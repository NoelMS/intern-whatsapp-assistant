// Main webhook handler for incoming WhatsApp messages
const { handleIncomingMessage } = require('../lib/message-handler');

// Check environment variables on load
console.log('Environment check:', {
  hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
  hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
  hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
  hasGeminiKey: !!process.env.GEMINI_API_KEY
});

module.exports = async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Received webhook:', {
      from: req.body?.From,
      body: req.body?.Body,
      timestamp: new Date().toISOString()
    });
    
    // Extract message details from Twilio
    const from = req.body.From;  // whatsapp:+1234567890
    const to = req.body.To;      // whatsapp:+14155238886
    const body = req.body.Body;  // Message content
    const messageSid = req.body.MessageSid;

    // Process the message
    const result = await handleIncomingMessage({
      from,
      to,
      body,
      messageSid
    });

    // Send TwiML response
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>${result.reply || 'Thank you for your message!'}</Message>
      </Response>`);

  } catch (error) {
    console.error('Webhook error:', error);
    
    // Send error response
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>Sorry, I'm having trouble processing your request. Please try again or contact your coordinator.</Message>
      </Response>`);
  }
};
