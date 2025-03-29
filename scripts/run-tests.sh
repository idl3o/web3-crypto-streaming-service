#!/bin/bash
# Full test suite runner for web3-crypto-streaming-service

# Set error handling
set -e

echo "=== Starting Full Test Suite ==="

# Environment setup
echo "Setting up test environment..."
export NODE_ENV=test

# Run Mocha tests
echo "=== Running Mocha Tests ==="
npx mocha

# Run Hardhat tests
echo "=== Running Hardhat Tests ==="
npx hardhat test

# Run any custom tests
echo "=== Running Custom Tests ==="
node src/utils/__tests__/blockchain.test.ts
node src/services/__tests__/ApiManager.test.ts

echo "=== All Tests Completed Successfully ==="
