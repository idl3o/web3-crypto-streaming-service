.PHONY: install uninstall clean podman-init

PREFIX ?= /usr/local
BINDIR = $(PREFIX)/bin
SERVICEDIR = /etc/systemd/system

install:
	mkdir -p $(BINDIR)
	cp start.sh $(BINDIR)/web3-crypto-service
	cp wait-for-it.sh $(BINDIR)/web3-crypto-wait
	chmod +x $(BINDIR)/web3-crypto-service
	chmod +x $(BINDIR)/web3-crypto-wait
	cp web3-crypto.service $(SERVICEDIR)/
	systemctl daemon-reload

uninstall:
	rm -f $(BINDIR)/web3-crypto-service
	rm -f $(BINDIR)/web3-crypto-wait
	rm -f $(SERVICEDIR)/web3-crypto.service
	systemctl daemon-reload

clean:
	podman-compose down
	podman system prune -f

podman-init:
	podman volume create web3-data
	podman network create web3-network || true
