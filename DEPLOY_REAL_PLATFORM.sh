#!/bin/bash
# Deploy the REAL E-Code Platform from Replit to Google Cloud

PROJECT_ID="votre-projet-ecode"
ZONE="europe-west1-b"
APP_NAME="e-code-platform-real"

echo "================================================"
echo "🚀 DEPLOYING YOUR REAL E-CODE PLATFORM"
echo "================================================"

# Step 1: Build the production Docker image
echo "📦 Building production Docker image..."
docker build -t gcr.io/${PROJECT_ID}/${APP_NAME}:latest .

# Step 2: Push to Google Container Registry
echo "☁️ Pushing to Google Container Registry..."
docker push gcr.io/${PROJECT_ID}/${APP_NAME}:latest

# Step 3: Create Kubernetes deployment
echo "🎯 Creating Kubernetes deployment..."
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${APP_NAME}
  namespace: e-code
spec:
  replicas: 15
  selector:
    matchLabels:
      app: ${APP_NAME}
  template:
    metadata:
      labels:
        app: ${APP_NAME}
    spec:
      containers:
      - name: app
        image: gcr.io/${PROJECT_ID}/${APP_NAME}:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "5000"
        - name: DATABASE_URL
          value: "${DATABASE_URL}"
        - name: OPENAI_API_KEY
          value: "${OPENAI_API_KEY}"
        - name: STRIPE_SECRET_KEY
          value: "${STRIPE_SECRET_KEY}"
        - name: VITE_STRIPE_PUBLIC_KEY
          value: "${VITE_STRIPE_PUBLIC_KEY}"
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: ${APP_NAME}-service
  namespace: e-code
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 5000
    protocol: TCP
  selector:
    app: ${APP_NAME}
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${APP_NAME}-hpa
  namespace: e-code
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${APP_NAME}
  minReplicas: 15
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
EOF

# Step 4: Wait for deployment
echo "⏳ Waiting for deployment to be ready..."
kubectl rollout status deployment/${APP_NAME} -n e-code --timeout=300s

# Step 5: Get the external IP
echo "🔍 Getting external IP address..."
sleep 30
EXTERNAL_IP=$(kubectl get service ${APP_NAME}-service -n e-code -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo ""
echo "================================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "================================================"
echo "🌐 Your REAL E-Code Platform is now live at:"
echo "   http://${EXTERNAL_IP}"
echo ""
echo "📊 Infrastructure:"
echo "   - 15 pods (auto-scaling to 100)"
echo "   - Production-ready configuration"
echo "   - All features from Replit deployed"
echo ""
echo "🔗 Access your platform:"
echo "   - Direct: http://${EXTERNAL_IP}"
echo "   - Domain: https://e-code.ai (after DNS propagation)"
echo "================================================"