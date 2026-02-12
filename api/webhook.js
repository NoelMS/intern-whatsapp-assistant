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
  console.log('🚀 WEBHOOK HIT:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log('❌ Rejected: Method not allowed');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📩 RAW WEBHOOK BODY:', JSON.stringify(req.body, null, 2));
    
    // Extract message details from Twilio
    const from = req.body?.From;
    const to = req.body?.To;
    const body = req.body?.Body;
    const messageSid = req.body?.MessageSid;

    console.log('📩 Extracted:', { from, to, body, messageSid });

    if (!from || !body) {
      console.log('❌ Missing required fields');
      res.set('Content-Type', 'text/xml');
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>Invalid request format</Message>
        </Response>`);
    }

    // Process the message
    console.log('🔄 Processing message...');
    const result = await handleIncomingMessage({
      from,
      to,
      body,
      messageSid
    });

    console.log('✅ Processing complete:', result.status);

    // Send TwiML response
    const reply = result.reply || 'Thank you for your message!';
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${reply}</Message>
</Response>`;

    console.log('📤 Sending TwiML response');
    res.set('Content-Type', 'text/xml');
    res.status(200).send(twiml);

  } catch (error) {
    console.error('❌ Webhook error:', error);
    console.error('Stack:', error.stack);
    
    // Always send a valid TwiML response even on error
    res.set('Content-Type', 'text/xml');
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I'm having trouble processing your request. Please try again or contact your coordinator.</Message>
</Response>`);
  }
};
