// Standalone Grok Connector Server for Railway deployment
// This server acts as a webhook proxy between the main WhatsApp bot and X.AI Grok API
// Deploy this to Railway separately for 24/7 uptime
// This file has ZERO dependencies on Twilio - it's completely standalone

const express = require('express');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize X.AI Grok client (only if XAI_API_KEY is set)
let grokClient = null;

function getGrokClient() {
  if (!grokClient && process.env.XAI_API_KEY) {
    grokClient = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1',
      timeout: 10000
    });
  }
  return grokClient;
}

const MODEL = 'grok-4.3';

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'grok-connector-server',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Main webhook endpoint - receives messages from main bot
app.post('/api/grok-webhook', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { message, phone, context, intern, destination } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        error: 'Missing message field',
        status: 'invalid_request'
      });
    }

    const client = getGrokClient();
    if (!client) {
      console.error('XAI_API_KEY not configured');
      return res.status(503).json({
        error: 'Service not configured',
        status: 'service_error'
      });
    }

    console.log(`[Grok-Connector] Received request from ${phone}: "${message.substring(0, 50)}..."`);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(intern, destination);

    // Call Grok API
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_completion_tokens: 256,
      top_p: 0.9
    });

    const elapsed = Date.now() - startTime;

    if (!response.choices?.[0]?.message?.content) {
      console.error('No response content from Grok');
      return res.status(502).json({
        error: 'Empty response from Grok API',
        status: 'api_error'
      });
    }

    const generatedText = response.choices[0].message.content.trim();

    console.log(`✓ [Grok-Connector] Response generated in ${elapsed}ms (${response.usage?.total_tokens} tokens)`);

    res.json({
      response: generatedText,
      provider: 'grok_connector',
      status: 'success',
      time: elapsed,
      tokens: response.usage?.total_tokens
    });

  } catch (error) {
    const elapsed = Date.now() - startTime;
    const errorMsg = error.message || String(error);
    const status = error.status || 500;

    // Log detailed error info
    console.error(`❌ [Grok-Connector] Error after ${elapsed}ms:`, {
      status,
      message: errorMsg,
      error: error.type || error.code
    });

    // Determine appropriate HTTP status
    let httpStatus = 503; // Service unavailable by default
    
    if (status === 401) {
      httpStatus = 401;
      console.error('Invalid XAI_API_KEY');
    } else if (status === 429) {
      httpStatus = 429;
      console.error('Grok API rate limited');
    } else if (status === 400) {
      httpStatus = 400;
      console.error('Invalid request to Grok API');
    }

    res.status(httpStatus).json({
      error: errorMsg,
      status: 'error',
      provider: 'grok_connector',
      time: elapsed
    });
  }
});

// Endpoint for statistics/monitoring
app.get('/api/stats', (req, res) => {
  res.json({
    service: 'grok-connector-server',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({
    error: 'Internal server error',
    status: 'server_error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    status: 'not_found'
  });
});

// Build system prompt for Grok
function buildSystemPrompt(intern, destination) {
  if (!intern || !destination) {
    // Fallback if context not provided
    return `You are a helpful, friendly assistant for interns.
Be warm, welcoming, and provide practical advice.
Keep responses under 150 words.
Use plain text only - no markdown or special formatting.`;
  }

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

// Start server
app.listen(PORT, () => {
  console.log(`Grok Connector Server running on port ${PORT}`);
  console.log(`Health check: GET http://localhost:${PORT}/health`);
  console.log(`Webhook endpoint: POST http://localhost:${PORT}/api/grok-webhook`);
  console.log(`Stats endpoint: GET http://localhost:${PORT}/api/stats`);
  
  if (!process.env.XAI_API_KEY) {
    console.warn('⚠️ XAI_API_KEY not configured - Grok API calls will fail');
  }
});

module.exports = app;
