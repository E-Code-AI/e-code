#!/bin/bash

# Complete E-Code Platform Deployment to Google Cloud
# Run this after your cluster is created

echo "========================================="
echo "  E-Code Platform - Google Cloud Deploy"
echo "========================================="

# Check if we're in the e-code directory
if [ ! -f "package.json" ]; then
    echo "Please run this from the e-code directory"
    echo "cd ~/e-code"
    exit 1
fi

# 1. Get cluster credentials
echo "Getting cluster credentials..."
gcloud container clusters get-credentials e-code-cluster --zone europe-west1-b

# 2. Create namespace
echo "Creating namespace..."
kubectl create namespace e-code-platform || echo "Namespace may already exist"

cdue
data:
  POSTGRES_PASSWORD: $(echo -n "ecode2025secure" | base64)
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: e-code-platform
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: ecode
        - name: POSTGRES_USER
          value: postgres
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: POSTGRES_PASSWORD
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: e-code-platform
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
EOF

# 4. Build and push Docker image
      echo "Building Docker image..."
      PROJECT_ID="votre-projet-ecode"
      IMAGE_NAME="gcr.io/${PROJECT_ID}/e-code-platform:latest"

# Configure Docker for GCR
gcloud auth configure-docker

# Build the image
docker build -t gcr.io/votre-projet-ecode/e-code-platform:latest

# Push to Google Container Registry
echo "Pushing image to GCR..."
docker push gcr.io/votre-projet-ecode/e-code-platform:latest

# 5. Deploy the application
echo "Deploying E-Code Platform..."
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: e-code-platform
  namespace: e-code-platform
spec:
  replicas: 2
  selector:
    matchLabels:
      app: e-code-platform
  template:
    metadata:
      labels:
        app: e-code-platform
    spec:
      containers:
      - name: e-code-platform
        image: ${IMAGE_NAME}
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          value: "postgresql://postgres:ecode2025secure@postgres:5432/ecode"
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-keys
              key: OPENAI_API_KEY
              optional: true
        - name: STRIPE_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: api-keys
              key: STRIPE_SECRET_KEY
              optional: true
---
apiVersion: v1
kind: Service
metadata:
  name: e-code-platform
  namespace: e-code-platform
spec:
  type: LoadBalancer
  selector:
    app: e-code-platform
  ports:
  - port: 80
    targetPort: 5000
EOF

# 6. Wait for deployment
echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/e-code-platform -n e-code-platform

# 7. Get the external IP
echo ""
echo "========================================="
echo "  Deployment Complete!"
echo "========================================="
echo ""
echo "Getting external IP address..."
kubectl get service e-code-platform -n e-code-platform

echo ""
echo "Your E-Code Platform will be available at the EXTERNAL-IP shown above."
echo "It may take a few minutes for the IP to be assigned."
echo ""
echo "To check status:"
echo "kubectl get pods -n e-code-platform"
echo ""
echo "To see logs:"
echo "kubectl logs -n e-code-platform -l app=e-code-platform"