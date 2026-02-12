// Main webhook handler for incoming WhatsApp messages
console.log('📝 WEBHOOK MODULE LOADED');

const twilio = require('twilio');

// Lazy load to avoid issues
let handleIncomingMessage;
try {
  handleIncomingMessage = require('../lib/message-handler').handleIncomingMessage;
  console.log('✅ Message handler loaded');
} catch (e) {
  console.error('❌ Failed to load message handler:', e);
}

module.exports = async (req, res) => {
  // Log immediately
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
    console.log('📩 Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('📩 Request body type:', typeof req.body);
    console.log('📩 Request body:', req.body);
    
    // Handle both JSON and form-urlencoded bodies
    let bodyData = req.body;
    if (typeof bodyData === 'string') {
      // Try to parse if it's a string
      try {
        bodyData = JSON.parse(bodyData);
      } catch (e) {
        // It's form data, use as-is
        console.log('📩 Body is form-urlencoded string');
      }
    }
    
    // Extract message details from Twilio
    const from = bodyData?.From || bodyData?.from;
    const to = bodyData?.To || bodyData?.to;
    const body = bodyData?.Body || bodyData?.body;
    const messageSid = bodyData?.MessageSid || bodyData?.messageSid;

    console.log('📩 Extracted:', { from, to, body: body?.substring(0, 50), messageSid });

    if (!from || !body) {
      console.log('❌ Missing required fields');
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Invalid request: missing From or Body</Message>
</Response>`);
    }

    if (!handleIncomingMessage) {
      console.error('❌ Message handler not available');
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Service temporarily unavailable. Please try again.</Message>
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

    console.log('✅ Result:', result.status);

    // Send TwiML response
    const reply = result.reply || 'Thank you for your message!';
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${reply}</Message>
</Response>`;

    console.log('📤 Sending response');
    res.set('Content-Type', 'text/xml');
    res.status(200).send(twiml);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    
    // Always send valid TwiML
    res.set('Content-Type', 'text/xml');
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I'm having trouble. Please try again.</Message>
</Response>`);
  }
};
