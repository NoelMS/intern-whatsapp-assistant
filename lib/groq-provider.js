// Groq AI integration (primary provider) — RAG mode
// Answers are grounded strictly in FAQ + destination data; no general knowledge used.
const Groq = require('groq-sdk');
const { searchTopFAQs } = require('./data-loader');

const MODEL = 'llama-3.1-8b-instant';
const TIMEOUT_MS = 8000;

let groqClient = null;

function getGroqClient() {
  if (!groqClient && process.env.GROQ_API_KEY) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }
  return groqClient;
}

async function generateResponse({ message, intern, destination }) {
  const startTime = Date.now();

  try {
    if (!process.env.GROQ_API_KEY) {
      console.warn('GROQ_API_KEY not configured, skipping Groq provider');
      return null;
    }

    const client = getGroqClient();
    if (!client) {
      console.warn('GROQ_API_KEY not configured');
      return null;
    }

    // ── RAG: retrieve the most relevant FAQs for this query ──────────────────
    const topFAQs = searchTopFAQs(destination.id, message, 5);
    console.log(`📚 [Groq RAG] Retrieved ${topFAQs.length} relevant FAQs as context`);
    // ─────────────────────────────────────────────────────────────────────────

    const systemPrompt = buildRAGPrompt(intern, destination, topFAQs);

    console.log('🚀 [Groq] Calling Groq AI (llama-3.1-8b-instant) in RAG mode...');

    const promise = client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.3,   // lower = more faithful to provided context
      max_tokens: 300,
      top_p: 0.9
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Groq request timeout')), TIMEOUT_MS)
    );

    const response = await Promise.race([promise, timeoutPromise]);
    const elapsed = Date.now() - startTime;

    if (!response.choices?.[0]?.message?.content) {
      console.warn('Groq: No response content in completion');
      return null;
    }

    const generatedText = response.choices[0].message.content.trim();

    console.log(`✓ [Groq RAG] Response in ${elapsed}ms (${response.usage?.total_tokens || 0} tokens)`);

    return {
      response: generatedText,
      provider: 'groq',
      time: elapsed,
      tokens: response.usage?.total_tokens || 0,
      model: MODEL
    };

  } catch (error) {
    const elapsed = Date.now() - startTime;
    const errorMsg = error.message || String(error);

    if (error.status === 429 || errorMsg.includes('rate_limit') || errorMsg.includes('429')) {
      console.warn(`⚠️ [Groq] Rate limit hit after ${elapsed}ms`);
      const err = new Error('GROQ_RATE_LIMIT');
      err.provider = 'groq';
      err.elapsed = elapsed;
      throw err;
    }

    if (error.status === 401 || errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
      console.error(`❌ [Groq] Authentication failed - check GROQ_API_KEY`);
      return null;
    }

    console.warn(`⚠️ [Groq] Error after ${elapsed}ms: ${errorMsg}`);
    return null;
  }
}

/**
 * Build the RAG system prompt.
 * The AI is given only the retrieved FAQs + key destination facts.
 * It is explicitly told NOT to use outside knowledge.
 */
function buildRAGPrompt(intern, destination, topFAQs) {
  let faqContext = '';
  if (topFAQs.length > 0) {
    faqContext = topFAQs
      .map((faq, i) => `[FAQ ${i + 1}] Q: ${faq.question}\nA: ${faq.answer}`)
      .join('\n\n');
  } else {
    faqContext = 'No relevant FAQ entries found for this query.';
  }

  return `You are a helpful assistant for ${intern.name}, an intern at ${destination.name}.

STRICT INSTRUCTIONS:
- Answer ONLY using the information provided in the KNOWLEDGE BASE below.
- Do NOT use any outside knowledge, general facts, or assumptions.
- If the knowledge base does not contain enough information to answer, say:
  "I don't have specific information about that. Please contact your coordinator at ${destination.coordinator.phone} for help."
- Keep responses under 200 words.
- Use plain text only — no markdown, no asterisks, no bullet symbols.
- Be friendly and practical.

INTERN: ${intern.name} | COORDINATOR: ${destination.coordinator.name} (${destination.coordinator.phone})
CAMPUS SECURITY: ${destination.emergency_info.campus_security} | AMBULANCE: ${destination.emergency_info.ambulance}

KNOWLEDGE BASE (answer strictly from this):
${faqContext}`;
}

module.exports = { generateResponse };
