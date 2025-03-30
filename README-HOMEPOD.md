# HomePod OS Integration

This guide explains how to use the Web3 Crypto Streaming Service with HomePod devices.

## Overview

The Web3 Crypto Streaming Service can stream audio content to Apple HomePod devices using AirPlay 2 protocol. This integration allows for decentralized content delivery through your home audio ecosystem.

## Requirements

- Apple HomePod or HomePod mini device
- iOS 14.0+ device on the same network (for initial setup)
- Web3 Crypto Streaming Service v1.0.0+
- Network that allows multicast DNS (mDNS) for device discovery

## Setup Instructions

1. **Enable HomePod Integration**

   ```bash
   npm run setup:homepod
   ```

2. **Configure Your HomePod**

   Ensure your HomePod device is connected to the same network as your streaming server.

3. **Set Permissions**
   
   You may need to grant additional permissions on iOS for streaming:
   
   - Go to HomePod settings on your iOS device
   - Enable "Allow Streaming from Web3 Services"

## Usage

### Stream to HomePod from CLI

```bash
npm run stream -- --target=homepod --device="Living Room HomePod"
```

### Stream to HomePod from API

```javascript
import { createStreamingClient } from '@web3-crypto-streaming/service';

const client = createStreamingClient();
await client.connect();
await client.streamToDevice({
  deviceType: 'homepod',
  deviceName: 'Living Room HomePod',
  content: {
    id: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    type: 'audio/mp3'
  }
});
```

## Troubleshooting

- **Device Not Found**: Ensure mDNS is working properly on your network
- **Permission Errors**: Check that your iOS device has granted the necessary permissions
- **Audio Stuttering**: This may indicate network congestion - try reducing audio quality or switching to a wired connection
