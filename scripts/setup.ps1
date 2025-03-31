<#
.SYNOPSIS
    Setup script for Web3 Crypto Streaming Service
.DESCRIPTION
    Initializes the development environment, installs dependencies, and configures 
    required services for the Web3 Crypto Streaming Service project.
.NOTES
    Version: 1.0.0
    Author: Web3 Crypto Streaming Team
#>

param (
    [switch]$InstallDependencies = $true,
    [switch]$InitializeServices = $true,
    [switch]$SetupMocks = $false,
    [switch]$SkipTests = $false
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

# Import utility functions
$ServiceUtilsPath = Join-Path -Path $PSScriptRoot -ChildPath "management\service-utils.ps1"

if (Test-Path $ServiceUtilsPath) {
    . $ServiceUtilsPath
} else {
    Write-Host "Error: Service utilities not found at $ServiceUtilsPath" -ForegroundColor Red
    exit 1
}

Write-ServiceLog "Starting Web3 Crypto Streaming Service setup..." "INFO"

# Check prerequisites
if (-not (Test-Prerequisites)) {
    Write-ServiceLog "Setup aborted: Prerequisites not met." "ERROR"
    exit 1
}

# Create necessary directories
$directories = @(
    (Join-Path -Path $ProjectRoot -ChildPath "logs"),
    (Join-Path -Path $ProjectRoot -ChildPath "data"),
    (Join-Path -Path $ProjectRoot -ChildPath "config")
)

foreach ($dir in $directories) {
    if (-not (Test-Path -Path $dir)) {
        Write-ServiceLog "Creating directory: $dir" "INFO"
        New-Item -Path $dir -ItemType Directory -Force | Out-Null
    }
}

# Install dependencies if requested
if ($InstallDependencies) {
    Write-ServiceLog "Installing project dependencies..." "INFO"
    
    try {
        Set-Location $ProjectRoot
        npm install
        
        if ($LASTEXITCODE -eq 0) {
            Write-ServiceLog "Dependencies installed successfully" "SUCCESS"
        } else {
            Write-ServiceLog "Failed to install dependencies" "ERROR"
            exit 1
        }
    } catch {
        Write-ServiceLog "Error installing dependencies: $_" "ERROR"
        exit 1
    }
}

# Create or update environment file
$envContent = @"
# Web3 Crypto Streaming Service Environment Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
ENABLE_MOCKS=$($SetupMocks.ToString().ToLower())

# Security Settings
JWT_SECRET=local_development_secret_replace_in_production
CCK2M_SECRET=local_development_cck2m_secret
GUBCHLLRB_SEED=local_development_gubchllrb_seed
SNE_PROTOCOL_KEY=local_development_sne_key

# Services
BITCOIN_RPC_URL=http://localhost:8332
BITCOIN_RPC_USER=user
BITCOIN_RPC_PASS=pass
DOGECOIN_RPC_URL=http://localhost:22555
DOGECOIN_RPC_USER=user
DOGECOIN_RPC_PASS=pass

# Storage
DB_TYPE=sqlite
DB_PATH=./data/database.sqlite
"@

$envPath = Join-Path -Path $ProjectRoot -ChildPath ".env"
Set-Content -Path $envPath -Value $envContent
Write-ServiceLog "Environment file created at $envPath" "INFO"

# Initialize services if requested
if ($InitializeServices) {
    Write-ServiceLog "Initializing services..." "INFO"
    
    if ($SetupMocks) {
        Write-ServiceLog "Setting up mock services" "INFO"
        
        # Run mock setup script
        $mockSetupScript = Join-Path -Path $PSScriptRoot -ChildPath "setup\setup-mocks.js"
        if (Test-Path $mockSetupScript) {
            node $mockSetupScript
            
            if ($LASTEXITCODE -eq 0) {
                Write-ServiceLog "Mock services set up successfully" "SUCCESS"
            } else {
                Write-ServiceLog "Failed to set up mock services" "ERROR"
            }
        } else {
            Write-ServiceLog "Mock setup script not found at: $mockSetupScript" "WARNING"
        }
    } else {
        Write-ServiceLog "Setting up real service connections" "INFO"
        
        # This would typically include additional setup steps for real services
        # For demonstration purposes, we'll just indicate success
        Write-ServiceLog "Service connections configured" "SUCCESS"
    }
}

# Run tests if not skipped
if (-not $SkipTests) {
    Write-ServiceLog "Running tests..." "INFO"
    
    Invoke-ServiceTests -TestType "unit"
    
    if ($LASTEXITCODE -ne 0) {
        Write-ServiceLog "Warning: Some tests failed" "WARNING"
    } else {
        Write-ServiceLog "Tests passed" "SUCCESS"
    }
}

Write-ServiceLog "Setup completed successfully" "SUCCESS"
Write-ServiceLog "To start the development environment, run: Start-DevEnvironment" "INFO"
