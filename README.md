# Thema API

Thema Subject Codes REST API

## Security Improvements

This project has been optimized for Docker security with the following features:

- Multi-stage build to reduce attack surface
- Non-root user execution
- Read-only filesystem with tmpfs for writable directories
- Resource limits to prevent resource exhaustion attacks
- Health checks for container monitoring
- Specific version pinning for better security patching
- SBOM (Software Bill of Materials) generation using Docker Scout
- Provenance attestation for supply chain security using Docker Scout
- Security vulnerability fixes for:
  - OpenSSL (CVE-2024-5535, CVE-2024-4741, CVE-2024-6119)
  - Musl (CVE-2025-26519)
  - Cross-spawn (CVE-2024-21538) - fixed using package-lock.override.json to force version 7.0.5 throughout the dependency tree

## Building the Docker Image

To build the Docker image with all security features enabled:

```bash
# Make the build script executable (if not already)
chmod +x build.sh

# Run the build script
./build.sh
```

The build script performs the following actions:
1. Enables Docker BuildKit for enhanced build capabilities
2. Creates a buildx builder instance if it doesn't exist
3. Builds the image with provenance and SBOM flags enabled
4. Generates a Software Bill of Materials (SBOM) using Docker Scout
5. Attaches the SBOM to the image as an attestation
6. Generates and attaches a provenance attestation with max mode

These steps ensure that the image meets Docker Scout's supply chain security requirements for:
- SBOM attestation
- Provenance attestation with max mode

## Running the Container

### Option 1: Using your locally built image

After building the image, you can run the container using:

```bash
docker-compose up -d
```

### Option 2: Using the prebuilt image

If you prefer to use the prebuilt image without building locally:

```bash
docker-compose -f docker-compose.prebuilt.yml up -d
```

The API will be available at http://localhost:3000 in both cases.

## Security Best Practices

- The container runs as a non-root user
- The filesystem is mounted as read-only
- Data volumes are mounted as read-only
- Resource limits are enforced
- Network binding is restricted to localhost
- Security options like no-new-privileges are enabled
- Logging is limited to prevent disk space attacks

## Vulnerability Mitigation Details

### Cross-spawn Vulnerability (CVE-2024-21538)

The cross-spawn package is a transitive dependency that appears in layer 3 of the Docker image. To fix this vulnerability:

1. Created a package-lock.override.json file that forces cross-spawn to version 7.0.5
2. Modified the Dockerfile to merge this override with the generated package-lock.json
3. Used jq to combine the files: `jq -s '.[0] * .[1]' package-lock.json package-lock.override.json`
4. Verified the installation with `npm ls cross-spawn`

This approach ensures that all instances of cross-spawn in the dependency tree are updated to the secure version, even if they are transitive dependencies.

## API Documentation

The API provides access to Thema Subject Codes with the following endpoints:

- GET /api/v1/metadata - Get metadata about the code list
- GET /api/v1/codes - Get all codes (with pagination)
- GET /api/v1/codes/search - Search for codes
- GET /api/v1/codes/:codeValue - Get a specific code by its value
- GET /api/v1/codes/:codeValue/children - Get children of a specific code
