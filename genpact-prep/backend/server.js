const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { generateAnswer, evaluateAnswer } = require('./localAI');
const connectDB = require('./db');
const Question = require('./models/Question');
const User = require('./models/User');
const { optionalAuth, requireAuth, requireAdmin } = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// ─── COMPANY META ───────────────────────────────────────────────────────────
const COMPANY_META = {
  Genpact: {
    tagline: "Global Professional Services · Digital Transformation · 100,000+ Employees",
    process: [
      { n:"1", h:"Online Assessment", p:"MCQs + Coding on HackerRank. DSA, OS, DBMS, OOPs." },
      { n:"2", h:"Technical Round", p:"In-depth tech questions, problem solving, code writing." },
      { n:"3", h:"HR Round", p:"Behavioral, culture fit, salary discussion & offer." },
    ],
    tips: [
      "Research Genpact's digital transformation services",
      "Be strong in Java, Python, SQL and CS fundamentals",
      "Use STAR format for behavioral questions naturally",
      "Know Genpact's 30+ countries, 100K+ workforce",
      "Practice speaking answers out loud before interview",
    ],
  },
  TCS: {
    tagline: "IT Services · Consulting · 600,000+ Employees · India's Largest IT Company",
    process: [
      { n:"1", h:"TCS NQT (National Qualifier Test)", p:"Aptitude, reasoning, verbal, coding on TCS iON." },
      { n:"2", h:"Technical Interview", p:"CS fundamentals, coding, project discussion." },
      { n:"3", h:"HR + Managerial Round", p:"Behavioral questions, relocation, joining flexibility." },
    ],
    tips: [
      "Prepare thoroughly for TCS NQT — aptitude is key",
      "Know at least one programming language very well",
      "Be prepared for relocation and shift-based work",
      "Research TCS's business segments and recent news",
      "Practice explaining your projects clearly",
    ],
  },
  Infosys: {
    tagline: "IT Services · Digital Innovation · 300,000+ Employees · Bengaluru HQ",
    process: [
      { n:"1", h:"InfyTQ / Online Test", p:"Aptitude, logical reasoning, verbal, coding rounds." },
      { n:"2", h:"Technical Round", p:"Programming, DBMS, OS, data structures, project discussion." },
      { n:"3", h:"HR Round", p:"Cultural fit, relocation, strengths/weaknesses, salary." },
    ],
    tips: [
      "Complete InfyTQ certification for advantage",
      "Focus on DBMS and SQL — heavily tested",
      "Know about Infosys's digital services and Finacle",
      "Prepare to discuss your academic projects in depth",
      "Be confident about willingness to work anywhere",
    ],
  },
  Wipro: {
    tagline: "IT Services · Consulting · 250,000+ Employees · SPIRIT Values",
    process: [
      { n:"1", h:"Online Assessment (AMCAT/eLitmus)", p:"Quantitative, logical, verbal, coding on CoCubes." },
      { n:"2", h:"Technical Interview", p:"Core CS, coding, project walkthrough." },
      { n:"3", h:"HR Round", p:"Cultural fit, Wipro SPIRIT values, bond agreement." },
    ],
    tips: [
      "Learn about Wipro's SPIRIT values — they often ask",
      "Practice coding problems on CoCubes platform",
      "Know about Wipro's digital transformation initiatives",
      "Be comfortable with a 1-year service agreement",
      "Prepare real examples for behavioral questions",
    ],
  },
  Accenture: {
    tagline: "Consulting · Technology · Outsourcing · 700,000+ Employees · Global Leader",
    process: [
      { n:"1", h:"Cognitive & Technical Assessment", p:"Verbal, analytical, abstract, coding on myworkday." },
      { n:"2", h:"Communication Assessment", p:"Speaking and writing assessment for language skills." },
      { n:"3", h:"Technical + HR Interview", p:"Core concepts, problem solving, behavioral, culture fit." },
    ],
    tips: [
      "Focus on communication skills — Accenture values them highly",
      "Prepare for Accenture's cognitive assessment format",
      "Know about Accenture's 'New IT' and cloud-first strategy",
      "Research Accenture's industry solutions and clients",
      "Be ready to discuss teamwork and leadership examples",
    ],
  },
};

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
      filter.$or = [
        { text: { $regex: search, $options: 'i' } },
        { job: { $regex: search, $options: 'i' } },
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

    // Map _id to id for frontend compatibility
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

// Submit a new question (auth required)
app.post('/api/questions/submit', requireAuth, async (req, res) => {
  try {
    const { company, job, type, diff, exp, text, date } = req.body;
    if (!company || !job || !type || !diff || !exp || !text) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const question = await Question.create({
      company, job, type, diff, exp, text,
      date: date || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      status: 'pending',
      submittedBy: req.user.firebaseUid,
    });

    res.status(201).json({ message: 'Question submitted for review!', id: question._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit question' });
  }
});

// Delete a question
app.delete('/api/questions/:id', requireAuth, async (req, res) => {
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
    const { direction } = req.body; // 'up' or 'down'
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

// Admin: Approve a pending question
app.put('/api/questions/:id/approve', requireAdmin, async (req, res) => {
  try {
    await Question.findByIdAndUpdate(req.params.id, { status: 'approved' });
    res.json({ message: 'Question approved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve' });
  }
});

// Admin: Delete a question
app.delete('/api/questions/:id', requireAdmin, async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// Admin: Get pending questions
app.get('/api/questions/pending', requireAdmin, async (req, res) => {
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
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      role: user.role,
      bookmarks: user.bookmarks.map(b => b.toString()),
      likes: user.likes.map(l => l.toString()),
      mockScores: user.mockScores || [],
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
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

// Save mock scores
app.post('/api/user/mock-scores', requireAuth, async (req, res) => {
  try {
    const { company, role, completeness, clarity, relevance, questionsCount } = req.body;
    req.user.mockScores.push({ company, role, completeness, clarity, relevance, questionsCount });
    await req.user.save();
    res.json({ message: 'Scores saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save scores' });
  }
});

// ─── LOCAL AI ROUTES ────────────────────────────────────────────────────────

// Generate ideal answer locally
app.post('/api/generate', async (req, res) => {
  const { messages, prompt, questionType, role, company } = req.body;

  if (!messages && !prompt) {
    return res.status(400).json({ error: 'Messages or prompt is required' });
  }

  // Determine the question text to generate an answer for
  let questionText = prompt || "";
  if (messages && messages.length > 0) {
    questionText = messages[messages.length - 1].content;
  }

  // Extract the actual question from the massive frontend prompt template
  const questionMatch = questionText.match(/Question:\s*"(.*?)"/);
  if (questionMatch && questionMatch[1]) {
    questionText = questionMatch[1];
  }

  // Extract Question Type if provided in the frontend template
  let extractedType = questionType;
  const typeMatch = questionText.match(/Type:\s*(.*?)\n/);
  if (!extractedType && typeMatch && typeMatch[1]) {
    extractedType = typeMatch[1].trim();
  }

  // Simulate network delay for realistic UX
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));

  try {
    const answer = await generateAnswer(questionText, extractedType || 'Technical', 'confident', role, company || 'Genpact');
    res.json({ content: answer });
  } catch (error) {
    console.error('Local AI Generate Error:', error);
    res.status(500).json({ error: 'Failed to generate answer' });
  }
});

// Evaluate candidate answer locally
app.post('/api/evaluate', async (req, res) => {
  const { messages, prompt } = req.body;

  if (!messages && !prompt) {
    return res.status(400).json({ error: 'Messages or prompt is required' });
  }

  // Extract the question and the user's answer
  let questionText = "";
  let answerText = prompt || "";
  
  if (messages && messages.length >= 2) {
    // Assuming the second to last message is the question and the last is the answer
    questionText = messages[messages.length - 2].content;
    answerText = messages[messages.length - 1].content;
  }

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 800));

  try {
    const evaluation = await evaluateAnswer(questionText, answerText);
    res.json({ content: JSON.stringify(evaluation) });
  } catch (error) {
    console.error('Local AI Evaluate Error:', error);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

// Start server
if (require.main === module) {
  app.listen(port, () => {
    console.log(`🚀 PrepWise backend running (Local AI) on http://localhost:${port}`);
  });
}

module.exports = app;
