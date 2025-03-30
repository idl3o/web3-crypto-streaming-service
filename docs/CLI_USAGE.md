# CLI Usage Guide

This project integrates with the [andrewflynn20/cli](https://github.com/andrewflynn20/cli) tool to provide command-line functionality for common operations.

## Installation

The CLI is automatically installed when you run:

```bash
npm run install:cli
```

## Available Commands

You can run the CLI using:

```bash
npm run cli -- [command] [options]
```

Or directly with:

```bash
npx web3-cli [command] [options]
```

### Core Commands

- **Deploy the service**:
  ```bash
  npx web3-cli deploy --env production
  ```

- **Stream Management**:
  ```bash
  npx web3-cli stream list
  npx web3-cli stream create --title "My Stream" --description "Description"
  npx web3-cli stream delete <streamId>
  ```

- **Wallet Operations**:
  ```bash
  npx web3-cli wallet balance --address 0x...
  npx web3-cli wallet send --to 0x... --amount 40000 --currency sat
  npx web3-cli wallet receive
  ```

- **IPFS Storage**:
  ```bash
  npx web3-cli ipfs upload ./path/to/file
  npx web3-cli ipfs pin <contentId>
  ```

## Configuration

The CLI uses the configuration in `cli.config.json` at the project root. You can modify this file to customize the CLI behavior.

## Updating the CLI

To update the CLI to the latest version:

```bash
npm run cli:update
```

## Integration with GitHub Codespaces

When working in GitHub Codespaces, the CLI is automatically configured to work with your development environment.
