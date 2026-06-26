const admin = require('firebase-admin');
const User = require('../models/User');

// Initialize Firebase Admin with project ID
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'prepwise-680d3',
  });
}

const DomainAllowlist = require('../models/DomainAllowlist');

// Find or create user in MongoDB from Firebase token
async function findOrCreateUser(decoded) {
  const email = (decoded.email || '').toLowerCase().trim();
  
  // Check if email is in the domain allowlist
  const allowlistEntry = await DomainAllowlist.findOne({ email });
  const isDomain = !!allowlistEntry;

  let user = await User.findOne({ firebaseUid: decoded.uid });
  if (!user) {
    user = await User.create({
      firebaseUid: decoded.uid,
      email: email,
      displayName: decoded.name || '',
      photoURL: decoded.picture || '',
      role: isDomain ? 'domain' : 'normal',
      onboardingComplete: false,
    });
  } else if (isDomain && user.role !== 'domain') {
    // Upgrade existing user to domain if email was added to allowlist
    user.role = 'domain';
    await user.save();
  } else if (!isDomain && user.role === 'domain') {
    // Downgrade if removed from allowlist (safety check)
    user.role = 'normal';
    await user.save();
  }
  return user;
}

// Optional auth — attaches user if token present, doesn't block
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded;
    req.user = await findOrCreateUser(decoded);
  } catch (err) {
    req.user = null;
  }
  next();
};

// Required auth — blocks if no valid token
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const token = authHeader.split('Bearer ')[1];

    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded;
    req.user = await findOrCreateUser(decoded);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Admin auth
const requireAdmin = async (req, res, next) => {
  await requireAuth(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({ error: 'Admin access required' });
  });
};

// Domain user auth
const requireDomain = async (req, res, next) => {
  await requireAuth(req, res, () => {
    if (req.user && (req.user.role === 'domain' || req.user.role === 'admin')) {
      return next();
    }
    return res.status(403).json({ error: 'Domain expert access required' });
  });
};

module.exports = { optionalAuth, requireAuth, requireAdmin, requireDomain };
