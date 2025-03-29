# Haskell Integration for Web3 Crypto Streaming Service

This directory contains Haskell code that powers advanced computational features of the simulator.

## Prerequisites

To use the Haskell engine, you need to have the following installed:

1. **GHC (Glasgow Haskell Compiler)** - version 8.10.x or newer
2. **Cabal** or **Stack** build tools
3. Required Haskell libraries:
   - aeson
   - time
   - random
   - bytestring

## Installation

### macOS

Using Homebrew:
```bash
brew install ghc cabal-install
cabal update
cabal install aeson time random
```

### Linux

Using distribution package manager:
```bash
# Ubuntu/Debian
sudo apt-get install ghc cabal-install
cabal update
cabal install aeson time random

# Fedora
sudo dnf install ghc cabal-install
cabal update
cabal install aeson time random
```

### Windows

1. Download and install [GHCup](https://www.haskell.org/ghcup/)
2. Open the terminal and run:
```bash
ghcup install ghc
ghcup install cabal
cabal update
cabal install aeson time random
```

## Compiling the Haskell Code

The JavaScript bridge will automatically compile the Haskell code when first needed, but you can manually compile it by running:

```bash
cd haskell
ghc -o simulator SimulationEngine.hs
```

## Usage in the Application

1. In the simulator settings, enable "Use Haskell Engine (Advanced)"
2. The simulator will now use the Haskell implementation for transaction generation
3. If Haskell is not available, the system will automatically fall back to JavaScript simulation

## Extending the Haskell Implementation

To add new functionality to the Haskell engine:

1. Modify `SimulationEngine.hs`
2. Add corresponding interface methods in `bridge.js`
3. Use the new methods in the simulator service

## Benefits of the Haskell Engine

- More efficient batch transaction generation
- Advanced statistical modeling
- Improved performance for complex calculations
- Pure functional approach to simulation logic
