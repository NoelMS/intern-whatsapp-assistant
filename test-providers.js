// Test script to verify providers work locally

const groqProvider = require('./lib/groq-provider');
const grokProvider = require('./lib/grok-provider');
const { orchestrateAIResponse } = require('./lib/ai-orchestrator');

// Mock data
const mockIntern = {
  name: 'Noel Mathew Sajan',
  phone: '+917025135070',
  department: 'Engineering - IT',
  destination_id: 'coimbatore'
};

const mockDestination = {
  id: 'coimbatore',
  name: 'Coimbatore, Tamil Nadu',
  coordinator: {
    name: 'Dr. Rajesh Kumar',
    phone: '+919876543210',
    email: 'r.kumar@karunya.edu.in'
  },
  accommodation: {
    name: 'Karunya Campus Hostel - Block A',
    address: 'Karunya Institute of Technology and Sciences, Coimbatore - 641114',
    landmark: 'Near Karunya Main Gate, 25km from Coimbatore Airport',
    wifi: 'Karunya-WiFi-Guest',
    room_number: 'A-204',
    nearest_metro: 'Not available',
    nearest_bus_stop: 'Karunya Bus Stop'
  },
  emergency_info: {
    local_police: '100',
    ambulance: '108',
    campus_security: '+914224680000 ext 5555',
    nearest_hospital: 'Karunya Medical Centre'
  },
  local_tips: {
    currency: 'Indian Rupees (INR)',
    language: 'Tamil, Telugu, Kannada, Hindi, English',
    weather: 'Pleasant year-round (20-32°C)',
    transport: 'Autos, Ola/Uber, local buses'
  },
  institute_info: {
    name: 'Karunya Institute of Technology and Sciences',
    phone: '+914224680000'
  }
};

async function testProviders() {
  console.log('\n=== Multi-Provider AI Test Suite ===\n');

  // Test 1: Check if API keys are configured
  console.log('Test 1: API Key Configuration');
  console.log(`  GROQ_API_KEY: ${process.env.GROQ_API_KEY ? '✓ SET' : '✗ NOT SET'}`);
  console.log(`  XAI_API_KEY: ${process.env.XAI_API_KEY ? '✓ SET' : '✗ NOT SET'}`);
  console.log();

  if (!process.env.GROQ_API_KEY && !process.env.XAI_API_KEY) {
    console.error('ERROR: No API keys configured. Please set GROQ_API_KEY and/or XAI_API_KEY');
    process.exit(1);
  }

  // Test 2: Test Groq provider if configured
  if (process.env.GROQ_API_KEY) {
    console.log('Test 2: Testing Groq Provider');
    console.log('  Query: "Where can I get groceries?"');
    
    try {
      const result = await groqProvider.generateResponse({
        message: 'Where can I get groceries?',
        intern: mockIntern,
        destination: mockDestination
      });

      if (result) {
        console.log(`  ✓ Response: ${result.response.substring(0, 100)}...`);
        console.log(`  ✓ Time: ${result.time}ms`);
        console.log(`  ✓ Provider: ${result.provider}`);
      } else {
        console.log('  ✗ No response from Groq');
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
    }
    console.log();
  }

  // Test 3: Test Grok provider if configured
  if (process.env.XAI_API_KEY) {
    console.log('Test 3: Testing X.AI Grok Provider');
    console.log('  Query: "What is the WiFi password?"');
    
    try {
      const result = await grokProvider.generateResponse({
        message: 'What is the WiFi password?',
        intern: mockIntern,
        destination: mockDestination
      });

      if (result) {
        console.log(`  ✓ Response: ${result.response.substring(0, 100)}...`);
        console.log(`  ✓ Time: ${result.time}ms`);
        console.log(`  ✓ Provider: ${result.provider}`);
      } else {
        console.log('  ✗ No response from Grok');
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
    }
    console.log();
  }

  // Test 4: Test Orchestrator
  console.log('Test 4: Testing AI Orchestrator');
  console.log('  Query: "Tell me about nearby attractions"');
  
  try {
    const result = await orchestrateAIResponse({
      message: 'Tell me about nearby attractions',
      intern: mockIntern,
      destination: mockDestination
    });

    console.log(`  ✓ Response: ${result.substring(0, 100)}...`);
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
  }
  console.log();

  console.log('=== Test Suite Complete ===\n');
}

// Run tests
testProviders().catch(console.error);
