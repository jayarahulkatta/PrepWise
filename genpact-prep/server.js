const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Initialize Gemini SDK
// Note: Requires GEMINI_API_KEY to be set in .env
const ai = new GoogleGenAI({});

// ─── DATA ───────────────────────────────────────────────────────────────────
const QUESTIONS = [
  { id:1, job:"Java Developer", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"How do you tackle out of memory errors after reaching the maximum available heap size in Java?", date:"Apr 2017" },
  { id:2, job:"Java Developer", type:"Background", diff:"Easy", exp:"Fresher", text:"Are you experienced in Java, J2EE, Spring, SOAP, and REST as mentioned on your resume?", date:"Jul 2018" },
  { id:3, job:"Process Associate", type:"HR", diff:"Easy", exp:"Fresher", text:"Tell me about yourself and why you want to join Genpact.", date:"Mar 2023" },
  { id:4, job:"Data Analyst", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"What is the difference between DDL and DML in SQL? Give examples of commands for each.", date:"Jan 2024" },
  { id:5, job:"Business Analyst", type:"Behavioral", diff:"Easy", exp:"Fresher", text:"Describe a challenging situation you have faced at work and how you handled it.", date:"Feb 2024" },
  { id:6, job:"QA Engineer", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"How is functional testing different from regression testing? Explain with examples.", date:"Nov 2023" },
  { id:7, job:"Python Developer", type:"Technical", diff:"Hard", exp:"3-5 Years", text:"What are the advantages of multithreading in Python? How do you handle the Global Interpreter Lock (GIL)?", date:"Dec 2023" },
  { id:8, job:"Senior Software Engineer", type:"Technical", diff:"Hard", exp:"Senior", text:"Explain the concept of surrogate keys in DBMS. When would you use them over natural keys?", date:"Jun 2022" },
  { id:9, job:"Process Associate", type:"HR", diff:"Easy", exp:"Fresher", text:"Where do you see yourself in the next 5 years if you join Genpact?", date:"Sep 2023" },
  { id:10, job:"Data Analyst", type:"Technical", diff:"Easy", exp:"Fresher", text:"How do you use SQL INNER JOIN to return records common to multiple tables?", date:"Aug 2023" },
  { id:11, job:"Java Developer", type:"Technical", diff:"Hard", exp:"3-5 Years", text:"What are Real-Time Operating Systems (RTOS)? What are the different types and their key characteristics?", date:"May 2021" },
  { id:12, job:"Business Analyst", type:"Behavioral", diff:"Medium", exp:"1-3 Years", text:"Have you ever disagreed with a supervisor or manager? How did you handle the situation professionally?", date:"Oct 2023" },
  { id:13, job:"Senior Software Engineer", type:"Technical", diff:"Medium", exp:"3-5 Years", text:"What is ad-hoc testing? Explain the different types: monkey testing, buddy testing, and pair testing.", date:"Jul 2023" },
  { id:14, job:"HR Manager", type:"HR", diff:"Easy", exp:"Fresher", text:"What do you know about Genpact as a company? Why do you want to work here specifically?", date:"Feb 2023" },
  { id:15, job:"Python Developer", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"Explain the various levels of data abstraction in a DBMS: physical, logical, and view level.", date:"Mar 2024" },
  { id:16, job:"QA Engineer", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"What is index hunting in databases? How does it help improve query performance significantly?", date:"Jan 2023" },
  { id:17, job:"Process Associate", type:"Behavioral", diff:"Easy", exp:"Fresher", text:"How do you handle working under pressure and tight deadlines in a fast-paced environment?", date:"Nov 2022" },
  { id:18, job:"Data Analyst", type:"Technical", diff:"Hard", exp:"3-5 Years", text:"What are the pros and cons of user-level threads vs kernel-level threads in operating systems?", date:"Apr 2023" },
  { id:19, job:"Java Developer", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"What is the difference between processes and threads? When would you prefer threads over processes?", date:"Aug 2022" },
  { id:20, job:"Business Analyst", type:"HR", diff:"Easy", exp:"Fresher", text:"How do you measure the success of both an organization and an individual? What parameters do you use?", date:"Dec 2022" },
  { id:21, job:"Senior Software Engineer", type:"Technical", diff:"Hard", exp:"Senior", text:"Explain microservices architecture. What are its advantages and challenges compared to monolithic?", date:"Feb 2024" },
  { id:22, job:"Python Developer", type:"Technical", diff:"Hard", exp:"3-5 Years", text:"How would you optimize a slow-running Python script that processes large datasets of millions of rows?", date:"Mar 2024" },
  { id:23, job:"QA Engineer", type:"Behavioral", diff:"Medium", exp:"1-3 Years", text:"Describe a time you found a critical bug just before a major release. What was your approach?", date:"Jan 2024" },
  { id:24, job:"Data Analyst", type:"Technical", diff:"Easy", exp:"Fresher", text:"What is the difference between GROUP BY and HAVING clauses in SQL? Give practical examples.", date:"Nov 2023" },
  { id:25, job:"HR Manager", type:"Behavioral", diff:"Medium", exp:"1-3 Years", text:"How do you handle a situation where two team members have a serious professional conflict at work?", date:"Oct 2023" },
  { id:26, job:"Java Developer", type:"Technical", diff:"Hard", exp:"Senior", text:"Explain Spring Boot auto-configuration. How does it work internally under the hood?", date:"Sep 2023" },
  { id:27, job:"Process Associate", type:"HR", diff:"Easy", exp:"Fresher", text:"What are your greatest strengths and weaknesses? How are you actively working to improve your weaknesses?", date:"Aug 2023" },
  { id:28, job:"Business Analyst", type:"Technical", diff:"Medium", exp:"3-5 Years", text:"How would you evaluate a manufacturing process for cost reduction and efficiency improvement?", date:"Jul 2023" },
  { id:29, job:"Senior Software Engineer", type:"Technical", diff:"Hard", exp:"Senior", text:"What design patterns have you used in your projects? Explain Singleton and Factory patterns.", date:"Jun 2023" },
  { id:30, job:"Python Developer", type:"Behavioral", diff:"Medium", exp:"3-5 Years", text:"Tell me about a project where you applied machine learning or data science to solve a real business problem.", date:"May 2023" },
];

// ─── ROUTES ─────────────────────────────────────────────────────────────────

// Get all questions
app.get('/api/questions', (req, res) => {
  res.json(QUESTIONS);
});

// Generate ideal answer via Gemini
app.post('/api/generate', async (req, res) => {
  const { messages, prompt } = req.body;
  
  if (!messages && !prompt) {
    return res.status(400).json({ error: 'Messages or prompt is required' });
  }

  try {
    let contents = prompt;
    if (messages) {
      contents = messages.filter(m => m.content).map(m => ({
        role: (m.role === 'ai' || m.role === 'assistant') ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        temperature: 0.7,
      }
    });

    res.json({ content: response.text });
  } catch (error) {
    console.error('Gemini Generate Error:', error);
    res.status(500).json({ error: 'Failed to generate answer from AI' });
  }
});

// Evaluate candidate answer via Gemini
app.post('/api/evaluate', async (req, res) => {
  const { messages, prompt } = req.body;

  if (!messages && !prompt) {
    return res.status(400).json({ error: 'Messages or prompt is required' });
  }

  try {
    let contents = prompt;
    if (messages) {
      contents = messages.filter(m => m.content).map(m => ({
        role: (m.role === 'ai' || m.role === 'assistant') ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      }
    });

    res.json({ content: response.text });
  } catch (error) {
    console.error('Gemini Evaluate Error:', error);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Backend server successfully running on http://localhost:${port}`);
});
