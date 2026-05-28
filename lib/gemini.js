// GitHub Models AI integration (using GPT-5 via Azure OpenAI)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_MODELS_API_URL = 'https://models.inference.ai.azure.com/chat/completions';

async function generateAIResponse({ message, intern, destination }) {
  try {
    if (!GITHUB_TOKEN) {
      console.error('❌ GITHUB_TOKEN not configured');
      return getFallbackResponse(destination);
    }

    // Build context prompt
    const context = buildContextPrompt(intern, destination);
    
    console.log('🤖 Calling GitHub Models API (GPT-5)...');
    
    const response = await fetch(GITHUB_MODELS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'InternWhatsAppAssistant/1.0'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
        max_tokens: 300,
        top_p: 0.8
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const generatedText = data.choices?.[0]?.message?.content;
    
    if (!generatedText) {
      throw new Error('No response generated');
    }

    console.log('✓ GitHub Models response received');
    return generatedText.trim();

  } catch (error) {
    console.error('❌ GitHub Models API error:', error.message);
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
- Keep responses concise (under 150 words) but complete`;
}

function getFallbackResponse(destination) {
  return `I'm sorry, I'm having trouble answering that right now. 

Please contact your coordinator ${destination.coordinator.name} at ${destination.coordinator.phone} for assistance.

For emergencies, call ${destination.emergency_info.local_police} (Police) or ${destination.emergency_info.ambulance} (Ambulance).`;
}

module.exports = { generateAIResponse };
