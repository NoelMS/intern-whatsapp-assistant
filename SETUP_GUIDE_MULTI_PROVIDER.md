# Multi-Provider AI Integration Setup Guide

This document explains how to set up Groq + X.AI Grok integration for the InternWhatsApp Assistant.

## Architecture Overview

```
WhatsApp Message (Twilio)
  ↓
Main Bot (Vercel: vercel.app)
  ├─ Greeting Detection
  ├─ Rate Limiting (5 sec/user)
  ├─ Intern Lookup
  ├─ FAQ Search (PRIMARY - No API cost)
  │   └─ Match score ≥50 → Return FAQ
  │   └─ Match score <50 → Continue to AI
  └─ AI Provider Chain (FALLBACK - Only if FAQ doesn't match)
      ├─ Try Groq (FREE - 30 req/min)
      │   └─ Success → Return response
      │   └─ Rate limit → Try next
      ├─ Try X.AI Grok (FREE - via XAI_API_KEY)
      │   └─ Success → Return response
      │   └─ Failure → Try next
      ├─ Try Grok Connector Webhook (TERTIARY)
      │   └─ Success → Return response
      │   └─ Failure → Continue
      └─ Generic Fallback Message
```

## Setup Steps

### 1. Get API Keys

#### Groq API Key
```bash
1. Visit https://console.groq.com
2. Sign up / Log in
3. Go to "API Keys" section
4. Create new API key
5. Copy the key (starts with "gsk_")
```

#### X.AI Grok API Key
```bash
1. Visit https://console.x.ai
2. Sign up / Log in
3. Go to Team → API Keys
4. Create new API key
5. Copy the key (starts with "xai_")
```

### 2. Configure Main Bot (Vercel)

Add these environment variables to your Vercel project:

```env
GROQ_API_KEY=gsk_YOUR_KEY_HERE
XAI_API_KEY=xai_YOUR_KEY_HERE
GROK_CONNECTOR_URL=https://your-grok-connector.railway.app
```

**How to add to Vercel:**
```bash
1. Go to https://vercel.com/dashboard
2. Click your project → Settings → Environment Variables
3. Add each variable with its value
4. Redeploy
```

### 3. Deploy Grok Connector to Railway (24/7 Webhook)

This runs independently and provides the tertiary fallback.

#### Step 1: Create Railway Account
```bash
1. Visit https://railway.app
2. Sign up with GitHub
3. Allow permissions
```

#### Step 2: Create New Railway Project
```bash
1. Click "New Project"
2. Select "Deploy from GitHub"
3. Select your `intern-whatsapp-assistant` repository
4. Choose branch: `main`
```

#### Step 3: Configure Railway Service
```bash
1. In Railway dashboard, go to your project
2. Click "New Service" → "GitHub Repo"
3. Connect to `intern-whatsapp-assistant`
4. Set Root Directory: `.` (or `/` if needed)
5. Set Start Command: `node grok-connector-server.js`
```

#### Step 4: Add Environment Variables to Railway
```bash
1. In Railway service, click "Variables"
2. Add:
   - XAI_API_KEY=xai_YOUR_KEY
   - PORT=3000
   - NODE_ENV=production
3. Save
```

#### Step 5: Deploy
```bash
1. Railway will auto-deploy from GitHub
2. Wait for "Deployment Successful"
3. Click "Public URL" to get your Railway URL
4. Copy the URL (format: https://xxxx.railway.app)
```

#### Step 6: Update Main Bot with Webhook URL
```bash
1. Go to Vercel project settings
2. Add/Update GROK_CONNECTOR_URL environment variable
3. Paste the Railway URL
4. Redeploy main bot
```

### 4. Testing

#### Test FAQ Search (No API Cost)
```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "From": "whatsapp:+917025135070",
    "Body": "where do I go to eat",
    "MessageSid": "test-001"
  }'
```

Expected: Returns FAQ (no API call made)

#### Test Groq Provider
```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "From": "whatsapp:+917025135070",
    "Body": "tell me about the weather",
    "MessageSid": "test-002"
  }'
```

Expected logs:
```
✓ [Groq] Response received in 1200ms
```

#### Test Provider Fallback (Simulate Rate Limit)
Make 45+ rapid requests to hit Groq's 30 req/min limit, then the next request will try Grok.

### 5. Monitoring

#### Check Groq Rate Limits
```bash
# The bot logs when rate limits are hit
# Check Vercel logs: https://vercel.com/dashboard → Select project → Deployments → Logs
```

#### Check Railway Webhook Health
```bash
curl https://your-grok-connector.railway.app/health

# Expected response:
{
  "status": "ok",
  "service": "grok-connector-server",
  "uptime": 3600,
  "timestamp": "2026-05-30T15:30:00.000Z"
}
```

#### View Provider Usage
Check Vercel logs for lines like:
```
✓ [Chain] Query handled by: groq(1200ms) → Success
⚠️ [Chain] Query handled by: groq(RATE_LIMIT) → grok(2100ms) → Success
❌ [Chain] All providers failed: groq(ERROR) → grok(ERROR) → fallback(GENERIC_MESSAGE)
```

## API Key Costs

| Provider | Free Tier | Cost Model | Rate Limit |
|----------|-----------|-----------|-----------|
| **Groq** | Yes, free | Pay-as-you-go | 30 req/min |
| **X.AI Grok** | Yes, free | Pay-as-you-go | Depends on plan |
| **FAQ Search** | Yes, unlimited | No cost | Unlimited |

## Troubleshooting

### Groq API Key Invalid
```
Error: GROQ_API_KEY not configured
```
**Solution:** Check GROQ_API_KEY in Vercel environment variables is correct

### X.AI Grok Not Working
```
Error: [Grok] Authentication failed - check XAI_API_KEY
```
**Solution:** 
1. Verify XAI_API_KEY is set in Vercel
2. Check key format (should start with `xai_`)
3. Regenerate key at https://console.x.ai/team/default/api-keys

### Railway Webhook Timeout
```
Error: Request timeout
```
**Solution:**
1. Check Railway service is running: visit Railway health URL
2. Check XAI_API_KEY is set in Railway environment
3. Verify function timeout (set to 10 seconds in grok-provider.js)

### Rate Limit Hit
```
⚠️ [Groq] Rate limit hit after 1200ms
```
**Solution:**
1. This is normal - 30 requests per minute limit
2. The bot will automatically use X.AI Grok for the next request
3. For production with high volume, consider upgrading Groq plan

## Next Steps

1. Add Together AI when $5 credit is available (drop-in replacement)
2. Implement response caching to reduce API calls
3. Monitor usage patterns to optimize provider selection
4. Consider adding paid tier if hitting rate limits frequently

## Support

For issues:
1. Check Vercel deployment logs
2. Check Railway service logs
3. Verify all environment variables are set correctly
4. Test individual providers with curl commands above
