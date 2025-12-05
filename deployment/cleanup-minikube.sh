#!/bin/bash

# Cleanup Nozama Minikube Deployment
# Usage: ./cleanup-minikube.sh

set -e

echo "🧹 Cleaning up Nozama deployment from Minikube"
echo ""

# Check if namespace exists
if kubectl get namespace nozama > /dev/null 2>&1; then
    echo "📦 Found Nozama namespace, proceeding with cleanup..."
    
    # Delete all resources in the namespace
    echo "🗑️  Deleting all services..."
    kubectl delete services --all -n nozama
    
    echo "🗑️  Deleting all deployments..."
    kubectl delete deployments --all -n nozama
    
    echo "🗑️  Deleting all persistent volume claims..."
    kubectl delete pvc --all -n nozama
    
    echo "🗑️  Deleting namespace..."
    kubectl delete namespace nozama
    
    echo "✅ Cleanup completed successfully!"
else
    echo "⚠️  Nozama namespace not found. Nothing to clean up."
fi

echo ""
echo "📋 Remaining namespaces:"
kubectl get namespaces

echo ""
echo "💡 To stop Minikube completely:"
echo "  minikube stop"
echo ""
echo "💡 To delete Minikube cluster:"
echo "  minikube delete"