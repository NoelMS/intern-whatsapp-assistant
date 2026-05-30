// AI Orchestrator - manages fallback chain across multiple providers
const groqProvider = require('./groq-provider');
const grokProvider = require('./grok-provider');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

/**
 * Main orchestrator function - tries multiple AI providers in sequence
 * Fallback chain:
 * 1. Groq (primary) - fast, free tier
 * 2. X.AI Grok (secondary) - fallback if Groq fails/rate limited
 * 3. Generic message (ultimate fallback)
 */
async function orchestrateAIResponse({ message, intern, destination }) {
  const startTime = Date.now();
  const providers = [];

  try {
    // Try Groq first (primary)
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
        logProviderChain(message, providers);
        return groqResult.response;
      }
    } catch (error) {
      const isRateLimit = error.message === 'GROQ_RATE_LIMIT';
      providers.push({
        provider: 'groq',
        status: isRateLimit ? 'rate_limit' : 'error',
        error: error.message
      });

      if (isRateLimit) {
        console.log('⚠️ [Orchestrator] Groq rate limited, trying next provider...');
      } else {
        console.log('⚠️ [Orchestrator] Groq failed, trying next provider...');
      }
    }

    // Try Grok (secondary) if Groq didn't work
    try {
      const grokResult = await grokProvider.generateResponse({
        message,
        intern,
        destination
      });
      
      if (grokResult) {
        const elapsed = Date.now() - startTime;
        console.log(`✓ [Orchestrator] Success with Grok (${elapsed}ms total)`);
        providers.push({
          provider: 'grok',
          status: 'success',
          time: grokResult.time,
          tokens: grokResult.tokens
        });
        logProviderChain(message, providers);
        return grokResult.response;
      }
    } catch (error) {
      const isRateLimit = error.message === 'GROK_RATE_LIMIT';
      providers.push({
        provider: 'grok',
        status: isRateLimit ? 'rate_limit' : 'error',
        error: error.message
      });

      if (isRateLimit) {
        console.log('⚠️ [Orchestrator] Grok rate limited, using fallback message...');
      } else {
        console.log('⚠️ [Orchestrator] Grok failed, using fallback message...');
      }
    }

    // All providers exhausted - return generic fallback
    const elapsed = Date.now() - startTime;
    console.log(`❌ [Orchestrator] All providers exhausted (${elapsed}ms total), returning fallback`);
    providers.push({
      provider: 'fallback',
      status: 'generic_message'
    });
    logProviderChain(message, providers);
    
    return getGenericFallback(destination);

  } catch (error) {
    console.error('❌ [Orchestrator] Unexpected error:', error.message);
    return getGenericFallback(destination);
  }
}

/**
 * Log the provider chain execution for monitoring
 */
function logProviderChain(message, providers) {
  const chain = providers.map(p => {
    if (p.status === 'success') {
      return `${p.provider}(${p.time}ms)`;
    } else if (p.status === 'rate_limit') {
      return `${p.provider}(RATE_LIMIT)`;
    } else if (p.status === 'error') {
      return `${p.provider}(ERROR)`;
    } else {
      return `${p.provider}(FALLBACK)`;
    }
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
  return `Service temporarily unavailable. Please try again in a moment.

If you need immediate assistance, contact your coordinator at ${destination.coordinator.phone} or call campus security at ${destination.emergency_info.campus_security}.`;
}

module.exports = { orchestrateAIResponse };
