// backend/sandbox.js
async function executeCode(code, language) {
  // Gracefully fallback to the free public Piston Code Execution network 
  // if no private URL is configured.
  const url = process.env.SANDBOX_API_URL || "https://emkc.org/api/v2/piston/execute";
  const apiKey = process.env.SANDBOX_API_KEY;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}`, 'x-api-key': apiKey })
      },
      // Piston Sandbox API required payload format
      body: JSON.stringify({
        language: language.toLowerCase(),
        version: "*",
        files: [{ content: code }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        stdout: '',
        stderr: `Execution Provider Error: ${response.status}\n${errorText}`
      };
    }

    const data = await response.json();
    
    // Abstracting Piston V2 Response Shape
    if (data.run) {
      return {
        success: data.run.code === 0,
        stdout: data.run.stdout || '',
        stderr: data.run.stderr || '',
        time: '< 1'
      };
    }
    
    // Legacy mapping just in case
    const stdout = typeof data.stdout === 'string' ? data.stdout : 
                  (typeof data.output === 'string' ? data.output : '');
                  
    const stderr = typeof data.stderr === 'string' ? data.stderr : 
                  (typeof data.error === 'string' ? data.error : '');

    return {
      success: true,
      stdout,
      stderr,
      time: data.time || data.executionTime || 'N/A'
    };
  } catch (error) {
    return {
      success: false,
      stdout: '',
      stderr: `Network/Sandbox Error: ${error.message}`
    };
  }
}

module.exports = { executeCode };
