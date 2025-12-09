eval $(minikube docker-env)

cd backend
docker build -t myregistry/backend:latest .
cd ../frontend
docker build -t myregistry/frontend:latest .
cd ..

kubectl apply -f ./backend/deployment.yaml
kubectl apply -f ./backend/service.yaml
kubectl apply -f ./frontend/deployment.yaml
kubectl apply -f ./frontend/service.yaml
kubectl apply -f ./k8s/postgres.yaml
# kubectl apply -f ./k8s/redis.yaml

minikube addons enable metrics-server
minikube addons enable dashboard

kubectl port-forward svc/frontend-service 5180:5180 &
kubectl port-forward svc/backend-service 3000:3000 &
kubectl port-forward svc/postgres 5432:5432 &
kubectl proxy --port=8002 &