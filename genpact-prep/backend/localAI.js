const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai');
const crypto = require('crypto');

// ─── PROVIDER SETUP ─────────────────────────────────────────────────────────

// Primary: Google Gemini (Free: 15 RPM, 1M tokens/day)
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Fallback: Groq (Free: 30 RPM, 14,400 req/day)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// ─── MONGODB CACHE ──────────────────────────────────────────────────────────
let AICache;
try {
  AICache = require('./models/AICache');
} catch (e) {
  console.warn('⚠️ AICache model not found, caching disabled.');
  AICache = null;
}

function hashQuestion(text, type, company, role) {
  return crypto.createHash('md5').update(`${text}|${type}|${company}|${role}`).digest('hex');
}

async function getCachedAnswer(hash) {
  if (!AICache) return null;
  try {
    const cached = await AICache.findOne({ questionHash: hash }).lean();
    if (cached) {
      console.log(`⚡ Cache HIT — serving cached answer (provider: ${cached.provider})`);
      return cached.answer;
    }
  } catch (e) { /* ignore cache errors */ }
  return null;
}

async function setCachedAnswer(hash, questionText, type, company, role, answer, provider) {
  if (!AICache) return;
  try {
    await AICache.findOneAndUpdate(
      { questionHash: hash },
      { questionText, type, company, role, answer, provider, createdAt: new Date() },
      { upsert: true, new: true }
    );
    console.log(`💾 Cached answer (provider: ${provider})`);
  } catch (e) { /* ignore cache errors */ }
}

// ─── EXTRACT QUESTION ───────────────────────────────────────────────────────
function extractQuestionText(text) {
  const match = text.match(/Question:\s*"(.*?)"/);
  return match && match[1] ? match[1] : text;
}

// ─── PROVIDER 1: GEMINI ─────────────────────────────────────────────────────
async function generateWithGemini(prompt) {
  const response = await gemini.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });
  return response.text;
}

// ─── PROVIDER 2: GROQ ──────────────────────────────────────────────────────
async function generateWithGroq(systemPrompt, userPrompt) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 800,
  });
  return response.choices[0].message.content;
}

// ─── PROVIDER 3: LOCAL HEURISTIC (LAST RESORT) ─────────────────────────────
function generateLocally(questionText, type, company) {
  const lower = questionText.toLowerCase();

  if (/sql|database|dbms|query/i.test(lower)) {
    return `When it comes to databases, I have strong practical experience. During my projects at ${company}, I worked extensively with SQL databases — designing normalized schemas, writing complex queries with JOINs, subqueries, and aggregate functions, and optimizing performance.\n\nI understand ACID properties and the trade-offs between normalizing data for consistency vs denormalizing for read speed. I'm also familiar with NoSQL databases like MongoDB for flexible schema designs.`;
  }
  if (/oop|object.oriented|class|inheritance|polymorphism/i.test(lower)) {
    return `Object-oriented programming is one of my core strengths. The four pillars — Encapsulation, Abstraction, Inheritance, and Polymorphism — are principles I apply daily.\n\nI favor composition over inheritance for flexibility, use interfaces to decouple code, and apply design patterns like Singleton and Factory to keep codebases testable and modular.`;
  }
  if (/react|frontend|component|state|hook/i.test(lower)) {
    return `Frontend development with React is one of my strongest areas. I leverage functional components and hooks (useState, useEffect, useMemo) exclusively to build modular UIs.\n\nI prioritize performance by preventing unnecessary re-renders, and I deeply care about responsive design and accessibility for the end user.`;
  }
  if (/tell me about|describe a time|behavioral|star/i.test(lower)) {
    return `I can certainly share a relevant experience.\n\n**Situation:** During my final semester project, our team faced a major setback when the core API we relied on changed its pricing model, cutting off our access two weeks before launch.\n\n**Task:** My goal was to migrate us to an open-source alternative without breaking the UI components we had already built.\n\n**Action:** I took the initiative to research three alternatives over the weekend. I wrote an abstraction layer so the new API data perfectly matched the old structure. I then paired with my teammate to rapidly test the new integration.\n\n**Result:** We shipped the project on time, and the new open-source API actually reduced our latency by 20%. My professor praised us for our resilience and clean architecture under pressure.`;
  }

  return `That is an excellent question, and it is particularly relevant for a role at ${company}.\n\nIn my experience, the key to answering this effectively is combining strong theoretical understanding with practical examples. I would approach this by first breaking down the core concepts, then demonstrating how I have applied them in real projects.\n\nI am highly adaptable and always eager to learn new technologies. I'm confident that my problem-solving mindset and strong fundamentals make me well-suited for this position.`;
}

