// backend/sandbox.js
const { gemini, groq } = require('./localAI');

async function executeCode(code, language) {
  // Since the public Piston Sandbox is dead, and we cannot guarantee 
  // Vercel serverless has a valid JDK/Python binary, we simulate the 
  // execution output transparently using our fast fallback AI.
  const prompt = `You are a strict compiler and execution engine for ${language}.
Analyze the following code. Determine if there are syntax errors, runtime errors, or if it runs successfully.
If it requests user input or loops infinitely, gracefully simulate a timeout or crash.

Code:
${code}

Return STRICTLY a JSON object with no markdown formatting:
{
  "code": 0 if success, 1 if error,
  "stdout": "The exact string output to console (if any)",
  "stderr": "The exact compiler or runtime error message (if any)",
  "time": "simulated execution time in ms, e.g., '12' or '45'"
}`;

  try {
    let resultJson = "";
    try {
      const gRes = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.1,
      });
      resultJson = gRes.choices[0].message.content;
    } catch (e) {
      const gRes = await gemini.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        generationConfig: { responseMimeType: 'application/json' }
      });
      resultJson = gRes.text;
    }

    const data = JSON.parse(resultJson.replace(/```json/g, '').replace(/```/g, '').trim());

    return {
      success: data.code === 0,
      stdout: data.stdout || '',
      stderr: data.stderr || '',
      time: data.time || '< 1'
    };
  } catch (err) {
    console.error("Simulation error", err);
    return {
      success: false,
      stdout: '',
      stderr: `Execution Provider Error: Simulated sandbox failed to parse.\n${err.message}`
    };
  }
}

module.exports = { executeCode };
