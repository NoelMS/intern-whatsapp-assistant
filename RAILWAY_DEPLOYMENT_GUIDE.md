# Railway Deployment Guide - Grok Connector Server

## Quick Setup (5 minutes)

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Authorize the app

### Step 2: Create New Railway Project

**Option A: From Dashboard (Recommended)**
```
1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Select your GitHub account
5. Choose: NoelMS/intern-whatsapp-assistant
6. Select branch: main
7. Click "Deploy"
```

**Option B: Using Railway CLI**
```bash
npm install -g @railway/cli
railway login
railway init
# Follow prompts
```

### Step 3: Configure Railway Service

Once deployed, Railway creates a service. Now configure it:

1. Go to your Railway project
2. Click on the service (should say "grok-connector" or similar)
3. Go to "Settings" tab
4. Find "Root Directory" → Leave as `.`
5. Find "Build Command" → Leave empty (auto-detects)
6. Find "Start Command" → **IMPORTANT:** Set to:
   ```
   node grok-connector-server.js
   ```
7. Click "Save"

### Step 4: Add Environment Variables

In Railway service:

1. Click "Variables" tab
2. Add these variables:
   ```
   XAI_API_KEY = xai_YOUR_API_KEY
   NODE_ENV = production
   PORT = 3000
   ```
3. Click "Save"
4. Railway will auto-redeploy

### Step 5: Get Your Railway URL

1. Wait for deployment to complete (green checkmark)
2. Click "Public URL" button
3. Copy the URL (format: https://xxxx.railway.app)
4. This is your `GROK_CONNECTOR_URL` for Vercel

### Step 6: Test Railway Webhook

```bash
curl https://your-railway-url.railway.app/health

# Expected response:
{
  "status": "ok",
  "service": "grok-connector-server",
  "uptime": 123.45
}
```

---

## Environment Variables Reference

### Required Variables
```
XAI_API_KEY          - X.AI API key (starts with xai_)
                       Get from: https://console.x.ai/team/default/api-keys
```

### Optional Variables
```
PORT                 - Server port (default: 3000)
NODE_ENV             - Environment (production/development)
LOG_LEVEL            - Logging level (info/debug/error)
```

### Variables NOT Needed for Grok Connector
```
❌ TWILIO_ACCOUNT_SID      - Only for main bot (Vercel)
❌ TWILIO_AUTH_TOKEN       - Only for main bot (Vercel)
❌ TWILIO_WHATSAPP_NUMBER  - Only for main bot (Vercel)
❌ GROQ_API_KEY            - Only for main bot (Vercel)
```

---

## Troubleshooting Railway Deployment

### "Build failed"
**Solution:**
1. Check that you selected the correct repository
2. Verify the branch is "main"
3. Check that package.json exists in root directory
4. Railway should auto-detect Node.js project

### "Start Command failed"
**Solution:**
1. Go to Settings → Start Command
2. Verify it's exactly: `node grok-connector-server.js`
3. Save and trigger redeploy

### "Service not responding"
**Solution:**
1. Check if XAI_API_KEY is set in Variables
2. Check Railway logs for errors
3. Verify the key format (starts with xai_)
4. Try restarting the service

### "Cannot GET /"
**Solution:** This is normal!
- `/` endpoint doesn't exist
- Use `/health` to check status
- Use `/api/grok-webhook` for the main endpoint

### "Port already in use"
**Solution:**
- Railway assigns port automatically
- Don't hardcode PORT in the start command
- The server reads PORT from environment

---

## Monitoring Railway Service

### Check Logs
1. Go to Railway project
2. Click the service
3. Click "Logs" tab
4. Watch real-time logs

### Check Metrics
1. Click "Metrics" tab
2. View CPU, Memory, Network usage
3. Check uptime and deployment history

### Check Deployments
1. Click "Deployments" tab
2. View deployment history
3. Rollback to previous version if needed

---

## Connecting to Main Bot (Vercel)

Once Railway is deployed:

1. Copy your Railway URL (e.g., https://grok-connector-xxxx.railway.app)
2. Go to Vercel dashboard
3. Select intern-whatsapp-assistant project
4. Settings → Environment Variables
5. Add/Update: `GROK_CONNECTOR_URL=https://grok-connector-xxxx.railway.app`
6. Redeploy main bot

---

## Viewing Logs

### Real-Time Logs
```bash
# If using Railway CLI
railway logs -f

# Or use dashboard:
# https://railway.app → Select project → Logs tab
```

### Expected Log Output
```
Grok Connector Server running on port 3000
Health check: GET http://localhost:3000/health
Webhook endpoint: POST http://localhost:3000/api/grok-webhook
Stats endpoint: GET http://localhost:3000/api/stats
✓ XAI_API_KEY configured
```

### Error Logs
If you see:
```
⚠️ XAI_API_KEY not configured - Grok API calls will fail
```

**Solution:** Add XAI_API_KEY to Railway Variables

---

## Scaling & Limits

**Free Tier Limits:**
- 500 hours per month of uptime
- 1 GB RAM
- Shared CPU
- Enough for ~50,000 messages/month

**If You Need More:**
1. Go to Railway project settings
2. Upgrade plan to Pro ($5/month)
3. Get dedicated resources

---

## Next Steps

1. ✅ Deploy Grok Connector to Railway (this guide)
2. 📝 Get your Railway URL
3. 🔧 Add GROK_CONNECTOR_URL to Vercel
4. 🚀 Redeploy main bot on Vercel
5. ✔️ Test end-to-end

See `DEPLOYMENT_CHECKLIST.md` for complete deployment flow.
