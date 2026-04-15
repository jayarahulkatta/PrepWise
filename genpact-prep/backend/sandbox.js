// backend/sandbox.js
async function executeCode(code, language) {
  const url = process.env.SANDBOX_API_URL;
  const apiKey = process.env.SANDBOX_API_KEY;

  if (!url || !apiKey) {
    return {
      success: false,
      stdout: '',
      stderr: `Execution Provider Error: Sandbox configuration missing.\nPlease add SANDBOX_API_URL and SANDBOX_API_KEY to your .env file.`
    };
  }

  try {
    // A standard generic sandbox execution payload
    // Easily configurable if the actual sandbox format deviates
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-api-key': apiKey // Sent in both headers as fallback coverage
      },
      body: JSON.stringify({
        language,
        code
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
    
    // Abstracting various standard response formats (generic mapping)
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
