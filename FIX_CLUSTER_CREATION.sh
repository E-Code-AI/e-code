#!/bin/bash

# Alternative zones with better resource availability
echo "Trying alternative zones for GKE cluster creation..."

# Option 1: Try us-central1-c (usually has good availability)
echo "Attempting us-central1-c..."
gcloud container clusters create e-code-cluster \
  --zone us-central1-c \
  --num-nodes 2 \
  --machine-type e2-standard-2 \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 5

# If that fails, uncomment and try these alternatives:

# Option 2: us-east1-b (often has capacity)
# gcloud container clusters create e-code-cluster \
#   --zone us-east1-b \
#   --num-nodes 2 \
#   --machine-type e2-standard-2 \
#   --enable-autoscaling \
#   --min-nodes 1 \
#   --max-nodes 5

# Option 3: europe-west1-b (if US zones are full)
# gcloud container clusters create e-code-cluster \
#   --zone europe-west1-b \
#   --num-nodes 2 \
#   --machine-type e2-standard-2 \
#   --enable-autoscaling \
#   --min-nodes 1 \
#   --max-nodes 5

# Option 4: Smaller machines if still failing
# gcloud container clusters create e-code-cluster \
#   --zone us-central1-c \
#   --num-nodes 2 \
#   --machine-type e2-medium \
#   --enable-autoscaling \
#   --min-nodes 1 \
#   --max-nodes 3