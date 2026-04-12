const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getProviderPriority() {
  const order = process.env.AI_PROVIDER_ORDER || 'openrouter,claude';
  const allowed = new Set(['openrouter','claude']);
  return order.split(',').map(p => p.trim().toLowerCase()).filter(p => allowed.has(p));
}

async function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OpenRouter API key not configured');
  const modelName = process.env.OPENROUTER_MODEL_NAME || 'google/gemini-2.0-flash-001';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://hirevault.ai',
      'X-Title': 'HireVault Logic Verification'
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1500
    })
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${err}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Anthropic API key not configured');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL_NAME || 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      temperature: 0.1,
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

async function callAIWithFallback(prompt) {
  const providers = getProviderPriority();

  for (const provider of providers) {
    try {
      let content;

      if (provider === 'openrouter') {
        content = await callOpenRouter(prompt);
      } else if (provider === 'claude') {
        content = await callClaude(prompt);
      }

      if (content) {
        return content;
      }
    } catch (err) {
      console.warn(`[LogicVerification] ${provider} failed: ${err.message}`);
      continue;
    }
  }

  throw new Error('All AI providers failed for logic verification');
}

async function generateLogicVerification(codingAnswers) {
  const inputData = codingAnswers.map(ans => ({
    problemNumber: ans.questionIndex + 1,
    problemTitle: ans.questionTitle || 'Coding Problem',
    problemStatement: ans.questionText || '',
    candidateCode: ans.code || '',
    rubric: ans.rubric
  }));

  const prompt = `
You are an expert technical interviewer analyzing a candidate's code submission.

INPUT:
${JSON.stringify(inputData, null, 2)}

TASK:
Analyze the candidate's code for each problem. You MUST generate EXACTLY 3 verification questions for EVERY problem in the input list, even if the candidate's code is minimal (e.g., just "return 2").

CRITICAL RULES FOR QUESTION GENERATION:
1. QUANTITY: You MUST return exactly 3 questions per problem in the "questions" array. No more, no less.
2. RELEVANCY:
   - Read the candidate's actual code carefully.
   - If they wrote minimal code (like "return 2"), ask about the algorithmic logic they WOULD have used to solve the actual problem statement, and why they chose a static return instead of the required logic.
   - If they wrote logic, your questions MUST reference their specific variable names, loops, or logic branches.
3. STRUCTURE:
   - Question 1 (Follow-up): Ask about the core algorithm choice or a specific line in their code.
   - Question 2 (Follow-up): Ask about time/space complexity or a specific edge case relevant to the problem.
   - Question 3 (Trap): Make a deliberately FALSE technical claim about their code or the problem's requirements to see if they catch it.
4. NATURAL TONE: Make questions sound like a senior engineer during a live interview. Use phrases like "I noticed you used...", "How would your approach handle...", "Wait, I see that your code...".

STRICT JSON OUTPUT FORMAT:
{
  "logic_verification": [
    {
      "problem_number": 1,
      "problem_title": "...",
      "time_per_question_seconds": 120,
      "questions": [
        { "type": "follow_up", "question": "..." },
        { "type": "follow_up", "question": "..." },
        { "type": "trap", "question": "..." }
      ]
    }
  ]
}

IMPORTANT:
- Return ONLY valid JSON.
- DO NOT skip any problems.
- Ensure the questions are technically deep and specific to the problem statement.
`;

  try {
    const content = await callAIWithFallback(prompt);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON format received from AI');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.logic_verification;
  } catch (err) {
    console.error('[LogicVerification] All providers failed:', err);
    throw new Error('Logic verification generation failed. All providers exhausted.');
  }
}

module.exports = { generateLogicVerification };
