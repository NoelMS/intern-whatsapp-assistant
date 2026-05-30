# 🎯 Railway Deployment - FINAL FIX

## The Problem
Railway was running `api/webhook.js` (which needs Twilio), not the grok-connector-server.

## The Solution
Created a new entry point system:
- **Vercel** → Uses `api/webhook.js` (via package.json "main" field)
- **Railway** → Uses `server.js` (via npm start script)
- **Same repository** → Works for both

## What Changed

### Files Added
- ✅ `server.js` - Exact copy of grok-connector-server.js

### Files Updated
- ✅ `package.json` - Added `"start": "node server.js"`
- ✅ `Procfile` - Changed to `web: npm start`

## How It Works Now

**When Railway starts:**
```
Railway reads Procfile
  ↓
Runs: npm start
  ↓
package.json script runs: node server.js
  ↓
server.js starts (grok-connector)
  ↓
✅ No Twilio needed - just XAI_API_KEY
```

**When Vercel deploys:**
```
Vercel detects Node.js
  ↓
Uses package.json "main": "api/webhook.js"
  ↓
Runs webhook.js as serverless function
  ↓
✅ Works as before (needs Twilio + Groq)
```

## What You Need To Do Now

### Step 1: Push Latest Code
```bash
cd ~/intern-whatsapp-assistant
git push origin main
```

### Step 2: Redeploy on Railway

**Option A: Using Railway Dashboard**
1. Go to https://railway.app/dashboard
2. Click your project
3. Look for "Redeploy" button
4. Click to redeploy from latest GitHub commit

**Option B: Delete and Recreate**
1. Go to Railway project settings
2. Delete current service
3. Create new from GitHub (select main branch)
4. Railway will auto-deploy

### Step 3: Add Environment Variable

Once deployed:
1. In Railway dashboard, find your service
2. Look for "Variables" section
3. Add: `XAI_API_KEY = xai_YOUR_KEY`
4. Save

Railway auto-redeploys with new env vars.

### Step 4: Verify It Works

```bash
curl https://your-railway-url/health

# Should return:
{
  "status": "ok",
  "service": "grok-connector-server",
  "uptime": 123.45
}
```

### Step 5: Get Your URL

Copy the Railway public URL and add to Vercel:
1. Go to Vercel dashboard
2. Select intern-whatsapp-assistant
3. Settings → Environment Variables
4. Add: `GROK_CONNECTOR_URL = https://your-railway-url`
5. Redeploy Vercel

---

## Verification Checklist

- [ ] Pushed latest code to GitHub
- [ ] Redeployed on Railway
- [ ] Added XAI_API_KEY to Railway variables
- [ ] Railway service shows "Running" (green)
- [ ] Health check returns JSON (curl /health)
- [ ] Added GROK_CONNECTOR_URL to Vercel
- [ ] Redeployed Vercel
- [ ] Sent test WhatsApp message
- [ ] Check logs show provider chain working

---

## Expected Logs on Railway

**Success:**
```
Grok Connector Server running on port 3000
Health check: GET /health
Webhook endpoint: POST /api/grok-webhook
Stats endpoint: GET /api/stats
✓ XAI_API_KEY configured
```

**When handling a request:**
```
[Grok-Connector] Received request from +917025135070: "tell me about..."
✓ [Grok-Connector] Response generated in 2345ms
```

---

## If Something Goes Wrong

### Railway still shows Twilio errors
- Make sure code is pushed: `git push origin main`
- Wait 30 seconds for Railway to pull latest
- Manually trigger redeploy from Railway dashboard
- Check that you're on the "main" branch

### Can't find Variables section
- In Railway dashboard, click your project
- Click the service
- Look for "Variables", "Environment", or settings tab
- It might be in a different place depending on UI updates

### Still not working
1. Check Railway logs for actual error
2. Verify XAI_API_KEY is set (not empty)
3. Try deleting service and redeploying from scratch
4. Check that grok-connector-server.js exists in repo

---

## Quick Summary

| Component | Entry Point | Needs |
|-----------|-------------|-------|
| **Vercel** | api/webhook.js | Twilio + Groq |
| **Railway** | server.js (via npm start) | XAI_API_KEY only |

Both use the same GitHub repo, different entry points!

---

## Next Steps

1. ✅ Push code
2. ✅ Redeploy Railway
3. ✅ Add XAI_API_KEY
4. ✅ Copy Railway URL
5. ✅ Add to Vercel
6. ✅ Test end-to-end

You're almost there! 🚀
