// Vector embedding & semantic search for data retrieval
// Uses GitHub Models for generating embeddings, then cosine similarity for search

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const EMBEDDINGS_API_URL = 'https://models.inference.ai.azure.com/chat/completions';

// Simple in-memory vector store (in production, use Pinecone, Weaviate, etc.)
let vectorStore = {};

/**
 * Generate embedding for text using GitHub Models
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Embedding vector
 */
async function generateEmbedding(text) {
  try {
    const response = await fetch(EMBEDDINGS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'InternAssistant/1.0'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Convert the following text into a semantic representation. Respond with a JSON array of numbers representing the embedding.'
          },
          {
            role: 'user',
            content: `Generate embedding for: "${text.substring(0, 500)}"`
          }
        ],
        temperature: 0,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Extract embedding array from response
    const embedding = JSON.parse(content);
    console.log(`✓ Generated embedding for text (${text.length} chars)`);
    return embedding;

  } catch (error) {
    console.error('❌ Embedding generation error:', error.message);
    // Fallback: generate simple hash-based pseudo-embedding
    return generateSimpleEmbedding(text);
  }
}

/**
 * Generate simple pseudo-embedding using hash (fallback)
 * @param {string} text
 * @returns {number[]}
 */
function generateSimpleEmbedding(text) {
  const vector = new Array(384).fill(0); // 384-dim vector
  for (let i = 0; i < text.length; i++) {
    vector[i % 384] += text.charCodeAt(i) / 255;
  }
  // Normalize
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / (norm || 1));
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vec1
 * @param {number[]} vec2
 * @returns {number} - Similarity score (0-1)
 */
function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2) || 1);
}

/**
 * Index documents for semantic search
 * @param {string} key - Unique identifier
 * @param {string} text - Text content to index
 * @param {object} metadata - Additional data
 */
async function indexDocument(key, text, metadata = {}) {
  try {
    const embedding = await generateEmbedding(text);
    vectorStore[key] = {
      text,
      embedding,
      metadata,
      timestamp: new Date()
    };
    console.log(`📝 Indexed document: ${key}`);
  } catch (error) {
    console.error(`❌ Failed to index ${key}:`, error.message);
  }
}

/**
 * Search documents using semantic similarity
 * @param {string} query - Search query
 * @param {number} topK - Number of results to return
 * @param {object} filters - Filter by metadata
 * @returns {Promise<object[]>} - Results with similarity scores
 */
async function semanticSearch(query, topK = 3, filters = {}) {
  try {
    const queryEmbedding = await generateEmbedding(query);
    
    // Calculate similarity for all documents
    const results = Object.entries(vectorStore)
      .map(([key, doc]) => {
        // Apply metadata filters
        if (filters.destination && doc.metadata.destination !== filters.destination) {
          return null;
        }
        
        const similarity = cosineSimilarity(queryEmbedding, doc.embedding);
        return {
          key,
          text: doc.text,
          similarity,
          metadata: doc.metadata
        };
      })
      .filter(r => r !== null && r.similarity > 0.3) // Filter low relevance
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
    
    console.log(`🔍 Semantic search found ${results.length} relevant documents`);
    return results;

  } catch (error) {
    console.error('❌ Semantic search error:', error.message);
    return [];
  }
}

/**
 * Initialize vector store with destination data
 * @param {object} destinations - Destinations data
 */
async function initializeVectorStore(destinations) {
  console.log('🚀 Initializing vector store...');
  
  for (const dest of destinations) {
    // Index destination description
    const descKey = `desc_${dest.id}`;
    await indexDocument(
      descKey,
      dest.description || dest.name,
      { destination: dest.id, type: 'description' }
    );
    
    // Index popular areas
    if (dest.popular_areas) {
      const placesKey = `places_${dest.id}`;
      await indexDocument(
        placesKey,
        `Popular areas: ${dest.popular_areas.join(', ')}`,
        { destination: dest.id, type: 'places' }
      );
    }
    
    // Index accommodation info
    if (dest.accommodation) {
      const accomKey = `accom_${dest.id}`;
      await indexDocument(
        accomKey,
        `Accommodation: ${dest.accommodation.name} at ${dest.accommodation.address}. WiFi: ${dest.accommodation.wifi}`,
        { destination: dest.id, type: 'accommodation' }
      );
    }
    
    // Index local tips
    if (dest.local_tips) {
      const tipsKey = `tips_${dest.id}`;
      const tipsText = Object.entries(dest.local_tips)
        .map(([k, v]) => `${k}: ${v}`)
        .join('. ');
      await indexDocument(tipsKey, tipsText, { destination: dest.id, type: 'tips' });
    }
    
    // Index emergency info
    if (dest.emergency_info) {
      const emergencyKey = `emergency_${dest.id}`;
      const emergencyText = `Emergency: Police ${dest.emergency_info.local_police}, Ambulance ${dest.emergency_info.ambulance}, Hospital: ${dest.emergency_info.nearest_hospital}`;
      await indexDocument(emergencyKey, emergencyText, { destination: dest.id, type: 'emergency' });
    }
  }
  
  console.log(`✅ Vector store initialized with ${Object.keys(vectorStore).length} indexed documents`);
}

/**
 * Get relevant context for a query within a destination
 * @param {string} query - User query
 * @param {string} destinationId - Destination ID
 * @returns {Promise<string>} - Formatted context
 */
