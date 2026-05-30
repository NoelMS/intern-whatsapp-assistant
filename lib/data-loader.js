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
  const queryLower = query.toLowerCase();
  const faqs = loadFAQs();
  
  // Find FAQ for this destination with matching keywords
  const match = faqs.find(faq => {
    if (faq.destination_id !== destinationId) return false;
    
    // Check if any keyword matches
    const hasKeywordMatch = faq.keywords.some(keyword => 
      queryLower.includes(keyword.toLowerCase())
    );
    
    if (hasKeywordMatch) {
      console.log(`✓ FAQ match: "${faq.question}" (matched keywords)`);
    }
    
    return hasKeywordMatch;
  });
  
  return match || null;
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
  getAllInterns,
  getAllDestinations,
  getFAQsByDestination,
  reloadData
};
