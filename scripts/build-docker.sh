#!/bin/bash

# Build all Docker images for Tenure Platform
# Usage: ./scripts/build-docker.sh [registry] [tag]
#
# Examples:
#   ./scripts/build-docker.sh                    # Build with default names
#   ./scripts/build-docker.sh myregistry latest  # Build with registry prefix
#   ./scripts/build-docker.sh ghcr.io/myorg v1.0 # Build for GitHub Container Registry

set -e

REGISTRY=${1:-"tenure"}
TAG=${2:-"latest"}

echo "========================================"
echo "Building Tenure Platform Docker Images"
echo "Registry: $REGISTRY"
echo "Tag: $TAG"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

build_image() {
    local name=$1
    local context=$2
    local dockerfile=$3

    echo -e "\n${YELLOW}Building: $REGISTRY/$name:$TAG${NC}"
    echo "Context: $context"
    echo "Dockerfile: $dockerfile"

    if docker build -t "$REGISTRY/$name:$TAG" -f "$dockerfile" "$context"; then
        echo -e "${GREEN}✓ Successfully built $REGISTRY/$name:$TAG${NC}"
    else
        echo -e "${RED}✗ Failed to build $REGISTRY/$name:$TAG${NC}"
        exit 1
    fi
}

# Navigate to project root
cd "$(dirname "$0")/.."

echo -e "\n${YELLOW}Starting builds...${NC}\n"

# Build UI (Next.js)
build_image "ui" "." "Dockerfile"

# Build Subscription Service
build_image "subscription-service" "./services/subscription-service" "./services/subscription-service/Dockerfile"

# Build Queue Service
build_image "queue-service" "./services/Tenure-queue" "./services/Tenure-queue/Dockerfile"

# Build KYC Service
build_image "kyc-service" "./services/kyc-service" "./services/kyc-service/Dockerfile"

# Build Payout Service
build_image "payout-service" "./services/payout-service" "./services/payout-service/Dockerfile"

echo -e "\n${GREEN}========================================"
echo "All images built successfully!"
echo "========================================${NC}"

echo -e "\nBuilt images:"
docker images | grep "$REGISTRY" | grep "$TAG"

echo -e "\n${YELLOW}To push images to registry:${NC}"
echo "  docker push $REGISTRY/ui:$TAG"
echo "  docker push $REGISTRY/subscription-service:$TAG"
echo "  docker push $REGISTRY/queue-service:$TAG"
echo "  docker push $REGISTRY/kyc-service:$TAG"
echo "  docker push $REGISTRY/payout-service:$TAG"

echo -e "\n${YELLOW}To deploy to Kubernetes:${NC}"
echo "  kubectl apply -f k8s/tenure-platform.yaml"
