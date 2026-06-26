const express = require('express');
const router = express.Router();
const User = require('../models/User');
const MockSession = require('../models/MockSession');
const ChatSession = require('../models/ChatSession');
const { requireAuth, requireDomain } = require('../middleware/auth');

// ─── PROFILE ────────────────────────────────────────────────────────────────

// Get user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      role: user.role,
      onboardingComplete: user.onboardingComplete,
      displayName: user.displayName || '',
      email: user.email || '',
      prepProfile: user.prepProfile || {},
      domainProfile: user.domainProfile || {},
      bookmarks: user.bookmarks || [],
      readinessScore: user.readinessScore || 0,
      streakDays: user.streakDays || 0,
      resume: user.resume ? { text: '(uploaded)', uploadedAt: user.resume.uploadedAt } : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Refresh profile (lightweight — for App.jsx onboarding gate)
router.get('/profile/refresh', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.firebaseUid }).lean();
    res.json({
      role: user.role,
      onboardingComplete: user.onboardingComplete,
      prepProfile: user.prepProfile || {},
      domainProfile: user.domainProfile || {},
      readinessScore: user.readinessScore || 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to refresh profile' });
  }
});

// ─── ONBOARDING ─────────────────────────────────────────────────────────────

router.put('/onboarding', requireAuth, async (req, res) => {
  try {
    const { role, prepProfile, domainProfile } = req.body;
    const update = { onboardingComplete: true };

    if (role === 'domain' && domainProfile) {
      update.domainProfile = { ...domainProfile, questionsSubmitted: 0, questionsApproved: 0, questionsPending: 0, contributorScore: 0 };
    } else if (prepProfile) {
      update.prepProfile = prepProfile;
    }
    // Note: role is set by server based on allowlist, not by client request

    await User.findOneAndUpdate({ firebaseUid: req.user.firebaseUid }, update);
    res.json({ success: true });
  } catch (err) {
    console.error('Onboarding error:', err);
    res.status(500).json({ error: 'Failed to save onboarding' });
  }
});

// ─── BOOKMARKS ──────────────────────────────────────────────────────────────

