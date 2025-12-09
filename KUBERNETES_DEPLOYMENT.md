# Deploy to DigitalOcean Kubernetes (DOKS)

**Cost: ~$36/month** (Basic cluster + Load Balancer)

This guide deploys your stock trading game to DigitalOcean Kubernetes Service.

## Prerequisites

- DigitalOcean account
- `kubectl` installed locally
- `doctl` (DigitalOcean CLI) installed

## Cost Breakdown

| Component | Cost |
|-----------|------|
| DOKS Cluster (2 nodes, Basic) | $24/month |
| Load Balancer | $12/month |
| **Total** | **$36/month** |

*Note: Uses DigitalOcean Container Registry (free)*

---

## Step 1: Install Tools

### Install kubectl (if not already installed)

**Windows (PowerShell):**
```powershell
choco install kubernetes-cli
# OR download from: https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/
```

### Install doctl

**Windows (PowerShell):**
```powershell
choco install doctl
# OR download from: https://docs.digitalocean.com/reference/doctl/how-to/install/
```

---

## Step 2: Authenticate with DigitalOcean

```powershell
# Create API token at: https://cloud.digitalocean.com/account/api/tokens
doctl auth init

# Verify authentication
doctl account get
```

---

## Step 3: Create Kubernetes Cluster

### Option A: Via Web Console (Easiest)

1. Go to https://cloud.digitalocean.com/kubernetes/clusters
2. Click **"Create Kubernetes Cluster"**
3. Settings:
   - **Datacenter**: Choose closest region (e.g., NYC3)
   - **Version**: Latest stable (1.28.x or higher)
   - **Node Pool**: Basic nodes, $12/month each
   - **Node Count**: 2 nodes
   - **Name**: `stock-game-cluster`
4. Click **"Create Cluster"**
5. Wait 3-5 minutes for provisioning

### Option B: Via CLI

```powershell
# Create cluster
doctl kubernetes cluster create stock-game-cluster `
  --region nyc3 `
  --version 1.28.2-do.0 `
  --node-pool "name=worker-pool;size=s-2vcpu-2gb;count=2"

# This takes 3-5 minutes
```

---

## Step 4: Configure kubectl

```powershell
# Download cluster credentials
doctl kubernetes cluster kubeconfig save stock-game-cluster

# Verify connection
kubectl get nodes
```

You should see 2 nodes listed!

---

## Step 5: Set Up Container Registry

```powershell
# Create container registry (if you don't have one)
doctl registry create stock-game-registry

# Log in to registry
doctl registry login

# Get registry name
doctl registry get
# You'll see something like: registry.digitalocean.com/stock-game-registry
```

---

## Step 6: Build and Push Docker Images

```powershell
cd C:\Users\mye85\Documents\UofT\ECE1779\ECE1779

# Set your registry URL (replace with your actual registry name)
$REGISTRY = "registry.digitalocean.com/stock-game-registry"

# Build backend
docker build -t ${REGISTRY}/backend:latest ./backend
docker push ${REGISTRY}/backend:latest

# Build frontend (use production Dockerfile)
docker build -t ${REGISTRY}/frontend:latest -f ./k8s/Dockerfile.frontend ./frontend
docker push ${REGISTRY}/frontend:latest

# Verify images are pushed
doctl registry repository list-v2
```

---

## Step 7: Update Kubernetes Manifests

The manifests in `k8s-do/` folder are already configured for DigitalOcean.
Just update the image names with your registry:

```powershell
# This is done automatically in the k8s-do/ manifests
# Your images will be: registry.digitalocean.com/stock-game-registry/backend:latest
```

---

## Step 8: Deploy to Kubernetes

```powershell
# Deploy everything
kubectl apply -f k8s-do/

# Watch deployment progress
kubectl get pods -w

# Wait until all pods show "Running" status (2-3 minutes)
```

---

## Step 9: Get Load Balancer IP

```powershell
# Get the external IP (may take 2-3 minutes to provision)
kubectl get svc frontend-service

# Look for EXTERNAL-IP column
# Example: 143.198.123.45
```

---

## Step 10: Access Your App

Visit: `http://YOUR_EXTERNAL_IP`

🎉 **Your app is live on Kubernetes!**

---

