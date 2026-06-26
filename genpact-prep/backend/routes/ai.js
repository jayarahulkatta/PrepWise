const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { generateAnswer, evaluateAnswer, generateChatDebrief: generateDebrief } = require('../localAI');
const { optionalAuth, requireAuth } = require('../middleware/auth');

// ─── RATE LIMITING ──────────────────────────────────────────────────────────

// Allow authenticated users more requests than unauthenticated
const aiRateLimiterAuth = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: { error: 'Too many AI requests. Please wait a minute and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiRateLimiterAnon = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: { error: 'Too many AI requests for guest user. Please wait or log in.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware to apply the correct rate limiter based on auth status
const dynamicRateLimiter = (req, res, next) => {
  if (req.user) {
    return aiRateLimiterAuth(req, res, next);
  }
  return aiRateLimiterAnon(req, res, next);
};

// ─── AI ENDPOINTS ───────────────────────────────────────────────────────────

// Generate AI answer
router.post('/generate', optionalAuth, dynamicRateLimiter, async (req, res) => {
  try {
    const { messages, tone, questionType, role, company } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Valid messages array required' });

    // Include resume text if user is authenticated and has a resume
    const resumeText = req.user?.resume?.text || null;
    
    // Pass authentication status to skip relevance filter if true
    // Pass authentication status to skip relevance filter if true
    const isAuthenticated = !!req.user;

    const lastMessageContent = messages[messages.length - 1]?.content || "";
    const answer = await generateAnswer(lastMessageContent, tone, questionType, role, company, resumeText, isAuthenticated);
    res.json({ text: answer });
  } catch (err) {
    console.error('AI Generate Error:', err);
    res.status(500).json({ error: err.message || 'AI Generation failed' });
  }
});

// Evaluate user answer
router.post('/evaluate', requireAuth, dynamicRateLimiter, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Valid messages array required' });

    const resumeText = req.user?.resume?.text || null;
    const experienceLevel = req.user?.prepProfile?.experienceLevel || 'Fresher';
    const targetRole = req.user?.prepProfile?.targetRole || 'Candidate';

    const lastMsgContent = messages[messages.length - 1]?.content || "";
    const qMatch = lastMsgContent.match(/Question:\s*"(.*?)"/s) || lastMsgContent.match(/Question:\s*(.*)/);
    const questionText = qMatch ? qMatch[1].trim() : lastMsgContent;
    
    const aMatch = lastMsgContent.match(/Answer:\s*"(.*?)"/s) || lastMsgContent.match(/Answer:\s*(.*)/s);
    const answerText = aMatch ? aMatch[1].trim() : '';

    const evaluation = await evaluateAnswer(questionText, answerText, 'Technical', resumeText, experienceLevel, targetRole);
    res.json(evaluation);
  } catch (err) {
    console.error('AI Evaluate Error:', err);
    res.status(500).json({ error: err.message || 'Evaluation failed' });
  }
});

// Generate debrief
router.post('/debrief', requireAuth, dynamicRateLimiter, async (req, res) => {
  try {
    const { messages, company } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Valid messages array required' });

    const resumeText = req.user?.resume?.text || null;
    const debrief = await generateDebrief(messages, company, resumeText);
    res.json(debrief);
  } catch (err) {
    console.error('AI Debrief Error:', err);
    res.status(500).json({ error: err.message || 'Debrief failed' });
  }
});

module.exports = router;
