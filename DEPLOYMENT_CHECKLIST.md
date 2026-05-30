# Deployment Checklist - Multi-Provider AI Integration

## What's New
Your WhatsApp bot now has **triple-redundant AI** with automatic fallback:
1. **Groq** (Primary) - Fast, free, 30 req/min
2. **X.AI Grok** (Secondary) - Fallback provider  
3. **FAQ Search** (Primary for 80% of queries) - Free, unlimited

Plus a standalone **Railway webhook server** for 24/7 uptime.

## Pre-Deployment Checklist

### 1. Get API Keys (5 minutes)

**Groq API Key:**
- [ ] Visit https://console.groq.com
- [ ] Sign in with GitHub / Email
- [ ] Go to API Keys section
- [ ] Create new key → Copy it (starts with `gsk_`)
- [ ] Store safely in a secure location (keep it private!)

**X.AI Grok API Key:**
- [ ] Visit https://console.x.ai
- [ ] Sign in with GitHub / Email
- [ ] Go to Team → API Keys
- [ ] Create new key → Copy it (starts with `xai_`)
- [ ] Store safely

### 2. Create Railway Account (2 minutes)

- [ ] Visit https://railway.app
- [ ] Click "Start Project"
- [ ] Sign up with GitHub
- [ ] Allow GitHub permissions

### 3. Deploy Grok Connector to Railway (10 minutes)

**Step 1: Create Railway Service**
- [ ] Go to https://railway.app/dashboard
- [ ] Click "New Project"
- [ ] Select "Deploy from GitHub"
- [ ] Select your GitHub account → "NoelMS/intern-whatsapp-assistant"
- [ ] Choose branch: `main`
- [ ] Click "Deploy"

**Step 2: Configure Railway Service**
- [ ] Railway auto-creates a service
- [ ] Go to your project's service
- [ ] Click "Settings" tab
- [ ] Find "Root Directory" → Leave as `.`
- [ ] Find "Build Command" → Leave empty (default)
- [ ] Find "Start Command" → Set to: `node grok-connector-server.js`
- [ ] Click "Save"

**Step 3: Add Environment Variables**
- [ ] In Railway service, click "Variables"
- [ ] Add these variables:
  ```
  XAI_API_KEY = xai_YOUR_KEY_HERE
  PORT = 3000
  NODE_ENV = production
  ```
- [ ] Click "Save"
- [ ] Railway will auto-redeploy

**Step 4: Get Railway URL**
- [ ] Wait for deployment to complete (green checkmark)
- [ ] Click "Public URL" button
- [ ] Copy the URL (format: `https://intern-whatsapp-xxxx.railway.app`)
- [ ] Save it: You'll need this for Vercel

### 4. Deploy Main Bot to Vercel (5 minutes)

**Option A: Auto-deploy from GitHub (Recommended)**
- [ ] Vercel should auto-detect the changes
- [ ] Go to https://vercel.com/dashboard
- [ ] Your "intern-whatsapp-assistant-2" project should show a new deployment
- [ ] Wait for it to complete

**Option B: Manual Deploy**
```bash
cd ~/intern-whatsapp-assistant
vercel --prod
```

**Step: Add Environment Variables to Vercel**
- [ ] Go to https://vercel.com/dashboard
- [ ] Click "intern-whatsapp-assistant-2" project
- [ ] Go to Settings → Environment Variables
- [ ] Add these variables:
  ```
  GROQ_API_KEY = gsk_YOUR_KEY_HERE
  XAI_API_KEY = xai_YOUR_KEY_HERE  
  GROK_CONNECTOR_URL = https://your-railway-url-here.railway.app
  ```
- [ ] Click "Save"
- [ ] Redeploy: Click Deployments → last deployment → "Redeploy"

### 5. Verify Deployment (2 minutes)

**Test Railway Webhook:**
```bash
curl https://your-railway-url.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "grok-connector-server",
  "uptime": 123.45
}
```

**Test FAQ Search (No API cost):**
```bash
curl -X POST https://intern-whatsapp-assistant-2.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Twilio-Signature: test" \
  -d '{
    "From": "whatsapp:+917025135070",
    "Body": "where do I go to eat",
    "MessageSid": "test-001"
  }'
```

