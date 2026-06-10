# Intern WhatsApp Assistant

AI-powered WhatsApp support system for interns with FAQ responses and conversational abilities.

## Features

- **WhatsApp Integration** - Twilio-powered messaging
- **AI Responses** - Google Gemini for intelligent replies
- **FAQ Database** - Pre-built answers for common questions
- **Multi-Destination** - Support for Bangalore, Hyderabad, Pune, and more
- **Free Tier** - Runs on free quotas (Twilio Sandbox + Gemini API)
- **Easy Deployment** - One-click Vercel deploy

## Project Structure

```
intern-whatsapp-assistant/
├── api/
│   └── webhook.js              # Main WhatsApp webhook handler
├── lib/
│   ├── message-handler.js     # Process incoming messages
│   ├── gemini.js             # AI response generation
│   ├── twilio.js             # WhatsApp sender
│   └── data-loader.js        # JSON data management
├── data/
│   ├── interns.json          # Intern contact details
│   ├── destinations.json     # Destination information
│   └── faqs.json            # FAQ database (21 questions)
├── scripts/
│   └── send-welcome.js       # Send welcome messages
├── .env.example             # Environment variables template
├── vercel.json              # Vercel deployment config
├── package.json             # Node.js dependencies
└── README.md                # This file
```

## Quick Start Guide

### Step 1: Prerequisites

