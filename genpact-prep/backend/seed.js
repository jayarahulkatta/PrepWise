const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./db');
const Question = require('./models/Question');

const SEED_DATA = [
  // ═══ GENPACT ═══
  { company:"Genpact", job:"Java Developer", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"How do you tackle out of memory errors after reaching the maximum available heap size in Java?", date:"Apr 2017" },
  { company:"Genpact", job:"Java Developer", type:"Background", diff:"Easy", exp:"Fresher", text:"Are you experienced in Java, J2EE, Spring, SOAP, and REST as mentioned on your resume?", date:"Jul 2018" },
  { company:"Genpact", job:"Process Associate", type:"HR", diff:"Easy", exp:"Fresher", text:"Tell me about yourself and why you want to join Genpact.", date:"Mar 2023" },
  { company:"Genpact", job:"Data Analyst", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"What is the difference between DDL and DML in SQL? Give examples of commands for each.", date:"Jan 2024" },
  { company:"Genpact", job:"Business Analyst", type:"Behavioral", diff:"Easy", exp:"Fresher", text:"Describe a challenging situation you have faced at work and how you handled it.", date:"Feb 2024" },
  { company:"Genpact", job:"QA Engineer", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"How is functional testing different from regression testing? Explain with examples.", date:"Nov 2023" },
  { company:"Genpact", job:"Python Developer", type:"Technical", diff:"Hard", exp:"3-5 Years", text:"What are the advantages of multithreading in Python? How do you handle the Global Interpreter Lock (GIL)?", date:"Dec 2023" },
  { company:"Genpact", job:"Senior Software Engineer", type:"Technical", diff:"Hard", exp:"Senior", text:"Explain the concept of surrogate keys in DBMS. When would you use them over natural keys?", date:"Jun 2022" },
  { company:"Genpact", job:"Process Associate", type:"HR", diff:"Easy", exp:"Fresher", text:"Where do you see yourself in the next 5 years if you join Genpact?", date:"Sep 2023" },
  { company:"Genpact", job:"Data Analyst", type:"Technical", diff:"Easy", exp:"Fresher", text:"How do you use SQL INNER JOIN to return records common to multiple tables?", date:"Aug 2023" },
  { company:"Genpact", job:"Java Developer", type:"Technical", diff:"Hard", exp:"3-5 Years", text:"What are Real-Time Operating Systems (RTOS)? What are the different types and their key characteristics?", date:"May 2021" },
  { company:"Genpact", job:"Business Analyst", type:"Behavioral", diff:"Medium", exp:"1-3 Years", text:"Have you ever disagreed with a supervisor or manager? How did you handle the situation professionally?", date:"Oct 2023" },
  { company:"Genpact", job:"Senior Software Engineer", type:"Technical", diff:"Medium", exp:"3-5 Years", text:"What is ad-hoc testing? Explain the different types: monkey testing, buddy testing, and pair testing.", date:"Jul 2023" },
  { company:"Genpact", job:"HR Manager", type:"HR", diff:"Easy", exp:"Fresher", text:"What do you know about Genpact as a company? Why do you want to work here specifically?", date:"Feb 2023" },
  { company:"Genpact", job:"Python Developer", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"Explain the various levels of data abstraction in a DBMS: physical, logical, and view level.", date:"Mar 2024" },
  { company:"Genpact", job:"QA Engineer", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"What is index hunting in databases? How does it help improve query performance significantly?", date:"Jan 2023" },
  { company:"Genpact", job:"Process Associate", type:"Behavioral", diff:"Easy", exp:"Fresher", text:"How do you handle working under pressure and tight deadlines in a fast-paced environment?", date:"Nov 2022" },
  { company:"Genpact", job:"Data Analyst", type:"Technical", diff:"Hard", exp:"3-5 Years", text:"What are the pros and cons of user-level threads vs kernel-level threads in operating systems?", date:"Apr 2023" },
  { company:"Genpact", job:"Java Developer", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"What is the difference between processes and threads? When would you prefer threads over processes?", date:"Aug 2022" },
  { company:"Genpact", job:"Business Analyst", type:"HR", diff:"Easy", exp:"Fresher", text:"How do you measure the success of both an organization and an individual? What parameters do you use?", date:"Dec 2022" },
  { company:"Genpact", job:"Senior Software Engineer", type:"Technical", diff:"Hard", exp:"Senior", text:"Explain microservices architecture. What are its advantages and challenges compared to monolithic?", date:"Feb 2024" },
  { company:"Genpact", job:"Python Developer", type:"Technical", diff:"Hard", exp:"3-5 Years", text:"How would you optimize a slow-running Python script that processes large datasets of millions of rows?", date:"Mar 2024" },
  { company:"Genpact", job:"QA Engineer", type:"Behavioral", diff:"Medium", exp:"1-3 Years", text:"Describe a time you found a critical bug just before a major release. What was your approach?", date:"Jan 2024" },
  { company:"Genpact", job:"Data Analyst", type:"Technical", diff:"Easy", exp:"Fresher", text:"What is the difference between GROUP BY and HAVING clauses in SQL? Give practical examples.", date:"Nov 2023" },
  { company:"Genpact", job:"HR Manager", type:"Behavioral", diff:"Medium", exp:"1-3 Years", text:"How do you handle a situation where two team members have a serious professional conflict at work?", date:"Oct 2023" },
  { company:"Genpact", job:"Java Developer", type:"Technical", diff:"Hard", exp:"Senior", text:"Explain Spring Boot auto-configuration. How does it work internally under the hood?", date:"Sep 2023" },
  { company:"Genpact", job:"Process Associate", type:"HR", diff:"Easy", exp:"Fresher", text:"What are your greatest strengths and weaknesses? How are you actively working to improve your weaknesses?", date:"Aug 2023" },
  { company:"Genpact", job:"Business Analyst", type:"Technical", diff:"Medium", exp:"3-5 Years", text:"How would you evaluate a manufacturing process for cost reduction and efficiency improvement?", date:"Jul 2023" },
  { company:"Genpact", job:"Senior Software Engineer", type:"Technical", diff:"Hard", exp:"Senior", text:"What design patterns have you used in your projects? Explain Singleton and Factory patterns.", date:"Jun 2023" },
  { company:"Genpact", job:"Python Developer", type:"Behavioral", diff:"Medium", exp:"3-5 Years", text:"Tell me about a project where you applied machine learning or data science to solve a real business problem.", date:"May 2023" },

  // ═══ TCS ═══
  { company:"TCS", job:"System Engineer", type:"Technical", diff:"Easy", exp:"Fresher", text:"What is the difference between an abstract class and an interface in Java?", date:"Jan 2024" },
  { company:"TCS", job:"System Engineer", type:"Technical", diff:"Easy", exp:"Fresher", text:"What are the pillars of Object-Oriented Programming? Explain each briefly.", date:"Feb 2024" },
  { company:"TCS", job:"System Engineer", type:"HR", diff:"Easy", exp:"Fresher", text:"Tell me about yourself. Why do you want to join TCS?", date:"Mar 2024" },
  { company:"TCS", job:"System Engineer", type:"Technical", diff:"Medium", exp:"Fresher", text:"Write a program to check if a string is a palindrome without using built-in reverse functions.", date:"Nov 2023" },
  { company:"TCS", job:"IT Analyst", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"Explain the concept of normalization in databases. What are the different normal forms?", date:"Dec 2023" },
  { company:"TCS", job:"IT Analyst", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"What is the difference between TCP and UDP? When would you use each protocol?", date:"Oct 2023" },
  { company:"TCS", job:"ASE", type:"Technical", diff:"Hard", exp:"3-5 Years", text:"Explain the CAP theorem in distributed systems. Give real-world examples for each trade-off.", date:"Jan 2024" },
  { company:"TCS", job:"ASE", type:"Behavioral", diff:"Medium", exp:"1-3 Years", text:"Tell me about a time you had to learn a new technology quickly to deliver on a project deadline.", date:"Feb 2024" },
  { company:"TCS", job:"System Engineer", type:"HR", diff:"Easy", exp:"Fresher", text:"Are you willing to relocate to any TCS location across India? How do you feel about night shifts?", date:"Mar 2024" },
  { company:"TCS", job:"Data Scientist", type:"Technical", diff:"Hard", exp:"3-5 Years", text:"Explain the bias-variance tradeoff. How do you diagnose and fix overfitting in a model?", date:"Sep 2023" },
  { company:"TCS", job:"System Engineer", type:"Technical", diff:"Easy", exp:"Fresher", text:"What is the difference between a stack and a queue? Give real-world examples of each.", date:"Aug 2023" },
  { company:"TCS", job:"IT Analyst", type:"Behavioral", diff:"Easy", exp:"Fresher", text:"How do you prioritize tasks when you have multiple assignments with the same deadline?", date:"Jul 2023" },

  // ═══ INFOSYS ═══
  { company:"Infosys", job:"System Engineer", type:"Technical", diff:"Easy", exp:"Fresher", text:"What is the difference between a primary key and a foreign key in a relational database?", date:"Jan 2024" },
  { company:"Infosys", job:"System Engineer", type:"Technical", diff:"Easy", exp:"Fresher", text:"Explain the concept of pointers in C. What are dangling pointers and how do you avoid them?", date:"Feb 2024" },
  { company:"Infosys", job:"System Engineer", type:"HR", diff:"Easy", exp:"Fresher", text:"Tell me about yourself. What interests you about working at Infosys?", date:"Mar 2024" },
  { company:"Infosys", job:"Technology Analyst", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"Explain REST API. What are the different HTTP methods and when do you use each one?", date:"Dec 2023" },
  { company:"Infosys", job:"Technology Analyst", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"What is Docker? How is it different from virtual machines? Explain containerization.", date:"Nov 2023" },
  { company:"Infosys", job:"Digital Specialist", type:"Technical", diff:"Hard", exp:"3-5 Years", text:"Explain the event loop in Node.js. How does it handle asynchronous operations internally?", date:"Oct 2023" },
  { company:"Infosys", job:"Digital Specialist", type:"Behavioral", diff:"Medium", exp:"1-3 Years", text:"Describe a situation where you had to explain a complex technical concept to a non-technical stakeholder.", date:"Sep 2023" },
  { company:"Infosys", job:"System Engineer", type:"HR", diff:"Easy", exp:"Fresher", text:"What do you know about Infosys? Can you name some of the services and solutions they offer?", date:"Aug 2023" },
  { company:"Infosys", job:"System Engineer", type:"Technical", diff:"Medium", exp:"Fresher", text:"What is the time complexity of binary search? When is it more efficient than linear search?", date:"Jul 2023" },
  { company:"Infosys", job:"Technology Analyst", type:"Technical", diff:"Hard", exp:"3-5 Years", text:"Explain CI/CD pipelines. What tools have you used and how do you set up automated deployments?", date:"Jun 2023" },
  { company:"Infosys", job:"Digital Specialist", type:"Behavioral", diff:"Medium", exp:"3-5 Years", text:"Tell me about a time you identified a bottleneck in a process and proposed an innovative solution.", date:"May 2023" },

  // ═══ WIPRO ═══
  { company:"Wipro", job:"Project Engineer", type:"Technical", diff:"Easy", exp:"Fresher", text:"What are the different types of inheritance in Java? Can you do multiple inheritance with classes?", date:"Jan 2024" },
  { company:"Wipro", job:"Project Engineer", type:"Technical", diff:"Easy", exp:"Fresher", text:"Explain the difference between method overloading and method overriding with examples.", date:"Feb 2024" },
  { company:"Wipro", job:"Project Engineer", type:"HR", diff:"Easy", exp:"Fresher", text:"Tell me about yourself. Why Wipro? What do you know about Wipro's SPIRIT values?", date:"Mar 2024" },
  { company:"Wipro", job:"Senior Software Engineer", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"What is the difference between SQL and NoSQL databases? When would you choose one over the other?", date:"Dec 2023" },
  { company:"Wipro", job:"Senior Software Engineer", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"Explain the concept of Git branching strategies. What is Git Flow and how does it work?", date:"Nov 2023" },
  { company:"Wipro", job:"Technical Lead", type:"Technical", diff:"Hard", exp:"3-5 Years", text:"How do you design a system that handles 10 million concurrent users? Discuss scalability patterns.", date:"Oct 2023" },
  { company:"Wipro", job:"Project Engineer", type:"Behavioral", diff:"Easy", exp:"Fresher", text:"How do you handle constructive criticism from your seniors? Give a real example.", date:"Sep 2023" },
  { company:"Wipro", job:"Senior Software Engineer", type:"Behavioral", diff:"Medium", exp:"1-3 Years", text:"Tell me about a project where you had to collaborate with a difficult team member. How did you manage?", date:"Aug 2023" },
  { company:"Wipro", job:"Project Engineer", type:"Technical", diff:"Easy", exp:"Fresher", text:"What is the difference between an array and a linked list? Compare their time complexities.", date:"Jul 2023" },
  { company:"Wipro", job:"Technical Lead", type:"Technical", diff:"Hard", exp:"Senior", text:"Explain the SOLID principles with practical code examples. How do they improve code maintainability?", date:"Jun 2023" },

  // ═══ ACCENTURE ═══
  { company:"Accenture", job:"Associate Software Engineer", type:"Technical", diff:"Easy", exp:"Fresher", text:"What is OOPS? Explain the four pillars of object-oriented programming with everyday examples.", date:"Jan 2024" },
  { company:"Accenture", job:"Associate Software Engineer", type:"Technical", diff:"Easy", exp:"Fresher", text:"What is the difference between a compiler and an interpreter? Give examples of languages for each.", date:"Feb 2024" },
  { company:"Accenture", job:"Associate Software Engineer", type:"HR", diff:"Easy", exp:"Fresher", text:"Tell me about yourself. Why do you want to join Accenture? What do you know about the company?", date:"Mar 2024" },
  { company:"Accenture", job:"Application Developer", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"Explain the MVC architecture pattern. How have you used it in your projects?", date:"Dec 2023" },
  { company:"Accenture", job:"Application Developer", type:"Technical", diff:"Medium", exp:"1-3 Years", text:"What is an API Gateway? Why is it important in microservices architecture?", date:"Nov 2023" },
  { company:"Accenture", job:"Technology Architect", type:"Technical", diff:"Hard", exp:"3-5 Years", text:"How do you approach system design for an e-commerce platform that needs to handle flash sales?", date:"Oct 2023" },
  { company:"Accenture", job:"Associate Software Engineer", type:"Behavioral", diff:"Easy", exp:"Fresher", text:"Describe a time when you worked on a team project. What was your role and contribution?", date:"Sep 2023" },
  { company:"Accenture", job:"Application Developer", type:"Behavioral", diff:"Medium", exp:"1-3 Years", text:"Tell me about a time you made a mistake at work. How did you handle it and what did you learn?", date:"Aug 2023" },
  { company:"Accenture", job:"Associate Software Engineer", type:"HR", diff:"Easy", exp:"Fresher", text:"Are you comfortable with relocating? How do you feel about working in rotational shifts?", date:"Jul 2023" },
  { company:"Accenture", job:"Technology Architect", type:"Technical", diff:"Hard", exp:"Senior", text:"Explain event-driven architecture. When would you use it over request-response patterns?", date:"Jun 2023" },
];

async function seed() {
  await connectDB();

  // Clear existing data
  await Question.deleteMany({});
  console.log('🗑️  Cleared existing questions');

  // Insert seed data with status: approved
  const questions = SEED_DATA.map(q => ({ ...q, status: 'approved' }));
  await Question.insertMany(questions);

  // Print summary
  const companies = [...new Set(SEED_DATA.map(q => q.company))];
  for (const c of companies) {
    const count = SEED_DATA.filter(q => q.company === c).length;
    console.log(`  📦 ${c}: ${count} questions`);
  }
  console.log(`\n✅ Seeded ${SEED_DATA.length} total questions across ${companies.length} companies`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