**Test Groq Provider (Requires GROQ_API_KEY):**
```bash
curl -X POST https://intern-whatsapp-assistant-2.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Twilio-Signature: test" \
  -d '{
    "From": "whatsapp:+917025135070",
    "Body": "tell me about the weather",
    "MessageSid": "test-002"
  }'
```

Check Vercel logs for:
```
✓ [Groq] Response received in 1234ms
```

### 6. Testing (Ongoing)

**From Twilio Sandbox (send from your phone):**
- [ ] Test FAQ query: "where do I go to eat"
- [ ] Test AI query: "tell me about the weather"
- [ ] Test coordinator: "who is my coordinator"
- [ ] Test attractions: "places to explore in coimbatore"

**Check Logs:**
- [ ] Vercel logs: https://vercel.com/dashboard → select project → "Deployments" → "Function Logs"
- [ ] Railway logs: https://railway.app → select project → click "Logs"

---

## Post-Deployment Monitoring

### Watch for Provider Chain Execution
In Vercel logs, you should see patterns like:
```
✓ [Chain] Query handled by: groq(1200ms)
⚠️ [Chain] Query handled by: groq(RATE_LIMIT) → grok(2100ms)
❌ [Chain] All providers failed: groq(ERROR) → grok(ERROR) → fallback(GENERIC_MESSAGE)
```

### Monitor Rate Limits
- **Groq:** 30 requests per minute (free tier)
- **X.AI Grok:** Depends on your account tier
- **FAQ:** Unlimited (first 80% of queries)

### Expected Behavior
1. ~80% of queries hit FAQ search (instant, no API cost)
2. ~20% of queries use Groq (average 1-2 seconds)
3. If Groq rate limited, fallback to Grok
4. If both fail, return generic message

---

## Troubleshooting

### Groq API Key Error
```
GROQ_API_KEY not configured
```
**Solution:** 
1. Verify key in Vercel env vars
2. Key must start with `gsk_`
3. Redeploy after adding

### X.AI Grok Not Responding
```
[Grok] Authentication failed
```
**Solution:**
1. Check XAI_API_KEY in Vercel
2. Key must start with `xai_`
3. Verify key format at https://console.x.ai/team/default/api-keys

### Railway Webhook Timeout
```
Error: Request timeout
```
**Solution:**
1. Check Railway service is running (green status)
2. Verify XAI_API_KEY is set in Railway vars
3. Check Railway logs for errors

### Vercel Signature Validation Error
```
⚠️ Potential injection attempt detected
```
**Solution:** This is normal - ensure TWILIO_WEBHOOK_AUTH_TOKEN is set

---

## Success Indicators

✅ **All working correctly when you see:**

1. FAQ queries return instantly (logs show "FAQ match")
2. Open-ended queries use Groq (logs show "✓ [Groq]")
3. Logs show provider chain: `groq → grok → fallback`
4. No 401/403 errors in Vercel logs
5. Railway webhook responds to /health requests

✅ **Cost remains $0 when:**
- Groq free tier: 30 req/min (for ~2000 msgs/day limit)
- FAQ search: Unlimited calls
- X.AI Grok: Free tier (if configured)
- Railway: Free tier with $5 credits/month

---

## Next Steps (Optional)

1. **Upgrade Groq** if hitting rate limits frequently
2. **Add Together AI** when $5 credit available (drop-in replacement)
3. **Implement caching** to reduce API calls for repeated queries
4. **Monitor costs** as you add more interns/queries

---

## Files Changed
- `lib/groq-provider.js` - NEW Groq integration
- `lib/grok-provider.js` - NEW X.AI Grok integration  
- `lib/ai-orchestrator.js` - NEW Fallback chain orchestration
- `lib/message-handler.js` - UPDATED to use orchestrator
- `grok-connector-server.js` - NEW Railway webhook server
- `package.json` - UPDATED with new dependencies
- `.env.example` - UPDATED with new vars
- `SETUP_GUIDE_MULTI_PROVIDER.md` - Detailed setup guide

---

## Questions?

Check the logs:
- **Vercel:** https://vercel.com/dashboard → Deployments → Function Logs
- **Railway:** https://railway.app → Project → Logs

Or review the setup guide:
- `SETUP_GUIDE_MULTI_PROVIDER.md` in the repo

Good luck! 🚀
