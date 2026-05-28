// Main webhook handler for incoming WhatsApp messages
console.log('📝 WEBHOOK MODULE LOADED');

const twilio = require('twilio');
const crypto = require('crypto');

// Lazy load to avoid issues
let handleIncomingMessage;
try {
  handleIncomingMessage = require('../lib/message-handler').handleIncomingMessage;
  console.log('✅ Message handler loaded');
} catch (e) {
  console.error('❌ Failed to load message handler:', e);
}

// Manual Twilio signature validation for Vercel
function validateTwilioSignature(url, params, signature, authToken) {
  try {
    // Build the data string from params
    const keys = Object.keys(params).sort();
    let data = url;
    keys.forEach(key => {
      data += key + params[key];
    });
    
    // Create HMAC-SHA1 hash
    const hash = crypto.createHmac('sha1', authToken).update(data).digest('base64');
    
    return hash === signature;
  } catch (error) {
    console.error('Signature validation error:', error.message);
    return false;
  }
}

module.exports = async (req, res) => {
  // Set content type for all responses (Vercel compatibility)
  res.setHeader('Content-Type', 'text/xml');
  
  // Log immediately
  console.log('🚀 WEBHOOK HIT:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log('❌ Rejected: Method not allowed');
    return res.status(405).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Method not allowed</Message>
</Response>`);
  }

  try {
    // Validate Twilio webhook signature
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error('❌ TWILIO_AUTH_TOKEN not configured');
      return res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Server misconfigured: missing TWILIO_AUTH_TOKEN</Message>
</Response>`);
    }

    // Get the raw body and signature
    const twilioSignature = req.headers['x-twilio-signature'] || '';
    
    // For Vercel, get host from headers
    const host = req.headers.host || 'unknown';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const webhookUrl = `${protocol}://${host}${req.url}`;
    
    console.log('🔐 Validating Twilio signature...');
    console.log('   URL:', webhookUrl);
    console.log('   Signature:', twilioSignature.substring(0, 10) + '...');
    
    // Validate using manual HMAC-SHA1
    const isValidRequest = validateTwilioSignature(
      webhookUrl,
      req.body || {},
      twilioSignature,
      authToken
    );

    if (!isValidRequest) {
      console.warn('⚠️ Invalid Twilio webhook signature (continuing for staging)');
    } else {
      console.log('✅ Twilio signature validated');
    }

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
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Invalid request: missing From or Body</Message>
</Response>`);
    }

    if (!handleIncomingMessage) {
      console.error('❌ Message handler not available');
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
    return res.status(200).send(twiml);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    
    // Always send valid TwiML
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I'm having trouble. Please try again.</Message>
</Response>`);
  }
};
