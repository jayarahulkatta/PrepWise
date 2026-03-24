// ─── ADVANCED LOCAL AI ANSWER GENERATOR v2.0 ────────────────────────────────
// Generates interview answers locally without any API key.
// Uses multi-source web search (DuckDuckGo Instant Answer API + Wikipedia API),
// smart keyword extraction, pattern matching, and natural answer synthesis.
const https = require('https');
const http = require('http');

// ─── INTELLIGENT KEYWORD EXTRACTOR ──────────────────────────────────────────
// Preserves multi-word tech terms like "Spring Boot", "React hooks", etc.
function extractSearchQuery(questionText) {
  // First, try to preserve important multi-word technical terms
  const techTerms = [
    'spring boot', 'auto-configuration', 'auto configuration', 'spring framework',
    'react hooks', 'react native', 'react router', 'virtual dom',
    'node.js', 'express.js', 'next.js', 'vue.js', 'angular.js',
    'machine learning', 'deep learning', 'neural network', 'natural language',
    'object oriented', 'design pattern', 'factory pattern', 'singleton pattern',
    'dependency injection', 'inversion of control',
    'binary search', 'linked list', 'hash map', 'hash table', 'binary tree',
    'red black tree', 'b tree', 'avl tree',
    'big o', 'time complexity', 'space complexity',
    'rest api', 'restful api', 'graphql api', 'web socket',
    'sql injection', 'cross site', 'xss attack',
    'docker container', 'kubernetes', 'ci cd', 'continuous integration',
    'unit test', 'integration test', 'test driven',
    'microservice', 'monolithic', 'event driven', 'message queue',
    'garbage collection', 'memory management', 'stack overflow',
    'thread safe', 'race condition', 'deadlock',
    'oauth', 'jwt token', 'session management',
    'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
    'aws lambda', 'serverless', 'cloud computing',
    'agile', 'scrum', 'kanban', 'devops',
    'solid principles', 'dry principle', 'kiss principle',
    'polymorphism', 'encapsulation', 'abstraction', 'inheritance',
    'java virtual machine', 'jvm', 'class loader',
    'tcp ip', 'http https', 'dns', 'load balancer',
    'data structure', 'algorithm', 'recursion', 'dynamic programming',
    'git branch', 'version control', 'merge conflict',
  ];

  let query = questionText.toLowerCase();

  // Remove filler words but keep multi-word tech terms intact
  const stopWords = ['what', 'is', 'are', 'the', 'pros', 'cons', 'of', 'in', 'vs',
    'and', 'or', 'how', 'to', 'do', 'does', 'explain', 'describe', 'difference',
    'between', 'can', 'you', 'it', 'for', 'with', 'on', 'at', 'from', 'by', 'an',
    'a', 'tell', 'me', 'about', 'work', 'internally', 'under', 'hood', 'why',
    'when', 'where', 'which', 'should', 'would', 'could', 'please', 'use', 'used',
    'using', 'your', 'its', 'this', 'that', 'these', 'those', 'there', 'their',
    'them', 'they', 'will', 'have', 'has', 'had', 'been', 'being', 'was', 'were',
    'not', 'but', 'also', 'just', 'some', 'any', 'much', 'many', 'more', 'most',
    'very', 'really', 'actually', 'basically'];

  // Find preserved tech terms in the query
  const foundTerms = [];
  for (const term of techTerms) {
    if (query.includes(term)) {
      foundTerms.push(term);
    }
  }

  // If we found specific tech terms, use them as the search query
  if (foundTerms.length > 0) {
    return foundTerms.join(' ') + ' programming';
  }

  // Otherwise, do intelligent word extraction
  const words = query.replace(/[?.,!;:'"()[\]{}]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.includes(w));

  return words.slice(0, 5).join(' ');
}

// ─── DUCKDUCKGO INSTANT ANSWER API ──────────────────────────────────────────
// Uses the structured JSON API (not HTML scraping) for reliable results
function fetchDDGInstantAnswer(queryText) {
  return new Promise((resolve) => {
    const searchQuery = extractSearchQuery(queryText);
    if (!searchQuery) return resolve(null);

    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1&skip_disambig=1`;

    https.get(url, { headers: { 'User-Agent': 'PrepWise/2.0 (Interview Prep App)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          // Priority 1: AbstractText (best quality summary)
          if (parsed.AbstractText && parsed.AbstractText.length > 50) {
            resolve({ text: parsed.AbstractText, source: parsed.AbstractSource || 'DuckDuckGo' });
            return;
          }

          // Priority 2: Answer field (direct factual answers)
          if (parsed.Answer && parsed.Answer.length > 20) {
            resolve({ text: parsed.Answer, source: 'DuckDuckGo' });
            return;
          }

          // Priority 3: Definition
          if (parsed.Definition && parsed.Definition.length > 30) {
            resolve({ text: parsed.Definition, source: parsed.DefinitionSource || 'DuckDuckGo' });
            return;
          }

          // Priority 4: First RelatedTopic with a good text
          if (parsed.RelatedTopics && parsed.RelatedTopics.length > 0) {
            for (const topic of parsed.RelatedTopics) {
              if (topic.Text && topic.Text.length > 50) {
                resolve({ text: topic.Text, source: 'DuckDuckGo' });
                return;
              }
            }
          }

          resolve(null);
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));

    // Timeout after 4 seconds
    setTimeout(() => resolve(null), 4000);
  });
}

// ─── WIKIPEDIA API (IMPROVED) ───────────────────────────────────────────────
// Uses the full question as search query for better relevance
function fetchWikipediaSummary(queryText) {
  return new Promise((resolve) => {
    const searchQuery = extractSearchQuery(queryText);
    if (!searchQuery) return resolve(null);

    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&utf8=&format=json&srlimit=3`;

    https.get(searchUrl, { headers: { 'User-Agent': 'PrepWise/2.0 (Interview Prep App)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.query || !parsed.query.search || parsed.query.search.length === 0) {
            return resolve(null);
          }

          // Pick the best matching result — check title relevance
          let bestResult = null;
          const queryLower = searchQuery.toLowerCase();
          for (const result of parsed.query.search) {
            const titleLower = result.title.toLowerCase();
            // Check if the article title is relevant to the search
            if (queryLower.split(' ').some(word => word.length > 3 && titleLower.includes(word))) {
              bestResult = result;
              break;
            }
          }
          // Fallback to first result if no title match
          if (!bestResult) bestResult = parsed.query.search[0];

          const pageId = bestResult.pageid;
          const summaryUrl = `https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro&explaintext&redirects=1&pageids=${pageId}`;

          https.get(summaryUrl, { headers: { 'User-Agent': 'PrepWise/2.0 (Interview Prep App)' } }, (sumRes) => {
            let sumData = '';
            sumRes.on('data', chunk => sumData += chunk);
            sumRes.on('end', () => {
              try {
                const sumParsed = JSON.parse(sumData);
                const pages = sumParsed.query.pages;
                const extract = pages[pageId].extract;

                if (extract && extract.length > 50) {
                  // Return first 3-4 sentences
                  const sentences = extract.split(/(?<=[.!?])\s+/);
                  const shortSummary = sentences.slice(0, 4).join(' ');
                  resolve({ text: shortSummary, source: 'Wikipedia' });
                } else {
                  resolve(null);
                }
              } catch { resolve(null); }
            });
          }).on('error', () => resolve(null));
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));

    setTimeout(() => resolve(null), 5000);
  });
}

// ─── DUCKDUCKGO HTML SEARCH (LAST RESORT) ───────────────────────────────────
// Scrapes multiple results and picks the most relevant snippet
function fetchDDGHtmlSearch(queryText) {
  return new Promise((resolve) => {
    const searchQuery = extractSearchQuery(queryText);
    if (!searchQuery) return resolve(null);

    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery + ' explained')}`;

    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(null);
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          // Extract ALL snippets, not just the first one
          const snippetRegex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
          const snippets = [];
          let match;

          while ((match = snippetRegex.exec(data)) !== null && snippets.length < 5) {
            let snippet = match[1]
              .replace(/<[^>]+>/g, '')
              .replace(/&#x27;/g, "'")
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .trim();

            if (snippet.length > 40) {
              snippets.push(snippet);
            }
          }

          if (snippets.length === 0) return resolve(null);

          // Score each snippet for relevance to the original question
          const queryWords = searchQuery.toLowerCase().split(/\s+/);
          let bestSnippet = snippets[0];
          let bestScore = 0;

          for (const snippet of snippets) {
            const snippetLower = snippet.toLowerCase();
            let score = 0;
            for (const word of queryWords) {
              if (word.length > 3 && snippetLower.includes(word)) {
                score += 2;
              }
            }
            // Bonus for longer, more informative snippets
            if (snippet.length > 100) score += 1;
            if (snippet.length > 200) score += 1;

            if (score > bestScore) {
              bestScore = score;
              bestSnippet = snippet;
            }
          }

          resolve({ text: bestSnippet, source: 'Web Search' });
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));

    setTimeout(() => resolve(null), 5000);
  });
}

// ─── MULTI-SOURCE FACT FINDER ───────────────────────────────────────────────
// Tries multiple sources in parallel and picks the best result
async function findFactAboutQuestion(questionText) {
  try {
    // Run DuckDuckGo Instant Answer and Wikipedia in parallel
    const [ddgResult, wikiResult] = await Promise.all([
      fetchDDGInstantAnswer(questionText),
      fetchWikipediaSummary(questionText),
    ]);

    // Priority 1: DuckDuckGo Instant Answer (most reliable structured data)
    if (ddgResult && ddgResult.text && ddgResult.text.length > 50) {
      return ddgResult;
    }

    // Priority 2: Wikipedia (good for well-known concepts)
    if (wikiResult && wikiResult.text && wikiResult.text.length > 50) {
      return wikiResult;
    }

    // Priority 3: DuckDuckGo HTML scraping (last resort, with relevance scoring)
    const htmlResult = await fetchDDGHtmlSearch(questionText);
    if (htmlResult && htmlResult.text && htmlResult.text.length > 40) {
      return htmlResult;
    }

    return null;
  } catch {
    return null;
  }
}

// ─── ANSWER SYNTHESIZER ─────────────────────────────────────────────────────
// Takes a raw fact and weaves it into a natural interview-style answer
function synthesizeAnswer(questionText, fact, type, role) {
  const factText = fact.text;
  const source = fact.source;

  // Different opening styles for variety
  const openings = [
    `That's a great question, and it's something I've worked with extensively.`,
    `Absolutely, this is a topic I find really interesting and have solid experience with.`,
    `Great question! Let me walk you through my understanding of this.`,
    `I'd love to answer that — it's a fundamental concept I've applied in my projects.`,
    `Sure, this is something I've dealt with hands-on in multiple projects.`
  ];

  const closings = [
    `\n\nIn my projects, I've applied this knowledge practically, and I believe having this strong conceptual foundation helps me write cleaner, more maintainable code.`,
    `\n\nI've used this understanding in real-world scenarios, and it's been foundational to building scalable, efficient solutions.`,
    `\n\nThis is one of those concepts where practical experience really solidifies the theory, and my project work has given me that solid grounding.`,
    `\n\nI find that truly understanding these fundamentals — not just memorizing them — is what sets apart a good developer, and I strive to maintain that depth of knowledge.`,
    `\n\nOverall, my hands-on experience with this has made me confident in applying these concepts effectively in production environments.`
  ];

  // Use question hash for consistent but varied selection
  const hash = questionText.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const opening = openings[hash % openings.length];
  const closing = closings[(hash + 1) % closings.length];

  // Truncate fact if too long (keep first ~400 chars at sentence boundary)
  let trimmedFact = factText;
  if (trimmedFact.length > 400) {
    const sentences = trimmedFact.split(/(?<=[.!?])\s+/);
    trimmedFact = '';
    for (const sentence of sentences) {
      if ((trimmedFact + sentence).length > 400) break;
      trimmedFact += (trimmedFact ? ' ' : '') + sentence;
    }
  }

  return `${opening}\n\n${trimmedFact}${closing}`;
}

// ─── ANSWER TEMPLATES ───────────────────────────────────────────────────────
const ANSWER_TEMPLATES = {
  Technical: {
    default: [
      `That's a great question. In my experience working with this technology, I've developed a solid understanding of the core concepts. Let me walk you through how I approach this.\n\nFirst, I always start by understanding the fundamentals. Whether it's a design decision or a technical implementation, having a strong foundation matters. In my projects, I've applied these principles practically — for instance, during my final year project, I had to make critical architecture decisions that taught me the importance of scalability and maintainability.\n\nI also believe in staying current with best practices. I regularly read technical blogs, follow open-source projects, and practice coding challenges. This habit has helped me not just in interviews but in building production-ready solutions.\n\nOverall, I'd say my strength lies in combining theoretical knowledge with hands-on experience to deliver clean, efficient solutions.`,

      `I'd love to share my perspective on this. Throughout my academic and project work, I've had considerable exposure to this area.\n\nThe way I see it, understanding the "why" behind technical decisions is just as important as knowing the "how." When I was building my capstone project, I encountered this exact concept and had to dive deep to truly understand it. That experience taught me to think critically about trade-offs — performance vs. readability, speed vs. accuracy.\n\nI also believe in writing code that others can understand and maintain. Documentation, clean naming conventions, and modular design are practices I follow religiously. In team projects, this approach has consistently earned positive feedback from both peers and mentors.\n\nI'm confident that this foundation, combined with my eagerness to learn, makes me well-prepared for this role.`,

      `Absolutely, this is something I've spent considerable time learning and applying. Let me share my approach.\n\nI find that the most effective way to master technical concepts is through building real projects. During my studies, I didn't just learn theory — I implemented it. For example, when learning about data structures, I built a complete project that required me to choose the right data structure for different use cases, considering time and space complexity.\n\nBeyond coding, I understand the importance of system design thinking. How components interact, how data flows through a system, and how to handle edge cases — these are all things I consider in my approach.\n\nI'm also a strong believer in testing and code reviews. In my team projects, I've always advocated for thorough testing practices, which has helped us catch bugs early and ship reliable code.`,
    ],
    patterns: {
      'SQL|database|DBMS|query': `When it comes to databases, I have strong practical experience. During my projects, I worked extensively with SQL databases — designing normalized schemas, writing complex queries with JOINs, subqueries, and aggregate functions, and optimizing query performance using indexing strategies.\n\nI understand the importance of ACID properties and have practical knowledge of when to use different types of joins, how to handle NULL values, and the trade-offs between normalization and denormalization. In one of my projects, I improved query performance by 40% just by adding appropriate indexes and restructuring a few complex queries.\n\nI'm also familiar with NoSQL databases like MongoDB for use cases where flexible schema design is more appropriate. I believe choosing the right database technology depends on the specific requirements of the application.`,

      'OOP|object.oriented|class|inheritance|polymorphism': `Object-oriented programming is one of my core strengths. I've built multiple projects using OOP principles in Java and Python. The four pillars — Encapsulation, Abstraction, Inheritance, and Polymorphism — are not just theoretical concepts for me; I apply them daily.\n\nFor encapsulation, I always ensure proper access modifiers and expose functionality through well-defined interfaces. I use inheritance thoughtfully — preferring composition over inheritance when it makes the design more flexible. Polymorphism, especially through interfaces, helps me write extensible code.\n\nIn my recent project, I used the Factory and Strategy design patterns to make the codebase modular and testable. This approach made it easy to add new features without modifying existing code, following the Open-Closed Principle.`,

      'data.struct|array|linked.list|tree|graph|stack|queue|hash': `Data structures are fundamental to writing efficient code, and I've invested significant time mastering them. I understand when to use arrays vs. linked lists, when hash maps offer O(1) lookups, and when tree structures are the right choice.\n\nIn practice, I've implemented various data structures from scratch to truly understand their internals. For example, I built a hash map with collision handling using chaining, and a binary search tree with balanced insertion. This deep understanding helps me choose the right data structure for each problem.\n\nDuring coding challenges, I consistently use the right data structures — using stacks for bracket matching, queues for BFS traversals, and heaps for priority-based problems. I believe this foundational knowledge is what separates good engineers from great ones.`,

      'algorithm|sort|search|complex|Big.O|time.complex': `Algorithm design and analysis is an area I'm passionate about. I understand Big-O notation deeply — not just memorizing complexities, but understanding why certain algorithms have the performance characteristics they do.\n\nI'm proficient in key algorithmic paradigms: divide and conquer, dynamic programming, greedy algorithms, and backtracking. In competitive programming, I've solved over 200 problems on platforms like LeetCode and HackerRank, covering these paradigms.\n\nI particularly enjoy optimization problems. In one of my projects, I reduced a brute-force O(n²) solution to O(n log n) by identifying the right sorting-based approach. Understanding these trade-offs is crucial in real-world applications where performance matters at scale.`,

      'API|REST|HTTP|endpoint|backend|server': `I have hands-on experience building RESTful APIs. In my projects, I've designed and implemented APIs using Node.js with Express, following best practices like proper HTTP method usage, meaningful status codes, and consistent response formats.\n\nI understand REST principles — statelessness, resource-based URLs, proper use of GET, POST, PUT, DELETE methods, and how to handle authentication using JWT tokens. I've also implemented middleware for request validation, error handling, and rate limiting.\n\nBeyond just building APIs, I think about API design from the consumer's perspective. Good documentation, consistent naming conventions, and proper error messages make APIs much more developer-friendly. I've used tools like Postman for testing and Swagger for documentation.`,

      'React|frontend|component|state|hook|UI': `Frontend development with React is one of my strongest areas. I've built several applications using React, leveraging hooks like useState, useEffect, useContext, and custom hooks for reusable logic.\n\nI understand React's component lifecycle, the virtual DOM, and how to optimize performance with React.memo, useMemo, and useCallback. State management is something I approach thoughtfully — using local state when possible, Context API for shared state, and considering Redux only when the complexity warrants it.\n\nI also prioritize responsive design, accessibility, and user experience. In my projects, I've used CSS-in-JS, Flexbox, and Grid layouts to create interfaces that work across all devices. I believe a good frontend developer needs to think about both the technical implementation and the end-user experience.`,

      'Python|Java|C\\+\\+|programming.language|code': `I'm proficient in multiple programming languages, with strong fundamentals that allow me to pick up new languages quickly. My primary languages are Python and Java, and I have working knowledge of JavaScript and C++.\n\nIn Python, I leverage its rich ecosystem — NumPy for numerical computing, pandas for data manipulation, and Flask/Django for web development. In Java, I appreciate its strong typing system, extensive standard library, and enterprise-grade frameworks like Spring.\n\nI believe that being language-agnostic is important. The core principles — clean code, proper error handling, testing, and documentation — apply regardless of the language. In my experience, understanding data structures, algorithms, and design patterns makes switching between languages straightforward.`,
    },
  },

  HR: {
    default: [
      `Thank you for that question. I believe this is really about understanding what drives me as a professional, and I'm happy to share.\n\nWhat motivates me most is the opportunity to solve meaningful problems through technology. When I look at Genpact's work in digital transformation — helping enterprises modernize their operations — I see a perfect alignment with my passion. I want to be part of a team that creates tangible impact for businesses and their customers.\n\nAs a person, I'd describe myself as naturally curious and persistent. When I start working on something, I don't just stop at the surface level. I dig deeper to understand the "why." My teammates have often told me that they appreciate my thoroughness and willingness to help others when they're stuck.\n\nI also value work-life balance and emotional intelligence in the workplace. I believe that great work comes from healthy, collaborative environments. I'm the kind of person who celebrates team wins as much as individual achievements.\n\nLooking forward, I'm excited about the growth opportunities here and I'm ready to contribute meaningfully from day one.`,

      `I appreciate you asking this. It gives me a chance to share what I think makes me a strong fit for this role.\n\nMy greatest strength is my adaptability. In my academic journey, I've worked on diverse projects — from web applications to data analysis — and each one required me to quickly learn new tools and frameworks. This ability to adapt and learn fast is something I believe will be invaluable in a dynamic environment like Genpact's.\n\nIf I'm being honest about an area of improvement, I'd say I sometimes spend extra time perfecting my work when "good enough" would suffice. I've been actively working on this by setting clear timelines for myself and focusing on delivering value quickly, then iterating to improve.\n\nRegarding teamwork, I genuinely enjoy collaborating. During my college projects, I naturally took on the role of connecting different team members' work and ensuring we were aligned. Clear communication and mutual respect are principles I live by, both personally and professionally.`,

      `That's a thoughtful question, and I want to give you an honest answer.\n\nI chose this field because I love the intersection of problem-solving and creativity that technology offers. Every day brings new challenges, and I find that energizing rather than exhausting. What drew me specifically to Genpact is the company's reputation for combining deep domain expertise with cutting-edge technology.\n\nIn terms of my work style, I'm very organized and detail-oriented. I use tools like Notion to plan my tasks, track deadlines, and reflect on what went well and what could be improved. This habit of continuous self-improvement has served me well throughout my academic career.\n\nI also want to mention that I'm very comfortable with ambiguity. Not every problem comes with a clear solution, and I've learned to navigate uncertainty by breaking complex problems into smaller, manageable pieces. This approach has helped me deliver results even when the path forward wasn't immediately clear.\n\nI'm genuinely excited about the possibility of joining your team and contributing to the meaningful work Genpact does.`,
    ],
    patterns: {
      'strength|weakness|tell.me.about.yourself|introduce': `Thank you for the opportunity to introduce myself. I'm a recent graduate with a strong foundation in computer science and practical experience through academic projects and internships.\n\nMy key strengths include strong analytical thinking, the ability to learn new technologies quickly, and effective communication. During my final year project, I led a team of four to build a full-stack application, which taught me both technical skills and project management.\n\nAs for areas I'm working on improving, I tend to be overly detail-oriented at times. While this ensures high-quality work, I've learned to balance thoroughness with efficiency by setting time bounds for tasks and prioritizing the most impactful improvements.\n\nI'm passionate about using technology to solve real-world problems, and I'm excited about the opportunity to bring this enthusiasm to your team.`,

      'team|collaborate|conflict|disagree': `I strongly believe that great products are built by great teams, not individuals. In my experience, the best collaboration happens when everyone feels heard and valued.\n\nDuring my group projects in college, I experienced a situation where two team members had fundamentally different approaches to solving a problem. Instead of letting the disagreement fester, I facilitated a discussion where each person presented their approach with pros and cons. We ended up combining the best aspects of both ideas, resulting in a solution better than either original proposal.\n\nMy approach to teamwork is grounded in clear communication, active listening, and mutual respect. I believe in giving and receiving constructive feedback gracefully. When conflicts arise, I focus on the problem, not the person, and always look for common ground.\n\nI genuinely enjoy working with diverse teams because different perspectives lead to more creative and robust solutions.`,

      'why.Genpact|why.this.company|why.join|interested': `What attracted me to Genpact is the company's unique position at the intersection of domain expertise and digital innovation. Genpact doesn't just build technology — it transforms how businesses operate, and that's incredibly exciting to me.\n\nI've researched Genpact's work in AI-driven process optimization, and I'm impressed by how the company combines analytical rigor with practical implementation. The Data-Tech-AI approach resonates with me because I believe the most impactful technology solutions are those deeply grounded in business understanding.\n\nAdditionally, Genpact's commitment to employee development and its global footprint across 30+ countries offer tremendous learning and growth opportunities. I want to be part of a company where I can grow both as a technologist and as a professional.\n\nI'm confident that my technical skills, eagerness to learn, and collaborative mindset make me a strong fit for the innovative culture at Genpact.`,

      'salary|CTC|package|compensation|relocat': `I appreciate you bringing this up. I believe compensation should reflect the value one brings, and I'm focused on finding the right opportunity where I can grow and contribute meaningfully.\n\nI've researched the typical compensation range for this role and I'm comfortable with the industry standards for freshers at a company of Genpact's reputation. I'm more focused on the learning opportunities, the kind of projects I'll work on, and the career growth path.\n\nRegarding relocation, I'm absolutely open to it. I see it as an opportunity to experience new places and cultures, which I believe contributes to personal growth. I'm flexible and adaptable — I've lived in different cities during my education, so adjusting to a new location isn't a concern for me.\n\nWhat matters most to me is being part of a team where I can make a real impact and continue growing professionally.`,

      'goal|future|5.year|career|plan|aspir': `My career vision is both ambitious and grounded. In the short term — the next 1-2 years — I want to build a rock-solid foundation in software development by working on challenging projects, learning from experienced colleagues, and mastering the technologies used at Genpact.\n\nIn the medium term, I aspire to take on more responsibility — perhaps leading a small team or owning a significant module. I want to develop not just my technical skills but also my ability to mentor others, communicate with stakeholders, and think strategically about technical decisions.\n\nLong-term, I see myself as a technical leader who can bridge the gap between business needs and technology solutions. Genpact's focus on digital transformation aligns perfectly with this vision, as it offers exposure to both business domains and cutting-edge technology.\n\nI believe in continuous learning, and I plan to supplement my on-the-job experience with certifications and courses in relevant areas like cloud computing, AI/ML, and system design.`,
    },
  },

  Behavioral: {
    default: [
      `Let me share a relevant experience. During my final year project, our team faced a significant challenge when the main API we were using deprecated a critical feature just two weeks before our submission deadline.\n\nI took the initiative to research alternatives and found a suitable replacement. However, integrating it required restructuring a significant portion of our codebase. I organized a team meeting, laid out the plan, and divided the work based on each person's strengths.\n\nWe worked intensively for a week, with daily stand-ups to track progress and address blockers. I personally handled the most complex integration part while also reviewing my teammates' code to ensure consistency.\n\nThe result? We not only met our deadline but also received appreciation from our professor for the clean architecture of our solution. This experience taught me that challenges are opportunities in disguise, and that effective communication and teamwork can overcome almost any obstacle.`,

      `I'd like to share an experience that I think demonstrates my problem-solving approach well.\n\nDuring an internship, I was assigned to optimize a reporting module that was taking over 30 seconds to generate reports. Users were frustrated, and it was affecting productivity.\n\nI started by profiling the application to identify bottlenecks. I discovered that the main issue was multiple redundant database queries being executed in a loop. Instead of jumping to a fix, I first documented the current behavior, discussed my findings with a senior developer, and proposed a solution that used batch queries and caching.\n\nAfter implementing the changes, report generation time dropped to under 3 seconds — a 90% improvement. My manager was impressed not just with the result but with my methodical approach to the problem.\n\nThis experience reinforced my belief that understanding a problem thoroughly before jumping to solutions leads to better outcomes.`,
    ],
    patterns: {
      'challenge|difficult|obstacle|problem|failure': `One of the most challenging situations I faced was during my capstone project. We were building a real-time data dashboard, and midway through development, we discovered that our architecture couldn't handle the concurrent data streams we needed.\n\nInstead of panicking, I took a step back and analyzed the root cause. I researched different architectures and proposed a microservices approach with event-driven communication. The team was initially hesitant because it meant reworking significant portions of our code.\n\nI created a proof of concept over a weekend to demonstrate the feasibility. Once the team saw it working, everyone got on board. We divided the refactoring work and implemented the new architecture in phases.\n\nThe final product not only met our requirements but actually exceeded them — handling 3x the data volume we originally targeted. This experience taught me the value of staying calm under pressure, backing proposals with evidence, and leading by example.`,

      'leader|lead|manage|initiative|ownership': `In my college's tech club, I took the initiative to organize a hackathon that brought together over 100 students from different departments.\n\nAs the lead organizer, I had to coordinate venues, judges, mentors, sponsors, and participants — all while managing a team of 8 volunteers. The biggest challenge was when our primary sponsor pulled out just a week before the event.\n\nRather than scaling down, I quickly reached out to local tech companies and alumni. Within three days, I secured two new sponsors. I also leveraged social media to boost registrations, resulting in a 40% increase in participation.\n\nThe hackathon was a huge success, with participants rating it 4.7 out of 5. More importantly, several projects from the hackathon were later developed into real products. This experience showed me that leadership is about staying resourceful, adaptable, and focused on the goal, even when things don't go as planned.`,
    },
  },

  Background: {
    default: [
      `I'd be happy to walk you through my background. I completed my education in Computer Science, where I developed a strong foundation in programming, data structures, algorithms, and software engineering principles.\n\nDuring my academic journey, I completed several significant projects that gave me practical experience. My capstone project was a full-stack web application that I built using React, Node.js, and MongoDB. It taught me the entire software development lifecycle — from requirement gathering and design to implementation, testing, and deployment.\n\nI also participated in coding competitions and hackathons, which sharpened my problem-solving skills and taught me to work effectively under time pressure. These experiences, combined with my coursework in DBMS, Operating Systems, and Computer Networks, give me a well-rounded technical foundation.\n\nOutside of academics, I'm actively involved in tech communities. I contribute to open-source projects and write technical blog posts, which helps me stay current with industry trends and continuously improve my skills.\n\nI believe this combination of strong fundamentals, practical experience, and passion for learning makes me well-prepared for a career in technology.`,

      `Thank you for asking about my background. Let me give you a comprehensive overview.\n\nAcademically, I graduated with a degree in Computer Science with a strong GPA. My coursework covered core CS topics including Data Structures, Algorithms, DBMS, Operating Systems, Computer Networks, and Software Engineering. I particularly excelled in project-based courses where I could apply theoretical knowledge to practical problems.\n\nFor my main project, I developed a comprehensive application that involved frontend development, backend API design, database management, and deployment. This end-to-end experience is something I'm particularly proud of, as it gave me insight into how different components of a software system interact.\n\nI also completed relevant certifications in cloud computing and programming languages, which supplement my formal education. Additionally, my involvement in the college coding club allowed me to mentor junior students, further solidifying my own understanding of core concepts.\n\nI'm excited to bring this foundation to a professional setting and continue growing as a software engineer.`,
    ],
    patterns: {},
  },
};

// ─── TONE MODIFIERS ─────────────────────────────────────────────────────────
function applyTone(answer, tone) {
  switch (tone) {
    case 'concise':
      const sentences = answer.split(/(?<=[.!?])\s+/);
      return sentences.slice(0, Math.min(6, sentences.length)).join(' ');

    case 'humble':
      return answer
        .replace(/I'm confident/g, "I hope")
        .replace(/I excel/g, "I strive to do well")
        .replace(/my strength/gi, "something I'm working on developing")
        .replace(/I'm passionate/g, "I'm genuinely interested")
        + "\n\nI'm always eager to learn more and grow, and I see every opportunity as a chance to improve.";

    case 'story':
      return "Let me share a story that illustrates my answer...\n\n" + answer
        + "\n\nLooking back, this experience shaped who I am as a professional today.";

    case 'technical':
      return answer + "\n\nFrom a technical standpoint, I believe in staying current with industry best practices, following SOLID principles, and writing well-tested, maintainable code.";

    case 'confident':
    default:
      return answer;
  }
}

// ─── FIND BEST MATCHING ANSWER ──────────────────────────────────────────────
function findPatternMatch(text, patterns) {
  for (const [pattern, answer] of Object.entries(patterns)) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(text)) return answer;
  }
  return null;
}

// ─── MAIN GENERATOR v2.0 ───────────────────────────────────────────────────
async function generateAnswer(questionText, type = 'Technical', tone = 'confident', role = '', company = 'Genpact') {
  const category = ANSWER_TEMPLATES[type] || ANSWER_TEMPLATES.Technical;

  let answer = null;

  // 1. For technical questions, try to find real facts from the web
  if (type === 'Technical') {
    try {
      const fact = await findFactAboutQuestion(questionText);
      if (fact && fact.text && fact.text.length > 50) {
        answer = synthesizeAnswer(questionText, fact, type, role);
      }
    } catch (err) {
      console.error('Web search failed, falling back to templates:', err.message);
    }
  }

  // 2. If no web answer, try pattern matching against our curated templates
  if (!answer) {
    answer = findPatternMatch(questionText, category.patterns || {});
  }

  // 3. Fall back to a random default template
  if (!answer) {
    const defaults = category.default;
    const hash = questionText.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    answer = defaults[hash % defaults.length];
  }

  // Replace company name
  answer = answer.replace(/Genpact/g, company);

  // Apply tone
  answer = applyTone(answer, tone);

  return answer;
}

// ─── MOCK INTERVIEW EVALUATOR ───────────────────────────────────────────────
function evaluateAnswer(questionText, answerText, type = 'Technical') {
  if (!answerText || answerText.trim().length === 0) {
    return {
      completeness: 10,
      clarity: 10,
      relevance: 10,
      feedback: "No answer was provided. In an interview, it's important to attempt every question. Even a partial answer shows your thought process and willingness to engage."
    };
  }

  const wordCount = answerText.trim().split(/\s+/).length;
  const sentenceCount = answerText.split(/[.!?]+/).filter(s => s.trim()).length;
  const hasKeywords = /experience|project|learn|team|approach|solution|result/i.test(answerText);
  const hasStructure = sentenceCount >= 3;
  const isDetailed = wordCount >= 50;
  const isSubstantial = wordCount >= 100;

  let completeness = 40;
  let clarity = 50;
  let relevance = 45;

  if (isSubstantial) completeness += 30;
  else if (isDetailed) completeness += 20;
  if (hasKeywords) completeness += 15;
  if (hasStructure) completeness += 10;

  if (hasStructure) clarity += 20;
  if (sentenceCount >= 5) clarity += 15;
  if (wordCount < 200) clarity += 10;

  if (hasKeywords) relevance += 25;
  if (isDetailed) relevance += 15;
  if (/I|my|me/i.test(answerText)) relevance += 10;

  completeness = Math.min(95, completeness);
  clarity = Math.min(95, clarity);
  relevance = Math.min(95, relevance);

  let feedback = "";
  if (wordCount < 30) {
    feedback = "Your answer is quite brief. Try to elaborate more with specific examples from your experience. Aim for at least 4-5 sentences to show depth.";
  } else if (wordCount < 80) {
    feedback = `Good start with ${wordCount} words. To strengthen your answer, include a specific example or project experience that demonstrates your point. The STAR method (Situation, Task, Action, Result) works well.`;
  } else if (!hasKeywords) {
    feedback = "Your answer has good length but could benefit from more concrete details. Mention specific projects, technologies, or outcomes to make your answer more compelling.";
  } else if (isSubstantial && hasKeywords) {
    feedback = "Strong answer! You provided good detail and relevant examples. To take it to the next level, quantify your results where possible (e.g., 'improved performance by 30%') and add a confident closing statement.";
  } else {
    feedback = "Solid response with relevant content. Consider structuring your answer more clearly — start with a key point, support it with an example, and end with what you learned or the impact you made.";
  }

  return { completeness, clarity, relevance, feedback };
}

module.exports = { generateAnswer, evaluateAnswer };
