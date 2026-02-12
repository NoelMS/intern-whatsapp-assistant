// Script to send welcome messages to all interns
const { sendWhatsAppMessage } = require('../lib/twilio');
const { getAllInterns, getDestination } = require('../lib/data-loader');

async function sendWelcomeMessages() {
  const interns = getAllInterns();
  
  console.log(`📨 Starting welcome message campaign...`);
  console.log(`Total interns: ${interns.length}\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const intern of interns) {
    try {
      const destination = getDestination(intern.destination_id);
      
      if (!destination) {
        console.error(`❌ Skipping ${intern.name}: Destination not found (${intern.destination_id})`);
        failCount++;
        continue;
      }
      
      const welcomeMessage = `🎉 *Welcome to your ${destination.name} Internship!*

Hi ${intern.name}! 

I'm your digital assistant here to help you throughout your stay. Feel free to ask me anything about:
• 🏠 Accommodation & WiFi
• 🛒 Shopping & daily needs
• 🚗 Transportation & getting around
• 🍽️ Food & restaurants
• 🏥 Emergency contacts
• 🗺️ Places to visit
• 💡 Local tips & customs

━━━━━━━━━━━━━━━━━━━━━

📍 *YOUR COORDINATOR*
Name: ${destination.coordinator.name}
WhatsApp: ${destination.coordinator.whatsapp}
Email: ${destination.coordinator.email}

🏠 *YOUR ACCOMMODATION*
${destination.accommodation.name}
📍 Address: ${destination.accommodation.address}
🎯 Landmark: ${destination.accommodation.landmark}
🔢 Room: ${destination.accommodation.room_number}
📶 WiFi Password: ${destination.accommodation.wifi}
🗓️ Check-in: ${intern.start_date}

━━━━━━━━━━━━━━━━━━━━━

💡 *QUICK INFO*
• Emergency: ${destination.emergency_info.local_police} (Police), ${destination.emergency_info.ambulance} (Ambulance)
• Nearest Metro/Station: ${destination.accommodation.nearest_metro || destination.accommodation.nearest_bus_stop}
• Language: ${destination.local_tips.language}
• Weather: ${destination.local_tips.weather}

━━━━━━━━━━━━━━━━━━━━━

Just reply to this message with your questions anytime!

Have a wonderful experience! 🌟`;

      await sendWhatsAppMessage(intern.phone, welcomeMessage);
      console.log(`✓ Sent to ${intern.name} (${intern.phone})`);
      successCount++;
      
      // Add delay between messages to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      console.error(`❌ Failed to send to ${intern.name}: ${error.message}`);
      failCount++;
    }
  }
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Campaign Complete!`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━\n`);
}

// Run if called directly
if (require.main === module) {
  sendWelcomeMessages().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { sendWelcomeMessages };
