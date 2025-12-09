# Quick Deploy to DigitalOcean Kubernetes
# Run this script after creating your DOKS cluster

# Step 1: Set your registry name
$REGISTRY = "stock-game-registry"
$REGISTRY_URL = "registry.digitalocean.com/$REGISTRY"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "DigitalOcean Kubernetes Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Step 2: Build and push images
Write-Host ""
Write-Host "Building Docker images..." -ForegroundColor Yellow

Write-Host "Building backend..." -ForegroundColor Gray
docker build -t ${REGISTRY_URL}/backend:latest ./backend

Write-Host "Building frontend..." -ForegroundColor Gray
docker build -t ${REGISTRY_URL}/frontend:latest -f ./k8s-do/Dockerfile.frontend ./frontend

Write-Host ""
Write-Host "Pushing images to DigitalOcean Registry..." -ForegroundColor Yellow
docker push ${REGISTRY_URL}/backend:latest
docker push ${REGISTRY_URL}/frontend:latest

# Step 3: Update manifests with registry URL
Write-Host ""
Write-Host "Updating Kubernetes manifests..." -ForegroundColor Yellow

$backendFile = "k8s-do/04-backend.yaml"
$frontendFile = "k8s-do/05-frontend.yaml"

(Get-Content $backendFile) -replace 'YOUR_REGISTRY_NAME', $REGISTRY | Set-Content $backendFile
(Get-Content $frontendFile) -replace 'YOUR_REGISTRY_NAME', $REGISTRY | Set-Content $frontendFile

# Step 4: Deploy to Kubernetes
Write-Host ""
Write-Host "Deploying to Kubernetes..." -ForegroundColor Yellow

kubectl apply -f k8s-do/

Write-Host ""
Write-Host "Waiting for pods to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

kubectl get pods

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Waiting for Load Balancer IP (this may take 2-3 minutes)..." -ForegroundColor Yellow

$maxAttempts = 20
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $attempt++
    $ip = kubectl get svc frontend-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>$null
    
    if ($ip) {
        Write-Host ""
        Write-Host "Your app is ready!" -ForegroundColor Green
        Write-Host "Access at: http://$ip" -ForegroundColor Cyan
        break
    }
    
    Write-Host "Attempt $attempt/$maxAttempts - waiting..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
}

if (-not $ip) {
    Write-Host ""
    Write-Host "Load Balancer IP not ready yet." -ForegroundColor Yellow
    Write-Host "Run this command to check: kubectl get svc frontend-service" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  View pods:    kubectl get pods" -ForegroundColor Gray
Write-Host "  View logs:    kubectl logs -f deployment/backend-deployment" -ForegroundColor Gray
Write-Host "  Get IP:       kubectl get svc frontend-service" -ForegroundColor Gray
