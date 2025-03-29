#!/bin/bash

# Docker startup script for Web3 Crypto Streaming Service

# Functions
show_help() {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  -e, --env ENV        Set environment (dev, prod, test) [default: dev]"
  echo "  -b, --build          Build containers before starting"
  echo "  -r, --rebuild        Force rebuild containers"
  echo "  -c, --clean          Clean up before starting (removes containers and volumes)"
  echo "  -h, --help           Show this help message"
  echo "Examples:"
  echo "  $0                   Start development environment"
  echo "  $0 -e prod           Start production environment"
  echo "  $0 -e dev -b         Build and start development environment"
  echo "  $0 -e prod -r        Force rebuild and start production environment"
}

# Default values
ENV="dev"
BUILD=false
REBUILD=false
CLEAN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--env)
      ENV="$2"
      shift 2
      ;;
    -b|--build)
      BUILD=true
      shift
      ;;
    -r|--rebuild)
      REBUILD=true
      BUILD=true
      shift
      ;;
    -c|--clean)
      CLEAN=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Validate environment
if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ] && [ "$ENV" != "test" ]; then
  echo "Error: Invalid environment '$ENV'. Must be one of: dev, prod, test"
  exit 1
fi

# Set environment variables
if [ "$ENV" == "prod" ]; then
  COMPOSE_FILE="docker-compose.yml -f docker-compose.prod.yml"
  ENV_FILE=".env.production"
  export NODE_ENV=production
elif [ "$ENV" == "test" ]; then
  COMPOSE_FILE="docker-compose.yml -f docker-compose.test.yml"
  ENV_FILE=".env.test"
  export NODE_ENV=test
else
  COMPOSE_FILE="docker-compose.yml"
  ENV_FILE=".env"
  export NODE_ENV=development
fi

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "Warning: $ENV_FILE file not found. Creating from example..."
  if [ -f ".env.example" ]; then
    cp .env.example "$ENV_FILE"
  else
    echo "Error: .env.example file not found. Cannot create $ENV_FILE"
    exit 1
  fi
fi

# Clean up if requested
if [ "$CLEAN" = true ]; then
  echo "Cleaning up containers and volumes..."
  docker-compose $COMPOSE_FILE down -v
fi

# Build if requested
if [ "$BUILD" = true ]; then
  BUILD_ARGS=""
  if [ "$REBUILD" = true ]; then
    BUILD_ARGS="--no-cache --pull"
  fi
  echo "Building containers for $ENV environment..."
  docker-compose $COMPOSE_FILE build $BUILD_ARGS
fi

# Start containers
echo "Starting $ENV environment..."
docker-compose $COMPOSE_FILE up -d

# Show running containers
echo "Running containers:"
docker-compose $COMPOSE_FILE ps

echo "Environment $ENV is now running!"

if [ "$ENV" == "dev" ]; then
  echo "Development server available at: http://localhost:8080"
elif [ "$ENV" == "prod" ]; then
  echo "Production server available at: http://localhost (or https if configured)"
fi

echo "To view logs: docker-compose $COMPOSE_FILE logs -f"
echo "To stop: docker-compose $COMPOSE_FILE down"
