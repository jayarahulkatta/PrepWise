const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { generateAnswer, evaluateAnswer, generateChatDebrief } = require('./localAI');
const connectDB = require('./db');
const Question = require('./models/Question');
const User = require('./models/User');
const { optionalAuth, requireAuth, requireAdmin, requireDomain } = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 5000;

// CORS — restrict origins in production
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL || 'https://prepwise.vercel.app']
  : ['http://localhost:3000', 'http://localhost:5000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow in dev, tighten in prod
    }
  },
  credentials: true,
}));
app.use(express.json());

// Connect to MongoDB
connectDB();

// ─── COMPANY META ───────────────────────────────────────────────────────────
const COMPANY_META = {
  Genpact: {
    tagline: "Global Professional Services · Digital Transformation · 100,000+ Employees",
    process: [
      { n: "1", h: "Online Assessment", p: "MCQs + Coding on HackerRank. DSA, OS, DBMS, OOPs." },
      { n: "2", h: "Technical Round", p: "In-depth tech questions, problem solving, code writing." },
      { n: "3", h: "HR Round", p: "Behavioral, culture fit, salary discussion & offer." },
    ],
    tips: [
      "Research Genpact's digital transformation services",
      "Be strong in Java, Python, SQL and CS fundamentals",
      "Use STAR format for behavioral questions naturally",
      "Know Genpact's 30+ countries, 100K+ workforce",
      "Practice speaking answers out loud before interview",
    ],
  },
};

// ─── HELPER: Escape regex special chars for safe search ─────────────────────
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── QUESTION ROUTES ────────────────────────────────────────────────────────

// Get all companies
app.get('/api/companies', (req, res) => {
  const companies = Object.keys(COMPANY_META).map(name => ({
    name,
    ...COMPANY_META[name],
  }));
  res.json(companies);
});

// Get company meta
app.get('/api/companies/:name', (req, res) => {
  const meta = COMPANY_META[req.params.name];
  if (!meta) return res.status(404).json({ error: 'Company not found' });
  res.json({ name: req.params.name, ...meta });
});

