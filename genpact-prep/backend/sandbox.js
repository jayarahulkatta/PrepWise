// backend/sandbox.js
const { gemini, groq } = require('./localAI');

async function executeCode(code, language) {
  // AI-simulated execution engine optimized for DSA interview prep.
  // Key difference from a generic sandbox: if the code uses input()/Scanner,
  // we auto-provide reasonable sample inputs instead of failing.
  const prompt = `You are a precise code execution simulator for ${language}, used in a DSA interview preparation platform.

Analyze the following code carefully and simulate its execution.

CRITICAL RULES:
1. If the code uses input(), Scanner, stdin, or any user-input mechanism, DO NOT report an error.
   Instead, provide reasonable sample test inputs that match the algorithm's expected format (e.g., array sizes, array elements, target values) and simulate execution WITH those inputs.
2. For DSA problems, use small but meaningful sample inputs (e.g., arrays of 5-8 elements).
3. If the code has actual syntax errors or logic bugs, report those accurately.
4. If the code would loop infinitely, report a timeout.
5. Show the exact console output the code would produce with your sample inputs.

Code:
${code}

Return STRICTLY a JSON object with no markdown formatting:
{
  "code": 0 if the algorithm runs successfully (even with simulated inputs), 1 if there are real syntax/runtime errors,
  "stdout": "The exact output the program prints with simulated sample input. Include a note like '[Simulated with input: ...]' at the start if you provided inputs.",
  "stderr": "Only real compiler or runtime error messages. Empty string if the code is correct.",
  "time": "simulated execution time in ms, e.g., '12' or '45'"
}`;

  try {
    let resultJson = "";
    try {
      const gRes = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
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
