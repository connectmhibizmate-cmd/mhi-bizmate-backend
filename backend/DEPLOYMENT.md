# Heart of BizMate — Backend Deployment Guide

## Prerequisites

1. **Supabase migrations applied** — Run migrations `0001` through `0005` in the Supabase Dashboard SQL Editor (in order).
2. **Supabase service role key** — Dashboard → Settings → API → `service_role` key.
3. **CORS origins** — The URL where your frontend is hosted (e.g., `https://mhibizmate.base44.app`).

---

## Option A: Render (Recommended — Free Tier Available)

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo `connectmhibizmate-cmd/mhi-bizmate-backend`
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm ci`
   - **Start Command**: `node src/server.js`
   - **Instance Type**: Free or Starter
4. Environment Variables:
   ```
   SUPABASE_URL=https://dmscflxqjzvasnyqbhlu.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   CORS_ALLOWED_ORIGINS=https://mhibizmate.base44.app
   NODE_ENV=production
   ```
5. Deploy → You'll get a URL like `https://mhi-bizmate-backend.onrender.com`
6. Test: `GET https://mhi-bizmate-backend.onrender.com/health` → `{ "status": "ok" }`

---

## Option B: Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select repo `connectmhibizmate-cmd/mhi-bizmate-backend`
3. Settings → Root Directory: `backend`
4. Variables: Add the same env vars as above
5. Deploy → Get URL → Test `/health`

---

## Option C: Fly.io

```bash
cd backend
fly launch --no-deploy
# Edit fly.toml to set env vars or use: fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
fly deploy
```

---

## Option D: Docker

```bash
cd backend
docker build -t heart-of-bizmate .
docker run -p 3001:3001 \
  -e SUPABASE_URL=https://dmscflxqjzvasnyqbhlu.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=<key> \
  -e CORS_ALLOWED_ORIGINS=https://mhibizmate.base44.app \
  heart-of-bizmate
```

---

## Post-Deployment: Connect Frontend

Once the backend is deployed and you have the URL (e.g., `https://mhi-bizmate-backend.onrender.com`):

1. Tell Base44 the backend URL so it can be embedded in the frontend config.
2. The frontend will switch from "offline stub" mode to "live backend" mode automatically.

---

## Verification Checklist

- [ ] `GET /health` returns `{ "status": "ok" }`
- [ ] `GET /api/v1/products` returns `401` (auth required — correct)
- [ ] Frontend can authenticate and fetch products
- [ ] Order creation works (atomic stock + order)
- [ ] CORS headers present on API responses