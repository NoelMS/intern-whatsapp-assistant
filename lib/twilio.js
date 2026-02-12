// Twilio WhatsApp message sender
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Validate credentials
if (!accountSid || !authToken || !fromNumber) {
  console.error('❌ Missing Twilio credentials. Check environment variables.');
  console.error('TWILIO_ACCOUNT_SID:', accountSid ? 'Set' : 'Missing');
  console.error('TWILIO_AUTH_TOKEN:', authToken ? 'Set' : 'Missing');
  console.error('TWILIO_PHONE_NUMBER:', fromNumber ? 'Set' : 'Missing');
}

const client = twilio(accountSid, authToken);

async function sendWhatsAppMessage(to, body) {
  try {
    // Ensure phone number format
    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    
    console.log(`📤 Sending message to ${toNumber}`);
    console.log(`Message length: ${body.length} characters`);
    
    const message = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body: body
    });

    console.log(`✓ Message sent successfully! SID: ${message.sid}`);
    return message;

  } catch (error) {
    console.error('❌ Twilio send error:', error.message);
    
    if (error.code === 21608) {
      console.error('Error: The phone number is not registered in the Twilio Sandbox. Add it in the Twilio Console.');
    } else if (error.code === 21211) {
      console.error('Error: Invalid phone number format.');
    } else if (error.code === 20003) {
      console.error('Error: Authentication failed. Check your Account SID and Auth Token.');
    }
    
    throw error;
  }
}

module.exports = { sendWhatsAppMessage };
