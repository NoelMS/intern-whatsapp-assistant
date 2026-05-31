// Loads and queries JSON data files
const fs = require('fs');
const path = require('path');
const { initializeVectorStore } = require('./vector-search');

// Cache for data to avoid reading files repeatedly
let internsCache = null;
let destinationsCache = null;
let faqsCache = null;
let vectorStoreInitialized = false;

function loadInterns() {
  if (!internsCache) {
    try {
      const dataPath = path.join(__dirname, '../data/interns.json');
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      internsCache = data.interns || [];
      console.log(`✓ Loaded ${internsCache.length} interns`);
    } catch (error) {
      console.error('❌ Error loading interns:', error.message);
      internsCache = [];
    }
  }
  return internsCache;
}

function loadDestinations() {
  if (!destinationsCache) {
    try {
      const dataPath = path.join(__dirname, '../data/destinations.json');
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      destinationsCache = data.destinations || [];
      console.log(`✓ Loaded ${destinationsCache.length} destinations`);
      
      // Initialize vector store for semantic search (async, non-blocking)
      if (!vectorStoreInitialized) {
        vectorStoreInitialized = true;
        initializeVectorStore(destinationsCache).catch(err => {
          console.error('⚠️ Vector store initialization failed:', err.message);
        });
      }
    } catch (error) {
      console.error('❌ Error loading destinations:', error.message);
      destinationsCache = [];
    }
  }
  return destinationsCache;
}

function loadFAQs() {
  if (!faqsCache) {
    try {
      const dataPath = path.join(__dirname, '../data/faqs.json');
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      faqsCache = data.faqs || [];
      console.log(`✓ Loaded ${faqsCache.length} FAQs`);
    } catch (error) {
      console.error('❌ Error loading FAQs:', error.message);
      faqsCache = [];
    }
  }
  return faqsCache;
}

// Reload data (useful when files are updated)
function reloadData() {
  internsCache = null;
  destinationsCache = null;
  faqsCache = null;
  console.log('🔄 Data cache cleared, will reload on next request');
}

function getInternByPhone(phone) {
  // Normalize phone number (remove whatsapp: prefix if present)
  const cleanPhone = phone.replace('whatsapp:', '');
  console.log(`🔍 Looking for intern with phone: "${cleanPhone}"`);
  
  const interns = loadInterns();
  console.log(`📋 Total interns loaded: ${interns.length}`);
  
  if (interns.length > 0) {
    console.log(`📋 Intern phones in system: ${interns.map(i => `"${i.phone}"`).join(', ')}`);
  }
  
  const intern = interns.find(i => {
    const match = i.phone === cleanPhone;
    console.log(`  Checking: "${i.phone}" === "${cleanPhone}" ? ${match}`);
    return match;
  });
  
  if (!intern) {
    console.log(`⚠️ No intern found for phone: "${cleanPhone}"`);
  } else {
    console.log(`✅ Found intern: ${intern.name}`);
  }
  
  return intern || null;
}

function getDestination(destinationId) {
  const destinations = loadDestinations();
  
  const destination = destinations.find(d => d.id === destinationId);
  
  if (!destination) {
    console.log(`⚠️ No destination found for ID: ${destinationId}`);
  }
  
  return destination || null;
}

