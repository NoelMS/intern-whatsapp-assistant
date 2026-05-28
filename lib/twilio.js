// Twilio WhatsApp message sender
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// Validate credentials at startup
if (!accountSid || !authToken || !fromNumber) {
  console.error('❌ FATAL: Missing Twilio credentials!');
  console.error('TWILIO_ACCOUNT_SID:', accountSid ? '✓ Set' : '✗ Missing');
  console.error('TWILIO_AUTH_TOKEN:', authToken ? '✓ Set' : '✗ Missing');
  console.error('TWILIO_WHATSAPP_NUMBER:', fromNumber ? '✓ Set' : '✗ Missing');
  console.error('Please configure environment variables before starting.');
  process.exit(1); // Force exit immediately
}
console.log('✅ Twilio credentials validated at startup');

const client = twilio(accountSid, authToken);

// Environment detection
const IS_SANDBOX = fromNumber.includes('14155238886');
if (IS_SANDBOX) {
  console.warn('⚠️ Running in TWILIO SANDBOX mode');
  console.log('📍 Sandbox limitations:');
  console.log('   - 1000 messages/day limit');
  console.log('   - Participants must be pre-approved');
  console.log('   - Expires after 30 days of no activity');
} else {
  console.log('✅ Running in PRODUCTION mode');
}

async function sendWhatsAppMessage(to, body) {
  try {
    // Ensure phone number format for "to" (could be +1234567890 or whatsapp:+1234567890)
    let toNumber = to;
    if (!toNumber.startsWith('whatsapp:')) {
      toNumber = `whatsapp:${to}`;
    }
    
    // Ensure "from" number has whatsapp: prefix
    let fromNumberFormatted = fromNumber;
    if (!fromNumberFormatted.startsWith('whatsapp:')) {
      fromNumberFormatted = `whatsapp:${fromNumber}`;
    }
    
    console.log(`📤 Sending from: ${fromNumberFormatted}`);
    console.log(`📤 Sending to: ${toNumber}`);
    console.log(`Message length: ${body.length} characters`);
    
    const message = await client.messages.create({
      from: fromNumberFormatted,
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
