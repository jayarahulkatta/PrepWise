const { OpenAI } = require('openai');
const https = require('https');

process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''; // Ensure it exists
let openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const N8N_WEBHOOK_URL = 'https://saatvik00.app.n8n.cloud/webhook/n8n-key-rotate';

// ─── N8N API KEY ROTATION LOGIC ─────────────────────────────────────────────
function rotateApiKey() {
  return new Promise((resolve) => {
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const req = https.request(N8N_WEBHOOK_URL, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Accept various common response formats from n8n
          const newKey = parsed.key || parsed.newKey || parsed.apiKey || parsed.OPENAI_API_KEY;
          
          if (newKey) {
            process.env.OPENAI_API_KEY = newKey;
            openai = new OpenAI({ apiKey: newKey });
            console.log('🔄 OpenAI API Key rotated successfully via n8n!');
            resolve(true);
          } else {
            console.error('⚠️ n8n webhook succeeded, but no key was found in response payload:', parsed);
            resolve(false);
          }
        } catch (err) {
          console.error('⚠️ Error parsing n8n response (expected JSON):', err.message);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.error('⚠️ Webhook error while attempting key rotation:', e);
      resolve(false);
    });

    // Send payload explaining why rotation is requested
    req.write(JSON.stringify({ 
      event: 'key_exhausted',
      timestamp: new Date().toISOString()
    }));
    req.end();
  });
}

// Wrapper to auto-rotate key & retry if quotas are exceeded
async function executeWithRotation(actionFn) {
  try {
    return await actionFn();
  } catch (error) {
    // 401: Invalid Auth, 429: Rate Limit / Quota Exceeded
    if (error.status === 401 || error.status === 429) {
      console.warn(`⚠️ OpenAI Error ${error.status}: Key may be exhausted. Triggering n8n rotation...`);
      const rotated = await rotateApiKey();
      if (rotated) {
        console.log('🔁 Retrying OpenAI request with new key...');
        return await actionFn(); // Retry exactly once with the new key
      }
    }
    throw error; // If rotation fails or it's a different error, throw normally
  }
}

// ─── 1. EXTRACT QUESTION METADATA ──────────────────────────────────────────
function extractQuestionText(text) {
  const match = text.match(/Question:\s*"(.*?)"/);
  return match && match[1] ? match[1] : text;
}

// ─── MAIN GENERATOR ────────────────────────────────────────────────────────
async function generateAnswer(questionText, type = 'Technical', tone = 'confident', role = '', company = 'Genpact') {
  const extractedQuestion = extractQuestionText(questionText);

  const systemPrompt = `You are an expert interviewer and senior engineer at ${company}.
Your task is to provide an ideal, highly compelling answer to the following interview question for a ${role} candidate.
Provide a clear, detailed, and technically accurate answer. 
The question type is: ${type}.
Tone required: ${tone}.
If it is a behavioral question, structure your answer using the STAR (Situation, Task, Action, Result) method.`;

  try {
    // Wrap API call inside rotate-and-retry logic
    return await executeWithRotation(async () => {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: extractedQuestion },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });
      return response.choices[0].message.content;
    });
  } catch (error) {
    console.error('OpenAI Generate Error:', error);
    return `AI Service Error: ${error.message || 'Unknown error occurred. Please check Vercel logs.'}`;
  }
}

// ─── MOCK INTERVIEW EVALUATOR ───────────────────────────────────────────────
async function evaluateAnswer(questionText, answerText, type = 'Technical') {
  if (!answerText || answerText.trim().length === 0) {
    return { completeness: 10, clarity: 10, relevance: 10, feedback: "No answer was provided." };
  }

  const systemPrompt = `You are a strict but fair technical interviewer. 
Evaluate the candidate's answer to the following question.
Question: "${questionText}"
Question Type: ${type}

You must return a strictly formatted JSON object with no markdown block ticks.
The keys must be exactly:
{
  "completeness": <number 0-100 indicating how fully the question was answered>,
  "clarity": <number 0-100 indicating how clear and articulate the answer was>,
  "relevance": <number 0-100 indicating how on-topic the answer was>,
  "feedback": "<string 1-3 sentences giving constructive actionable feedback>"
}`;

  try {
    const rawResponse = await executeWithRotation(async () => {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Candidate's Answer: "${answerText}"` },
        ],
        temperature: 0.2,
      });
      return response.choices[0].message.content;
    });

    try {
      const content = rawResponse.replace(/```json/g, '').replace(/```/g, '');
      const parsed = JSON.parse(content);
      return {
        completeness: parsed.completeness || 50,
        clarity: parsed.clarity || 50,
        relevance: parsed.relevance || 50,
        feedback: parsed.feedback || "Good attempt.",
      };
    } catch (parseError) {
      console.error('Failed to parse JSON evaluation:', parseError);
      return { completeness: 50, clarity: 50, relevance: 50, feedback: "We encountered an issue parsing the detailed evaluation score." };
    }
  } catch (error) {
    console.error('OpenAI Evaluate Error:', error);
    return { completeness: 0, clarity: 0, relevance: 0, feedback: "AI evaluation service is temporarily unavailable." };
  }
}

module.exports = { generateAnswer, evaluateAnswer };