// Get questions with filters
app.get('/api/questions', optionalAuth, async (req, res) => {
  try {
    const { company, type, diff, exp, job, search, page = 1, limit = 8, sort = 'helpful' } = req.query;

    const filter = { status: 'approved' };
    if (company) filter.company = company;
    if (type) filter.type = type;
    if (diff) filter.diff = diff;
    if (exp) filter.exp = exp;
    if (job) filter.job = job;
    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { text: { $regex: safeSearch, $options: 'i' } },
        { job: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const sortOption = sort === 'recent'
      ? { createdAt: -1 }
      : { upvotes: -1, createdAt: -1 };

    const total = await Question.countDocuments(filter);
    const questions = await Question.find(filter)
      .sort(sortOption)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const mapped = questions.map(q => ({
      id: q._id.toString(),
      company: q.company,
      job: q.job,
      type: q.type,
      diff: q.diff,
      exp: q.exp,
      text: q.text,
      date: q.date,
      upvotes: q.upvotes || 0,
      downvotes: q.downvotes || 0,
      submittedBy: q.submittedBy || null,
    }));

    res.json({
      questions: mapped,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error('Questions fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Get ALL questions for a company (used by mock interview, chat sim)
app.get('/api/questions/all', async (req, res) => {
  try {
    const { company } = req.query;
    const filter = { status: 'approved' };
    if (company) filter.company = company;

    const questions = await Question.find(filter).lean();
    const mapped = questions.map(q => ({
      id: q._id.toString(),
      company: q.company,
      job: q.job,
      type: q.type,
      diff: q.diff,
      exp: q.exp,
      text: q.text,
      date: q.date,
      upvotes: q.upvotes || 0,
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Submit a new question (domain users only — auto-approved)
app.post('/api/questions/submit', requireDomain, async (req, res) => {
  try {
    const { company, job, type, diff, exp, text, date } = req.body;
    if (!company || !job || !type || !diff || !exp || !text) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Domain users get auto-approved, normal users go to pending
    const status = (req.user.role === 'domain' || req.user.role === 'admin') ? 'approved' : 'pending';

    const question = await Question.create({
      company, job, type, diff, exp, text,
      date: date || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      status,
      submittedBy: req.user.firebaseUid,
    });

    // Update domain user contribution stats
    if (req.user.role === 'domain' || req.user.role === 'admin') {
      req.user.domainProfile.questionsSubmitted += 1;
      req.user.domainProfile.questionsApproved += 1;
      req.user.domainProfile.contributorScore += 10;
      await req.user.save();
    }

    res.status(201).json({ 
      message: status === 'approved' ? 'Question published!' : 'Question submitted for review!', 
      id: question._id,
      status,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit question' });
  }
});

// Delete a question (domain users only)
app.delete('/api/questions/:id', requireDomain, async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Vote on a question
app.post('/api/questions/:id/vote', requireAuth, async (req, res) => {
  try {
    const { direction } = req.body;
    const uid = req.user.firebaseUid;
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const alreadyUp = question.votedBy?.up?.includes(uid);
    const alreadyDown = question.votedBy?.down?.includes(uid);

    if (direction === 'up') {
      if (alreadyUp) {
        question.votedBy.up.pull(uid);
        question.upvotes = Math.max(0, question.upvotes - 1);
      } else {
        if (alreadyDown) {
          question.votedBy.down.pull(uid);
          question.downvotes = Math.max(0, question.downvotes - 1);
        }
        question.votedBy.up.push(uid);
        question.upvotes += 1;
      }
    } else {
      if (alreadyDown) {
        question.votedBy.down.pull(uid);
        question.downvotes = Math.max(0, question.downvotes - 1);
      } else {
        if (alreadyUp) {
          question.votedBy.up.pull(uid);
          question.upvotes = Math.max(0, question.upvotes - 1);
        }
        question.votedBy.down.push(uid);
        question.downvotes += 1;
      }
    }

    await question.save();
    res.json({ upvotes: question.upvotes, downvotes: question.downvotes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Domain: Approve a pending question
app.put('/api/questions/:id/approve', requireDomain, async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!question) return res.status(404).json({ error: 'Question not found' });

    // Credit domain user if they submitted it
    if (question.submittedBy) {
      await User.findOneAndUpdate(
        { firebaseUid: question.submittedBy },
        { $inc: { 'domainProfile.questionsApproved': 1, 'domainProfile.contributorScore': 10 } }
      );
    }
    res.json({ message: 'Question approved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve' });
  }
});

// Admin/Domain: Get pending questions
app.get('/api/questions/pending', requireDomain, async (req, res) => {
  try {
    const questions = await Question.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
    res.json(questions.map(q => ({ id: q._id.toString(), ...q })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending questions' });
  }
});

// ─── USER ROUTES ────────────────────────────────────────────────────────────

// Get user profile
app.get('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    res.json({
      id: user._id.toString(),
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      role: user.role,
      onboardingComplete: user.onboardingComplete,
      prepProfile: user.prepProfile || {},
      domainProfile: user.domainProfile || {},
      bookmarks: (user.bookmarks || []).map(b => b.toString()),
      likes: (user.likes || []).map(l => l.toString()),
      readinessScore: user.readinessScore || 0,
      totalPracticeSessions: user.totalPracticeSessions || 0,
      streakDays: user.streakDays || 0,
      lastPracticeDate: user.lastPracticeDate,
      mockSessionCount: (user.mockSessions || []).length,
      chatSessionCount: (user.chatSessions || []).length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Complete onboarding
app.put('/api/user/onboarding', requireAuth, async (req, res) => {
  try {
    const { role, prepProfile, domainProfile } = req.body;
    const updates = { onboardingComplete: true };

    if (role === 'domain' || role === 'normal') {
      updates.role = role;
    }
    if (role === 'normal' && prepProfile) {
      updates.prepProfile = {
        targetCompany: prepProfile.targetCompany || 'Genpact',
        targetRole: prepProfile.targetRole || '',
        interviewDate: prepProfile.interviewDate || null,
        experienceLevel: prepProfile.experienceLevel || 'Fresher',
        focusAreas: prepProfile.focusAreas || [],
      };
    }
    if (role === 'domain' && domainProfile) {
      updates.domainProfile = {
        company: domainProfile.company || '',
        roleArea: domainProfile.roleArea || '',
        yearsExperience: domainProfile.yearsExperience || 0,
        specializations: domainProfile.specializations || [],
      };
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).lean();
    res.json({ message: 'Onboarding complete', role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

// Update profile
app.put('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const { prepProfile, domainProfile } = req.body;
    const updates = {};
    if (prepProfile) updates.prepProfile = prepProfile;
    if (domainProfile) updates.domainProfile = domainProfile;
    await User.findByIdAndUpdate(req.user._id, updates);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Toggle bookmark
app.put('/api/user/bookmarks', requireAuth, async (req, res) => {
  try {
    const { questionId } = req.body;
    const user = req.user;
    const idx = user.bookmarks.findIndex(b => b.toString() === questionId);
    if (idx > -1) {
      user.bookmarks.splice(idx, 1);
    } else {
      user.bookmarks.push(questionId);
    }
    await user.save();
    res.json({ bookmarks: user.bookmarks.map(b => b.toString()) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bookmarks' });
  }
});

// Toggle like
app.put('/api/user/likes', requireAuth, async (req, res) => {
  try {
    const { questionId } = req.body;
    const user = req.user;
    const idx = user.likes.findIndex(l => l.toString() === questionId);
    if (idx > -1) {
      user.likes.splice(idx, 1);
    } else {
      user.likes.push(questionId);
    }
    await user.save();
    res.json({ likes: user.likes.map(l => l.toString()) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update likes' });
  }
});

// Save mock session (full 6-axis scoring)
app.post('/api/user/mock-sessions', requireAuth, async (req, res) => {
  try {
    const { company, role, scores, sessionDurationSec, questionsAttempted, questionsSkipped } = req.body;

    // Compute averages
    const axes = ['technicalAccuracy', 'communicationClarity', 'structureOrganization', 'depthOfExamples', 'roleRelevance', 'overallImpression'];
    const validScores = scores.filter(s => !s.skipped);
    const averages = {};
    axes.forEach(axis => {
      averages[axis] = validScores.length > 0
        ? Math.round(validScores.reduce((sum, s) => sum + (s[axis] || 0), 0) / validScores.length)
        : 0;
    });

    // Compute readiness score (weighted)
    const weights = { technicalAccuracy: 0.25, communicationClarity: 0.2, structureOrganization: 0.15, depthOfExamples: 0.2, roleRelevance: 0.1, overallImpression: 0.1 };
    const readinessScore = Math.round(
      axes.reduce((sum, axis) => sum + (averages[axis] || 0) * (weights[axis] || 0), 0)
    );

    const session = {
      company,
      role,
      questionCount: scores.length,
      questionsAttempted: questionsAttempted || validScores.length,
      questionsSkipped: questionsSkipped || 0,
      sessionDurationSec,
      scores,
      averages,
      readinessScore,
    };

    req.user.mockSessions.push(session);
    req.user.totalPracticeSessions += 1;

    // Update streak
    const today = new Date().toDateString();
    const lastDate = req.user.lastPracticeDate ? new Date(req.user.lastPracticeDate).toDateString() : null;
    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      req.user.streakDays = lastDate === yesterday ? req.user.streakDays + 1 : 1;
      req.user.lastPracticeDate = new Date();
    }

    // Update overall readiness (rolling average of last 5 sessions)
    const recentSessions = req.user.mockSessions.slice(-5);
    req.user.readinessScore = Math.round(
      recentSessions.reduce((sum, s) => sum + (s.readinessScore || 0), 0) / recentSessions.length
    );

    // Detect weak areas
    const weakAreas = axes.filter(axis => averages[axis] < 50);
    if (weakAreas.length > 0) {
      req.user.prepProfile = req.user.prepProfile || {};
      req.user.prepProfile.weakAreas = weakAreas;
    }

    await req.user.save();
    res.json({
      message: 'Session saved',
      sessionId: req.user.mockSessions[req.user.mockSessions.length - 1]._id,
      readinessScore: req.user.readinessScore,
      streakDays: req.user.streakDays,
    });
  } catch (err) {
    console.error('Mock session save error:', err);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

// Get mock session history
app.get('/api/user/mock-sessions', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    const sessions = (user.mockSessions || []).sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({
      sessions,
      readinessScore: user.readinessScore || 0,
      totalPracticeSessions: user.totalPracticeSessions || 0,
      streakDays: user.streakDays || 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Save chat session with debrief
app.post('/api/user/chat-sessions', requireAuth, async (req, res) => {
  try {
    const { company, messages, debrief } = req.body;
    req.user.chatSessions.push({ company, messages, debrief });
    req.user.totalPracticeSessions += 1;

    // Update streak
    const today = new Date().toDateString();
    const lastDate = req.user.lastPracticeDate ? new Date(req.user.lastPracticeDate).toDateString() : null;
    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      req.user.streakDays = lastDate === yesterday ? req.user.streakDays + 1 : 1;
      req.user.lastPracticeDate = new Date();
    }

    await req.user.save();
    res.json({ message: 'Chat session saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save chat session' });
  }
});

// Get domain user stats
app.get('/api/user/domain-stats', requireDomain, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    const submittedQuestions = await Question.find({ submittedBy: req.user.firebaseUid }).lean();
    const approved = submittedQuestions.filter(q => q.status === 'approved');
    const pending = submittedQuestions.filter(q => q.status === 'pending');
    const totalViews = approved.reduce((sum, q) => sum + (q.upvotes || 0), 0);

    res.json({
      questionsSubmitted: submittedQuestions.length,
      questionsApproved: approved.length,
      questionsPending: pending.length,
      totalLearnerEngagement: totalViews,
      contributorScore: user.domainProfile?.contributorScore || 0,
      recentSubmissions: submittedQuestions.slice(-10).map(q => ({
        id: q._id.toString(),
        text: q.text,
        status: q.status,
        company: q.company,
        date: q.date,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch domain stats' });
  }
});

// ─── AI ROUTES ──────────────────────────────────────────────────────────────

// Generate ideal answer (with tone passthrough)
app.post('/api/generate', async (req, res) => {
  const { messages, prompt, tone, questionType, role, company } = req.body;

  if (!messages && !prompt) {
    return res.status(400).json({ error: 'Messages or prompt is required' });
  }

  let questionText = prompt || "";
  if (messages && messages.length > 0) {
    questionText = messages[messages.length - 1].content;
  }

  // Extract the actual question from prompt template
  const questionMatch = questionText.match(/Question:\s*"(.*?)"/);
  if (questionMatch && questionMatch[1]) {
    questionText = questionMatch[1];
  }

  // Extract Type if embedded
  let extractedType = questionType;
  const typeMatch = questionText.match(/Type:\s*(.*?)\n/);
  if (!extractedType && typeMatch && typeMatch[1]) {
    extractedType = typeMatch[1].trim();
  }

  try {
    const answer = await generateAnswer(
      questionText,
      extractedType || 'Technical',
      tone || 'confident',  // ← tone now respected
      role,
      company || 'Genpact'
    );
    res.json({ content: answer });
  } catch (error) {
    console.error('AI Generate Error:', error);
    res.status(500).json({ error: 'Failed to generate answer' });
  }
});

// Evaluate candidate answer (6-axis scoring)
app.post('/api/evaluate', async (req, res) => {
  const { messages, prompt } = req.body;

  if (!messages && !prompt) {
    return res.status(400).json({ error: 'Messages or prompt is required' });
  }

  let questionText = "";
  let answerText = prompt || "";

  if (messages && messages.length >= 1) {
    // Extract question and answer from the evaluation message
    const lastMsg = messages[messages.length - 1].content;
    const qMatch = lastMsg.match(/Question:\s*"(.*?)"/);
    const aMatch = lastMsg.match(/Answer:\s*"(.*?)"/s);
    if (qMatch) questionText = qMatch[1];
    if (aMatch) answerText = aMatch[1];
    if (!questionText && messages.length >= 2) {
      questionText = messages[messages.length - 2].content;
    }
  }

  try {
    const evaluation = await evaluateAnswer(questionText, answerText);
    res.json({ content: JSON.stringify(evaluation) });
  } catch (error) {
    console.error('AI Evaluate Error:', error);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

// Generate chat debrief
app.post('/api/debrief', async (req, res) => {
  const { messages, company } = req.body;
  if (!messages || messages.length < 2) {
    return res.status(400).json({ error: 'At least 2 conversation messages required' });
  }
  try {
    const debrief = await generateChatDebrief(messages, company || 'Genpact');
    res.json({ debrief });
  } catch (error) {
    console.error('Debrief Error:', error);
    res.status(500).json({ error: 'Failed to generate debrief' });
  }
});

// Start server
if (require.main === module) {
  app.listen(port, () => {
    console.log(`🚀 PrepWise backend running on http://localhost:${port}`);
  });
}

module.exports = app;
