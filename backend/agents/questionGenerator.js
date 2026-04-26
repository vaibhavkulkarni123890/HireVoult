const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getProviderPriority() {
  const order = process.env.AI_PROVIDER_ORDER || 'gemini,openrouter,claude';
  const allowed = new Set(['gemini', 'openrouter', 'claude', 'groq', 'nvidia']);
  return order.split(',').map(p => p.trim().toLowerCase()).filter(p => allowed.has(p));
}

async function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OpenRouter API key not configured');
  const modelName = process.env.OPENROUTER_MODEL_NAME || 'meta-llama/llama-3.3-70b-instruct';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://hirevault.ai',
      'X-Title': 'HireVault Assessment Generator'
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 7000
    })
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${err}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callNVIDIA(prompt) {
  const modelName = process.env.LLM_MODEL_NAME || 'meta/llama-3.1-405b-instruct';
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 8000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    })
  });
  if (!response.ok) {
    const err = await response.text();
    if (response.status === 404) {
      throw new Error(`NVIDIA API error 404: Rate limit exceeded for the model (or model not found)`);
    }
    throw new Error(`NVIDIA API error ${response.status}: ${err}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGROQ(prompt) {
  const modelName = process.env.GROQ_MODEL_NAME || 'llama-3.3-70b-versatile';
  let attempts = 0;
  const maxAttempts = 1;
  while (attempts < maxAttempts) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 6000
      })
    });
    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }
    const errText = await response.text();
    if (response.status === 429) {
      attempts++;
      if (attempts >= maxAttempts) break;
      await new Promise(res => setTimeout(res, 3000));
      continue;
    }
    throw new Error(`Groq API error ${response.status}: ${errText}`);
  }
  throw new Error('Groq API rate limit exceeded after retries');
}

async function callGEMINI(prompt) {
  const modelsToTry = [
    process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',
    'gemini-pro',
    'gemini-1.0-pro'
  ];

  let lastError;
  for (const modelName of modelsToTry) {
    try {
      // Force 'v1' stable endpoint instead of 'v1beta' to avoid 404s
      const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1' });
      const result = await model.generateContent(prompt, {
        temperature: 0.3,
        maxOutputTokens: 3000,
        candidateCount: 1
      });
      const candidate = result.response?.candidates?.[0];
      const text = candidate?.content?.parts?.map(part => part.text || '').join('') || '';
      if (text) return text;
    } catch (err) {
      console.warn(`[QuestionGenerator] Gemini model ${modelName} failed: ${err.message}`);
      lastError = err;
      if (err.message.includes('404') || err.message.toLowerCase().includes('not found')) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Claude API key not configured');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL_NAME || 'claude-3-5-sonnet-20241022',
      max_tokens: 7000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }
  const data = await response.json();
  return data.content?.[0]?.text || '';
}

async function callAI(prompt) {
  const providers = getProviderPriority();
  let lastError = new Error('No AI providers available');
  for (const provider of providers) {
    try {
      let content;
      if (provider === 'claude')   content = await callClaude(prompt);
      else if (provider === 'groq') content = await callGROQ(prompt);
      else if (provider === 'openrouter') content = await callOpenRouter(prompt);
      else if (provider === 'gemini') content = await callGEMINI(prompt);
      else if (provider === 'nvidia') content = await callNVIDIA(prompt);
      if (content) return content;
    } catch (err) {
      console.warn(`[QuestionGenerator] ${provider} failed: ${err.message}`);
      lastError = err;
    }
  }
  throw lastError;
}

function sanitizeQuestion(q) {
  if (!q) return q;

  // Normalize type casing and infer when missing
  const inferredType = q.testCases ? 'coding' : (Array.isArray(q.options) ? 'mcq' : (q.rubric ? 'theory' : (q.type || 'mcq')));
  q.type = String(inferredType).toLowerCase();

  // Normalize difficulty to valid enum only — never let 'auto' reach MongoDB
  const validDiffs = ['easy', 'medium', 'hard'];
  const diff = (q.difficulty || 'medium').toLowerCase();
  q.difficulty = validDiffs.includes(diff) ? diff : 'medium';

  if (q.type === 'mcq' && Array.isArray(q.options)) {
    q.options = q.options.map(opt => String(opt).replace(/^([a-d]\)|(\([a-d]\))|[0-4]\.|-|\d\.|Option \d:)\s*/i, '').trim());
  }

  if (q.reasoning) {
    q.reasoning = q.reasoning.replace(/^(Why this question:|reasoning:|Why:)\s*/i, '').trim();
  }

  // Convert structured question objects to a single formatted string for DB
  if (typeof q.question === 'object' && q.question !== null) {
    const qObj = q.question;
    const parts = [];
    if (qObj.problemStatement) parts.push('Problem Statement:\n' + qObj.problemStatement);
    if (qObj.inputFormat) parts.push('Input Format:\n' + qObj.inputFormat);
    if (qObj.outputFormat) parts.push('Output Format:\n' + qObj.outputFormat);
    if (qObj.constraints) parts.push('Constraints:\n' + qObj.constraints);
    if (qObj.examples && Array.isArray(qObj.examples)) {
      const exStr = qObj.examples.map((ex, i) => {
        let s = `Example ${i + 1}:\n`;
        if (ex.input) s += `Input: ${typeof ex.input === 'object' ? JSON.stringify(ex.input) : ex.input}\n`;
        if (ex.output) s += `Output: ${typeof ex.output === 'object' ? JSON.stringify(ex.output) : ex.output}\n`;
        if (ex.explanation) s += `Explanation: ${ex.explanation}`;
        return s;
      }).join('\n');
      parts.push('Examples:\n' + exStr);
    }
    q.question = parts.join('\n\n');
  }

  if (q.description && !q.question) q.question = q.description;
  if (q.question && !q.description) q.description = q.question;

  if (q.type === 'mcq') {
    q.timeLimit = q.timeLimit || 120;
    q.points = q.points || 5;
  } else if (q.type === 'coding') {
    const diff = (q.difficulty || 'medium').toLowerCase();
    if (diff === 'easy')   q.timeLimit = 1200, q.points = 15;
    else if (diff === 'hard') q.timeLimit = 2700, q.points = 25;
    else                      q.timeLimit = 1800, q.points = 20;

    if (q.testCases && Array.isArray(q.testCases)) {
      q.testCases = q.testCases.map((tc) => {
        const isHidden = tc.isVisible === false || tc.isHidden === true;
        let safeInput = tc.input;
        if (typeof tc.input === 'string' && (tc.input.startsWith('{') || tc.input.startsWith('['))) {
          try { safeInput = JSON.parse(tc.input); } catch(e) {}
        }
        return { ...tc, input: safeInput, isHidden, isVisible: !isHidden };
      });

      q.testCases = q.testCases.map((tc, idx) => {
        let expected = tc.expectedOutput;
        if (expected === 'true') expected = true;
        if (expected === 'false') expected = false;
        if (typeof expected === 'string' && /^-?\d+(\.\d+)?$/.test(expected)) {
          const num = Number(expected);
          if (!isNaN(num)) expected = num;
        }
        return { ...tc, expectedOutput: expected, isHidden: idx >= 2, isVisible: idx < 2 };
      });
    }
  }

  // ─── FINAL DEFENSIVE: ensure question is ALWAYS a string before DB write ───
  if (typeof q.question !== 'string') {
    if (typeof q.question === 'object' && q.question !== null) {
      q.question = JSON.stringify(q.question, null, 2);
    } else {
      q.question = String(q.question || '');
    }
  }

  return q;
}

const EXPERIENCE_LEVEL_MAP = `
EXPERIENCE LEVEL — STRICTLY ENFORCE:

============================================
JUNIOR (0-2 years) — ONLY these topic areas:
============================================
MCQ topics allowed:
- HTML/CSS: Box model, Flexbox, Grid, Responsive design
- JavaScript basics: Variables, functions, closures, promises, async/await, ES6+
- React basics: Components, props, useState, useEffect, conditional rendering
- Basic Node.js: Express routes, middleware, basic REST APIs
- Basic SQL: SELECT, INSERT, UPDATE, DELETE, simple JOINs
- Git basics: commit, push, pull, merge, branches
- HTTP basics: GET/POST/PUT/DELETE, status codes, headers

MCQ topics FORBIDDEN for Junior:
- CAP theorem, Distributed systems, Message queues, Sharding, System design, GraphQL advanced, Redux advanced

============================================
JUNIOR CODING PROBLEMS — ABSOLUTELY FORBIDDEN:
============================================
!! FORBIDDEN - NEVER ASK THESE !!
- Two Sum, Reverse String, Palindrome Check, FizzBuzz, Fibonacci
- Array Rotation, Simple Array Sum, Power of Two, Check Prime
- ANY toy problems from basic tutorials

Instead, ask REAL LOGIC puzzles like:
- Nested object manipulation, State management logic, Custom data structure implementation
- Scheduling algorithms, Priority queue simulation, Event bus/logic simulation
- Given JS code with bugs - ask them to identify and fix issues
- Logic-based scenarios specific to the job role (e.g., form validation logic, API response handling)

============================================
MID LEVEL (3-5 years) — Standard topics:
============================================
Can mix EASY + MEDIUM problems. No restrictions on problem types.
Focus on: Practical application, debugging, optimization

============================================
SENIOR (6+ years) — Challenging topics:
============================================
MEDIUM + HARD problems required.
Must include: DP, Graphs, Sliding Window, Hashing optimization
`;

function buildPrompt(role) {
  const { title, experienceYears, skills, questionConfig, seniorityLevel, salary } = role;

  const mcqCount = questionConfig?.mcq?.count || 4;
  const codingCount = questionConfig?.coding?.count || 2;

  const skillsList = (skills || []).join(', ');
  const salaryMin = salary?.min || 0;

  return `
You are a senior technical interviewer creating REAL hiring assessments.

ROLE:
${title} | ${seniorityLevel} (${experienceYears} yrs)

SKILLS:
${skillsList}

========================
DIFFICULTY RULES
========================
Junior:
<5L → EASY
5–8L → EASY+MEDIUM
>8L → MEDIUM

Mid: EASY+MEDIUM  
Senior: MEDIUM+HARD

========================
GENERATE EXACTLY:
========================
${mcqCount} MCQs  
${codingCount} Coding Questions

========================
MCQ RULES
========================
- Based ONLY on given skills
- Conceptual + tricky (not direct theory)
- 4 strong options (no obvious wrong)
- No company/job questions

========================
CODING RULES (STRICT)
========================
- Pure JS/Python logic ONLY
- No DB, APIs, React, system design
- Focus on real-world logic, edge cases

Each coding question MUST follow EXACT LeetCode format:

Problem Statement:
- Clear real-world scenario (2–3 lines)

Input Format:
- Function inputs with types

Output Format:
- Expected return

Constraints:
- Input limits + expected complexity

Examples:
Input: ...
Output: ...
Explanation: ...

Input: ...
Output: ...
Explanation: ...

========================
TEST CASE RULES (CRITICAL)
========================
- ALWAYS include:
  → 2 visible test cases

- Hidden test cases:
  Junior → 2–4  
  Mid → 4–6  
  Senior → 6–10  

- Hidden MUST include:
  - Edge cases
  - Boundary values
  - Large inputs
  - Tricky scenarios

========================
ANTI-CHEATING REQUIREMENT
========================
- Avoid predictable patterns
- Randomize:
  - Input values
  - Array sizes
  - Order of test cases
- Ensure:
  - Same logic, different values
  - No repeated examples

========================
RUBRIC RULES
========================
- Explain grading (NOT solution)
- Mention optimal vs partial credit
- Mention edge case expectations

========================
REASONING RULES
========================
- WHY question fits role
- 1–2 lines only
- DO NOT reveal solution approach

========================
OUTPUT FORMAT (STRICT JSON)
========================
{
 "questions":[
  {
   "type":"mcq",
   "question":"...",
   "options":["...","...","...","..."],
   "correctOption":0,
   "difficulty":"easy|medium|hard",
   "timeLimit":90,
   "points":5,
   "reasoning":"..."
  },
  {
   "type":"coding",
   "title":"...",
   "difficulty":"easy|medium|hard",
   "description":"Problem Statement + Input Format + Output Format + Constraints + Examples",
   "rubric":"...",
   "testCases":[
     {"input":{},"expectedOutput":"","isVisible":true},
     {"input":{},"expectedOutput":"","isVisible":true},
     {"input":{},"expectedOutput":"","isVisible":false},
     {"input":{},"expectedOutput":"","isVisible":false}
   ],
   "timeLimit":1200,
   "reasoning":"..."
  }
 ]
}

Return ONLY JSON.
`;
}

function parseAIResponse(content) {
  if (!content) throw new Error('AI returned empty content');

  let jsonStr = content.trim();

  // Remove markdown
  jsonStr = jsonStr
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  // Extract JSON
  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (match) jsonStr = match[0];

  // Remove control chars (CRITICAL FIX)
  jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, '');

  // Remove trailing commas
  jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

  try {
    const parsed = JSON.parse(jsonStr);
    const arr = parsed.questions || (Array.isArray(parsed) ? parsed : []);
    return arr.map(q => sanitizeQuestion(q));
  } catch (err) {
    console.warn('[parseAIResponse] Direct parse failed');

    // Extract individual objects
    const objects = extractAllTopLevelObjects(jsonStr);

    const valid = [];

    for (const obj of objects) {
      try {
        const cleaned = obj
          .replace(/[\x00-\x1F\x7F]/g, '')
          .replace(/,\s*}/g, '}');

        const parsed = JSON.parse(cleaned);
        valid.push(sanitizeQuestion(parsed));
      } catch {}
    }

    if (valid.length > 0) return valid;

    throw new Error('Invalid JSON from AI');
  }
}

function extractAllTopLevelObjects(str) {
  const objects = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let current = '';
  let started = false;

  // If the string starts with an array bracket, we want to extract objects INSIDE it
  const isArray = str.trim().startsWith('[');
  const startTargetDepth = isArray ? 1 : 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (escaped) {
      if (started) current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      if (started) current += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      if (started) current += char;
      continue;
    }

    if (inString) {
      if (started) current += char;
      continue;
    }

    if (char === '{') {
      if (depth === startTargetDepth) {
        started = true;
        current = '{';
      } else if (started) {
        current += '{';
      }
      depth++;
    } else if (char === '}') {
      depth--;
      if (started) {
        current += '}';
        if (depth === startTargetDepth) {
          objects.push(current);
          current = '';
          started = false;
        }
      }
    } else if (char === '[') {
      if (started) current += '[';
      depth++;
    } else if (char === ']') {
      depth--;
      if (started) {
        current += ']';
        // If we're at depth 0 and started, it was an array at the root, ignore it for individual object extraction
      }
    } else {
      if (started) current += char;
    }
  }

  return objects;
}

function isValidCodingQuestion(q, existingTitles = [], seniority = 'mid') {
  if (!q || q.type === 'mcq' || q.type === 'theory') return false;
  if (!Array.isArray(q.testCases) || q.testCases.length < 2) return false;
  const descText = (q.description || q.question || q.title || '');
const hasPlaceholders = 
    descText.includes('[named parameter]') ||
    descText.includes('[constraint 1') ||
    descText.includes('[constraint 2') ||
    descText.includes('[linked list]') ||
    descText.includes('[array of integers]') ||
    descText.includes('[why this is the answer]') ||
    descText.includes('[maximum number') ||
    descText.includes('[first element');
if (hasPlaceholders) {
    console.warn('[isValidCodingQuestion] Rejected placeholder question:', q.title);
    return false;
}
  const titleOrDesc = (q.title || q.description || q.question || '').toLowerCase();
  const fullText = (q.title || q.description || q.question || '').toLowerCase();

  const isSystemDesignKeywords =
    titleOrDesc.includes('microservices architecture') ||
    titleOrDesc.includes('system architecture') ||
    titleOrDesc.includes('design an architecture') ||
    titleOrDesc.includes('design a system') ||
    titleOrDesc.includes('architect a system') ||
    (titleOrDesc.includes('distributed system') && titleOrDesc.includes('design'));
  if (isSystemDesignKeywords) return false;

  // Filter out HTML/CSS/UI/non-DSA problems
  const isNonDSA = fullText.includes('<table>') || fullText.includes('<tr>') || fullText.includes('<td>') ||
    fullText.includes('css') && (fullText.includes('class') || fullText.includes('style')) ||
    fullText.includes('html') && fullText.includes('parse') ||
    fullText.includes('dom') || fullText.includes('jsx') || fullText.includes('react component') ||
    fullText.includes('ui ') || fullText.includes('user interface') ||
    fullText.includes('selector') && fullText.includes('css') ||
    fullText.includes('button') || fullText.includes('counter component');
  if (isNonDSA) return false;

// Filter out ONLY extremely trivial problems for Junior roles
if (seniority.toLowerCase() === 'junior') {
  const toyProblems = [
    'fizzbuzz',
    'check prime',
    'power of two'
  ];

  // Reject ONLY if exact trivial match
  if (toyProblems.some(toy => titleOrDesc.trim() === toy)) {
    return false;
  }
}

  if (existingTitles.includes(titleOrDesc)) return false;
  return true;
}

async function generateQuestions(role) {
  const { title, jd, skills, questionConfig, seniorityLevel, salary } = role;

  const mcqConfig    = questionConfig?.mcq    || { count: 4 };
  const codingConfig = questionConfig?.coding || { count: 2 };

  const mcqCount     = typeof mcqConfig.count === 'number' ? mcqConfig.count : 4;
  const codingCount  = typeof codingConfig.count === 'number' ? codingConfig.count : 2;

  const skillsList = (skills || []).join(', ');
  const salaryMin  = salary?.min || 0;

  const salaryBand = salaryMin >= 1000000 ? '10L+' : salaryMin >= 400000 ? '4-10L' : '0-4L';
  const seniority  = (seniorityLevel || 'mid').toLowerCase();

  function pickDifficulty(defaultDiff) {
    return defaultDiff || 'medium';
  }

  const codingDiffs = Array.isArray(codingConfig.questions)
    ? codingConfig.questions.map(q => pickDifficulty((q.difficulty || 'medium').toLowerCase()))
    : Array(codingCount).fill(pickDifficulty((codingConfig.difficulty || 'medium').toLowerCase()));

  const mcqDiff = pickDifficulty((mcqConfig.difficulty || 'medium').toLowerCase());

  const basePrompt = (type, count, difficulty) => `You are generating ${type.toUpperCase()} questions.

Generate EXACTLY ${count} ${type} questions.
Difficulty: ALL must be ${difficulty}.
Format: Strict JSON with key "questions" as an array.
`;

  const mcqPrompt   = `You are generating ${mcqCount} technical MCQ questions for a hiring assessment targeting these skills: ${skillsList}.

Seniority: ${seniority || 'mid'}-level.
Required difficulty: ${mcqDiff.toUpperCase()}.

` + buildMCQFormat();
  const codingPrompt = `You are generating ${codingCount} algorithmic coding questions for a hiring assessment targeting these skills: ${skillsList}.
Required difficulties: ${codingDiffs.join(', ')}.
` + buildCodingFormat();

  let generatedMCQs = [];
  let generatedCoding = [];

  try {
    const content = await callAI(mcqPrompt);
    const parsed  = parseAIResponse(content);
    generatedMCQs = parsed.filter(q => (q.type === 'mcq' || Array.isArray(q.options))).slice(0, mcqCount);
  } catch (err) {
    console.warn(`[QuestionGenerator] MCQ generation failed: ${err.message}`);
  }

let generatedCoding = [];

const MAX_RETRIES = 3;

for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  console.log(`[AI Retry] Coding attempt ${attempt}`);

  try {
    const content = await callAI(codingPrompt);

    const parsed = parseAIResponse(content);

    const filtered = parsed.filter(q =>
      isValidCodingQuestion(q)
    );

    if (filtered.length >= codingCount) {
      generatedCoding = filtered.slice(0, codingCount);
      break;
    }

    console.warn(`[Retry] Only got ${filtered.length}/${codingCount} valid coding`);

    // 🔥 IMPROVED RETRY PROMPT (VERY IMPORTANT)
    codingPrompt += `

FIX YOUR OUTPUT:
- Your previous response had INVALID JSON or INVALID questions
- DO NOT include placeholders like [named parameter]
- DO NOT include broken strings or newlines
- Output STRICT VALID JSON
- Ensure EXACTLY ${codingCount} VALID coding questions
`;

  } catch (err) {
    console.warn(`[Retry Error] ${err.message}`);
  }
}

// FINAL HARD CHECK
if (generatedCoding.length < codingCount) {
  throw new Error(
    `AI failed after ${MAX_RETRIES} retries. Got ${generatedCoding.length}/${codingCount} coding questions`
  );
}
  console.log(`[QuestionGenerator] MCQ generated so far: ${generatedMCQs.length}/${mcqCount}`);
  if (generatedMCQs.length < mcqCount) {
    console.log(`[QuestionGenerator] MCQ shortfall - calling ensureQuestionCount for ${mcqCount - generatedMCQs.length} more MCQs`);
    const tmpMcq = await ensureQuestionCount(generatedMCQs, mcqCount, 'mcq', { skillsList, difficulty: mcqDiff });
    console.log(`[QuestionGenerator] ensureQuestionCount returned ${tmpMcq.length} MCQs (was ${generatedMCQs.length})`);
    generatedMCQs = tmpMcq;
  }
  console.log(`[QuestionGenerator] Coding generated so far: ${generatedCoding.length}/${codingCount}`);
  if (generatedCoding.length < codingCount) {
    console.log(`[QuestionGenerator] Coding shortfall - calling ensureQuestionCount for ${codingCount - generatedCoding.length} more coding questions`);
    const tmpCoding = await ensureQuestionCount(generatedCoding, codingCount, 'coding', { skillsList, difficulties: codingDiffs });
    console.log(`[QuestionGenerator] ensureQuestionCount returned ${tmpCoding.length} coding (was ${generatedCoding.length})`);
    generatedCoding = tmpCoding
      .filter((q, i, arr) => isValidCodingQuestion(q, generatedCoding.slice(0, i).map(x => (x.title || x.description || x.question || '').toLowerCase())))
      .map((q, i) => {
        const diff = (codingDiffs[generatedCoding.length + i] || 'medium').toLowerCase();
        q.difficulty = diff;
        if (diff === 'easy')   q.timeLimit = 1200, q.points = 15;
        else if (diff === 'hard') q.timeLimit = 2700, q.points = 25;
        else                      q.timeLimit = 1800, q.points = 20;
        return q;
      })
      .slice(0, codingCount);
  }

  const finalQuestions = [
    ...generatedMCQs.map(q => sanitizeQuestion({ ...q, type: 'mcq' })),
    ...generatedCoding.map(q => sanitizeQuestion({ ...q, type: 'coding' }))
  ];

  console.log(`[QuestionGenerator] Final questions: ${finalQuestions.length} (MCQs: ${generatedMCQs.length}, Coding: ${generatedCoding.length})`);

  if (finalQuestions.length === 0) {
    throw new Error('All AI models failed to generate questions. Please try again later.');
  }

  if (generatedMCQs.length < mcqCount || generatedCoding.length < codingCount) {
    throw new Error(`AI models failed to generate sufficient questions. MCQs: ${generatedMCQs.length}/${mcqCount}, Coding: ${generatedCoding.length}/${codingCount}. Please try again.`);
  }

  return finalQuestions;
}

function buildMCQFormat() {
  return `CRITICAL: Every question must test a CONCEPT, SYNTAX, ALGORITHM, or COMPARISON from the required skills. NEVER mention company names, job titles, projects, role descriptions, or daily tasks.

MCQ OPTION QUALITY RULES:
- All 4 options must be technically plausible to someone who partially understands the concept.
- Wrong options must represent common misconceptions or close-but-incorrect alternatives.
- GOOD wrong option: "To handle state changes in a component" (close but wrong for useEffect).
- BAD wrong option: "To create a new component" (obviously wrong).
- Test: A developer with 6 months experience should need to think to identify the correct answer.
- The correct answer should not be immediately obvious — it should require genuine knowledge.

GOOD: "What is the output of typeof [] in JavaScript?"
BAD: "What language is used in the ACME project?" ❌

Output ONLY valid JSON in this format:
{
  "questions": [
    {
      "type": "mcq",
      "question": "Full technical question here?",
      "options": ["Correct answer", "Wrong answer A", "Wrong answer B", "Wrong answer C"],
      "correctOption": 0,
      "difficulty": "easy|medium|hard",
      "timeLimit": 90,
      "points": 5,
      "reasoning": "Tests X concept from the required skills."
    }
  ]
}`;
}

function buildCodingFormat() {
  return `STRICT OUTPUT: Return ONLY a raw JSON object — no markdown code fences, no prose before/after, no backticks.

CRITICAL RESTRICTION — DSA/ALGORITHMS ONLY:
- !! FORBIDDEN !!: HTML parsing, CSS manipulation, DOM manipulation, React/Vue components, UI problems
- !! FORBIDDEN !!: File system access, networking, server-side code, SQL queries
- !! FORBIDDEN !!: String-to-HTML conversion, CSS class combinations, selector problems
- ONLY ALLOWED: Pure data transformation, string parsing (non-HTML), array manipulation, tree/graph algorithms, DP, recursion, sorting, searching, sliding window, hashing, stack/queue problems
- The function must take inputs and RETURN a data value — not build components or modify state

Output ONLY valid JSON in this format. Must include BOTH starterCode.javascript and starterCode.python and AT LEAST 4 testCases (2 visible, 2 hidden) and update the count of test cases based on problem difficulty upto max of 8 test cases as hidden in format (2 visible + 10-15 hidden).

TIME LIMITS: easy=1200s (20min), medium=1800s (30min), hard=2700s (45min). Use the correct timeLimit for each question's difficulty.

RUBRIC RULES:
- Every coding question MUST include a "rubric" field.
- Rubric explains what full credit vs partial credit looks like.
- Format: "Optimal solution uses [approach] for O([complexity]). [Alternative approach] gets partial credit. [Edge case] must be handled."
- Example: "Optimal solution uses a HashMap for O(n) time O(n) space. Brute force O(n²) nested loop gets 50% credit. Must handle empty array edge case."
- Rubric must NOT give away the solution — just describe the expected quality level.

CODING DESCRIPTION FORMAT — MANDATORY:
Every coding question description MUST be structured exactly like this:

Problem Statement:
[2-3 sentences describing the problem scenario clearly]

Input Format:
[List exactly what the function receives — parameter names, types, constraints]

Output Format:
[List exactly what should be returned — type and conditions]

CRITICAL JSON RULES:
- Do NOT include real line breaks inside strings
- Use \\n instead
- Output must be directly parsable using JSON.parse()
- Do NOT truncate JSON

Constraints:
- [constraint 1 with exact bounds]
- [constraint 2]
- [time/space complexity expectation if relevant]

Examples:
Input: [named parameter] = [value], [named parameter] = [value]
Output: [expected output]
Explanation: [why this is the answer]

Input: [named parameter] = [value]
Output: [expected output]
Explanation: [why this is the answer]

DO NOT write everything in one paragraph.
DO NOT skip any section.
Each section MUST start on a new line with the section header followed by a colon.

{
  "questions": [
    {
      "type": "coding",
      "title": "...",
      "difficulty": "easy|medium|hard",
      "description": "Full LeetCode-style statement: Problem Statement, Input, Output, Constraints, Examples",
      "rubric": "...",
      "starterCode": { "javascript": "...", "python": "..." },
      "testCases": [
        { "input": ..., "expectedOutput": ..., "isVisible": true },
        { "input": ..., "expectedOutput": ..., "isVisible": true },
        { "input": ..., "expectedOutput": ..., "isVisible": false },
        { "input": ..., "expectedOutput": ..., "isVisible": false }
      ],
      "timeLimit": 1200|1800|2700,
      "reasoning": "..."
    }
  ]
}`;
}

async function ensureQuestionCount(current, required, type, roleData) {
  if (current.length >= required) return current;
  
  const missing = required - current.length;
  const coveredTopics = current
    .map(q => (q.title || q.question || '').split(' ').slice(0, 5).join(' '))
    .join(', ');
  const skills = roleData.skillsList || '';
  const diff = roleData.difficulty || 'medium';

  console.log(`[ensureQuestionCount] Generating ${missing} more ${type} questions`);

  try {
    let prompt;

    if (type === 'mcq') {
      prompt = `Generate EXACTLY ${missing} technical MCQ questions for skills: ${skills}.
Required difficulty: ${diff.toUpperCase()}.
Avoid these already covered topics: ${coveredTopics}.

${buildMCQFormat()}`;
    } else {
      const difficulties = (roleData.difficulties || [diff]).slice(0, missing);
      
      // Use the FULL coding prompt — same as original generateQuestions
      prompt = `You are generating ${missing} algorithmic coding questions for a hiring assessment targeting these skills: ${skills}.
Required difficulties: ${difficulties.join(', ')}.
Avoid these already covered topics: ${coveredTopics}.

CRITICAL: Do NOT use placeholder text like [named parameter], [constraint 1], [linked list], [array of integers] etc.
Write REAL concrete problem statements with actual variable names, real constraints (e.g. 1 <= n <= 1000), and real examples.

${buildCodingFormat()}`;
    }

    const content = await callAI(prompt);
    const parsed = parseAIResponse(content);

    const add = parsed.filter(q =>
      type === 'mcq'
        ? (q.type === 'mcq' || Array.isArray(q.options))
        : isValidCodingQuestion(q, current.map(x => (x.title || '').toLowerCase()))
    );

    console.log(`[ensureQuestionCount] Got ${add.length} valid ${type} questions`);
    return [...current, ...add].slice(0, required);

  } catch (err) {
    console.warn(`[ensureQuestionCount] Failed: ${err.message}`);
    throw new Error(`Failed to generate additional ${type} questions: ${err.message}`);
  }
}

function buildMCQPrompt({ skillsList, seniority, mcqCount, difficulty }) {
  const seniorityLabel = seniority === 'junior' ? '0–2 years' : seniority === 'senior' ? '6+ years' : '3–5 years';
  const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  return `You are generating ${mcqCount} technical multiple-choice questions for a hiring assessment targeting: ${skillsList}.

Generate EXACTLY ${mcqCount} questions.
ALL questions must be ${diffLabel.toUpperCase()} difficulty.

CRITICAL FORMAT RULES — Every question MUST follow these EXACTLY:
1. The question text must test a specific CONCEPT, SYNTAX, ALGORITHM, or COMPARISON from the required skills listed above.
2. Questions must NOT mention any company name, job title, job description, role, project, team, or daily tasks.
3. Questions must NOT ask "What is the primary language used in X project?" or "Which skill is required for Y role?"
4. Each option must be a technically plausible answer — only ONE correct.
5. The correct answer must be the one relevant to the required skills.

MCQ OPTION QUALITY RULES:
- All 4 options must be technically plausible to someone who partially understands the concept.
- Wrong options must represent common misconceptions or close-but-incorrect alternatives.
- GOOD wrong option: "To handle state changes in a component" (close but wrong for useEffect).
- BAD wrong option: "To create a new component" (obviously wrong).
- Test: A developer with 6 months experience should need to think to identify the correct answer.
- The correct answer should not be immediately obvious — it should require genuine knowledge.

GOOD examples (skills-based):
- "What is the output of: console.log(typeof null) in JavaScript?" [JavaScript]
- "Which of the following is a valid way to declare a TypeScript interface?" [TypeScript]
- "What is the time complexity of searching in a balanced BST?" [Algorithms]
- "In React, what hook would you use for side effects?" [React]
- "Which HTTP method is typically used to update a resource?" [REST API]
- "What does the useEffect dependency array control?" [React];

BAD examples (job-description-based — DO NOT generate these):
- "What language is used in the ACME project?" ❌
- "Which skill is listed as required in the job description?" ❌
- "What is the primary responsibility in this role?" ❌

Output ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "questions": [
    {
      "type": "mcq",
      "question": "Full technical question here?",
      "options": ["Correct answer", "Wrong answer A", "Wrong answer B", "Wrong answer C"],
      "correctOption": 0,
      "difficulty": "${diffLabel.toLowerCase()}",
      "timeLimit": 90,
      "points": 5,
      "reasoning": "Tests X concept from the required skills."
    }
  ]
}

Return ONLY the JSON. No markdown fences. No conversational text.`;
}

async function generateTheoryFromCode(code, language, problemStatement) {
  const prompt = `Code submitted:\n\n${code}\n\nGenerate 2 technical follow-up questions about this code. JSON: { "questions": [{ "type": "theory", "question": "...", "rubric": "...", "points": 10, "timeLimit": 180 }] }`;

  try {
    const content = await callAI(prompt);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const parsed = JSON.parse(jsonMatch[0]);
    return (parsed.questions || []).map(q => sanitizeQuestion(q));
  } catch (err) {
    console.warn(`[QuestionGenerator] Theory generation failed: ${err.message}`);
    return [];
  }
}

module.exports = { generateQuestions, generateTheoryFromCode };
