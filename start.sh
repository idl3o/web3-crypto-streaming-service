#!/bin/bash
set -e

# Create necessary directories
mkdir -p data

# Make scripts executable
chmod +x wait-for-it.sh

# Stop any running containers
podman-compose down

# Clean up old containers and build new ones
podman-compose build --no-cache

# Start services in detached mode
podman-compose up -d

# Wait for services and show status
echo "Starting services..."
sleep 5
podman-compose ps

# Show logs
echo "Showing logs (Ctrl+C to exit)..."
podman-compose logs -f