**Required Accounts (Free):**
- [GitHub](https://github.com) - For code repository
- [Twilio](https://www.twilio.com/try-twilio) - WhatsApp messaging
- [Google AI Studio](https://aistudio.google.com/app/apikey) - Gemini API
- [Vercel](https://vercel.com) - Free hosting

### Step 2: Twilio Setup

1. **Create Twilio Account**
   - Sign up at https://www.twilio.com/try-twilio
   - Verify your phone number
   - No credit card required for sandbox

2. **Get WhatsApp Sandbox**
   - Go to Console -> Messaging -> "Try it out" -> "Send a WhatsApp message"
   - Or directly: https://www.twilio.com/console/sms/whatsapp/sandbox
   - Note your **Sandbox Number**: `+1 415 523 8886`

3. **Get Credentials** (already provided, but here's where to find them):
   - Account SID: `YOUR_TWILIO_ACCOUNT_SID`
   - Auth Token: `YOUR_TWILIO_AUTH_TOKEN`
   - From Twilio Console main dashboard

### Step 3: Gemini API Setup

1. **Get API Key**
   - Go to: https://aistudio.google.com/app/apikey
   - Sign in with Google
   - Click "Create API Key"
   - Copy the key: `YOUR_GEMINI_API_KEY`

2. **Enable API** (if needed)
   - Visit: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
   - Click "Enable"
   - Wait 2-3 minutes

### Step 4: Deploy to Vercel

1. **Push Code to GitHub**
   ```bash
   # In your project directory
   git init
   git add .
   git commit -m "Initial commit"
   
   # Create repo on GitHub, then:
   git remote add origin https://github.com/YOUR_USERNAME/intern-whatsapp-assistant.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel auto-detects Node.js project

3. **Add Environment Variables**
   In Vercel Dashboard -> Your Project -> Settings -> Environment Variables:
   
   | Name | Value |
   |------|-------|
   | TWILIO_ACCOUNT_SID | YOUR_TWILIO_ACCOUNT_SID |
   | TWILIO_AUTH_TOKEN | YOUR_TWILIO_AUTH_TOKEN |
   | TWILIO_PHONE_NUMBER | whatsapp:+14155238886 |
   | GEMINI_API_KEY | YOUR_GEMINI_API_KEY |

4. **Get Your Webhook URL**
   After deployment, Vercel gives you a URL like:
   ```
   https://intern-whatsapp-assistant-xyz123.vercel.app
   ```
   Your webhook URL will be:
   ```
   https://intern-whatsapp-assistant-xyz123.vercel.app/api/webhook
   ```

### Step 5: Configure Twilio Webhook

1. Go to Twilio Console -> Messaging -> WhatsApp Sandbox
2. Find "When a message comes in"
3. Paste your webhook URL:
   ```
   https://intern-whatsapp-assistant-xyz123.vercel.app/api/webhook
   ```
4. Method: POST
5. Click **Save**

### Step 6: Add Interns to Sandbox

**Each intern must join the sandbox:**

1. Intern saves the Twilio number: `+1 415 523 8886`
2. Intern sends this exact message:
   ```
   join <your-sandbox-phrase>
   ```
   (Find your unique phrase in Twilio Console -> WhatsApp Sandbox)
3. They'll get confirmation: "You are now connected..."

4. **Add their number in Twilio:**
   - Go to Sandbox page
   - Add phone numbers under "Sandbox Participants"
   - Format: `+91XXXXXXXXXX` (with country code)

### Step 7: Customize Data

Edit these files with real data:

**`data/interns.json`** - Add your interns:
```json
{
  "id": "intern_001",
  "name": "Real Name",
  "phone": "+91XXXXXXXXXX",
  "destination_id": "bangalore",
  "start_date": "2025-03-01",
  "coordinator_id": "coord_001"
}
```

**`data/destinations.json`** - Update coordinator details, addresses, WiFi passwords

**`data/faqs.json`** - Add more FAQs specific to each destination

### Step 8: Test & Send Welcome Messages

1. **Test the bot:**
   - Message the sandbox number from an intern's phone
   - Ask: "Where can I buy groceries?"
   - Should get a detailed response!

2. **Send welcome messages:**
   ```bash
   # Install dependencies first
   npm install
   
   # Send welcome messages to all interns
   npm run send-welcome
   ```

## How It Works

```
Intern sends WhatsApp
        |
Twilio Sandbox (+1 415 523 8886)
        |
Webhook -> Your Vercel API
        |
Identify intern by phone number
        |
Check FAQ keywords match?
        |
   Yes -> Return FAQ answer
   No -> Call Gemini AI
        |
Send response via WhatsApp
```

## Current Data

**Destinations:**
- Bangalore, Karnataka
- Hyderabad, Telangana  
- Pune, Maharashtra

**Sample Interns:** 3 (Rahul, Priya, Arun)

**FAQs:** 21 questions covering:
- Shopping & groceries
- Airport transfers
- Emergency contacts
- Restaurants & food
- WiFi & internet
- Weekend trips
- Local customs

## Customization

### Adding a New Destination

1. Add entry to `data/destinations.json`:
```json
{
  "id": "chennai",
  "name": "Chennai, Tamil Nadu",
  "coordinator": { ... },
  "accommodation": { ... },
  "emergency_info": { ... }
}
```

2. Add FAQs to `data/faqs.json`:
```json
{
  "id": "faq_022",
  "destination_id": "chennai",
  "category": "shopping",
  "keywords": ["buy", "grocery"],
  "answer": "Your answer here..."
}
```

3. Push to GitHub -> Auto-deploys!

### Adding a New Intern

Edit `data/interns.json`:
```json
{
  "id": "intern_004",
  "name": "New Intern Name",
  "phone": "+91XXXXXXXXXX",
  "destination_id": "bangalore",
  "start_date": "2025-04-01"
}
```

## Important Notes

### Twilio Sandbox Limitations

- **Free for testing** - 1000 messages/day
- **Perfect for your use** - 10-20 interns
- **Must approve numbers** - Add each intern to Sandbox Participants
- **Shared number** - All use `+1 415 523 8886`
- **Expires after 30 days** - Send 1 test message monthly to keep active
- **Reset daily** - Quota resets at midnight UTC

### Gemini API Limits

- **1500 requests/day** - More than enough
- **15 requests/minute** - Rate limit
- **May have delays** - New keys take 5-10 min to activate
- **Resets daily** - Midnight PST

### Vercel Free Tier

- **100GB bandwidth/month**
- **Serverless functions**
- **Cold starts** - ~500ms delay on first request after idle
- **Functions timeout** - 10 seconds (sufficient for this)

## Troubleshooting

### "Message not delivered"
- Check intern's phone is added to Sandbox Participants
- Verify phone format: `+91XXXXXXXXXX`
- Ask intern to send `join <phrase>` again

### "AI not responding"
- Check Gemini API key in Vercel env vars
- Verify API is enabled in Google Cloud
- Check Vercel logs for errors

### "404 errors"
- Verify webhook URL is correct in Twilio
- Check `/api/webhook` endpoint is deployed
- Look at Vercel deployment logs

### "Quota exceeded"
- Wait for next day (resets at midnight PST)
- Check usage at https://ai.dev/rate-limit
- Consider upgrading if consistently hitting limits

## Security

- **Keep .env private** - Never commit credentials
- **Use private repo** - Don't expose intern data publicly
- **Rotate keys** - If exposed, regenerate in Twilio/Google console
- **Phone masking** - Logs show only last 4 digits

## Support

**Issues?**
1. Check Vercel logs: Dashboard -> Functions tab
2. Test Gemini API: Use the curl command from setup
3. Verify Twilio: Send test message from console
4. Contact your coordinator for complex issues!

## License

MIT License - Feel free to use and modify!

## Credits

- Twilio WhatsApp API
- Google Gemini AI
- Vercel Hosting
- Built for interns

---

**Ready to help your interns!**
