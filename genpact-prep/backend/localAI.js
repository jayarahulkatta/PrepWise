const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai');
const crypto = require('crypto');

// ─── PROVIDER SETUP ─────────────────────────────────────────────────────────
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    if (cached) return cached.answer;
  } catch (e) { /* ignore */ }
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
  } catch (e) { /* ignore */ }
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

// ─── PROVIDER 3: LOCAL HEURISTIC ────────────────────────────────────────────
function generateLocally(questionText, type, company) {
  const lower = questionText.toLowerCase();

  if (/sql|database|dbms|query/i.test(lower)) {
    return `When it comes to databases, I have strong practical experience. During my projects, I worked extensively with SQL databases — designing normalized schemas, writing complex queries with JOINs, subqueries, and aggregate functions, and optimizing performance.\n\nI understand ACID properties and the trade-offs between normalizing data for consistency vs denormalizing for read speed. I'm also familiar with NoSQL databases like MongoDB for flexible schema designs.`;
  }
  if (/oop|object.oriented|class|inheritance|polymorphism/i.test(lower)) {
    return `Object-oriented programming is one of my core strengths. The four pillars — Encapsulation, Abstraction, Inheritance, and Polymorphism — are principles I apply daily.\n\nI favor composition over inheritance for flexibility, use interfaces to decouple code, and apply design patterns like Singleton and Factory to keep codebases testable and modular.`;
  }
  if (/react|frontend|component|state|hook/i.test(lower)) {
    return `Frontend development with React is one of my strongest areas. I leverage functional components and hooks (useState, useEffect, useMemo) exclusively to build modular UIs.\n\nI prioritize performance by preventing unnecessary re-renders, and I deeply care about responsive design and accessibility for the end user.`;
  }
  if (/tell me about|describe a time|behavioral|star/i.test(lower)) {
    return `I can certainly share a relevant experience.\n\nSituation: During my final semester project, our team faced a major setback when the core API we relied on changed its pricing model, cutting off our access two weeks before launch.\n\nTask: My goal was to migrate us to an open-source alternative without breaking the UI components we had already built.\n\nAction: I took the initiative to research three alternatives over the weekend. I wrote an abstraction layer so the new API data perfectly matched the old structure. I then paired with my teammate to rapidly test the new integration.\n\nResult: We shipped the project on time, and the new open-source API actually reduced our latency by 20%. My professor praised us for our resilience and clean architecture under pressure.`;
  }

  return `That is an excellent question, and it is particularly relevant for a role at ${company}.\n\nIn my experience, the key to answering this effectively is combining strong theoretical understanding with practical examples. I would approach this by first breaking down the core concepts, then demonstrating how I have applied them in real projects.\n\nI am highly adaptable and always eager to learn new technologies. I'm confident that my problem-solving mindset and strong fundamentals make me well-suited for this position.`;
}

