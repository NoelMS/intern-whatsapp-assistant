// Handles incoming messages and generates responses
const { generateAIResponse } = require('./gemini');
const { sendWhatsAppMessage } = require('./twilio');
const { getInternByPhone, getDestination, searchFAQs } = require('./data-loader');

async function handleIncomingMessage({ from, to, body, messageSid }) {
  const phone = from.replace('whatsapp:', '');
  const messageText = body.trim();
  
  console.log(`📩 Processing message from ${phone}: "${messageText}"`);

  try {
    // Find intern by phone number
    const intern = getInternByPhone(phone);
    
    if (!intern) {
      console.log(`⚠️ Unknown phone number: ${phone}`);
      const reply = "Hello! I'm the Intern Support Assistant. " +
        "I notice you're not registered in our system. " +
        "Please contact your coordinator for assistance.";
      
      await sendWhatsAppMessage(phone, reply);
      return { reply, status: 'unknown_user' };
    }

    console.log(`✓ Found intern: ${intern.name}`);

    // Get destination details
    const destination = getDestination(intern.destination_id);
    
    if (!destination) {
      console.error(`❌ Destination not found: ${intern.destination_id}`);
      const reply = "I'm having trouble finding your destination details. " +
        "Please contact your coordinator directly for assistance.";
      
      await sendWhatsAppMessage(phone, reply);
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

    // Send reply
    await sendWhatsAppMessage(phone, reply);
    
    console.log(`✓ Response sent (${responseType})`);
    
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
    
    try {
      await sendWhatsAppMessage(phone, errorReply);
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
    
    return { 
      reply: errorReply,
      status: 'error',
      error: error.message
    };
  }
}

module.exports = { handleIncomingMessage };
