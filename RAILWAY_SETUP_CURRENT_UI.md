# Railway Deployment - Updated UI Guide

## Current Railway UI (2026)

Railway's interface has been simplified. Here's how to deploy with the current UI:

### Step 1: Create New Project

1. Go to https://railway.app
2. Click "New Project" button
3. Select "Deploy from GitHub"
4. Authorize GitHub if needed
5. Select repository: `intern-whatsapp-assistant`
6. Select branch: `main`
7. Click "Deploy"

### Step 2: Wait for Auto-Deploy

Railway will:
- Auto-detect Node.js project
- Install dependencies
- Auto-detect start command from package.json
- Deploy automatically

**This may take 2-3 minutes**

### Step 3: Add Environment Variable

Once deployed:

1. Go to https://railway.app/dashboard
2. Click on your project
3. Look for your service (should show "grok-connector" or similar)
4. Click on the service card
5. You should see "Variables" or "Environment" section
6. Click to add variable:
   ```
   XAI_API_KEY = xai_YOUR_KEY_HERE
   ```
7. Save/Confirm

The service will auto-redeploy with the new variable.

### Step 4: Get Your URL

1. In your Railway project, find the service
2. Look for "Public URL" or "URL" section
3. Copy the URL (format: `https://intern-whatsapp-assistant-xxxx.railway.app`)
4. This is your `GROK_CONNECTOR_URL`

### Step 5: Test It Works

```bash
curl https://your-railway-url/health

# Should respond:
{
  "status": "ok",
  "service": "grok-connector-server"
}
```

---

## Alternative: Using railway.json

If you want to be explicit about the start command, Railway reads from `railway.json`:

**We've already created this file** at the root of your repo:

```json
{
  "builder": "nixpacks",
  "services": {
    "grok-connector": {
      "startCommand": "node grok-connector-server.js"
    }
  }
}
```

This tells Railway exactly what to run.

---

## If Auto-Deploy Isn't Working

### Option 1: Use Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Navigate to your project
cd ~/intern-whatsapp-assistant

# Deploy
railway up

# View logs
railway logs -f
```

### Option 2: Manual GitHub Deploy

1. Make sure your GitHub repo is up to date:
   ```bash
   git push origin main
   ```

2. In Railway:
   - New Project → Deploy from GitHub
   - Select your repo again
   - It should show the latest commit

### Option 3: Check Railway Logs for Issues

1. In Railway dashboard, look for a "Logs" section
2. Scroll through logs to see what went wrong
3. Common issues:
   - Dependencies not installed
   - Node.js version mismatch
   - Missing environment variables

---

## What Should Happen

**On First Deploy:**
```
Building...
Installing dependencies...
Building complete
Deploying...
Running: node grok-connector-server.js
✓ Service running on port 3000
✓ Health check: /health working
```

**Expected Success:**
- Service shows "Running" status (green)
- Public URL is accessible
- `/health` endpoint returns JSON

**If Stuck:**
- Check Railway logs
- Verify XAI_API_KEY is set
- Try manual redeploy from GitHub

---

## Current Railway Interface Tips

**Look for these sections in your service:**

1. **Status** - Shows if service is Running/Building/Error
2. **Public URL** - Click to get your webhook URL
3. **Variables** - Where to add XAI_API_KEY
4. **Logs** - Real-time output of your service
5. **Deployments** - History of deployments
6. **Settings** - If available, shows advanced config

**If something looks different:**
- Railway updates their UI occasionally
- Check https://docs.railway.app for latest docs
- Most functionality is in the same place, just reorganized

---

## Quick Troubleshooting

### Service won't start
**Check:**
1. XAI_API_KEY is set
2. No Twilio vars needed (they'll be ignored)
3. Check logs for actual error message

### Can't find where to add variables
**Look for:**
- "Variables" tab or section
- "Environment" button
- Settings with key-value pairs
- Add button or "+" icon

### Can't find Public URL
**Look for:**
- URL section in service details
- Deployment info area
- Or check logs - it prints the URL

### Everything looks empty
**Try:**
1. Refresh the page (F5)
2. Wait a moment for UI to load
3. Make sure you're in the right project
4. Check that deployment is complete

---

## Once Railway is Working

You'll have:
- ✅ Railway URL (copy this)
- ✅ XAI_API_KEY set
- ✅ Service running
- ✅ Logs visible

Then:
1. Add Railway URL to Vercel as `GROK_CONNECTOR_URL`
2. Redeploy main bot on Vercel
3. Test end-to-end

---

## Need Help?

1. **Check Railway status:** https://status.railway.app
2. **Read Railway docs:** https://docs.railway.app
3. **Check logs in Railway dashboard** - Most helpful for debugging
4. **Verify your code pushed:** `git push origin main`

The deployment should be mostly automatic once you add the XAI_API_KEY variable!
