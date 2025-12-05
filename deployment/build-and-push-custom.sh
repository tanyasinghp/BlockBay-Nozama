#!/bin/bash

# Advanced Build and Push Script with Custom Image Names
# Usage: ./build-and-push-custom.sh

set -e

echo "🚀 Building and pushing Nozama services with custom configurations"
echo ""

# Load configuration file
CONFIG_FILE="service-images.conf"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Error: Configuration file $CONFIG_FILE not found"
    echo "Please create $CONFIG_FILE with your image configurations"
    exit 1
fi

# Source the configuration
source "$CONFIG_FILE"

echo "📋 Loading image configurations from $CONFIG_FILE"
echo ""

# Array of services with their paths and config variable names
declare -A SERVICES=(
    ["identity-reputation"]="../services/identity-reputation:IDENTITY_REPUTATION"
    ["search-discovery"]="../services/search-discovery:SEARCH_DISCOVERY" 
    ["order-service"]="../services/order-service:ORDER_SERVICE"
    ["listing-service"]="../services/listing-service:LISTING_SERVICE"
    ["payment-service"]="../services/payment-service:PAYMENT_SERVICE"
)

# Login to Docker Hub
echo "🔐 Logging into Docker Hub..."
docker login

# Build and push each service
for SERVICE_CONFIG in "${!SERVICES[@]}"; do
    IFS=':' read -r SERVICE_NAME SERVICE_PATH CONFIG_VAR <<< "${SERVICES[$SERVICE_CONFIG]}:$SERVICE_CONFIG"
    
    # Get the image name from the config variable
    FULL_IMAGE_NAME=$(eval echo \$${CONFIG_VAR})
    
    if [ -z "$FULL_IMAGE_NAME" ]; then
        echo "❌ Error: No configuration found for $CONFIG_VAR in $CONFIG_FILE"
        continue
    fi
    
    # Extract image name and tag
    IMAGE_NAME_WITH_TAG="$FULL_IMAGE_NAME"
    IMAGE_NAME_ONLY="${FULL_IMAGE_NAME%:*}"
    
    echo ""
    echo "🔨 Building $SERVICE_NAME from $SERVICE_PATH..."
    echo "📦 Target image: $IMAGE_NAME_WITH_TAG"
    
    # Check if service directory exists
    if [ ! -d "$SERVICE_PATH" ]; then
        echo "❌ Error: Directory $SERVICE_PATH does not exist. Skipping $SERVICE_NAME."
        continue
    fi
    
    # Check for Dockerfile
    DOCKERFILE_PATH=""
    if [ -f "$SERVICE_PATH/Dockerfile" ]; then
        DOCKERFILE_PATH="$SERVICE_PATH/Dockerfile"
    elif [ -f "$SERVICE_PATH/dockerfile" ]; then
        DOCKERFILE_PATH="$SERVICE_PATH/dockerfile"
    else
        echo "❌ Error: No Dockerfile found in $SERVICE_PATH. Skipping $SERVICE_NAME."
        continue
    fi
    
    echo "📄 Using Dockerfile: $DOCKERFILE_PATH"
    
    # Build from service directory
    cd "$SERVICE_PATH"
    
    # Handle different dockerfile names
    if [ -f "Dockerfile" ]; then
        docker build -t "$IMAGE_NAME_WITH_TAG" -t "$IMAGE_NAME_ONLY:latest" .
    elif [ -f "dockerfile" ]; then
        docker build -f dockerfile -t "$IMAGE_NAME_WITH_TAG" -t "$IMAGE_NAME_ONLY:latest" .
    fi
    
    echo "📤 Pushing $SERVICE_NAME..."
    docker push "$IMAGE_NAME_WITH_TAG"
    docker push "$IMAGE_NAME_ONLY:latest"
    
    cd - > /dev/null
    echo "✅ $SERVICE_NAME pushed successfully!"
done

echo ""
echo "🎉 All services built and pushed according to configuration!"
echo ""
echo "📋 Images created:"
echo "  📦 $IDENTITY_REPUTATION"
echo "  📦 $SEARCH_DISCOVERY"
echo "  📦 $ORDER_SERVICE"  
echo "  📦 $LISTING_SERVICE"
echo "  📦 $PAYMENT_SERVICE"
echo ""
echo "⚠️  Important: Update your k8s manifests to use these image names:"
echo "  1. Edit ../k8s/*.yaml files"
echo "  2. Update the 'image:' fields to match your configuration"
echo "  3. Run: ./deploy-to-minikube.sh"