// ─── MAIN GENERATOR (CACHE → GEMINI → GROQ → LOCAL) ────────────────────────
async function generateAnswer(questionText, type = 'Technical', tone = 'confident', role = '', company = 'Genpact') {
  const extractedQuestion = extractQuestionText(questionText);
  const cacheHash = hashQuestion(extractedQuestion, type, company, role);

  const cached = await getCachedAnswer(cacheHash);
  if (cached) return cached;

  const TONE_GUIDES = {
    confident: "Speak with confidence. Use 'I\\'ve found that...' and 'In my experience...'",
    story: "Weave a story with beginning, challenge, action, outcome. Feel natural.",
    concise: "Be crisp and direct. Under 120 words. No fluff.",
    humble: "Be genuine and modest. Show eagerness to grow.",
    technical: "Go deep technically. Use precise terminology. Include code if relevant.",
  };

  const toneGuide = TONE_GUIDES[tone] || TONE_GUIDES.confident;

  const systemPrompt = `You are an expert interviewer and senior engineer at ${company}.
Your task is to provide an ideal, highly compelling answer to the following interview question for a ${role || 'technical'} candidate.
Provide a clear, detailed, and technically accurate answer.
The question type is: ${type}.
Tone: ${toneGuide}
If it is a behavioral question, structure your answer using the STAR (Situation, Task, Action, Result) method.
Do NOT use markdown formatting like ** or ## in your answer. Use plain text only.
Write as someone would SPEAK — conversational, 150-220 words.`;

  const fullGeminiPrompt = `${systemPrompt}\n\nQuestion: ${extractedQuestion}`;

  // Try Gemini
  try {
    const answer = await generateWithGemini(fullGeminiPrompt);
    if (answer) {
      await setCachedAnswer(cacheHash, extractedQuestion, type, company, role, answer, 'gemini');
      return answer;
    }
  } catch (err) {
    console.warn('⚠️ Gemini failed:', err.message);
  }

  // Try Groq
  try {
    const answer = await generateWithGroq(systemPrompt, extractedQuestion);
    if (answer) {
      await setCachedAnswer(cacheHash, extractedQuestion, type, company, role, answer, 'groq');
      return answer;
    }
  } catch (err) {
    console.warn('⚠️ Groq failed:', err.message);
  }

  // Local fallback
  const localAnswer = generateLocally(extractedQuestion, type, company);
  await setCachedAnswer(cacheHash, extractedQuestion, type, company, role, localAnswer, 'local');
  return localAnswer;
}

// ─── 6-AXIS EVALUATOR ──────────────────────────────────────────────────────
async function evaluateAnswer(questionText, answerText, type = 'Technical') {
  if (!answerText || answerText.trim().length === 0) {
    return {
      technicalAccuracy: 10, communicationClarity: 10, structureOrganization: 10,
      depthOfExamples: 10, roleRelevance: 10, overallImpression: 10,
      feedback: "No answer was provided.",
      strengths: [],
      improvements: [{ area: "Completeness", issue: "No answer given", suggestion: "Try to provide at least a partial answer." }],
    };
  }

  const evalPrompt = `You are a strict but fair senior technical interviewer. Evaluate the candidate's answer using 6 axes.

Question: "${questionText}"
Question Type: ${type}
Candidate's Answer: "${answerText}"

Return ONLY valid JSON (no markdown, no code blocks):
{
  "technicalAccuracy": <0-100>,
  "communicationClarity": <0-100>,
  "structureOrganization": <0-100>,
  "depthOfExamples": <0-100>,
  "roleRelevance": <0-100>,
  "overallImpression": <0-100>,
  "strengths": ["strength 1", "strength 2"],
  "improvements": [
    {
      "area": "area name",
      "issue": "what was wrong (1 sentence)",
      "suggestion": "how to fix it (1-2 sentences)"
    }
  ],
  "feedback": "2-3 sentence coaching summary"
}`;

  // Try Gemini
  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: evalPrompt,
    });
    const cleaned = (response.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return normalizeEvaluation(parsed);
  } catch (err) {
    console.warn('⚠️ Gemini eval failed:', err.message);
  }

  // Try Groq
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: evalPrompt },
        { role: 'user', content: 'Evaluate this answer now.' },
      ],
      temperature: 0.2,
    });
    const cleaned = (response.choices[0].message.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return normalizeEvaluation(parsed);
  } catch (err) {
    console.warn('⚠️ Groq eval failed:', err.message);
  }

  // Local heuristic evaluation
  return localEvaluate(answerText);
}

function normalizeEvaluation(parsed) {
  const axes = ['technicalAccuracy', 'communicationClarity', 'structureOrganization', 'depthOfExamples', 'roleRelevance', 'overallImpression'];
  const result = {};
  axes.forEach(axis => { result[axis] = Math.min(100, Math.max(0, parsed[axis] || 50)); });
  result.strengths = parsed.strengths || [];
  result.improvements = parsed.improvements || [];
  result.feedback = parsed.feedback || "Good attempt.";
  return result;
}

