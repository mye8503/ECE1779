# DigitalOcean Kubernetes - Quick Start Checklist

## Prerequisites

- [ ] DigitalOcean account
- [ ] `kubectl` installed
- [ ] `doctl` installed

## Step-by-Step

### 1. Install Tools

```powershell
# Install kubectl
choco install kubernetes-cli

# Install doctl
choco install doctl
```

### 2. Authenticate

```powershell
# Get API token from: https://cloud.digitalocean.com/account/api/tokens
doctl auth init
```

### 3. Create Kubernetes Cluster

**Easy way:** Go to https://cloud.digitalocean.com/kubernetes/clusters
- Click "Create Cluster"
- Name: `stock-game-cluster`
- Region: NYC3
- Nodes: 2x Basic ($12/mo each)
- Click "Create"

**CLI way:**
```powershell
doctl kubernetes cluster create stock-game-cluster `
  --region nyc3 `
  --node-pool "name=worker-pool;size=s-2vcpu-2gb;count=2"
```

### 4. Connect kubectl

```powershell
doctl kubernetes cluster kubeconfig save stock-game-cluster
kubectl get nodes
```

### 5. Create Container Registry

```powershell
doctl registry create stock-game-registry
doctl registry login
```

### 6. Update Registry Name

Edit `deploy-k8s.ps1` and change:
```powershell
$REGISTRY = "stock-game-registry"  # Your actual registry name
```

### 7. Deploy!

```powershell
cd C:\Users\mye85\Documents\UofT\ECE1779\ECE1779
.\deploy-k8s.ps1
```

### 8. Access Your App

Script will show: `🌐 Access at: http://YOUR_IP`

## That's It!

**Cost: $36/month**
- Cluster (2 nodes): $24/mo
- Load Balancer: $12/mo
- Registry: Free

## Common Commands

```powershell
# View everything
kubectl get all

# View logs
kubectl logs -f deployment/backend-deployment

# Scale up
kubectl scale deployment backend-deployment --replicas=3

# Update image
docker build -t registry.digitalocean.com/stock-game-registry/backend:v2 ./backend
docker push registry.digitalocean.com/stock-game-registry/backend:v2
kubectl set image deployment/backend-deployment backend=registry.digitalocean.com/stock-game-registry/backend:v2
```

## Troubleshooting

**Pods not starting?**
```powershell
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

**Can't pull images?**
```powershell
doctl registry login
kubectl delete pod --all  # Force re-pull
```

**Load Balancer no IP?**
```powershell
# Wait 2-3 minutes, then:
kubectl get svc frontend-service
```

See `KUBERNETES_DEPLOYMENT.md` for full documentation!
