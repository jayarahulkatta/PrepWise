require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI(); // uses process.env.GEMINI_API_KEY naturally

async function test() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Tell me a long story.',
    config: {
      temperature: 0.7,
    }
  });
  console.log(JSON.stringify(response, null, 2));
}
test();
