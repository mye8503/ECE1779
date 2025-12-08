# Build and Deploy Script for Windows

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Building Frontend Locally" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Build frontend
Set-Location frontend
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "`n🏗️ Building frontend..." -ForegroundColor Yellow
npm run build

Set-Location ..

Write-Host "`n✅ Build complete!" -ForegroundColor Green
Write-Host "`nBuilt files are in: frontend/dist" -ForegroundColor Cyan

# Check if dist folder exists and has files
if (Test-Path "frontend/dist") {
    $fileCount = (Get-ChildItem "frontend/dist" -Recurse -File).Count
    Write-Host "📊 Total files: $fileCount" -ForegroundColor Cyan
} else {
    Write-Host "❌ Error: dist folder not created!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "1. Commit and push the dist folder to GitHub"
Write-Host "2. On your droplet, pull the latest code"
Write-Host "3. Run: docker-compose -f docker-compose.simple.yml up -d"
Write-Host ""
