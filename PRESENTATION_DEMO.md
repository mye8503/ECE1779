# Stock Trading Game - Presentation Demo Script

## Pre-Demo Setup (run before presentation)

```bash
# 1. Make sure minikube is running
minikube status

# 2. Set up kubectl proxy for dashboard (in a separate terminal)
kubectl proxy --port=8001 &

# 3. Set up port forwarding for frontend (in another terminal)
kubectl port-forward svc/frontend-service 5173:5173

# 4. Set up port forwarding for backend (in another terminal)
kubectl port-forward svc/backend-service 3000:3000
```

---

## Demo Sequence (in order)

### 1. Show Kubernetes Cluster Status (1 min)

```bash
# Show cluster info
echo "=== Kubernetes Cluster Info ==="
kubectl cluster-info

echo ""
echo "=== Minikube Status ==="
minikube status

echo ""
echo "=== Namespaces ==="
kubectl get namespaces
```

### 2. Show Deployments & Services (1 min)

```bash
# Show all deployments with replicas
echo "=== Deployments (showing Kubernetes orchestration) ==="
kubectl get deployments -o wide

echo ""
echo "=== Replica Sets ==="
kubectl get replicasets

echo ""
echo "=== Services (Load Balancers) ==="
kubectl get services

echo ""
echo "=== Persistent Volume Claim ==="
kubectl get pvc
```

### 3. Show Running Pods (1 min)

```bash
# Show all running pods with status
echo "=== All Running Pods ==="
kubectl get pods -o wide

# Show what images are running
echo ""
echo "=== Pod Images ==="
kubectl describe pods | grep -E "^Name:|Image:"
```

### 4. Show Resource Metrics & Monitoring (1 min)

```bash
# Show resource usage (this is our monitoring)
echo "=== Pod Resource Usage (CPU & Memory) ==="
kubectl top pods

echo ""
echo "=== Dashboard Link ==="
echo "Open in browser: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/"

# OR directly open dashboard
# minikube dashboard
```

### 5. Show PostgreSQL Persistence (1 min)

```bash
# Show PostgreSQL pod details
echo "=== PostgreSQL Pod ==="
kubectl describe pod -l app=postgres

echo ""
echo "=== Database Connection Status (from logs) ==="
kubectl logs -l app=postgres --tail=5

# Show that data persists
echo ""
echo "=== Checking Database ==="
kubectl exec -it $(kubectl get pod -l app=postgres -o jsonpath='{.items[0].metadata.name}') -- \
  psql -U game_user -d stock_game -c "SELECT COUNT(*) as game_count FROM games;"
```

### 6. Demonstrate Application (3-5 min)

```bash
# Open the application
echo "Opening application at http://localhost:5173"
# Navigate to http://localhost:5173 in browser

# In the application:
# 1. Register a new user or play as guest
# 2. Create a new game
# 3. Play (make some trades)
# 4. Show the leaderboard
# 5. End the game to see results
```

### 7. Show Pod Replication & High Availability (1 min)

```bash
# Show backend has 2 replicas
echo "=== Backend Deployment Details ==="
kubectl describe deployment backend-deployment

echo ""
echo "=== Kill one backend pod to show auto-recovery ==="
kubectl delete pod -l app=backend --field-selector=status.phase=Running | head -1

echo "Waiting 5 seconds..."
sleep 5

echo ""
echo "=== Watch new pod being created (notice READY 1/2 -> 2/2) ==="
kubectl get pods -l app=backend --watch &
WATCH_PID=$!
sleep 10
kill $WATCH_PID 2>/dev/null
```

### 8. Show Logs from Live Transactions (1 min)

```bash
# Show backend logs showing game activity
echo "=== Live Backend Logs ==="
kubectl logs -l app=backend -f --tail=20 &
LOGS_PID=$!

# (let it run for a bit while user plays)
sleep 15
kill $LOGS_PID 2>/dev/null

echo ""
echo "=== Sample Backend Log Output ==="
echo "Shows: WebSocket connections, database queries, transactions processing"
```

### 9. Summary - Show Core Requirements Met (1 min)

```bash
echo "=== CORE REQUIREMENTS CHECKLIST ==="
echo "✓ Docker Containerization:"
echo "  - Backend image: myregistry/backend:latest"
echo "  - Frontend image: myregistry/frontend:latest"
kubectl images

echo ""
echo "✓ PostgreSQL Database:"
echo "  - Status: Running"
kubectl get deployment postgres

echo ""
echo "✓ Persistent Storage (PersistentVolumeClaim):"
echo "  - PVC: postgres-pvc (1Gi)"
kubectl get pvc

echo ""
echo "✓ Kubernetes Orchestration:"
echo "  - Deployments: backend (2 replicas), frontend (2 replicas)"
echo "  - Services: Load Balancers for frontend & backend"
echo "  - Auto-healing: Pods automatically restart on failure"
kubectl get deployments
kubectl get services -l app!=kubernetes

echo ""
echo "✓ Monitoring & Observability:"
echo "  - Metrics: kubectl top pods (CPU/Memory)"
echo "  - Dashboard: Kubernetes UI at http://localhost:8001"
echo "  - Logs: kubectl logs for pod inspection"
```

---

## Quick Reference Commands

```bash
# Check everything is running
kubectl get all

# Watch deployments
kubectl rollout status deployment/backend-deployment

# View pod logs in real-time
kubectl logs -l app=backend -f

# Execute commands inside pods
kubectl exec -it <pod-name> -- /bin/bash

# Get detailed pod info
kubectl describe pod <pod-name>

# Port forward to access services
kubectl port-forward svc/frontend-service 5173:5173
kubectl port-forward svc/backend-service 3000:3000

# Scale deployment
kubectl scale deployment backend-deployment --replicas=3

# Delete and recreate (for demonstration)
kubectl delete pod <pod-name>  # New pod auto-created

# Clean up everything
minikube delete
```

---

## Demo Talking Points

1. **Containerization**: "Each service is containerized in Docker. Frontend, backend, database, and Redis all run in containers for consistency."

2. **Orchestration**: "Kubernetes manages all these containers. We have 2 replicas of backend and frontend for high availability. If a pod crashes, Kubernetes automatically creates a new one."

3. **Persistent Storage**: "The PostgreSQL database uses a PersistentVolumeClaim. Even if the pod restarts, the data survives on the volume."

4. **Real-time Application**: "The stock game uses WebSockets for real-time price updates every 2 seconds, and Kubernetes handles the load balancing."

5. **Monitoring**: "Kubernetes built-in metrics show CPU and memory usage for each pod. The dashboard provides visual monitoring of the cluster."

6. **Scalability**: "If we need more backend instances, we can scale the deployment with a single command - Kubernetes handles distribution."

---

## Troubleshooting During Demo

```bash
# If frontend can't connect to backend:
# Make sure both port forwards are running
kubectl port-forward svc/frontend-service 5173:5173 &
kubectl port-forward svc/backend-service 3000:3000 &

# If pod won't start:
kubectl describe pod <pod-name>
kubectl logs <pod-name>

# Restart a service:
kubectl rollout restart deployment/<deployment-name>

# Check service endpoints:
kubectl get endpoints
```

