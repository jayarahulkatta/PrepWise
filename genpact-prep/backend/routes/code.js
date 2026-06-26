const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { executeCode } = require('../sandbox');
const { evaluateCode } = require('../localAI');

const codeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 requests per minute
  message: { error: 'Too many code executions. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/submit', codeRateLimiter, async (req, res) => {
  try {
    const { question, code, language } = req.body;
    if (!code || !language) return res.status(400).json({ error: 'Code and language are required' });

    // Step 1: Simulate code execution
    const execResult = await executeCode(code, language);

    // Step 2: AI code evaluation
    let evaluation = null;
    try {
      evaluation = await evaluateCode(code, language, question || '', execResult.stdout || '', execResult.stderr || '');
    } catch (evalErr) {
      console.warn('AI code evaluation failed:', evalErr.message);
      evaluation = {
        correctness: "Unknown",
        explanation: "AI evaluation is temporarily unavailable.",
        edgeCasesMissed: [],
        timeComplexity: "Unknown",
        spaceComplexity: "Unknown",
        suggestions: []
      };
    }

    // Return in the shape CodingWorkspace.jsx expects
    res.json({
      execution: {
        success: execResult.success,
        stdout: execResult.stdout || '',
        stderr: execResult.stderr || '',
        time: execResult.time || '<1'
      },
      evaluation
    });
  } catch (err) {
    console.error('Code execution error:', err);
    res.status(500).json({ error: 'Code execution failed' });
  }
});

module.exports = router;
