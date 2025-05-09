FROM node:20.12-alpine AS build

# Update packages to fix vulnerabilities
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache openssl>=3.1.7-r0 musl>=1.2.4_git20230717-r5

WORKDIR /build

# Copy package files including the override
COPY package*.json ./
COPY package-lock.override.json ./

# Apply the package-lock override to force cross-spawn version
RUN npm install --package-lock-only && \
    jq -s '.[0] * .[1]' package-lock.json package-lock.override.json > package-lock.new.json && \
    mv package-lock.new.json package-lock.json

# Install dependencies with the overridden package-lock.json
RUN npm ci --only=production && \
    npm ls cross-spawn || true

# Copy only necessary application files
COPY src/ ./src/
COPY public/ ./public/

# Create a non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D nodeuser && \
    chown -R nodeuser:nodejs /build

# Generate SBOM
RUN apk add --no-cache syft jq && \
    syft /build -o spdx-json=/build/sbom.json

FROM node:20.12-alpine

# Update packages to fix vulnerabilities
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache openssl>=3.1.7-r0 musl>=1.2.4_git20230717-r5 wget

# Set working directory
WORKDIR /app

# Copy from build stage
COPY --from=build --chown=nodeuser:nodejs /build ./

# Create data directory with proper permissions
RUN mkdir -p /app/data && \
    addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D nodeuser && \
    chown -R nodeuser:nodejs /app

# Use non-root user
USER nodeuser

# Set NODE_ENV
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/metadata || exit 1

# Labels for provenance
LABEL org.opencontainers.image.source="https://github.com/yourusername/thema-api"
LABEL org.opencontainers.image.description="Thema Subject Codes REST API"
LABEL org.opencontainers.image.licenses="ISC"
LABEL org.opencontainers.image.vendor="Your Organization"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.created="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

# Run with reduced privileges
CMD ["node", "src/index.js"]
