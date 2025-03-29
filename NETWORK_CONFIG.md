# Network Configuration & Firewall Settings

This document provides information about the network requirements and firewall configurations needed for the proper functioning of CryptoStream.

## Required Network Access

The application needs access to the following services:

| Service | Domain | Port | Protocol | Description |
|---------|--------|------|----------|-------------|
| Ethereum RPC | `*.infura.io` | 443 | HTTPS | Blockchain communication |
| Ethereum WSS | `*.infura.io` | 443 | WSS | Real-time blockchain events |
| IPFS Gateway | `ipfs.io` | 443 | HTTPS | Primary IPFS content retrieval |
| IPFS Gateway | `cloudflare-ipfs.com` | 443 | HTTPS | Backup IPFS content retrieval |
| IPFS API | `ipfs.infura.io` | 5001 | HTTPS | IPFS content upload |
| Etherscan API | `api.etherscan.io` | 443 | HTTPS | Blockchain explorer API |
| Block Explorer | `*.etherscan.io` | 443 | HTTPS | Transaction verification |

## Firewall Rules

If you're behind a corporate firewall or using a restrictive network, ensure the following:

### Windows Firewall

1. Open Windows Defender Firewall with Advanced Security
2. Create a new outbound rule:
   - Rule type: Program
   - Program path: Path to your browser or the application
   - Action: Allow the connection
   - Profile: Domain, Private, Public (select all)
   - Name: "CryptoStream Web3 Access"

### Corporate Firewalls

Request the following exceptions from your IT department:

```
*.infura.io:443 (HTTPS/WSS)
ipfs.io:443 (HTTPS)
cloudflare-ipfs.com:443 (HTTPS)
ipfs.infura.io:5001 (HTTPS)
api.etherscan.io:443 (HTTPS)
*.etherscan.io:443 (HTTPS)
```

## Troubleshooting Connection Issues

### HTTP/2 Protocol Errors

If you encounter `ERR_HTTP2_PROTOCOL_ERROR` messages:

1. Try disabling HTTP/2 in your browser:
   - For Chrome: go to `chrome://flags/#enable-http2` and set to "Disabled"
   - For Firefox: set `network.http.spdy.enabled.http2` to `false` in about:config

2. Add the following to your `.env.local` file:
   ```
   VUE_APP_USE_HTTP2=false
   ```

3. Check if a proxy or firewall is intercepting HTTPS traffic

### Connection Timeouts

If services time out:

1. Test basic connectivity to required domains:
   ```bash
   ping ipfs.io
   ping infura.io
   ```

2. Try increasing timeout values in your `.env.local`:
   ```
   VUE_APP_HTTP_TIMEOUT=60000
   VUE_APP_WSS_TIMEOUT=90000
   ```

3. Verify your internet connection stability

### Proxy Configuration

If you're behind a proxy server, configure it in your `.env.local` file:

```
VUE_APP_PROXY_ENABLED=true
VUE_APP_PROXY_URL=http://your-proxy-server
VUE_APP_PROXY_PORT=8080
```

## Testing Network Connectivity

Use the built-in network diagnostics tool:

1. Open the application
2. Click on your profile icon
3. Select "Settings" 
4. Go to "Network Diagnostics"
5. Click "Run Diagnostics" to test connectivity to all required services

## Further Assistance

If you continue experiencing network issues:

1. Check the browser console for specific error messages
2. Contact our support team at support@cryptostream.example.com
3. Include the diagnostic report from the Network Diagnostics tool