function localEvaluate(answerText) {
  const wordCount = answerText.trim().split(/\s+/).length;
  const hasKeywords = /experience|project|learn|team|approach|solution|result/i.test(answerText);
  const hasStructure = /first|second|additionally|finally|in conclusion|situation|task|action|result/i.test(answerText);

  const base = wordCount > 100 ? 70 : wordCount > 50 ? 55 : 35;
  const keywordBonus = hasKeywords ? 15 : 0;
  const structureBonus = hasStructure ? 10 : 0;

  return {
    technicalAccuracy: Math.min(95, base + keywordBonus),
    communicationClarity: Math.min(95, base + structureBonus + 5),
    structureOrganization: Math.min(95, hasStructure ? base + 20 : base - 10),
    depthOfExamples: Math.min(95, wordCount > 80 ? base + 10 : base - 15),
    roleRelevance: Math.min(95, base + keywordBonus - 5),
    overallImpression: Math.min(95, base + Math.floor((keywordBonus + structureBonus) / 2)),
    strengths: wordCount > 50
      ? ["Provided a substantive response", "Showed effort in answering"]
      : ["Attempted to answer the question"],
    improvements: [
      {
        area: wordCount < 50 ? "Depth" : "Structure",
        issue: wordCount < 50 ? "Answer is too brief to demonstrate competency." : "Answer could benefit from clearer organization.",
        suggestion: wordCount < 50
          ? "Aim for 100-200 words. Include a specific example from your experience."
          : "Try using the STAR framework: Situation, Task, Action, Result.",
      },
    ],
    feedback: wordCount > 80
      ? "Solid response with good length. Focus on adding more specific examples and structuring with STAR."
      : "Your answer needs more depth. Add concrete examples and aim for at least 100 words.",
  };
}

// ─── CHAT DEBRIEF GENERATOR ─────────────────────────────────────────────────
async function generateChatDebrief(messages, company = 'Genpact') {
  const conversationText = messages.map(m => `${m.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${m.text}`).join('\n');

  const debriefPrompt = `You are a senior interview coach reviewing a mock interview conversation at ${company}.

Conversation:
${conversationText}

Analyze the candidate's performance and return ONLY valid JSON (no markdown):
{
  "overallScore": <1-10>,
  "communicationClarity": <1-10>,
  "technicalDepth": <1-10>,
  "confidence": <1-10>,
  "strongMoments": ["specific moment 1", "specific moment 2"],
  "weakMoments": ["specific weakness 1", "specific weakness 2"],
  "hireSignal": "lean_hire" | "lean_no_hire" | "strong_hire" | "strong_no_hire",
  "hireExplanation": "1-2 sentence explanation of hire signal",
  "recommendedPractice": ["practice recommendation 1", "practice recommendation 2"]
}`;

  // Try Gemini
  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: debriefPrompt,
    });
    const cleaned = (response.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('⚠️ Gemini debrief failed:', err.message);
  }

  // Try Groq
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: debriefPrompt },
        { role: 'user', content: 'Generate the debrief now.' },
      ],
      temperature: 0.3,
    });
    const cleaned = (response.choices[0].message.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('⚠️ Groq debrief failed:', err.message);
  }

  // Local fallback
  const msgCount = messages.filter(m => m.role === 'user').length;
  return {
    overallScore: Math.min(7, 3 + msgCount),
    communicationClarity: 6,
    technicalDepth: 5,
    confidence: 6,
    strongMoments: ["Engaged in the full conversation", "Responded to all questions"],
    weakMoments: ["Could not assess depth without AI analysis"],
    hireSignal: "lean_hire",
    hireExplanation: "Candidate participated fully. Detailed analysis unavailable offline.",
    recommendedPractice: ["Practice behavioral questions using STAR", "Work on adding specific metrics to answers"],
  };
}

module.exports = { generateAnswer, evaluateAnswer, generateChatDebrief };
