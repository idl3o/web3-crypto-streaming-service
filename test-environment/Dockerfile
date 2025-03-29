FROM ubuntu:22.04

# Install systemd and basic utilities
RUN apt-get update && apt-get install -y \
    systemd \
    make \
    curl \
    podman \
    podman-compose

# Create required directories
RUN mkdir -p /var/log /var/lock /opt

# Copy installation script
COPY ../install.sh /install.sh
RUN chmod +x /install.sh

CMD ["/bin/bash"]
