# Docker Setup for Web3 Crypto Streaming Service

This guide explains how to use Docker to run, develop, and deploy the Web3 Crypto Streaming Service.

## Prerequisites

- Docker Engine (20.10.x or newer)
- Docker Compose (2.x or newer)
- Git

## Quick Start

### Development Mode

To start the application in development mode:

```bash
# From the project root directory
./docker/start-docker.sh

# Or on Windows
docker\start-docker.bat
```

The development server will be available at http://localhost:8080.

### Production Mode

To start the application in production mode:

```bash
# From the project root directory
./docker/start-docker.sh -e prod

# Or on Windows
docker\start-docker.bat -e prod
```

The production server will be available at http://localhost.

## Available Commands and Options

The `start-docker.sh` (or `start-docker.bat` on Windows) script provides several options:

- `-e, --env ENV` - Set environment (dev, prod, test) [default: dev]
- `-b, --build` - Build containers before starting
- `-r, --rebuild` - Force rebuild containers
- `-c, --clean` - Clean up before starting (removes containers and volumes)
- `-h, --help` - Show help message

Examples:

```bash
# Start development environment with build
./docker/start-docker.sh -e dev -b

# Rebuild and start production environment
./docker/start-docker.sh -e prod -r

# Clean everything and start fresh development environment
./docker/start-docker.sh -c -b
```

## Container Structure

The Web3 Crypto Streaming Service uses several containers:

1. **app** - Vue.js application (development server or production build)
2. **ipfs** - IPFS node for decentralized content storage
3. **nginx** - Web server for production deployment
4. **certbot** - SSL certificate management (production only)

## Environment Variables

Docker configurations use environment variables from the following files:

- `.env` - Development environment
- `.env.production` - Production environment
- `.env.test` - Test environment

If these files don't exist, they will be created from `.env.example`.

## Volumes

The Docker setup uses several volumes for persistent data:

- **ipfs_data** - IPFS node data
- **ipfs_export** - IPFS export directory

## Custom Configuration

### Nginx Configuration

Customize Nginx configuration in:
- `docker/nginx.conf` - Development configuration
- `docker/nginx.prod.conf` - Production configuration

### SSL Setup

To enable HTTPS in production:

1. Update the domain in `docker-compose.prod.yml` for the certbot service
2. Run with the production environment: `./docker/start-docker.sh -e prod`
3. SSL certificates will be automatically generated and renewed

## Troubleshooting

### Viewing Logs

```bash
# View logs from all containers
docker-compose logs -f

# View logs from a specific container
docker-compose logs -f app
```

### Restarting Services

```bash
# Restart a specific service
docker-compose restart app

# Restart all services
docker-compose restart
```

### Common Issues

1. **Port Conflicts**: If ports 8080 or 80 are already in use, you'll need to change the port mapping in the Docker Compose files.

2. **IPFS Connectivity**: If the application can't connect to IPFS, check that the IPFS container is running and that the API URL is correctly set in your environment variables.

3. **Build Failures**: If the build fails, try rebuilding with the `--no-cache` option: `docker-compose build --no-cache`

## Best Practices

1. **Never store secrets in Docker images** - Use environment files or Docker secrets
2. **Regularly update base images** - Run `docker-compose pull` to get the latest versions
3. **Monitor resource usage** - Use `docker stats` to check container resource consumption
