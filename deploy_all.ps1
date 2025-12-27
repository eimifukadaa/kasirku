# Deploy Script for KASIRKU POS
# Run this script to sync environment variables and trigger deployments

Write-Host "🚀 Starting Deployment Automation..."

# 1. Configuration
$BACKEND_DOMAIN = "kasirku-backend-production.up.railway.app"
$DB_URL = "YOUR_DATABASE_URL_HERE"
$JWT_SECRET = "YOUR_JWT_SECRET_HERE"

# 2. Sync Railway Variables
Write-Host "📡 Syncing Railway Backend Variables..."
railway variables --service kasirku-backend --set "DATABASE_URL=$DB_URL" --set "ENV=production" --set "PORT=8080" --set "JWT_SECRET=$JWT_SECRET" --set "JWT_EXPIRY=24h" --set "CORS_ORIGINS=*"

# 3. Sync Vercel Variables
Write-Host "🌐 Syncing Vercel Frontend Variables..."
cd frontend
# Use --force to overwrite if exists, and non-interactive approach
echo "https://kasirku-backend-production.up.railway.app/api" | vercel env add VITE_API_URL production --force
echo "https://kasirku-backend-production.up.railway.app/api" | vercel env add VITE_API_URL preview --force
cd ..

# 4. Trigger Redeployment
Write-Host "🔄 Triggering Redeployments..."
railway up --service kasirku-backend --detach
cd frontend
vercel --prod --yes
cd ..

Write-Host "✅ Deployment initiated!"
Write-Host "Backend URL: https://kasirku-backend-production.up.railway.app"
Write-Host "Health Check: https://kasirku-backend-production.up.railway.app/health"
