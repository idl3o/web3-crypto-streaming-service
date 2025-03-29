#!/bin/bash

check_port() {
    local port=$1
    if lsof -i :$port > /dev/null; then
        echo "Port $port is in use"
        lsof -i :$port
        return 1
    else
        echo "Port $port is available"
        return 0
    fi
}

# Check HTTP port
check_port 3000

# Check HTTPS port
check_port 3443

# Check if ports need sudo
if [ $EUID -ne 0 ] && { [ $PORT -lt 1024 ] || [ $HTTPS_PORT -lt 1024 ]; }; then
    echo "Warning: Ports below 1024 require sudo privileges"
fi
