// Handles incoming messages and generates responses
const { generateAIResponse } = require('./gemini');
const { sendWhatsAppMessage } = require('./twilio');
const { getInternByPhone, getDestination, getFAQsByDestination } = require('./data-loader');
const { searchFAQsSemantically } = require('./vector-search');
const { checkRateLimit } = require('./rate-limiter');

async function handleIncomingMessage({ from, to, body, messageSid }) {
  const phone = from.replace('whatsapp:', '');
  
  // Input validation: check for empty message
  let messageText = body
    .trim()
    .slice(0, 500); // Limit to 500 characters
  
  if (!messageText) {
    console.log('Empty message received');
    const reply = "Hi there! Please send a message with your question and I'll help you out.";
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
  
  console.log(`Processing message from ${phone}: "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}"`);

  try {
    // Rate limiting check: 5 second throttle per user
    if (!checkRateLimit(phone, 5)) {
      console.log(`Rate limit exceeded for ${phone}`);
      const reply = "Please wait a moment before sending another message. (Max 1 message per 5 seconds)";
      return { 
        reply, 
        status: 'rate_limited'
      };
    }

    // Find intern by phone number
    const intern = getInternByPhone(phone);
    
    if (!intern) {
      console.log(`Unknown phone number: ${phone}`);
      const reply = "Hello! I'm the Intern Support Assistant. " +
        "I notice you're not registered in our system. " +
        "Please contact your coordinator for assistance.";
      return { reply, status: 'unknown_user' };
    }

    console.log(`Found intern: ${intern.name}`);

    // Get destination details
    const destination = getDestination(intern.destination_id);
    
    if (!destination) {
      console.error(`Destination not found: ${intern.destination_id}`);
      const reply = "I'm having trouble finding your destination details. " +
        "Please contact your coordinator directly for assistance.";
      return { reply, status: 'destination_error' };
    }

    // Simple greeting detection - only for exact 'hi' message
    if (messageText.toLowerCase().trim() === 'hi') {
      console.log('Simple greeting detected');
      const reply = `Hello ${intern.name}! Welcome to the Intern Support Assistant. How can I help you today?`;
      try {
        await sendWhatsAppMessage(phone, reply);
        console.log('Message sent to WhatsApp');
      } catch (sendError) {
        console.error('Failed to send WhatsApp message:', sendError.message);
      }
      return { 
        reply, 
        intern: intern.name,
        destination: destination.name,
        responseType: 'greeting',
        status: 'success'
      };
    }

    // Get all FAQs for this destination
    const destinationFAQs = getFAQsByDestination(intern.destination_id);
    
    // Use semantic search to find relevant FAQ
    let reply;
    let responseType;
    
    if (destinationFAQs.length > 0) {
      // Perform semantic search on FAQs
      const searchResults = await searchFAQsSemantically(messageText, destinationFAQs, 1);
      
      if (searchResults && searchResults.length > 0) {
        // Use top FAQ match
        const topMatch = searchResults[0];
        console.log(`FAQ semantic match found: ${topMatch.id} (score: ${topMatch.score.toFixed(3)})`);
        reply = topMatch.answer;
        responseType = 'faq';
      } else {
        // No relevant FAQ found, use AI
        console.log(`No relevant FAQ match from semantic search, using AI...`);
        reply = await generateAIResponse({
          message: messageText,
          intern,
          destination
        });
        responseType = 'ai';
      }
    } else {
      // No FAQs available for destination, use AI
      console.log(`No FAQs available for destination, using AI...`);
      reply = await generateAIResponse({
        message: messageText,
        intern,
        destination
      });
      responseType = 'ai';
    }

    console.log(`Response generated (${responseType})`);
    
    // Send the message to WhatsApp
    try {
      await sendWhatsAppMessage(phone, reply);
      console.log('Message sent to WhatsApp');
    } catch (sendError) {
      console.error('Failed to send WhatsApp message:', sendError.message);
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
    console.error('Handler error:', error);
    
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
