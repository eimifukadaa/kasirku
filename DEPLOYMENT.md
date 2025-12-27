# 🚀 KASIRKU Deployment Guide

Deploy KASIRKU POS completely **FREE** using Vercel + Railway + Supabase!

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Step 1: Setup Supabase Database](#step-1-setup-supabase-database)
- [Step 2: Deploy Backend to Railway](#step-2-deploy-backend-to-railway)
- [Step 3: Deploy Frontend to Vercel](#step-3-deploy-frontend-to-vercel)
- [Step 4: Connect Everything](#step-4-connect-everything)
- [Environment Variables Reference](#environment-variables-reference)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR USERS                                │
│                          (Browser)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   VERCEL (Frontend) - FREE                       │
│                   https://kasirku.vercel.app                     │
│                   React + Vite Static Site                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ API Calls (/api/*)
┌─────────────────────────────────────────────────────────────────┐
│                 RAILWAY (Backend) - $5 FREE/month                │
│                 https://kasirku.up.railway.app                   │
│                 Go + Fiber API Server                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Database Queries
┌─────────────────────────────────────────────────────────────────┐
│                 SUPABASE (Database) - FREE                       │
│                 PostgreSQL + Storage                             │
│                 500MB Database, 1GB Storage                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before you start, make sure you have:

- [ ] **GitHub Account** - [Sign up here](https://github.com/signup)
- [ ] **Supabase Account** - [Sign up here](https://supabase.com)
- [ ] **Railway Account** - [Sign up here](https://railway.app) (Use GitHub to sign in)
- [ ] **Vercel Account** - [Sign up here](https://vercel.com) (Use GitHub to sign in)
- [ ] **Your code pushed to GitHub** - Create a repo and push this project

---

## Step 1: Setup Supabase Database

### 1.1 Create a New Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `kasirku-db`
   - **Database Password**: Generate a strong password (SAVE THIS!)
   - **Region**: Choose closest to your users (e.g., Singapore)
4. Click **"Create new project"** and wait ~2 minutes

### 1.2 Get Your Credentials

1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):

| What to Copy | Where to Find It |
|--------------|------------------|
| **Project URL** | Under "Project URL" |
| **anon public** | Under "Project API keys" |
| **service_role** | Under "Project API keys" (click reveal) |

### 1.3 Setup Database Schema

1. Go to **SQL Editor** in Supabase
2. Copy the contents of `database/schema.sql` from your project
3. Paste and click **"Run"**

> ⚠️ **Important**: If you already have data in a local PostgreSQL, you'll need to export and import it to Supabase.

---

## Step 2: Deploy Backend to Railway

### 2.1 Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub Repo"**
4. Connect your GitHub account if not already connected
5. Select your **kasirku** repository
6. Railway will auto-detect the Dockerfile and start building

### 2.2 Configure Environment Variables

1. Click on your deployment
2. Go to **"Variables"** tab
3. Add ALL these variables:

```env
PORT=8080
ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgres://postgres.[PROJ_ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=disable
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRY=24h
CORS_ORIGINS=https://your-app.vercel.app
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60
```

> 💡 **Tip**: For `JWT_SECRET`, generate a secure random string using:
> ```bash
> openssl rand -base64 32
> ```

### 2.3 Get Your Railway URL

1. Go to **"Settings"** tab
2. Under **"Domains"**, click **"Generate Domain"**
3. Copy your URL (e.g., `https://kasirku-production.up.railway.app`)

### 2.4 Verify Backend is Running

Open in browser:
```
https://YOUR-RAILWAY-URL/health
```

You should see:
```json
{"status": "healthy", "service": "kasirku-api"}
```

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"**
4. Find your **kasirku** repo
5. **IMPORTANT**: Set the **Root Directory** to `frontend`

### 3.2 Configure Build Settings

Vercel should auto-detect, but verify:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### 3.3 Add Environment Variables

Click **"Environment Variables"** and add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://YOUR-RAILWAY-URL/api` |

Example:
```
VITE_API_URL=https://kasirku-production.up.railway.app/api
```

### 3.4 Deploy!

Click **"Deploy"** and wait for the build to complete (~1-2 min)

---

## Step 4: Connect Everything

### 4.1 Update Railway CORS

Now that you have your Vercel URL, update Railway:

1. Go to Railway → Your Project → Variables
2. Update `CORS_ORIGINS`:
   ```
   CORS_ORIGINS=https://kasirku.vercel.app,https://YOUR-APP.vercel.app
   ```
3. Railway will auto-redeploy

### 4.2 Test the Full Flow

1. Open your Vercel URL
2. Register a new account
3. Create a store
4. Add a product
5. Make a test transaction

If everything works, **congratulations! 🎉**

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Server port (Railway sets this automatically) |
| `ENV` | Yes | `development` or `production` |
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `DATABASE_URL` | Yes | Supabase connection string (URI) |
| `JWT_SECRET` | Yes | Secret for signing JWTs (min 32 chars) |
| `JWT_EXPIRY` | Yes | Token expiration (e.g., `24h`) |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `RATE_LIMIT_MAX` | No | Max requests per window (default: 100) |
| `RATE_LIMIT_WINDOW` | No | Rate limit window in seconds (default: 60) |
| `FONNTE_API_KEY` | No | WhatsApp gateway API key |
| `FONNTE_API_URL` | No | WhatsApp gateway URL |

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Full URL to your Railway backend + `/api` |

---

## Troubleshooting

### ❌ "CORS Error" in Browser Console

**Cause**: Backend is blocking requests from your frontend domain.

**Fix**: 
1. Go to Railway → Variables
2. Add your Vercel domain to `CORS_ORIGINS`
3. Example: `CORS_ORIGINS=https://kasirku.vercel.app`

---

### ❌ "Failed to Connect to Database"

**Cause**: Supabase credentials are incorrect or missing.

**Fix**:
1. Verify `SUPABASE_URL` is correct (no trailing slash)
2. Verify `SUPABASE_SERVICE_KEY` is the **service_role** key, not anon

---

### ❌ "404 Not Found" on Page Refresh

**Cause**: Vercel needs SPA rewrite configuration.

**Fix**: The `vercel.json` file should handle this. Verify it exists in `frontend/`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

### ❌ Railway Build Failing

**Cause**: Usually a Dockerfile issue.

**Fix**:
1. Check Railway build logs
2. Verify `go.mod` and `go.sum` are committed
3. Test locally: `docker build -t kasirku .`

---

### ❌ "502 Bad Gateway" or "503 Service Unavailable"

**Cause**: Backend crashed or failed to start.

**Fix**:
1. Check Railway deployment logs
2. Verify all required environment variables are set
3. Check health endpoint directly

---

## 💰 Cost Breakdown

| Service | Cost | Limits |
|---------|------|--------|
| **Vercel** | FREE | Unlimited sites, 100GB bandwidth/month |
| **Railway** | FREE | $5 credit/month (~500 hours) |
| **Supabase** | FREE | 500MB DB, 1GB storage, 50K MAU |

**Total: $0/month** for hobby/small business use! 🎉

---

## 📞 Need Help?

If you run into issues:

1. Check the [Railway Docs](https://docs.railway.app)
2. Check the [Vercel Docs](https://vercel.com/docs)
3. Check the [Supabase Docs](https://supabase.com/docs)

---

Happy deploying! 🚀
