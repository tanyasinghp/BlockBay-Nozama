#!/bin/bash

# Test Nozama Minikube Deployment
# Usage: ./test-minikube-deployment.sh

set -e

echo "🧪 Testing Nozama deployment in Minikube"
echo ""

# Function to test service health
test_service_health() {
    local service_name=$1
    local port=$2
    local health_endpoint=$3
    
    echo "🔍 Testing $service_name health..."
    
    # Start port forwarding in background
    kubectl port-forward -n nozama service/$service_name $port:$port &
    PORT_FORWARD_PID=$!
    
    # Wait for port forwarding to establish
    sleep 5
    
    # Test health endpoint
    if curl -f -s "http://localhost:$port$health_endpoint" > /dev/null; then
        echo "✅ $service_name is healthy"
        HEALTH_STATUS="✅ HEALTHY"
    else
        echo "❌ $service_name health check failed"
        HEALTH_STATUS="❌ UNHEALTHY"
    fi
    
    # Kill port forwarding
    kill $PORT_FORWARD_PID 2>/dev/null || true
    sleep 2
    
    echo "   Status: $HEALTH_STATUS"
    echo ""
}

# Check cluster status
echo "📋 Checking Minikube and cluster status..."
minikube status
echo ""

# Check pod status
echo "📦 Pod Status:"
kubectl get pods -n nozama
echo ""

# Check service status  
echo "🌐 Service Status:"
kubectl get services -n nozama
echo ""

# Test service health endpoints
echo "🏥 Testing service health endpoints..."
echo ""

# Test each service
test_service_health "identity-reputation-service" "3001" "/health"
test_service_health "search-discovery-service" "3002" "/health"
test_service_health "order-service" "3003" "/api/v1/health"
test_service_health "listing-service" "3004" "/health"
test_service_health "payment-service" "3005" "/health"

# Check resource usage
echo "📊 Resource Usage:"
echo "Cluster nodes:"
kubectl top nodes 2>/dev/null || echo "  (Metrics server not available)"
echo ""
echo "Nozama pods:"
kubectl top pods -n nozama 2>/dev/null || echo "  (Metrics server not available)"
echo ""

# Display recent events
echo "📅 Recent Events in Nozama namespace:"
kubectl get events -n nozama --sort-by='.lastTimestamp' | tail -10
echo ""

# Test database connection
echo "🗄️  Testing MongoDB connection..."
kubectl exec -n nozama deployment/mongodb -- mongosh --eval "db.adminCommand('ping')" --quiet
if [ $? -eq 0 ]; then
    echo "✅ MongoDB is accessible"
else
    echo "❌ MongoDB connection failed"
fi
echo ""

# Summary
echo "📋 Deployment Test Summary:"
echo "  Namespace: nozama"
echo "  Total Pods: $(kubectl get pods -n nozama --no-headers | wc -l)"
echo "  Running Pods: $(kubectl get pods -n nozama --no-headers | grep Running | wc -l)"
echo "  Total Services: $(kubectl get services -n nozama --no-headers | wc -l)"
echo ""

echo "🎯 To access services locally, run:"
echo "  kubectl port-forward -n nozama service/identity-reputation-service 3001:3001 &"
echo "  kubectl port-forward -n nozama service/search-discovery-service 3002:3002 &"
echo "  kubectl port-forward -n nozama service/order-service 3003:3003 &"
echo "  kubectl port-forward -n nozama service/listing-service 3004:3004 &"
echo "  kubectl port-forward -n nozama service/payment-service 3005:3005 &"
echo ""
echo "💡 Then test with:"
echo "  curl http://localhost:3001/health"
echo "  curl http://localhost:3002/health"  
echo "  curl http://localhost:3003/api/v1/health"
echo ""
echo "🧹 To cleanup the deployment:"
echo "  kubectl delete namespace nozama"