# Production Deployment Guide

## Architecture

**Frontend (Next.js)**: Deployed on Vercel
**WebSocket Server**: Deployed on Railway (separate service)

This split is necessary because Vercel's serverless functions don't support persistent WebSocket connections.

## Step 1: Deploy WebSocket Server to Railway

✅ Already done! Server is at: https://github.com/musselmanjoey/caption-contest-server

1. Go to Railway dashboard
2. Copy your server's public URL (e.g., `caption-contest-server-production-xxxx.up.railway.app`)
3. In Railway, add environment variable:
   - `ALLOWED_ORIGINS`: `https://joeymusselman.com,https://www.joeymusselman.com`

## Step 2: Configure Vercel Environment Variable

Once you have your Railway URL:

1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Add variable:
   - Name: `NEXT_PUBLIC_SOCKET_URL`
   - Value: `https://your-railway-url.up.railway.app` (replace with actual URL)
   - Apply to: Production, Preview, Development

## Step 3: Deploy to Vercel

The code is already set up! Just push to GitHub:

```bash
cd joey-musselman-site
git add -A
git commit -m "Update WebSocket URLs for production"
git push
```

Vercel will auto-deploy!

## How It Works

### Development (localhost:3001)
```typescript
// lib/socket.ts automatically uses localhost in dev
const socketUrl = 'http://localhost:3001';
```

### Production (Railway)
```typescript
// lib/socket.ts uses environment variable in production
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
```

## Testing Production Deployment

1. Open `https://joeymusselman.com/game/host`
2. Should see room code generated
3. On phone, go to `https://joeymusselman.com/game/join`
4. Enter room code and name
5. Should connect successfully!

## Troubleshooting

### "Room not found" errors
- Check Railway server logs
- Verify `ALLOWED_ORIGINS` includes your domain
- Ensure Railway service is running

### WebSocket won't connect
- Check browser console for CORS errors
- Verify `NEXT_PUBLIC_SOCKET_URL` is set in Vercel
- Test WebSocket URL directly: `https://your-railway-url.up.railway.app`

### Railway URLs
Railway gives you a public URL automatically. Find it in:
- Railway dashboard → Your service → Settings → Domains

## Costs

- **Vercel**: Free (Hobby plan)
- **Railway**:
  - $5/month free credit
  - Usage-based after that (very cheap for this project)
  - Alternatively, use Render free tier (less reliable but truly free)
