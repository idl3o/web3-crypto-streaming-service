# Docker Troubleshooting Guide for Web3 Crypto Streaming Service

This guide outlines common Docker issues in the Web3 Crypto Streaming Service and how to diagnose and fix them.

## Using the Docker Diagnostics Tool

We've included a special diagnostics tool to help troubleshoot Docker-related issues:

```powershell
# Basic diagnostics - saves data locally
.\tools\docker-diagnostics.ps1

# Upload diagnostics to Docker for support
.\tools\docker-diagnostics.ps1 -Upload

# Run Docker health checks
.\tools\docker-diagnostics.ps1 -Check

# Full diagnostics including container logs
.\tools\docker-diagnostics.ps1 -FullLogs
```

## Common Issues and Solutions

### 1. Container Startup Failures

**Symptoms:**
- Containers exit immediately after starting
- Error messages like "exited with code 1" in `docker compose ps` output

**Solutions:**
- Check container logs: `docker compose logs app`
- Validate environment variables in `.env` file
- Ensure volumes are properly mounted and accessible

### 2. Network Connectivity Issues

**Symptoms:**
- Containers cannot communicate with each other
- API calls between services fail
- "Connection refused" errors in logs

**Solutions:**
- Check if containers are on the same network: `docker network inspect web3-network`
- Use service names (not localhost) for container-to-container communication
- Ensure ports are correctly mapped in docker-compose.yml
- Test DNS resolution inside containers: `docker exec web3-crypto-streaming-app nslookup ipfs`

### 3. Volume Mount Issues

**Symptoms:**
- Changes to code not reflected in containers
- Missing or outdated files in containers
- Permission errors in logs

**Solutions:**
- Check volume definitions in docker-compose.yml
- Ensure paths are correctly specified (use absolute paths if necessary)
- Check file permissions on host directories
- For WSL2: Make sure files are in the Linux filesystem, not Windows mounted drives

### 4. Port Conflicts

**Symptoms:**
- "Port is already in use" errors during startup
- Services can't be accessed on expected ports

**Solutions:**
- Check for processes using the same ports: `netstat -ano | findstr "8080"`
- Change the external port mapping in docker-compose.yml
- Stop conflicting services or applications

### 5. Resource Constraints

**Symptoms:**
- Container performance is slow
- Out of memory errors
- Unexpected container restarts

**Solutions:**
- Check resource usage: `docker stats`
- Increase Docker Desktop resource limits (CPU/Memory)
- Add resource constraints to containers to prevent one container from using all resources

### 6. IPFS Connectivity Issues

**Symptoms:**
- Cannot connect to IPFS from application
- IPFS gateway returns errors
- Content cannot be stored or retrieved

**Solutions:**
- Verify IPFS container is running: `docker compose ps ipfs`
- Check IPFS container logs: `docker compose logs ipfs`
- Confirm API port 5001 and gateway port 8080/8081 are accessible
- Check environment variables for correct IPFS API and gateway URLs

### 7. SSL/TLS Certificate Issues

**Symptoms:**
- HTTPS doesn't work in production
- Certificate warnings in browser
- Connection errors in logs

**Solutions:**
- Check if certificates are properly mounted in Nginx container
- Verify Certbot ran successfully for production environment
- Check Nginx logs for certificate-related errors
- Manually renew certificates if needed: `docker compose exec certbot certonly --webroot ...`

## Using Docker's Official Diagnostics Tool

For deeper issues, Docker provides its own diagnostic tools:

```powershell
# On Windows - Gather diagnostics:
& "C:\Program Files\Docker\Docker\resources\com.docker.diagnose.exe" gather -upload

# On Windows - Run health checks:
& "C:\Program Files\Docker\Docker\resources\com.docker.diagnose.exe" check
```

This will upload diagnostic information to Docker's servers and provide a unique ID for support purposes.

## Cleaning Up Docker Resources

Sometimes a fresh start can resolve persistent issues:

```powershell
# Remove stopped containers
docker container prune

# Remove unused networks
docker network prune

# Remove unused volumes (CAUTION: this can delete data)
docker volume prune

# Remove unused images
docker image prune

# Complete clean-up (CAUTION: removes everything unused)
docker system prune -a --volumes
```

## Getting Help

If you're still having issues:

1. Run the diagnostics tool with the upload option
2. File an issue on GitHub with:
   - Diagnostics ID from the upload
   - Description of the problem
   - Steps to reproduce

The development team will help troubleshoot your Docker issues.
