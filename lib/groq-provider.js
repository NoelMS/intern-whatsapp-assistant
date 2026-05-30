// Groq AI integration (primary provider)
const Groq = require('groq-sdk');

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

    const context = buildContextPrompt(intern, destination);
    
    console.log('🚀 [Groq] Calling Groq AI (llama-3.1-8b-instant)...');
    
    const promise = client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: context
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 256,
      top_p: 0.9
    });

    // Add timeout
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
    
    console.log(`✓ [Groq] Response received in ${elapsed}ms (${response.usage?.total_tokens || 0} tokens)`);
    
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

    // Detect rate limit errors
    if (error.status === 429 || errorMsg.includes('rate_limit') || errorMsg.includes('429')) {
      console.warn(`⚠️ [Groq] Rate limit hit after ${elapsed}ms`);
      const err = new Error('GROQ_RATE_LIMIT');
      err.provider = 'groq';
      err.elapsed = elapsed;
      throw err;
    }

    // Detect auth errors
    if (error.status === 401 || errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
      console.error(`❌ [Groq] Authentication failed - check GROQ_API_KEY`);
      return null;
    }

    // Other errors
    console.warn(`⚠️ [Groq] Error after ${elapsed}ms: ${errorMsg}`);
    return null;
  }
}

function buildContextPrompt(intern, destination) {
  return `You are a helpful, friendly assistant for interns on a work program in ${destination.name}.

INTERN DETAILS:
- Name: ${intern.name}
- Department: ${intern.department || 'Unknown'}
- Coordinator: ${destination.coordinator.name} (${destination.coordinator.phone})

LOCATION: ${destination.name}
ACCOMMODATION: ${destination.accommodation.name}
ADDRESS: ${destination.accommodation.address}

LOCAL INFORMATION:
- Currency: ${destination.local_tips.currency}
- Language: ${destination.local_tips.language}
- Weather: ${destination.local_tips.weather}
- Transport Options: ${destination.local_tips.transport}
- Emergency Police: ${destination.emergency_info.local_police}
- Emergency Ambulance: ${destination.emergency_info.ambulance}
- Campus Security: ${destination.emergency_info.campus_security}
- Nearest Hospital: ${destination.emergency_info.nearest_hospital}

SHOPPING & DINING:
- Grocery Store: Organised Super Market (on campus)
- Nearby Restaurants: Saravana Bhavan, A2B, Ula Cafe
- Shopping Malls: Brookefields, Govind Square

COORDINATOR CONTACT: ${destination.coordinator.phone}
CAMPUS PHONE: ${destination.institute_info.phone}

You help with:
- Shopping and groceries (no mess available)
- Transportation and getting around
- Emergency contacts and procedures
- Local customs and cultural tips
- Accommodation and facilities
- Places to visit and things to do
- WiFi and campus facilities

IMPORTANT GUIDELINES:
- Be warm, welcoming, and practical
- For complex issues, direct to coordinator: ${destination.coordinator.phone}
- Interns have no mess - refer to restaurants or grocery shopping
- Keep responses under 150 words
- Use plain text only - no markdown, bold, or special formatting
- Provide actionable advice`;
}

module.exports = { generateResponse };
