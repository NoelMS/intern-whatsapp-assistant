// Meta WhatsApp Cloud API message sender
const accessToken = process.env.META_ACCESS_TOKEN;
const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

// Validate credentials at startup
if (!accessToken || !phoneNumberId) {
  console.error('❌ Missing Meta WhatsApp credentials!');
  console.error('META_ACCESS_TOKEN:', accessToken ? '✓ Set' : '✗ Missing');
  console.error('META_PHONE_NUMBER_ID:', phoneNumberId ? '✓ Set' : '✗ Missing');
} else {
  console.log('✅ Meta WhatsApp credentials detected');
}

async function sendWhatsAppMessage(to, body) {
  try {
    if (!accessToken || !phoneNumberId) {
      throw new Error("Missing Meta API credentials. Check META_ACCESS_TOKEN and META_PHONE_NUMBER_ID.");
    }

    // Meta API requires the "to" number without any "+" or "whatsapp:" prefixes.
    // e.g. "917025135070"
    let toNumber = to.replace('whatsapp:', '').replace('+', '');
    
    console.log(`📤 Sending to: ${toNumber} via Meta Cloud API`);
    console.log(`Message length: ${body.length} characters`);
    
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toNumber,
        type: 'text',
        text: {
          body: body
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Meta send error:', JSON.stringify(data, null, 2));
      throw new Error(data.error?.message || 'Failed to send Meta WhatsApp message');
    }

    console.log(`✓ Message sent successfully! Message ID: ${data.messages?.[0]?.id}`);
    return data;

  } catch (error) {
    console.error('❌ Send error:', error.message);
    throw error;
  }
}

module.exports = { sendWhatsAppMessage };
