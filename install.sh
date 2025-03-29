#!/bin/bash
set -e

LOG_FILE="/var/log/web3-crypto-install.log"

# Add temporal validation
TEMPORAL_LOCK="/var/lock/web3-crypto-temporal.lock"
TIMESTAMP=$(date +%s)

temporal_check() {
    if [ -f "$TEMPORAL_LOCK" ]; then
        LAST_INSTALL=$(cat "$TEMPORAL_LOCK")
        if [ $((TIMESTAMP - LAST_INSTALL)) -lt 3600 ]; then
            log "TEMPORAL ATTACK DETECTED: Installation attempted too soon after previous install"
            exit 1
        fi
    fi
    echo "$TIMESTAMP" > "$TEMPORAL_LOCK"
}

# Add to existing log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [TEMPORAL_ID:${TIMESTAMP}] $1" | tee -a "$LOG_FILE"
}

temporal_check

log "Starting installation of Web3 Crypto Streaming Service"

# Install dependencies
if [ -f /etc/debian_version ]; then
    log "Detected Debian-based system"
    apt-get update && apt-get install -y make curl podman podman-compose
elif [ -f /etc/redhat-release ]; then
    log "Detected RedHat-based system"
    yum install -y make curl podman podman-compose
fi

# Configure podman
systemctl --user enable podman.socket
loginctl enable-linger $(whoami)

# Create application directory
mkdir -p /opt/web3-crypto
cp -r . /opt/web3-crypto/

# Install service
make install

# Start service
if ! systemctl enable web3-crypto; then
    log "ERROR: Failed to enable web3-crypto service"
    exit 1
fi

if ! systemctl start web3-crypto; then
    log "ERROR: Failed to start web3-crypto service"
    exit 1
fi

# Verify service status
if systemctl is-active --quiet web3-crypto; then
    log "Installation complete. Service is running successfully."
else
    log "Installation completed but service failed to start. Check logs with: journalctl -u web3-crypto"
    exit 1
fi
