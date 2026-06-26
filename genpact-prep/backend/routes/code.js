const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { executeCodeSimulated } = require('../sandbox');

const codeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 requests per minute
  message: { error: 'Too many code executions. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/submit', codeRateLimiter, async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code || !language) return res.status(400).json({ error: 'Code and language are required' });

    // Using AI simulation (with disclaimer on frontend)
    const result = await executeCodeSimulated(code, language);
    res.json(result);
  } catch (err) {
    console.error('Code execution error:', err);
    res.status(500).json({ error: 'Code execution failed' });
  }
});

module.exports = router;
