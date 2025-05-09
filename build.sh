#!/bin/bash

# Enable BuildKit
export DOCKER_BUILDKIT=1
export BUILDX_EXPERIMENTAL=1

# Create a new builder instance if it doesn't exist
if ! docker buildx inspect thema-builder &>/dev/null; then
  echo "Creating new buildx builder instance..."
  docker buildx create --name thema-builder --use
fi

# Build the image with provenance and SBOM
echo "Building image with provenance and SBOM..."
docker buildx build \
  --builder thema-builder \
  --platform linux/amd64 \
  --provenance=true \
  --sbom=true \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  -t thema-api:latest \
  -f Dockerfile \
  --push \
  .

# Generate SBOM using Docker Scout
echo "Generating SBOM using Docker Scout..."
docker scout sbom thema-api:latest --format spdx-json > sbom.json

# Attach SBOM to the image
echo "Attaching SBOM to the image..."
docker scout sbom attest thema-api:latest --sbom sbom.json

# Generate provenance attestation
echo "Generating provenance attestation..."
docker scout provenance attest thema-api:latest --max

echo "Build completed with SBOM and provenance attestations."
echo "To run the container: docker-compose up -d"
