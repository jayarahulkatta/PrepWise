const https = require('https');

// ─── 1. QUESTION INTENT CLASSIFIER ──────────────────────────────────────────
function classifyQuestion(text) {
  const lower = text.toLowerCase();
  if (lower.match(/\b(how to|how do|how can|steps to|implement)\b/)) return 'INSTRUCTIONAL';
  if (lower.match(/\b(vs|versus|difference|compare|better)\b/)) return 'COMPARISON';
  if (lower.match(/\b(tell me about a time|describe a situation|give an example|have you ever)\b/)) return 'BEHAVIORAL_STAR';
  if (lower.match(/\b(what is|explain|define|concept of)\b/)) return 'CONCEPTUAL';
  if (lower.match(/\b(why|reason|cause)\b/)) return 'EXPLANATORY';
  return 'GENERAL';
}

// ─── 2. INTELLIGENT KEYWORD EXTRACTOR ───────────────────────────────────────
function extractSearchQuery(questionText) {
  const techTerms = [
    'spring boot', 'auto-configuration', 'react hooks', 'react native', 'virtual dom',
    'node.js', 'express.js', 'machine learning', 'deep learning', 'neural network',
    'object oriented', 'design pattern', 'dependency injection', 'inversion of control',
    'binary search', 'linked list', 'hash map', 'time complexity', 'space complexity',
    'rest api', 'graphql api', 'sql injection', 'docker container', 'kubernetes',
    'ci cd', 'microservice', 'garbage collection', 'deadlock', 'oauth', 'jwt token',
    'nosql', 'mongodb', 'aws lambda', 'solid principles', 'polymorphism'
  ];

  let query = questionText.toLowerCase();

  const foundTerms = techTerms.filter(term => query.includes(term));
  if (foundTerms.length > 0) return foundTerms.join(' ') + ' programming';

  const stopWords = ['what', 'is', 'are', 'the', 'pros', 'cons', 'of', 'in', 'vs',
    'and', 'or', 'how', 'to', 'do', 'does', 'explain', 'describe', 'difference',
    'between', 'can', 'you', 'it', 'for', 'with', 'on', 'at', 'from', 'by', 'an',
    'a', 'tell', 'me', 'about', 'work', 'internally', 'under', 'hood', 'why'];

  const words = query.replace(/[?.,!;:'"()[\]{}]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.includes(w));

  return words.slice(0, 5).join(' ');
}

// ─── 3. MULTI-SOURCE FETCHERS ───────────────────────────────────────────────

function fetchDDGInstantAnswer(queryText) {
  return new Promise((resolve) => {
    const searchQuery = extractSearchQuery(queryText);
    if (!searchQuery) return resolve(null);
    const url = "https://api.duckduckgo.com/?q=" + encodeURIComponent(searchQuery) + "&format=json&no_html=1&skip_disambig=1";
    https.get(url, { headers: { 'User-Agent': 'PrepWise/3.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          let bestSnippet = parsed.AbstractText || parsed.Answer || parsed.Definition;
          if (!bestSnippet && parsed.RelatedTopics && parsed.RelatedTopics.length > 0) {
            bestSnippet = parsed.RelatedTopics.find(t => t.Text && t.Text.length > 50)?.Text;
          }
          resolve(bestSnippet && bestSnippet.length > 30 ? bestSnippet : null);
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
    setTimeout(() => resolve(null), 3000);
  });
}

function fetchWikipediaSummary(queryText) {
  return new Promise((resolve) => {
    const searchQuery = extractSearchQuery(queryText);
    if (!searchQuery) return resolve(null);
    const searchUrl = "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(searchQuery) + "&utf8=&format=json&srlimit=1";
    https.get(searchUrl, { headers: { 'User-Agent': 'PrepWise/3.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.query && parsed.query.search && parsed.query.search.length > 0) {
            const pageId = parsed.query.search[0].pageid;
            const summaryUrl = "https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro&explaintext&redirects=1&pageids=" + pageId;
            https.get(summaryUrl, { headers: { 'User-Agent': 'PrepWise/3.0' } }, (sumRes) => {
              let sumData = '';
              sumRes.on('data', chunk => sumData += chunk);
              sumRes.on('end', () => {
                try {
                  const extract = JSON.parse(sumData).query.pages[pageId].extract;
                  if (extract && extract.length > 50) {
                    const shortSummary = extract.split(/(?<=[.!?])\s+/).slice(0, 3).join(' ');
                    resolve(shortSummary);
                  } else { resolve(null); }
                } catch { resolve(null); }
              });
            }).on('error', () => resolve(null));
          } else { resolve(null); }
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
    setTimeout(() => resolve(null), 4000);
  });
}

// ─── 4. MULTI-SNIPPET AGGREGATION & SYNTHESIS ────────────────────────────────

async function generateAggregatedResponse(questionText, intent, role) {
  const [ddgFact, wikiFact] = await Promise.all([
    fetchDDGInstantAnswer(questionText),
    fetchWikipediaSummary(questionText)
  ]);

  const facts = [];
  if (ddgFact && !facts.includes(ddgFact)) facts.push(ddgFact);
  if (wikiFact && !facts.some(f => f.slice(0, 20) === wikiFact.slice(0, 20))) {
    facts.push(wikiFact);
  }

  if (facts.length === 0) return null;

  let answer = "";
  
  if (intent === 'CONCEPTUAL' || intent === 'EXPLANATORY') {
    answer = "That's a vital concept, especially for someone in a " + (role || 'technical') + " position. Let me break it down clearly.\n\nFirst, to define it exactly: " + facts[0];
    if (facts.length > 1) {
      answer += "\n\nTo expand on that further, standard documentation also highlights that " + facts[1];
    }
    answer += "\n\nIn my practical experience, mastering this conceptual foundation ensures that I don't just write functional code, but code that is robust, scalable, and maintainable.";
  
  } else if (intent === 'COMPARISON') {
    answer = "This is a classic architectural debate, and knowing the distinction is crucial. Let me compare them based on industry standards.\n\nThe core definition to understand here is: " + facts[0] + "\n\nWhen choosing between approaches, I always look at the trade-offs on a project-by-project basis (e.g., performance vs. development speed). There isn't always one absolute 'winner', but picking the right tool for the job is what makes a great developer.";
  
  } else if (intent === 'INSTRUCTIONAL') {
    answer = "I'm very comfortable implementing this. The standard approach involves a few key steps.\n\nAt a high level: " + facts[0] + "\n\nWhen I do this in my own workflow, I prioritize writing clean, testable code, ensuring any edge cases or fatal errors are properly handled so the application doesn't crash in production.";
  
  } else {
    answer = "I have a solid grasp on this.\n\nBased on standard principles: " + facts[0] + "\n\nMy goal is always to apply these kinds of facts to build software that creates real value for the users.";
  }

  return answer;
}

// ─── 5. STAR METHOD BEHAVIORAL AUTO-FORMATTER ──────────────────────────────
function getStarBehavioralAnswer(questionText) {
  const stories = [
    {
      s: "During my final semester project, our team faced a major setback when the core API we relied on changed its pricing model, cutting off our access two weeks before launch.",
      t: "I realized we couldn't afford to halt development. My goal was to migrate us to an open-source alternative without breaking the UI components we had already built.",
      a: "I took the initiative to research three alternatives over the weekend. I wrote an abstraction layer (an adapter) so that the new API data perfectly matched the old structure. I then paired with my teammate to rapidly test the new integration.",
      r: "As a result, we not only shipped the project on time, but the new open-source API actually reduced our latency by 20%. My professor praised us for our resilience and clean architecture under pressure."
    },
    {
      s: "In an internship, I was tasked with analyzing a database that was notoriously slow, causing internal dashboards to occasionally freeze for up to 30 seconds.",
      t: "The objective was clear: identify the bottleneck and bring the dashboard load time under 3 seconds without rewriting the entire frontend.",
      a: "Instead of guessing, I used SQL profiling tools and found that three queries were running inside a loop (the N+1 problem). I refactored the backend code to use batch queries and added a thin Redis caching layer for the static reports.",
      r: "The load time dropped from 30 seconds down to 1.5 seconds. My manager was incredibly impressed by my methodical approach to profiling before coding, and it taught me the importance of performance-first thinking."
    }
  ];

  const hash = questionText.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const story = stories[hash % stories.length];

  return "I can certainly tell you about a time that fits perfectly.\n\n**Situation:** " + story.s + "\n\n**Task:** " + story.t + "\n\n**Action:** " + story.a + "\n\n**Result:** " + story.r + "\n\nThis experience fundamentally shaped my approach to overcoming challenges, and I carry those lessons with me into every new project.";
}

// ─── 6. NON-TECHNICAL / HR FALLBACKS ───────────────────────────────────────
const HR_TEMPLATES = [
  "I really appreciate that question! For me, motivation comes from the intersection of solving complex problems and collaborating with a great team. When I look at Genpact's reputation for driving digital transformation, I see an environment where I can both learn rapidly and contribute meaningfully. I'm highly organized, adaptable, and I don't shy away from ambiguity.",
  
  "That's a great question. If I were to summarize my work ethic, it boils down to ownership and adaptability. Whether I'm learning a new framework on the weekend or debugging a frustrating issue with a teammate, I take pride in seeing things through to completion. I'm excited about the possibility of bringing this mindset to the innovative culture here at Genpact.",
  
  "I'm glad you asked. I chose this field because technology is the ultimate tool for impact. Beyond my technical skills, my greatest strength is my communication. I love breaking down complex technical concepts so that everyone—from developers to business stakeholders—can be on the same page. I'm looking for a company like Genpact where that kind of collaborative effort is valued."
];

function findPatternMatch(text) {
  const patterns = {
    'SQL|database|DBMS|query': "When it comes to databases, I have strong practical experience. During my projects, I worked extensively with SQL databases — designing normalized schemas, writing complex queries with JOINs, subqueries, and aggregate functions, and optimizing performance.\n\nI understand ACID properties and the trade-offs between normalizing data for consistency vs denormalizing for read speed. I'm also familiar with NoSQL (like MongoDB) for flexible schema designs.",
    'OOP|object.oriented|class|inheritance|polymorphism': "Object-oriented programming is one of my core strengths. The four pillars — Encapsulation, Abstraction, Inheritance, and Polymorphism — are principles I apply daily.\n\nI favor composition over inheritance for flexibility, use interfaces to decouple code, and apply design patterns like Singleton and Factory to keep codebases testable and modular.",
    'React|frontend|component|state|hook': "Frontend development with React is one of my strongest areas. I leverage functional components and hooks (useState, useEffect, useMemo) exclusively to build modular UIs.\n\nI prioritize performance by preventing unnecessary re-renders, and I deeply care about responsive design and accessibility for the end user."
  };
  for (const [pattern, answer] of Object.entries(patterns)) {
    if (new RegExp(pattern, 'i').test(text)) return answer;
  }
  return null;
}

function applyTone(answer, tone) {
  if (tone === 'concise') {
    const sentences = answer.split(/(?<=[.!?])\s+/);
    return sentences.slice(0, Math.min(5, sentences.length)).join(' ');
  }
  if (tone === 'humble') {
    return answer.replace(/I excel/g, "I strive to do well").replace(/I'm confident/g, "I hope") + "\n\nI know I have a lot to learn, but I am extremely eager to grow and adapt to your team's best practices.";
  }
  return answer;
}

// ─── MAIN GENERATOR ────────────────────────────────────────────────────────
async function generateAnswer(questionText, type = 'Technical', tone = 'confident', role = '', company = 'Genpact') {
  let answer = null;
  const intent = classifyQuestion(questionText);

  if (intent === 'BEHAVIORAL_STAR') {
    answer = getStarBehavioralAnswer(questionText);
  }
  
  if (!answer && type === 'HR') {
    const hash = questionText.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    answer = HR_TEMPLATES[hash % HR_TEMPLATES.length];
  }

  if (!answer && type === 'Technical') {
    try {
      answer = await generateAggregatedResponse(questionText, intent, role);
    } catch (err) {
      console.error('Web Search Pipeline failed, using fallbacks.');
    }
  }

  if (!answer) {
    answer = findPatternMatch(questionText);
  }
  if (!answer) {
    answer = "That is an insightful question. \n\nIn my experience tackling complex challenges, I rely heavily on checking official community documentation and testing hypotheses practically. I am highly adaptable, so whenever I encounter something outside my immediate expertise, I can quickly ramp up and implement efficient solutions. I'm excited to bring this problem-solving mindset to the team at Genpact.";
  }

  answer = answer.replace(/Genpact/g, company || 'Genpact');
  return applyTone(answer, tone);
}

// ─── MOCK INTERVIEW EVALUATOR ───────────────────────────────────────────────
function evaluateAnswer(questionText, answerText, type = 'Technical') {
  if (!answerText || answerText.trim().length === 0) return { completeness: 10, clarity: 10, relevance: 10, feedback: "No answer was provided." };

  const wordCount = answerText.trim().split(/\s+/).length;
  const hasKeywords = /experience|project|learn|team|approach|solution|result/i.test(answerText);
  let completeness = wordCount > 50 ? 70 : 40;
  if (hasKeywords) completeness += 15;
  
  return {
    completeness: Math.min(95, completeness),
    clarity: Math.min(95, wordCount > 30 ? 80 : 50),
    relevance: Math.min(95, hasKeywords ? 85 : 55),
    feedback: wordCount > 50 ? "Solid response. Consider formatting with the STAR method for more structure." : "Your answer could be longer. Add concrete examples!"
  };
}

module.exports = { generateAnswer, evaluateAnswer };
