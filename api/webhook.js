// Main webhook handler for incoming WhatsApp messages
const twilio = require('twilio');
const { handleIncomingMessage } = require('../lib/message-handler');

// Twilio webhook validation helper
function validateTwilioRequest(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers['x-twilio-signature'];
  const url = `https://${req.headers.host}${req.url}`;
  
  console.log('🔐 Validating Twilio request:', {
    hasAuthToken: !!authToken,
    hasSignature: !!signature,
    url: url
  });
  
  if (!authToken || !signature) {
    console.log('⚠️ Missing auth token or signature');
    return false;
  }
  
  try {
    return twilio.validateRequest(authToken, signature, url, req.body);
  } catch (error) {
    console.error('❌ Validation error:', error);
    return false;
  }
}

module.exports = async (req, res) => {
  console.log('🚀 WEBHOOK HIT:', {
    method: req.method,
    url: req.url,
    headers: {
      'x-twilio-signature': !!req.headers['x-twilio-signature'],
      'content-type': req.headers['content-type']
    },
    timestamp: new Date().toISOString()
  });

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log('❌ Rejected: Method not allowed');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Temporarily skip validation for debugging
  // const isValid = validateTwilioRequest(req);
  // console.log('🔐 Request valid:', isValid);
  
  // if (!isValid) {
  //   console.log('❌ Invalid Twilio signature');
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  try {
    console.log('📩 Processing webhook...');
    console.log('📩 Request body:', JSON.stringify(req.body, null, 2));
    
    // Extract message details from Twilio
    const from = req.body?.From;
    const to = req.body?.To;
    const body = req.body?.Body;
    const messageSid = req.body?.MessageSid;

    console.log('📩 Extracted fields:', { from, to, body: body?.substring(0, 50), messageSid });

    if (!from || !body) {
      console.log('❌ Missing required fields (From or Body)');
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Invalid request: missing required fields</Message>
</Response>`);
    }

    // Process the message
    console.log('🔄 Calling handleIncomingMessage...');
    const result = await handleIncomingMessage({
      from,
      to,
      body,
      messageSid
    });

    console.log('✅ Processing result:', result.status);

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
    console.error('❌ Webhook error:', error.message);
    console.error('Stack:', error.stack);
    
    // Always send a valid TwiML response even on error
    res.set('Content-Type', 'text/xml');
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I'm having trouble processing your request. Please try again or contact your coordinator.</Message>
</Response>`);
  }
};
