const admin = require('firebase-admin');
const User = require('../models/User');

// Initialize Firebase Admin with project ID
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'prepwise-680d3',
  });
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

    // Find or create user in DB
    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        email: decoded.email || '',
        displayName: decoded.name || '',
        photoURL: decoded.picture || '',
      });
    }
    req.user = user;
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

    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        email: decoded.email || '',
        displayName: decoded.name || '',
        photoURL: decoded.picture || '',
      });
    }
    req.user = user;
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

module.exports = { optionalAuth, requireAuth, requireAdmin };
