# CryptoStream Automation Guide

This guide explains how to configure and use the automation features in the CryptoStream platform.

## Table of Contents

- [Getting Started](#getting-started)
- [Transaction Automation](#transaction-automation)
- [System Automation](#system-automation)
- [Custom Automation Scripts](#custom-automation-scripts)
- [Advanced Configuration](#advanced-configuration)
- [Troubleshooting](#troubleshooting)

## Getting Started

Automation in CryptoStream allows you to:

- Schedule recurring crypto payments and streams
- Monitor network conditions and automatically adjust gas prices
- Maintain IPFS content with automated pinning
- Run system maintenance tasks

### Prerequisites

- Node.js 14+ environment
- System with 2GB+ RAM for background processes
- API keys configured for external services

### Basic Setup

1. Enable automation in your `.env` file:

```
ENABLE_AUTOMATION=true
AUTOMATION_LEVEL=basic  # Options: basic, standard, advanced
```

2. Start the automation service:

```bash
npm run automation:start
```

## Transaction Automation

### Setting Up Recurring Payments

Create a configuration file in `automations/payments.json`:

```json
{
  "payments": [
    {
      "name": "Monthly Subscription",
      "description": "Streaming service monthly payment",
      "recipient": "0x1234567890abcdef1234567890abcdef12345678",
      "amount": "0.05",
      "currency": "ETH",
      "frequency": "monthly",
      "startDate": "2023-07-01T00:00:00Z",
      "endDate": "2024-07-01T00:00:00Z",
      "gasStrategy": "economic"
    }
  ]
}
```

### Configuring Event-Based Triggers

For payments triggered by external events, use the `events.json` configuration:

```json
{
  "eventTriggers": [
    {
      "name": "Low Gas Price Payment",
      "event": "gas.price.below",
      "threshold": 20,
      "unit": "gwei",
      "action": "execute-payment",
      "paymentId": "team-payroll"
    }
  ]
}
```

## System Automation

### Automated Health Checks

The system will automatically perform health checks including:

- Blockchain node connectivity
- IPFS gateway availability
- Database consistency
- Resource monitoring

### Log Rotation and Cleanup

Automatic log processing:

```bash
# Check automatic log maintenance settings
npm run automation:logs:status

# Manually trigger log rotation
npm run automation:logs:rotate
```

## Custom Automation Scripts

### Creating a Custom Automation

1. Create a new script in `src/automations/custom`:

```typescript
// src/automations/custom/myAutomation.ts
import { AutomationTask } from '../../types';

export default {
  id: 'my-custom-task',
  name: 'My Custom Automation',
  schedule: '0 22 * * *', // Every day at 10 PM
  async execute(context) {
    // Your automation code here
    console.log('Running my custom automation');
    
    // Access services
    const walletBalance = await context.services.wallet.getBalance();
    
    // Conditional logic
    if (walletBalance < 0.1) {
      await context.services.notifications.send({
        channel: 'email',
        subject: 'Low wallet balance',
        message: `Current balance: ${walletBalance} ETH`
      });
    }
    
    return { success: true };
  }
} as AutomationTask;
```

2. Register your automation:

```bash
npm run automation:register -- --path=src/automations/custom/myAutomation.ts
```

## Advanced Configuration

### Concurrency Control

Configure how many automations can run simultaneously:

```json
{
  "automation": {
    "concurrency": {
      "max": 5,
      "perCategory": {
        "network": 2,
        "storage": 1,
        "payments": 3
      }
    }
  }
}
```

### Resource Limiting

Set resource limits for automation tasks:

```json
{
  "automation": {
    "resources": {
      "memoryLimitMB": 512,
      "cpuPercentage": 25,
      "diskIOLimitKB": 1024
    }
  }
}
```

### Notification Integration

Configure where automation notifications are sent:

```json
{
  "automation": {
    "notifications": {
      "email": "admin@example.com",
      "slack": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
      "telegram": {
        "botToken": "YOUR_BOT_TOKEN",
        "chatId": "YOUR_CHAT_ID"
      }
    }
  }
}
```

## Troubleshooting

### Common Issues

#### Automation Not Starting

Check:
- `.env` file has `ENABLE_AUTOMATION=true`
- Required services are running
- System has sufficient resources

#### Failed Tasks

View detailed logs:

```bash
npm run automation:logs -- --level=debug
```

#### Permissions Issues

Make sure the user running the automation service has:
- Write access to the logs directory
- Network access for API calls
- Permission to execute system commands if needed

### Support

For more help with automation issues:
- Open an issue on GitHub
- Join our Discord server for community support
- Email support@cryptostream.example.com for premium support
