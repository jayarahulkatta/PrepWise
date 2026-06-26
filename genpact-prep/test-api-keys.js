require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai');

async function testKeys() {
  console.log('Testing API Keys...');
  
  // Test Gemini
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log('❌ GEMINI_API_KEY is missing');
    } else {
      const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await gemini.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: 'Say hello in one word',
      });
      if (response.text) {
        console.log('✅ Gemini API Key is valid and working!');
      } else {
        console.log('❌ Gemini API returned unexpected result');
      }
    }
  } catch (err) {
    console.log('❌ Gemini API Key Error:', err.message);
  }

  // Test Groq
  try {
    if (!process.env.GROQ_API_KEY) {
      console.log('❌ GROQ_API_KEY is missing');
    } else {
      const groq = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Say hello in one word' }],
      });
      if (response.choices && response.choices.length > 0) {
        console.log('✅ Groq API Key is valid and working!');
      } else {
        console.log('❌ Groq API returned unexpected result');
      }
    }
  } catch (err) {
    console.log('❌ Groq API Key Error:', err.message);
  }
}

testKeys();