function searchFAQs(destinationId, query) {
  const faqs = loadFAQs();
  
  const faqsForDestination = faqs.filter(faq => faq.destination_id === destinationId);
  console.log(`ℹ️ Found ${faqsForDestination.length} FAQs for destination: ${destinationId}`);
  
  if (!query || faqsForDestination.length === 0) return null;

  const queryLower = query.toLowerCase();

  // Detect combined intent flags for disambiguation
  const foodKeywords = ['eat', 'food', 'restaurant', 'dining', 'cafe', 'meal', 'places to eat'];
  const airportKeywords = ['airport'];
  const queryHasFood = foodKeywords.some(k => queryLower.includes(k));
  const queryHasAirport = airportKeywords.some(k => queryLower.includes(k));
  const isAirportDiningQuery = queryHasFood && queryHasAirport;

  // Score each FAQ by keyword relevance
  const scored = faqsForDestination.map(faq => {
    const questionLower = faq.question.toLowerCase();
    const answerLower = faq.answer.toLowerCase();
    let score = 0;

    // Split query into meaningful words (3+ chars), excluding the destination
    // city name — it appears in almost every FAQ so it's noise, not a signal
    const destinationNames = ['coimbatore']; // expand if more destinations added
    const queryWords = queryLower.split(/\s+/).filter(w => w.length >= 3 && !destinationNames.includes(w));

    // Score by word matches in question (weighted higher) and answer
    for (const word of queryWords) {
      if (questionLower.includes(word)) score += 30;
      if (answerLower.includes(word)) score += 10;
    }

    // Bonus for common topic phrases
    const topicPhrases = [
      { patterns: ['eat', 'food', 'restaurant', 'dining', 'cafe', 'meal'], bonus: 20 },
      { patterns: ['airport', 'flight', 'arrival'], bonus: 20 },
      { patterns: ['wifi', 'internet', 'password'], bonus: 20 },
      { patterns: ['hospital', 'medical', 'doctor'], bonus: 20 },
      { patterns: ['bus', 'train', 'taxi', 'transport', 'travel'], bonus: 20 },
      { patterns: ['hostel', 'curfew', 'room'], bonus: 20 },
      { patterns: ['emergency', 'police', 'ambulance'], bonus: 20 },
      { patterns: ['bank', 'atm', 'money'], bonus: 20 },
      { patterns: ['coordinator', 'faculty', 'office'], bonus: 20 },
      { patterns: ['grocery', 'groceries', 'supermarket', 'shop'], bonus: 20 },
      { patterns: ['sim', 'mobile', 'recharge', 'phone'], bonus: 20 },
      { patterns: ['weather', 'climate', 'temperature'], bonus: 20 },
      { patterns: ['mall', 'malls', 'shopping', 'market', 'store'], bonus: 20 },
      { patterns: ['explore', 'visit', 'attraction', 'tourist', 'sightseeing', 'places to visit'], bonus: 20 },
    ];

    for (const topic of topicPhrases) {
      const queryHasTopic = topic.patterns.some(p => queryLower.includes(p));
      const faqHasTopic = topic.patterns.some(p => questionLower.includes(p));
      if (queryHasTopic && faqHasTopic) score += topic.bonus;
    }

    // ── Disambiguation: airport + dining queries ──────────────────────────────
    // When the user asks about eating near/at the airport specifically, strongly
    // prefer FAQs that mention BOTH eating AND airport over generic dining FAQs.
    if (isAirportDiningQuery) {
      const faqHasAirport = airportKeywords.some(k => questionLower.includes(k));
      const faqHasFood = foodKeywords.some(k => questionLower.includes(k) || answerLower.includes(k));
      if (faqHasAirport && faqHasFood) {
        // This FAQ specifically covers airport dining — big boost
        score += 80;
      } else if (!faqHasAirport && faqHasFood) {
        // This FAQ covers general dining but NOT airport — penalise to avoid false match
        score -= 50;
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    return { ...faq, score };
  });

  // Return best match
  const best = scored.sort((a, b) => b.score - a.score)[0];
  console.log(`🏆 Best FAQ match: "${best.question}" (score: ${best.score})`);
  return best;
}

/**
 * Return the top N scored FAQs for a destination — used as RAG context.
 * Unlike searchFAQs(), this returns multiple results with their scores.
 * @param {string} destinationId
 * @param {string} query
 * @param {number} topN - max results to return (default 5)
 * @returns {Array} - top FAQs sorted by score, each with { id, question, answer, score }
 */
function searchTopFAQs(destinationId, query, topN = 5) {
  const faqs = loadFAQs();
  const faqsForDestination = faqs.filter(faq => faq.destination_id === destinationId);

  if (!query || faqsForDestination.length === 0) return [];

  const queryLower = query.toLowerCase();

  // Detect combined intent flags (same logic as searchFAQs)
  const foodKeywords = ['eat', 'food', 'restaurant', 'dining', 'cafe', 'meal', 'places to eat'];
  const airportKeywords = ['airport'];
  const queryHasFood = foodKeywords.some(k => queryLower.includes(k));
  const queryHasAirport = airportKeywords.some(k => queryLower.includes(k));
  const isAirportDiningQuery = queryHasFood && queryHasAirport;

  const destinationNames = ['coimbatore'];
  const queryWords = queryLower.split(/\s+/).filter(w => w.length >= 3 && !destinationNames.includes(w));

  const topicPhrases = [
    { patterns: ['eat', 'food', 'restaurant', 'dining', 'cafe', 'meal'], bonus: 20 },
    { patterns: ['airport', 'flight', 'arrival'], bonus: 20 },
    { patterns: ['wifi', 'internet', 'password'], bonus: 20 },
    { patterns: ['hospital', 'medical', 'doctor'], bonus: 20 },
    { patterns: ['bus', 'train', 'taxi', 'transport', 'travel'], bonus: 20 },
    { patterns: ['hostel', 'curfew', 'room'], bonus: 20 },
    { patterns: ['emergency', 'police', 'ambulance'], bonus: 20 },
    { patterns: ['bank', 'atm', 'money'], bonus: 20 },
    { patterns: ['coordinator', 'faculty', 'office'], bonus: 20 },
    { patterns: ['grocery', 'groceries', 'supermarket', 'shop'], bonus: 20 },
    { patterns: ['sim', 'mobile', 'recharge', 'phone'], bonus: 20 },
    { patterns: ['weather', 'climate', 'temperature'], bonus: 20 },
    { patterns: ['mall', 'malls', 'shopping', 'market', 'store'], bonus: 20 },
    { patterns: ['explore', 'visit', 'attraction', 'tourist', 'sightseeing', 'places to visit'], bonus: 20 },
  ];

  const scored = faqsForDestination.map(faq => {
    const questionLower = faq.question.toLowerCase();
    const answerLower = faq.answer.toLowerCase();
    let score = 0;

    for (const word of queryWords) {
      if (questionLower.includes(word)) score += 30;
      if (answerLower.includes(word)) score += 10;
    }

    for (const topic of topicPhrases) {
      const queryHasTopic = topic.patterns.some(p => queryLower.includes(p));
      const faqHasTopic = topic.patterns.some(p => questionLower.includes(p));
      if (queryHasTopic && faqHasTopic) score += topic.bonus;
    }

    if (isAirportDiningQuery) {
      const faqHasAirport = airportKeywords.some(k => questionLower.includes(k));
      const faqHasFood = foodKeywords.some(k => questionLower.includes(k) || answerLower.includes(k));
      if (faqHasAirport && faqHasFood) score += 80;
      else if (!faqHasAirport && faqHasFood) score -= 50;
    }

    return { ...faq, score };
  });

  return scored
    .filter(faq => faq.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

function getAllInterns() {
  return loadInterns();
}

function getAllDestinations() {
  return loadDestinations();
}

function getFAQsByDestination(destinationId) {
  const faqs = loadFAQs();
  return faqs.filter(faq => faq.destination_id === destinationId);
}

module.exports = {
  getInternByPhone,
  getDestination,
  searchFAQs,
  searchTopFAQs,
  getAllInterns,
  getAllDestinations,
  getFAQsByDestination,
  reloadData
};
