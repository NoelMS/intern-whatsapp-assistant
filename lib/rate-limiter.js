// Rate limiting for per-user message throttling
const rateLimitStore = new Map();

/**
 * Check if user has exceeded rate limit
 * @param {string} phone - User phone number
 * @param {number} limitSeconds - Seconds between allowed requests (default 5)
 * @returns {boolean} - true if allowed, false if rate limited
 */
function checkRateLimit(phone, limitSeconds = 5) {
  const now = Date.now();
  const lastRequest = rateLimitStore.get(phone) || 0;
  const timeSinceLastRequest = (now - lastRequest) / 1000;
  
  if (timeSinceLastRequest < limitSeconds) {
    console.log(`⏱️ Rate limit hit for ${phone} (${timeSinceLastRequest.toFixed(1)}s since last)`);
    return false;
  }
  
  rateLimitStore.set(phone, now);
  console.log(`✅ Rate limit check passed for ${phone}`);
  return true;
}

/**
 * Get current rate limit status for a phone number
 * @param {string} phone - User phone number
 * @param {number} limitSeconds - Rate limit window in seconds
 * @returns {object} - Object with allowed flag and secondsUntilNext
 */
function getRateLimitStatus(phone, limitSeconds = 5) {
  const now = Date.now();
  const lastRequest = rateLimitStore.get(phone) || 0;
  const timeSinceLastRequest = Math.max(0, limitSeconds - (now - lastRequest) / 1000);
  
  return {
    allowed: timeSinceLastRequest <= 0,
    secondsUntilNext: timeSinceLastRequest.toFixed(1)
  };
}

/**
 * Clear rate limit for a specific user or all users
 * @param {string} phone - Optional phone number to clear. If not provided, clears all.
 */
function clearRateLimit(phone) {
  if (phone) {
    rateLimitStore.delete(phone);
    console.log(`🔄 Rate limit cleared for ${phone}`);
  } else {
    rateLimitStore.clear();
    console.log(`🔄 All rate limits cleared`);
  }
}

/**
 * Get rate limit statistics
 * @returns {object} - Stats about rate limiter state
 */
function getStats() {
  return {
    totalLimited: rateLimitStore.size,
    entries: Array.from(rateLimitStore.entries()).map(([phone, timestamp]) => ({
      phone: `${phone.substring(0, 5)}***${phone.substring(phone.length - 3)}`,
      lastRequest: new Date(timestamp).toISOString()
    }))
  };
}

module.exports = {
  checkRateLimit,
  getRateLimitStatus,
  clearRateLimit,
  getStats
};
