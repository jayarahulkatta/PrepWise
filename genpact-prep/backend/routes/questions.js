const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const User = require('../models/User');
const { optionalAuth, requireAuth, requireDomain } = require('../middleware/auth');

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
  TCS: {
    tagline: "India's Largest IT Services · Global Top 10 · 600,000+ Employees",
    process: [
      { n: "1", h: "TCS NQT", p: "National Qualifier Test — aptitude, verbal, coding." },
      { n: "2", h: "Technical Interview", p: "CS fundamentals, project discussion, coding." },
      { n: "3", h: "HR Interview", p: "Behavioral questions, relocation, shift willingness." },
    ],
    tips: [
      "Score well in TCS NQT — it's the primary filter",
      "Be thorough with OOPs, DBMS, and OS concepts",
      "Prepare to discuss your final year project in depth",
      "TCS values adaptability — highlight flexibility",
    ],
  },
  Infosys: {
    tagline: "Digital Services & Consulting · Global Leader · 300,000+ Employees",
    process: [
      { n: "1", h: "InfyTQ / Online Test", p: "Coding, aptitude, verbal ability assessment." },
      { n: "2", h: "Technical + HR", p: "Combined technical and HR round for most roles." },
    ],
    tips: [
      "Practice on InfyTQ platform if available",
      "Infosys values innovation — mention relevant projects",
      "Know about Infosys' key services and clients",
    ],
  },
  Wipro: {
    tagline: "IT Services · Business Process Services · 250,000+ Employees",
    process: [
      { n: "1", h: "Online Assessment", p: "Aptitude + essay writing + coding challenge." },
      { n: "2", h: "Technical Interview", p: "Programming concepts, problem solving, projects." },
      { n: "3", h: "HR Interview", p: "Culture fit, SPIRIT values, career goals." },
    ],
    tips: [
      "Know Wipro's SPIRIT values by heart",
      "Prepare for essay writing section",
      "Strong Java/Python fundamentals are key",
    ],
  },
  Accenture: {
    tagline: "Global Professional Services · Strategy · Consulting · Technology",
    process: [
      { n: "1", h: "Online Assessment", p: "Cognitive, technical, coding assessments." },
      { n: "2", h: "Technical + HR", p: "Combined interview covering tech and behavioral." },
    ],
    tips: [
      "Accenture values communication skills highly",
      "Prepare for case-study style questions",
      "Know about Accenture's key practice areas",
    ],
  },
};

// ─── HELPER: Escape regex special chars for safe search ─────────────────────
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Get all companies
router.get('/companies', (req, res) => {
  const companies = Object.keys(COMPANY_META).map(name => ({
    name,
    ...COMPANY_META[name],
  }));
  res.json(companies);
});

// Get company meta
router.get('/companies/:name', (req, res) => {
  const meta = COMPANY_META[req.params.name];
  if (!meta) return res.status(404).json({ error: 'Company not found' });
  res.json({ name: req.params.name, ...meta });
});

// Get questions with filters
router.get('/', optionalAuth, async (req, res) => {
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

    let sortOption = { upvotes: -1, createdAt: -1 };
    if (sort === 'recent') sortOption = { createdAt: -1 };
    else if (sort === 'hardest') sortOption = { avgScore: 1, attempts: -1 };
    else if (sort === 'easiest') sortOption = { avgScore: -1, attempts: -1 };

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
      attempts: q.attempts || 0,
      avgScore: q.avgScore || 0,
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
router.get('/all', async (req, res) => {
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
      attempts: q.attempts || 0,
      avgScore: q.avgScore || 0,
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Submit a new question (domain users only — auto-approved)
router.post('/submit', requireDomain, async (req, res) => {
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

// Edit a question (domain users only)
router.put('/:id', requireDomain, async (req, res) => {
  try {
    const { job, type, diff, exp, text } = req.body;
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { job, type, diff, exp, text },
      { new: true }
    );
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json({ message: 'Question updated successfully', question });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Delete a question (domain users only)
router.delete('/:id', requireDomain, async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Bulk delete questions (domain users only)
router.post('/bulk-delete', requireDomain, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Invalid payload' });
    await Question.deleteMany({ _id: { $in: ids } });
    res.json({ message: `${ids.length} questions deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete' });
  }
});

// Vote on a question
router.post('/:id/vote', requireAuth, async (req, res) => {
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
router.put('/:id/approve', requireDomain, async (req, res) => {
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
router.get('/pending', requireDomain, async (req, res) => {
  try {
    const questions = await Question.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
    res.json(questions.map(q => ({ id: q._id.toString(), ...q })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending questions' });
  }
});

module.exports = { router, COMPANY_META };