router.post('/bookmarks', requireAuth, async (req, res) => {
  try {
    const { questionId } = req.body;
    const user = req.user;

    if (user.bookmarks.includes(questionId)) {
      user.bookmarks = user.bookmarks.filter(id => id !== questionId);
    } else {
      user.bookmarks.push(questionId);
    }
    await user.save();
    res.json({ bookmarks: user.bookmarks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bookmarks' });
  }
});

router.get('/bookmarks', requireAuth, async (req, res) => {
  try {
    res.json({ bookmarks: req.user.bookmarks || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// ─── RESUME ─────────────────────────────────────────────────────────────────

router.post('/resume', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Resume text too short' });
    }

    req.user.resume = {
      text: text.trim().slice(0, 10000), // Cap at 10k chars
      uploadedAt: new Date(),
    };
    await req.user.save();
    res.json({ message: 'Resume saved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

router.get('/resume', requireAuth, async (req, res) => {
  try {
    const resume = req.user.resume;
    res.json({
      hasResume: !!resume?.text,
      uploadedAt: resume?.uploadedAt || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resume info' });
  }
});

// ─── MOCK SESSIONS ──────────────────────────────────────────────────────────

router.post('/mock-sessions', requireAuth, async (req, res) => {
  try {
    const sessionData = {
      userId: req.user.firebaseUid,
      ...req.body,
    };
    const session = await MockSession.create(sessionData);

    // Update user's readiness score and streak
    const allSessions = await MockSession.find({ userId: req.user.firebaseUid })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (allSessions.length > 0) {
      // Calculate readiness from recent sessions
      const weights = { technicalAccuracy: 0.25, communicationClarity: 0.20, structureOrganization: 0.15, depthOfExamples: 0.20, roleRelevance: 0.10, overallImpression: 0.10 };
      const axes = Object.keys(weights);
      let totalScore = 0;

      for (const s of allSessions) {
        const validScores = (s.scores || []).filter(sc => !sc.skipped);
        if (validScores.length === 0) continue;
        for (const axis of axes) {
          const axisAvg = validScores.reduce((sum, sc) => sum + (sc[axis] || 0), 0) / validScores.length;
          totalScore += axisAvg * weights[axis];
        }
      }
      const readiness = Math.round(totalScore / allSessions.length);
      req.user.readinessScore = readiness;
    }

    // Update streak
    const today = new Date().toDateString();
    const lastActivity = req.user.lastActivityDate ? new Date(req.user.lastActivityDate).toDateString() : null;
    if (lastActivity !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      req.user.streakDays = lastActivity === yesterday ? (req.user.streakDays || 0) + 1 : 1;
      req.user.lastActivityDate = new Date();
    }

    await req.user.save();
    res.status(201).json({ id: session._id, message: 'Session saved' });
  } catch (err) {
    console.error('Mock session save error:', err);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

router.get('/mock-sessions', requireAuth, async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const sessions = await MockSession.find({ userId: req.user.firebaseUid })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const total = await MockSession.countDocuments({ userId: req.user.firebaseUid });

    res.json({
      sessions: sessions.map(s => ({
        id: s._id.toString(),
        company: s.company,
        role: s.role,
        scores: s.scores,
        sessionDurationSec: s.sessionDurationSec,
        questionsAttempted: s.questionsAttempted,
        questionsSkipped: s.questionsSkipped,
        createdAt: s.createdAt,
      })),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// ─── CHAT SESSIONS ──────────────────────────────────────────────────────────

router.post('/chat-sessions', requireAuth, async (req, res) => {
  try {
    const sessionData = {
      userId: req.user.firebaseUid,
      ...req.body,
    };
    const session = await ChatSession.create(sessionData);
    res.status(201).json({ id: session._id, message: 'Chat session saved' });
  } catch (err) {
    console.error('Chat session save error:', err);
    res.status(500).json({ error: 'Failed to save chat session' });
  }
});

router.get('/chat-sessions', requireAuth, async (req, res) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user.firebaseUid })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.json(sessions.map(s => ({
      id: s._id.toString(),
      company: s.company,
      messages: s.messages,
      debrief: s.debrief,
      createdAt: s.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
});

// ─── DOMAIN STATS ───────────────────────────────────────────────────────────

router.get('/domain-stats', requireDomain, async (req, res) => {
  try {
    const user = req.user;
    const dp = user.domainProfile || {};

    // Get recent submissions from this domain user
    const Question = require('../models/Question');
    const recentSubmissions = await Question.find({ submittedBy: user.firebaseUid })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Calculate total learner engagement (sum of attempts on their questions)
    const allSubmittedQuestions = await Question.find({ submittedBy: user.firebaseUid }).lean();
    const totalLearnerEngagement = allSubmittedQuestions.reduce((sum, q) => sum + (q.attempts || 0) + (q.upvotes || 0), 0);

    res.json({
      questionsSubmitted: dp.questionsSubmitted || 0,
      questionsApproved: dp.questionsApproved || 0,
      questionsPending: dp.questionsPending || 0,
      contributorScore: dp.contributorScore || 0,
      totalLearnerEngagement,
      recentSubmissions: recentSubmissions.map(q => ({
        id: q._id.toString(),
        text: q.text,
        type: q.type,
        diff: q.diff,
        job: q.job,
        attempts: q.attempts || 0,
        avgScore: q.avgScore || 0,
        upvotes: q.upvotes || 0,
        status: q.status,
        createdAt: q.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch domain stats' });
  }
});

router.get('/domain-sessions', requireDomain, async (req, res) => {
  try {
    const MockSession = require('../models/MockSession');
    // Fetch recent 20 mock sessions from all users
    const sessions = await MockSession.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Redact PII (userId)
    const redactedSessions = sessions.map(s => {
      // Create a pseudo candidate ID
      const candidateId = `Candidate-${s.userId ? s.userId.substring(0, 5) : 'Unknown'}`;
      
      let overallScore = 0;
      const validScores = (s.scores || []).filter(sc => !sc.skipped);
      if (validScores.length > 0) {
        overallScore = Math.round(validScores.reduce((sum, sc) => sum + (sc.overallImpression || 0), 0) / validScores.length);
      }

      return {
        _id: s._id,
        candidateId,
        role: s.role,
        company: s.company,
        overallScore,
        questionsAttempted: s.questionsAttempted,
        createdAt: s.createdAt,
      };
    });

    res.json({ sessions: redactedSessions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch domain sessions' });
  }
});

// ─── NORMAL USER STATS ──────────────────────────────────────────────────────

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const sessionCount = await MockSession.countDocuments({ userId: user.firebaseUid });
    const chatCount = await ChatSession.countDocuments({ userId: user.firebaseUid });

    // Get weak areas from recent sessions
    const recentSessions = await MockSession.find({ userId: user.firebaseUid })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const axes = ['technicalAccuracy', 'communicationClarity', 'structureOrganization', 'depthOfExamples', 'roleRelevance', 'overallImpression'];
    const axisAverages = {};
    for (const axis of axes) {
      const scores = [];
      for (const s of recentSessions) {
        const validScores = (s.scores || []).filter(sc => !sc.skipped);
        if (validScores.length > 0) {
          scores.push(validScores.reduce((sum, sc) => sum + (sc[axis] || 0), 0) / validScores.length);
        }
      }
      axisAverages[axis] = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    }

    // Identify weak areas (below 60)
    const weakAreas = axes.filter(a => axisAverages[a] > 0 && axisAverages[a] < 60);

    res.json({
      totalSessions: sessionCount,
      totalChats: chatCount,
      readinessScore: user.readinessScore || 0,
      streakDays: user.streakDays || 0,
      practiceGoalPercent: Math.min(100, Math.round((sessionCount / 10) * 100)),
      axisAverages,
      weakAreas,
      prepProfile: user.prepProfile || {},
      bookmarkCount: (user.bookmarks || []).length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
