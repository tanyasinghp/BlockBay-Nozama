#!/bin/bash

# Deploy Pre-built Images Script
# Usage: ./deploy-prebuild-images.sh
# 
# This script assumes all Docker images have already been pushed to Docker Hub
# and proceeds directly to Minikube deployment

set -e

echo "🚀 Deploying Nozama services using pre-built Docker Hub images"
echo ""

# Load configuration file to show what images will be used
CONFIG_FILE="service-images.conf"
if [ -f "$CONFIG_FILE" ]; then
    echo "📋 Using the following pre-built images:"
    source "$CONFIG_FILE"
    echo "  🆔 Identity & Reputation: $IDENTITY_REPUTATION"
    echo "  🔍 Search & Discovery: $SEARCH_DISCOVERY"
    echo "  📦 Order Service: $ORDER_SERVICE"
    echo "  📋 Listing Service: $LISTING_SERVICE"
    echo "  💳 Payment Service: $PAYMENT_SERVICE"
    echo ""
else
    echo "⚠️  Warning: Configuration file $CONFIG_FILE not found"
    echo "   Using default image names from Kubernetes manifests"
    echo ""
fi

echo "✅ Skipping build process - using existing Docker Hub images"
echo ""

# Check if minikube is running
if ! minikube status | grep -q "Running"; then
    echo "⚠️  Minikube is not running. Starting Minikube..."
    echo "💾 Starting with 6GB memory (Docker Desktop has 7.8GB available)"
    minikube start --driver=docker --cpus=3 --memory=6144mb
else
    echo "✅ Minikube is already running"
fi

echo ""
echo "📦 Deploying services to Kubernetes..."

# Apply manifests in order (dependencies first)
echo "🏗️  Creating namespace..."
kubectl apply -f ../k8s/namespace.yaml

echo "🗄️  Deploying MongoDB..."
kubectl apply -f ../k8s/mongodb.yaml

echo "⏳ Waiting for MongoDB to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/mongodb -n nozama

echo "🆔 Deploying Identity & Reputation service..."
kubectl apply -f ../k8s/identity-reputation.yaml

echo "🔍 Deploying Search & Discovery service..."
kubectl apply -f ../k8s/search-discovery.yaml

echo "📋 Deploying Listing service..."
kubectl apply -f ../k8s/listing-service.yaml

echo "📦 Deploying Order service..."
kubectl apply -f ../k8s/order-service.yaml

echo "💳 Deploying Payment service..."
kubectl apply -f ../k8s/payment-service.yaml

echo ""
echo "⏳ Waiting for all deployments to be ready..."
kubectl wait --for=condition=available --timeout=600s deployment --all -n nozama

echo ""
echo "📋 Deployment Status:"
kubectl get pods -n nozama -o wide
echo ""
kubectl get services -n nozama

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 To access services, use port forwarding:"
echo "  kubectl port-forward -n nozama service/identity-reputation-service 3001:3001"
echo "  kubectl port-forward -n nozama service/search-discovery-service 3002:3002"
echo "  kubectl port-forward -n nozama service/order-service 3003:3003"
echo "  kubectl port-forward -n nozama service/listing-service 3004:3004"
echo "  kubectl port-forward -n nozama service/payment-service 3005:3005"
echo ""
echo "📊 To monitor resources:"
echo "  kubectl top nodes"
echo "  kubectl top pods -n nozama"
echo ""
echo "🔍 To view logs:"
echo "  kubectl logs -f deployment/identity-reputation -n nozama"
echo "  kubectl logs -f deployment/search-discovery -n nozama"
echo ""
echo "🎯 Run './test-minikube-deployment.sh' to test the deployment"