// ─── MAIN GENERATOR (CACHE → GEMINI → GROQ → LOCAL) ────────────────────────
async function generateAnswer(questionText, type = 'Technical', tone = 'confident', role = '', company = 'Genpact') {
  const extractedQuestion = extractQuestionText(questionText);
  const cacheHash = hashQuestion(extractedQuestion, type, company, role);

  // 1. Check cache first
  const cached = await getCachedAnswer(cacheHash);
  if (cached) return cached;

  const systemPrompt = `You are an expert interviewer and senior engineer at ${company}.
Your task is to provide an ideal, highly compelling answer to the following interview question for a ${role || 'technical'} candidate.
Provide a clear, detailed, and technically accurate answer.
The question type is: ${type}.
Tone required: ${tone}.
If it is a behavioral question, structure your answer using the STAR (Situation, Task, Action, Result) method.
Do NOT use markdown formatting like ** or ## in your answer. Use plain text only.`;

  const fullGeminiPrompt = `${systemPrompt}\n\nQuestion: ${extractedQuestion}`;

  // 2. Try Gemini (Primary)
  try {
    console.log('🔵 Trying Gemini...');
    const answer = await generateWithGemini(fullGeminiPrompt);
    if (answer) {
      await setCachedAnswer(cacheHash, extractedQuestion, type, company, role, answer, 'gemini');
      return answer;
    }
  } catch (err) {
    console.warn('⚠️ Gemini failed:', err.message);
  }

  // 3. Try Groq (Fallback)
  try {
    console.log('🟠 Trying Groq...');
    const answer = await generateWithGroq(systemPrompt, extractedQuestion);
    if (answer) {
      await setCachedAnswer(cacheHash, extractedQuestion, type, company, role, answer, 'groq');
      return answer;
    }
  } catch (err) {
    console.warn('⚠️ Groq failed:', err.message);
  }

  // 4. Local heuristic (Last resort — always works)
  console.log('🔴 Using local heuristic fallback...');
  const localAnswer = generateLocally(extractedQuestion, type, company);
  await setCachedAnswer(cacheHash, extractedQuestion, type, company, role, localAnswer, 'local');
  return localAnswer;
}

// ─── MOCK INTERVIEW EVALUATOR (GEMINI → GROQ → LOCAL) ──────────────────────
async function evaluateAnswer(questionText, answerText, type = 'Technical') {
  if (!answerText || answerText.trim().length === 0) {
    return { completeness: 10, clarity: 10, relevance: 10, feedback: "No answer was provided." };
  }

  const evalPrompt = `You are a strict but fair technical interviewer.
Evaluate the candidate's answer to the following question.
Question: "${questionText}"
Question Type: ${type}

Candidate's Answer: "${answerText}"

You must return ONLY a JSON object with no markdown formatting, no code blocks, no extra text.
The keys must be exactly:
{
  "completeness": <number 0-100>,
  "clarity": <number 0-100>,
  "relevance": <number 0-100>,
  "feedback": "<1-3 sentences of constructive feedback>"
}`;

  // Try Gemini first
  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: evalPrompt,
    });
    const cleaned = (response.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      completeness: parsed.completeness || 50,
      clarity: parsed.clarity || 50,
      relevance: parsed.relevance || 50,
      feedback: parsed.feedback || "Good attempt.",
    };
  } catch (err) {
    console.warn('⚠️ Gemini eval failed:', err.message);
  }

  // Try Groq
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: evalPrompt },
        { role: 'user', content: `Evaluate this answer now.` },
      ],
      temperature: 0.2,
    });
    const cleaned = (response.choices[0].message.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      completeness: parsed.completeness || 50,
      clarity: parsed.clarity || 50,
      relevance: parsed.relevance || 50,
      feedback: parsed.feedback || "Good attempt.",
    };
  } catch (err) {
    console.warn('⚠️ Groq eval failed:', err.message);
  }

  // Local heuristic evaluation
  const wordCount = answerText.trim().split(/\s+/).length;
  const hasKeywords = /experience|project|learn|team|approach|solution|result/i.test(answerText);
  let completeness = wordCount > 50 ? 70 : 40;
  if (hasKeywords) completeness += 15;

  return {
    completeness: Math.min(95, completeness),
    clarity: Math.min(95, wordCount > 30 ? 80 : 50),
    relevance: Math.min(95, hasKeywords ? 85 : 55),
    feedback: wordCount > 50
      ? "Solid response. Consider formatting with the STAR method for more structure."
      : "Your answer could be longer. Add concrete examples!",
  };
}

module.exports = { generateAnswer, evaluateAnswer };
