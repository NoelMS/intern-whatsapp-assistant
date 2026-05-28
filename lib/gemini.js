// Google Gemini AI integration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

async function generateAIResponse({ message, intern, destination }) {
  try {
    // Build context prompt
    const context = buildContextPrompt(intern, destination);
    
    console.log('🤖 Calling Gemini API...');
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${context}\n\nIntern's question: ${message}\n\nProvide a helpful, friendly response. Keep it under 150 words. If unsure, suggest contacting the coordinator.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
          topP: 0.8,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('No response generated');
    }

    console.log('✓ Gemini response received');
    return generatedText.trim();

  } catch (error) {
    console.error('❌ Gemini API error:', error.message);
    return getFallbackResponse(destination);
  }
}

function buildContextPrompt(intern, destination) {
  return `You are a helpful, friendly assistant for interns on a work program in India.

DESTINATION: ${destination.name}
INTERN NAME: ${intern.name}
COORDINATOR: ${destination.coordinator.name} (${destination.coordinator.phone})
ACCOMMODATION: ${destination.accommodation.name}
ADDRESS: ${destination.accommodation.address}
LANDMARK: ${destination.accommodation.landmark}

LOCAL INFORMATION:
- Currency: ${destination.local_tips.currency}
- Emergency Numbers: ${destination.emergency_info.local_police} (Police), ${destination.emergency_info.ambulance} (Ambulance)
- Language: ${destination.local_tips.language}
- Weather: ${destination.local_tips.weather}
- Transport: ${destination.local_tips.transport}
- Nearest Metro/Station: ${destination.accommodation.nearest_metro || destination.accommodation.nearest_bus_stop}

ACCOMMODATION DETAILS:
- WiFi Password: ${destination.accommodation.wifi}
- Room: ${destination.accommodation.room_number}
- Check-in Date: ${destination.accommodation.check_in}

You help with practical questions about:
✓ Shopping and groceries
✓ Transportation and getting around
✓ Emergency contacts and procedures
✓ Local customs and cultural tips
✓ Accommodation and facilities
✓ Places to visit and things to do

IMPORTANT: 
- Be warm and welcoming
- Always mention the coordinator's contact for complex issues
- Give practical, actionable advice
- Keep responses concise but complete`;
}

function getFallbackResponse(destination) {
  return `I'm sorry, I'm having trouble answering that right now. 

Please contact your coordinator ${destination.coordinator.name} at ${destination.coordinator.phone} for assistance.

For emergencies, call ${destination.emergency_info.local_police} (Police) or ${destination.emergency_info.ambulance} (Ambulance).`;
}

module.exports = { generateAIResponse };