async function getRelevantContext(query, destinationId) {
  const results = await semanticSearch(query, 5, { destination: destinationId });
  
  if (results.length === 0) return '';
  
  return results
    .map(r => `- ${r.text} (relevance: ${(r.similarity * 100).toFixed(0)}%)`)
    .join('\n');
}

/**
 * Semantic search for FAQ documents
 * @param {string} query - User query
 * @param {array} faqs - FAQ documents to search
 * @param {number} topK - Number of top results to return
 * @returns {Promise<array>} - Ranked FAQ results with scores
 */
async function searchFAQsSemantically(query, faqs, topK = 3) {
  try {
    if (!faqs || faqs.length === 0) {
      console.log('No FAQs provided for search');
      return [];
    }

    console.log(`Searching ${faqs.length} FAQs for query: "${query}"`);
    
    // Use keyword-based search (simpler, more reliable)
    const results = keywordFallbackSearch(query, faqs, topK);
    console.log(`Search found ${results.length} relevant matches`);
    return results;

  } catch (error) {
    console.error('FAQ search error:', error.message);
    return [];
  }
}

/**
 * Keyword-based FAQ search (fallback when semantic search fails)
 * @param {string} query - User query
 * @param {array} faqs - FAQ documents to search
 * @param {number} topK - Number of top results to return
 * @returns {array} - Ranked FAQ results
 */
function keywordFallbackSearch(query, faqs, topK = 3) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  // Define topic keywords with priority levels
  const topics = {
    dining: {
      priority: 1,
      keywords: ['eat', 'food', 'restaurant', 'cafe', 'mess', 'dining', 'meal', 'lunch', 'breakfast', 'dinner']
    },
    airport: {
      priority: 2,
      keywords: ['airport', 'flight', 'arrival', 'departure']
    },
    wifi: {
      priority: 3,
      keywords: ['wifi', 'internet', 'password', 'network']
    },
    hospital: {
      priority: 4,
      keywords: ['hospital', 'medical', 'doctor', 'health', 'medicine']
    },
    transport: {
      priority: 5,
      keywords: ['travel', 'bus', 'train', 'taxi', 'auto', 'ooty', 'munnar', 'coonoor']
    },
    hostel: {
      priority: 6,
      keywords: ['hostel', 'room', 'curfew', 'warden', 'check-in', 'bed']
    },
    emergency: {
      priority: 7,
      keywords: ['emergency', 'police', 'ambulance']
    },
    banks: {
      priority: 8,
      keywords: ['bank', 'atm', 'money', 'financial']
    }
  };
  
  // Detect PRIMARY topic (highest priority match wins)
  let primaryTopic = null;
  let maxMatches = 0;
  let maxPriority = 999;
  
  for (const [topic, config] of Object.entries(topics)) {
    const matches = config.keywords.filter(kw => queryLower.includes(kw)).length;
    if (matches > 0 && (matches > maxMatches || (matches === maxMatches && config.priority < maxPriority))) {
      primaryTopic = topic;
      maxMatches = matches;
      maxPriority = config.priority;
    }
  }
  
  console.log(`Detected primary topic: ${primaryTopic} (${maxMatches} keyword matches)`);
  
  // Score FAQs
  const scoredFAQs = faqs.map(faq => {
    const questionLower = faq.question.toLowerCase();
    const answerLower = faq.answer.toLowerCase();
    let score = 0;
    
    // 1. EXACT PHRASE MATCHING (highest weight - bonus for matching question phrases)
    if (questionLower.includes('places to eat') && queryLower.includes('eat')) {
      score += 50;
    }
    if (questionLower.includes('groceries') && queryLower.includes('groceries')) {
      score += 50;
    }
    if (questionLower.includes('buy') && queryLower.includes('buy')) {
      score += 30;
    }
    if (questionLower.includes('airport') && queryLower.includes('airport')) {
      score += 40;
    }
    
    // 2. PRIMARY TOPIC BONUS (high weight)
    if (primaryTopic) {
      const primaryKeywords = topics[primaryTopic].keywords;
      const questionTopicMatches = primaryKeywords.filter(kw => questionLower.includes(kw)).length;
      const answerTopicMatches = primaryKeywords.filter(kw => answerLower.includes(kw)).length;
      
      score += questionTopicMatches * 20; // Very high weight for question match
      score += answerTopicMatches * 10;   // Medium weight for answer match
    }
    
    // 3. PENALTY for matching OTHER topics strongly (prevents cross-topic match)
    for (const [otherTopic, config] of Object.entries(topics)) {
      if (otherTopic !== primaryTopic) {
        const otherMatches = config.keywords.filter(kw => questionLower.includes(kw)).length;
        if (otherMatches > 0) {
          score -= otherMatches * 8; // Significant penalty for competing topics
        }
      }
    }
    
    // 4. GENERAL WORD MATCHES (lower weight)
    // Only count meaningful words
    const meaningfulWords = ['airport', 'campus', 'city', 'hostel', 'room', 'center', 'office', 'near', 'nearby'];
    queryWords.forEach(word => {
      if (meaningfulWords.includes(word)) {
        if (questionLower.includes(word)) score += 1;
        if (answerLower.includes(word)) score += 0.5;
      }
    });
    
    return { ...faq, score };
  });
  
  return scoredFAQs
    .filter(faq => faq.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

module.exports = {
  generateEmbedding,
  indexDocument,
  semanticSearch,
  initializeVectorStore,
  getRelevantContext,
  searchFAQsSemantically,
  getVectorStore: () => vectorStore
};
