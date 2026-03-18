async function run() {
  const evaluatePrompt = `You are an experienced Genpact interviewer. Evaluate this answer.
Question: "Explain Spring Boot auto-configuration. How does it work internally under the hood?"
Role: Java Developer
Answer: "spring boot auto is spring"

Respond ONLY with valid JSON, no markdown:
{"completeness":75,"clarity":80,"relevance":70,"feedback":"2-3 sentence conversational feedback..."}`;

  console.log("TESTING EVALUATE ENDPOINT...");
  const res1 = await fetch('http://localhost:5000/api/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: evaluatePrompt }] })
  });
  const data1 = await res1.json();
  console.log('Evaluate JSON Output:', data1.content);

  const generatePrompt = `You're a job candidate being interviewed at Genpact. Answer this interview question in first person, naturally, as if you're actually speaking in the interview room right now.

Question: "What is the difference between DDL and DML in SQL?"
Role applying for: Data Analyst

Write exactly as someone would SPEAK — conversational, not a textbook.
Keep it 150–220 words.
Write the answer directly. No preamble.`;

  console.log("\nTESTING GENERATE ENDPOINT...");
  const res2 = await fetch('http://localhost:5000/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: generatePrompt }] })
  });
  const data2 = await res2.json();
  console.log('Generate text length:', data2?.content?.length);
  console.log('Generate content:', data2?.content);
}
run().catch(console.error);
