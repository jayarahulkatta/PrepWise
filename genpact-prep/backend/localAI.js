const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── 1. EXTRACT QUESTION METADATA ──────────────────────────────────────────
function extractQuestionText(text) {
  const match = text.match(/Question:\s*"(.*?)"/);
  return match && match[1] ? match[1] : text;
}

// ─── MAIN GENERATOR ────────────────────────────────────────────────────────
async function generateAnswer(questionText, type = 'Technical', tone = 'confident', role = '', company = 'Genpact') {
  const extractedQuestion = extractQuestionText(questionText);

  const systemPrompt = `You are an expert interviewer and senior engineer at ${company}.
Your task is to provide an ideal, highly compelling answer to the following interview question for a ${role || 'technical'} candidate.
Provide a clear, detailed, and technically accurate answer.
The question type is: ${type}.
Tone required: ${tone}.
If it is a behavioral question, structure your answer using the STAR (Situation, Task, Action, Result) method.
Do NOT use markdown formatting like ** or ## in the answer. Use plain text only.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `${systemPrompt}\n\nQuestion: ${extractedQuestion}`,
    });

    return response.text || "The AI returned an empty response. Please try again.";
  } catch (error) {
    console.error('Gemini Generate Error:', error);
    return `AI Service Error: ${error.message || 'Unknown error. Please check your Gemini API key.'}`;
  }
}

// ─── MOCK INTERVIEW EVALUATOR ───────────────────────────────────────────────
async function evaluateAnswer(questionText, answerText, type = 'Technical') {
  if (!answerText || answerText.trim().length === 0) {
    return { completeness: 10, clarity: 10, relevance: 10, feedback: "No answer was provided." };
  }

  const prompt = `You are a strict but fair technical interviewer.
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const rawText = response.text || '';

    try {
      // Clean up any accidental markdown blocks
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        completeness: parsed.completeness || 50,
        clarity: parsed.clarity || 50,
        relevance: parsed.relevance || 50,
        feedback: parsed.feedback || "Good attempt.",
      };
    } catch (parseError) {
      console.error('Failed to parse Gemini JSON evaluation:', parseError);
      return { completeness: 50, clarity: 50, relevance: 50, feedback: "We encountered an issue parsing the evaluation." };
    }
  } catch (error) {
    console.error('Gemini Evaluate Error:', error);
    return { completeness: 0, clarity: 0, relevance: 0, feedback: "AI evaluation service is temporarily unavailable." };
  }
}

module.exports = { generateAnswer, evaluateAnswer };
