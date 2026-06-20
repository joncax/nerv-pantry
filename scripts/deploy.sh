#!/bin/bash
# nerv-pantry deploy script
# Uso: bash scripts/deploy.sh [--first-run]
set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NAMESPACE="nerv-pantry"
FIRST_RUN=false

if [[ "$1" == "--first-run" ]]; then
  FIRST_RUN=true
fi

echo "🔄 nerv-pantry deploy — $(date)"
cd "$REPO_DIR"

echo "📦 Building backend image..."
docker build -t nerv-pantry-backend:latest ./backend

echo "📦 Building frontend image..."
docker build -t nerv-pantry-frontend:latest ./frontend

echo "📤 Importing images to MicroK8s..."
docker save nerv-pantry-backend:latest | microk8s ctr images import -
docker save nerv-pantry-frontend:latest | microk8s ctr images import -

echo "🚀 Applying K8s manifests..."
microk8s kubectl apply -f k8s/namespace.yaml
microk8s kubectl apply -f k8s/postgres/
microk8s kubectl apply -f k8s/storage/
microk8s kubectl apply -f k8s/backend/
microk8s kubectl apply -f k8s/frontend/

echo "⏳ Waiting for pods to be ready..."
microk8s kubectl wait --for=condition=ready pod \
  -l app=nerv-pantry-postgres -n "$NAMESPACE" --timeout=60s
microk8s kubectl wait --for=condition=ready pod \
  -l app=nerv-pantry-backend -n "$NAMESPACE" --timeout=60s

if [ "$FIRST_RUN" = true ]; then
  echo "🗄️  Running database migrations..."
  BACKEND_POD=$(microk8s kubectl get pod -n "$NAMESPACE" \
    -l app=nerv-pantry-backend -o jsonpath='{.items[0].metadata.name}')
  microk8s kubectl exec -n "$NAMESPACE" "$BACKEND_POD" -- \
    alembic upgrade head

  echo "🌱 Running seed..."
  microk8s kubectl exec -n "$NAMESPACE" "$BACKEND_POD" -- \
    python -c "
import httpx, time
time.sleep(2)
r = httpx.post('http://localhost:8000/seed')
print(r.json())
"
fi

echo ""
echo "✅ Deploy complete!"
microk8s kubectl get all -n "$NAMESPACE"
echo ""
echo "🌐 Frontend: http://192.168.1.50:30190"
echo "🔧 Backend:  http://192.168.1.50:30191"
