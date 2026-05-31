// Main webhook handler for incoming Meta WhatsApp messages
console.log('📝 WEBHOOK MODULE LOADED');

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

  // 1. Handle Webhook Verification (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

    if (!VERIFY_TOKEN) {
      console.error('❌ META_VERIFY_TOKEN not configured');
      return res.status(500).send('Server misconfigured');
    }

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verified by Meta');
        return res.status(200).send(challenge);
      } else {
        console.log('❌ Webhook verification failed (token mismatch)');
        return res.status(403).send('Forbidden');
      }
    }
    return res.status(400).send('Bad Request');
  }

  // 2. Handle Incoming Messages (POST)
  if (req.method === 'POST') {
    const body = req.body;

    // Check if this is an event from a WhatsApp API
    if (body.object) {
      try {
        if (
          body.entry &&
          body.entry[0].changes &&
          body.entry[0].changes[0] &&
          body.entry[0].changes[0].value.messages &&
          body.entry[0].changes[0].value.messages[0]
        ) {
          const message = body.entry[0].changes[0].value.messages[0];
          
          // Only process text messages for now
          if (message.type === 'text') {
            const from = message.from; // The sender's phone number
            const bodyText = message.text.body; // The message text
            const messageSid = message.id; // Unique message ID

            console.log('📩 Extracted:', { from, body: bodyText?.substring(0, 50), messageSid });

            if (!handleIncomingMessage) {
              console.error('❌ Message handler not available');
            } else {
              console.log('🔄 Processing message...');
              await handleIncomingMessage({
                from,
                to: 'system',
                body: bodyText,
                messageSid
              });
            }
          } else {
             console.log(`ℹ️ Received non-text message type: ${message.type}, skipping.`);
          }
        }
        
        // Return a '200 OK' response to all requests
        return res.status(200).send('EVENT_RECEIVED');
      } catch (error) {
        console.error('❌ ERROR processing webhook:', error);
        return res.status(500).send('Error');
      }
    } else {
      // Return a '404 Not Found' if event is not from a WhatsApp API
      return res.status(404).send('Not Found');
    }
  }

  // Reject anything else
  console.log('❌ Rejected: Method not allowed');
  return res.status(405).send('Method not allowed');
};