## Useful Commands

### Check Status

```powershell
# View all resources
kubectl get all

# Check pod logs
kubectl logs -f deployment/backend-deployment
kubectl logs -f deployment/frontend-deployment

# Check database
kubectl logs -f statefulset/postgres

# Describe a pod (for troubleshooting)
kubectl describe pod <pod-name>
```

### Update Deployment

```powershell
# After making code changes:

# 1. Build new image
docker build -t ${REGISTRY}/backend:v2 ./backend
docker push ${REGISTRY}/backend:v2

# 2. Update deployment
kubectl set image deployment/backend-deployment backend=${REGISTRY}/backend:v2

# 3. Watch rollout
kubectl rollout status deployment/backend-deployment
```

### Scale Up/Down

```powershell
# Scale backend
kubectl scale deployment backend-deployment --replicas=3

# Scale frontend
kubectl scale deployment frontend-deployment --replicas=3
```

### Access Database Directly

```powershell
# Port-forward to PostgreSQL
kubectl port-forward statefulset/postgres 5432:5432

# Then connect from local machine
psql -h localhost -U game_user -d stock_game
```

### View Logs

```powershell
# All backend logs
kubectl logs -l app=backend --tail=100 -f

# All frontend logs
kubectl logs -l app=frontend --tail=100 -f
```

---

## Monitoring & Debugging

### Check Resource Usage

```powershell
# Node resources
kubectl top nodes

# Pod resources
kubectl top pods
```

### Restart a Deployment

```powershell
kubectl rollout restart deployment/backend-deployment
kubectl rollout restart deployment/frontend-deployment
```

### Delete and Redeploy

```powershell
# Delete everything
kubectl delete -f k8s-do/

# Redeploy
kubectl apply -f k8s-do/
```

---

## Setting Up a Custom Domain

1. **Add DNS A Record:**
   - Point your domain to the Load Balancer IP
   - Example: `game.yourdomain.com` → `143.198.123.45`

2. **Wait for DNS propagation** (5-15 minutes)

3. **Access via domain:** `http://game.yourdomain.com`

### Add SSL/HTTPS (Optional)

Install cert-manager and configure Let's Encrypt (see advanced guide)

---

## Cost Optimization

### Reduce to 1 node:
```powershell
doctl kubernetes cluster node-pool update stock-game-cluster worker-pool --count=1
# Saves: $12/month → Total: $24/month
```

### Use smaller nodes:
```powershell
# When creating cluster, use:
--node-pool "name=worker-pool;size=s-1vcpu-2gb;count=2"
# Costs: $18/month → Total: $30/month
```

---

## Cleanup / Delete Everything

```powershell
# Delete Kubernetes resources
kubectl delete -f k8s-do/

# Delete cluster
doctl kubernetes cluster delete stock-game-cluster

# Delete container registry (optional)
doctl registry delete stock-game-registry
```

---

## Comparison: DOKS vs Droplet

| Feature | Droplet ($6/mo) | DOKS ($36/mo) |
|---------|----------------|---------------|
| Auto-scaling | ❌ | ✅ |
| Load balancing | Manual | ✅ Automatic |
| Self-healing | ❌ | ✅ |
| Rolling updates | Manual | ✅ |
| Multi-node | ❌ | ✅ |
| Best for | Testing/Learning | Production |

---

## Troubleshooting

### Pods stuck in "Pending"
```powershell
kubectl describe pod <pod-name>
# Check events section for errors
```

### Can't pull images
```powershell
# Re-authenticate
doctl registry login

# Add imagePullSecrets (already configured in manifests)
```

### Load Balancer not getting IP
```powershell
# Check service
kubectl describe svc frontend-service

# May take 3-5 minutes to provision
```

### Out of resources
```powershell
# Check node capacity
kubectl describe nodes

# Scale up node pool if needed
doctl kubernetes cluster node-pool update stock-game-cluster worker-pool --count=3
```

---

## Next Steps

- ✅ Set up monitoring (DigitalOcean Monitoring is free)
- ✅ Configure auto-scaling
- ✅ Add SSL certificate
- ✅ Set up CI/CD pipeline
- ✅ Configure persistent volumes for database

Your Kubernetes deployment is production-ready! 🚀
