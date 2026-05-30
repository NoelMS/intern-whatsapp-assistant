// AI Orchestrator - manages provider chain
const groqProvider = require('./groq-provider');

/**
 * Main orchestrator function - tries Groq, falls back to generic message
 * Fallback chain:
 * 1. Groq (primary) - fast, free tier
 * 2. Generic message (fallback)
 */
async function orchestrateAIResponse({ message, intern, destination }) {
  const startTime = Date.now();
  const providers = [];

  try {
    console.log('🔄 [Orchestrator] Starting AI provider chain...');

    try {
      const groqResult = await groqProvider.generateResponse({
        message,
        intern,
        destination
      });

      if (groqResult) {
        const elapsed = Date.now() - startTime;
        console.log(`✓ [Orchestrator] Success with Groq (${elapsed}ms total)`);
        providers.push({
          provider: 'groq',
          status: 'success',
          time: groqResult.time,
          tokens: groqResult.tokens
        });
        logProviderChain(providers);
        return groqResult.response;
      }
    } catch (error) {
      const isRateLimit = error.message === 'GROQ_RATE_LIMIT';
      providers.push({
        provider: 'groq',
        status: isRateLimit ? 'rate_limit' : 'error',
        error: error.message
      });
      console.log(`⚠️ [Orchestrator] Groq ${isRateLimit ? 'rate limited' : 'failed'}, using fallback message...`);
    }

    // All providers exhausted - return generic fallback
    const elapsed = Date.now() - startTime;
    console.log(`❌ [Orchestrator] All providers exhausted (${elapsed}ms total), returning fallback`);
    providers.push({ provider: 'fallback', status: 'generic_message' });
    logProviderChain(providers);

    return getGenericFallback(destination);

  } catch (error) {
    console.error('❌ [Orchestrator] Unexpected error:', error.message);
    return getGenericFallback(destination);
  }
}

/**
 * Log the provider chain execution for monitoring
 */
function logProviderChain(providers) {
  const chain = providers.map(p => {
    if (p.status === 'success') return `${p.provider}(${p.time}ms)`;
    if (p.status === 'rate_limit') return `${p.provider}(RATE_LIMIT)`;
    if (p.status === 'error') return `${p.provider}(ERROR)`;
    return `${p.provider}(FALLBACK)`;
  }).join(' → ');

  const successProvider = providers.find(p => p.status === 'success');
  const logMsg = successProvider
    ? `✓ Query handled by: ${chain}`
    : `⚠️ All providers failed: ${chain}`;

  console.log(`📊 [Chain] ${logMsg}`);
}

/**
 * Generic fallback message when all providers fail
 */
function getGenericFallback(destination) {
  return `Sorry, I'm unable to answer that right now. Please try again in a moment.\n\nFor immediate help, contact your coordinator at ${destination.coordinator.phone} or campus security at ${destination.emergency_info.campus_security}.`;
}

module.exports = { orchestrateAIResponse };

