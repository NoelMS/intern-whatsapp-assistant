// Handles incoming messages and generates responses
const { generateAIResponse } = require('./gemini');
const { sendWhatsAppMessage } = require('./twilio');
const { getInternByPhone, getDestination, searchFAQs } = require('./data-loader');
const { checkRateLimit } = require('./rate-limiter');

async function handleIncomingMessage({ from, to, body, messageSid }) {
  const phone = from.replace('whatsapp:', '');
  
  // Input validation: check for empty message
  let messageText = body
    .trim()
    .slice(0, 500); // Limit to 500 characters
  
  if (!messageText) {
    console.log('⚠️ Empty message received');
    const reply = "Hi there! 👋 Please send a message with your question and I'll help you out.";
    return { 
      reply, 
      status: 'empty_message'
    };
  }

  // Check for suspicious patterns (basic XSS/injection prevention)
  const suspiciousPatterns = /[<>{}"`$]/g;
  if (suspiciousPatterns.test(messageText)) {
    console.log('⚠️ Potential injection attempt detected, but continuing with caution');
  }
  
  console.log(`📩 Processing message from ${phone}: "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}"`);

  try {
    // Rate limiting check: 5 second throttle per user
    if (!checkRateLimit(phone, 5)) {
      console.log(`⏱️ Rate limit exceeded for ${phone}`);
      const reply = "Please wait a moment before sending another message. 🕐 (Max 1 message per 5 seconds)";
      return { 
        reply, 
        status: 'rate_limited'
      };
    }

    // Find intern by phone number
    const intern = getInternByPhone(phone);
    
    if (!intern) {
      console.log(`⚠️ Unknown phone number: ${phone}`);
      const reply = "Hello! I'm the Intern Support Assistant. " +
        "I notice you're not registered in our system. " +
        "Please contact your coordinator for assistance.";
      return { reply, status: 'unknown_user' };
    }

    console.log(`✓ Found intern: ${intern.name}`);

    // Get destination details
    const destination = getDestination(intern.destination_id);
    
    if (!destination) {
      console.error(`❌ Destination not found: ${intern.destination_id}`);
      const reply = "I'm having trouble finding your destination details. " +
        "Please contact your coordinator directly for assistance.";
      return { reply, status: 'destination_error' };
    }

    // Search for FAQ match first
    const faqMatch = searchFAQs(intern.destination_id, messageText);
    
    let reply;
    let responseType;
    
    if (faqMatch) {
      // Use FAQ answer directly
      console.log(`✓ FAQ match found: ${faqMatch.id}`);
      reply = faqMatch.answer;
      responseType = 'faq';
    } else {
      // Generate AI response with context
      console.log(`🤖 No FAQ match, using AI...`);
      reply = await generateAIResponse({
        message: messageText,
        intern,
        destination
      });
      responseType = 'ai';
    }

    console.log(`✓ Response generated (${responseType})`);
    
    // Send the message to WhatsApp
    try {
      await sendWhatsAppMessage(phone, reply);
      console.log('✓ Message sent to WhatsApp');
    } catch (sendError) {
      console.error('❌ Failed to send WhatsApp message:', sendError.message);
      // Still return success - the response was generated
    }
    
    return { 
      reply, 
      intern: intern.name,
      destination: destination.name,
      responseType,
      status: 'success'
    };

  } catch (error) {
    console.error('❌ Handler error:', error);
    
    // Send error message
    const errorReply = "I'm sorry, I'm having trouble right now. " +
      "Please contact your coordinator for assistance.";
    
    return { 
      reply: errorReply,
      status: 'error',
      error: error.message
    };
  }
}

module.exports = { handleIncomingMessage };
