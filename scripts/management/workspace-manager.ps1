<#
.SYNOPSIS
    Workspace management utilities for Web3 Crypto Streaming Service
.DESCRIPTION
    Provides functions for managing multiple development workspaces and environments
    for the Web3 Crypto Streaming Service project.
.NOTES
    Version: 1.0.0
    Author: Web3 Crypto Streaming Team
#>

# Import service utilities
$ServiceUtilsPath = Join-Path -Path $PSScriptRoot -ChildPath "service-utils.ps1"
if (Test-Path $ServiceUtilsPath) {
  . $ServiceUtilsPath
}
else {
  Write-Host "Error: Service utilities not found at $ServiceUtilsPath" -ForegroundColor Red
  exit 1
}

# Configuration
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$WorkspaceFile = Join-Path -Path $ProjectRoot -ChildPath "web3-crypto-streaming.code-workspace"
$EnvFolder = Join-Path -Path $ProjectRoot -ChildPath "environments"

# Ensure environments directory exists
if (-not (Test-Path -Path $EnvFolder)) {
  New-Item -Path $EnvFolder -ItemType Directory -Force | Out-Null
}

# Function to create a new workspace environment
function New-WorkspaceEnvironment {
  param (
    [Parameter(Mandatory = $true)]
    [string]$Name,
        
    [Parameter(Mandatory = $false)]
    [ValidateSet("development", "testing", "staging", "production")]
    [string]$Type = "development",
        
    [Parameter(Mandatory = $false)]
    [switch]$EnableMocks = $false
  )
    
  Write-ServiceLog "Creating new workspace environment: $Name" "INFO"
    
  try {
    # Create environment directory
    $envPath = Join-Path -Path $EnvFolder -ChildPath $Name
    if (Test-Path $envPath) {
      Write-ServiceLog "Environment already exists: $Name" "ERROR"
      return $false
    }
        
    New-Item -Path $envPath -ItemType Directory -Force | Out-Null
        
    # Create environment configuration
    $envConfig = @{
      name        = $Name
      type        = $Type
      createdAt   = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
      enableMocks = $EnableMocks.IsPresent
      services    = @(
        "BitcoinPaymentService",
        "DogecoinPaymentService",
        "SonaStreamingService",
        "ProcessorService",
        "HashTokenVerificationService",
        "POEStreamCryptoTokenProtocolService",
        "DionysiusStreamingService",
        "SecureProxyStreamingService"
      )
    }
        
    # Save environment configuration
    $envConfigPath = Join-Path -Path $envPath -ChildPath "config.json"
    $envConfig | ConvertTo-Json -Depth 10 | Set-Content -Path $envConfigPath
        
    # Create environment .env file
    $envDotEnvPath = Join-Path -Path $envPath -ChildPath ".env"
        
    $envContent = @"
# $Name Environment Configuration
NODE_ENV=$Type
PORT=3000
LOG_LEVEL=debug
ENABLE_MOCKS=$($EnableMocks.ToString().ToLower())

# Security Settings
JWT_SECRET=local_${Name}_secret_replace_in_production
CCK2M_SECRET=local_${Name}_cck2m_secret
GUBCHLLRB_SEED=local_${Name}_gubchllrb_seed
SNE_PROTOCOL_KEY=local_${Name}_sne_key

# Services
BITCOIN_RPC_URL=http://localhost:8332
BITCOIN_RPC_USER=user
BITCOIN_RPC_PASS=pass
DOGECOIN_RPC_URL=http://localhost:22555
DOGECOIN_RPC_USER=user
DOGECOIN_RPC_PASS=pass

# Storage
DB_TYPE=sqlite
DB_PATH=./environments/$Name/database.sqlite
"@
        
    Set-Content -Path $envDotEnvPath -Value $envContent
        
    Write-ServiceLog "Created environment: $Name" "SUCCESS"
    Write-ServiceLog "Environment files created at: $envPath" "INFO"
        
    return $true
  }
  catch {
    Write-ServiceLog "Error creating environment: $_" "ERROR"
    return $false
  }
}

# Function to switch active workspace environment
function Switch-WorkspaceEnvironment {
  param (
    [Parameter(Mandatory = $true)]
    [string]$Name
  )
    
  Write-ServiceLog "Switching to workspace environment: $Name" "INFO"
    
  try {
    $envPath = Join-Path -Path $EnvFolder -ChildPath $Name
    if (-not (Test-Path $envPath)) {
      Write-ServiceLog "Environment does not exist: $Name" "ERROR"
      return $false
    }
        
    # Copy environment's .env file to root project directory
    $envDotEnvPath = Join-Path -Path $envPath -ChildPath ".env"
    $projectDotEnvPath = Join-Path -Path $ProjectRoot -ChildPath ".env"
        
    if (-not (Test-Path $envDotEnvPath)) {
      Write-ServiceLog ".env file not found for environment: $Name" "ERROR"
      return $false
    }
        
    Copy-Item -Path $envDotEnvPath -Destination $projectDotEnvPath -Force
        
    # Create symlink for environment's database if it exists
    $envDbPath = Join-Path -Path $envPath -ChildPath "database.sqlite"
    $projectDbPath = Join-Path -Path $ProjectRoot -ChildPath "data" -AdditionalChildPath "database.sqlite"
        
    if (Test-Path $envDbPath) {
      if (Test-Path $projectDbPath) {
        Remove-Item -Path $projectDbPath -Force
      }
            
      # Create the data directory if it doesn't exist
      $dataDir = Join-Path -Path $ProjectRoot -ChildPath "data"
      if (-not (Test-Path $dataDir)) {
        New-Item -Path $dataDir -ItemType Directory -Force | Out-Null
      }
            
      New-Item -ItemType SymbolicLink -Path $projectDbPath -Target $envDbPath -Force
    }
        
    # Update current environment marker
    $currentEnvPath = Join-Path -Path $ProjectRoot -ChildPath ".current-env"
    Set-Content -Path $currentEnvPath -Value $Name
        
    Write-ServiceLog "Switched to environment: $Name" "SUCCESS"
        
    return $true
  }
  catch {
    Write-ServiceLog "Error switching environment: $_" "ERROR"
    return $false
  }
}

# Function to start all services for a workspace environment
function Start-WorkspaceEnvironment {
  param (
    [Parameter(Mandatory = $false)]
    [string]$Name,
        
    [Parameter(Mandatory = $false)]
    [switch]$UseDocker = $false
  )
    
  # If no name provided, use current environment
  if (-not $Name) {
    $currentEnvPath = Join-Path -Path $ProjectRoot -ChildPath ".current-env"
    if (Test-Path $currentEnvPath) {
      $Name = Get-Content $currentEnvPath -Raw
    }
    else {
      Write-ServiceLog "No current environment set. Please specify an environment name." "ERROR"
      return $false
    }
  }
    
  Write-ServiceLog "Starting workspace environment: $Name" "INFO"
    
  # Switch to the environment
  if (-not (Switch-WorkspaceEnvironment -Name $Name)) {
    return $false
  }
    
  # Start the development environment
  return Start-DevEnvironment -UseDocker:$UseDocker
}

# Function to stop workspace environment
function Stop-WorkspaceEnvironment {
  param (
    [Parameter(Mandatory = $false)]
    [switch]$UseDocker = $false
  )
    
  Write-ServiceLog "Stopping workspace environment" "INFO"
    
  # Stop the development environment
  return Stop-DevEnvironment -UseDocker:$UseDocker
}

# Function to list all workspace environments
function Get-WorkspaceEnvironments {
  param (
    [Parameter(Mandatory = $false)]
    [switch]$Detailed = $false
  )
    
  Write-ServiceLog "Listing workspace environments" "INFO"
    
  # Get current environment
  $currentEnv = ""
  $currentEnvPath = Join-Path -Path $ProjectRoot -ChildPath ".current-env"
  if (Test-Path $currentEnvPath) {
    $currentEnv = Get-Content $currentEnvPath -Raw
  }
    
  # List all environments
  $environments = @()
    
  Get-ChildItem -Path $EnvFolder -Directory | ForEach-Object {
    $envName = $_.Name
    $isCurrent = $envName -eq $currentEnv
        
    if ($Detailed) {
      $configPath = Join-Path -Path $_.FullName -ChildPath "config.json"
      if (Test-Path $configPath) {
        $config = Get-Content $configPath | ConvertFrom-Json
                
        $environments += [PSCustomObject]@{
          Name          = $envName
          Type          = $config.type
          CreatedAt     = $config.createdAt
          IsCurrent     = $isCurrent
          EnableMocks   = $config.enableMocks
          ServicesCount = $config.services.Count
        }
      }
      else {
        $environments += [PSCustomObject]@{
          Name          = $envName
          Type          = "unknown"
          CreatedAt     = "unknown"
          IsCurrent     = $isCurrent
          EnableMocks   = $false
          ServicesCount = 0
        }
      }
    }
    else {
      $environments += [PSCustomObject]@{
        Name      = $envName
        IsCurrent = $isCurrent
      }
    }
  }
    
  return $environments
}

# Function to open VS Code with workspace
function Open-Workspace {
  param (
    [Parameter(Mandatory = $false)]
    [string]$WorkspacePath = $WorkspaceFile
  )
    
  Write-ServiceLog "Opening workspace" "INFO"
    
  if (-not (Test-Path $WorkspacePath)) {
    Write-ServiceLog "Workspace file not found: $WorkspacePath" "ERROR"
    return $false
  }
    
  try {
    Start-Process -FilePath "code" -ArgumentList $WorkspacePath
    Write-ServiceLog "Workspace opened" "SUCCESS"
    return $true
  }
  catch {
    Write-ServiceLog "Error opening workspace: $_" "ERROR"
    return $false
  }
}

# Display help information
function Show-WorkspaceHelp {
  Write-Host "Web3 Crypto Streaming Service Workspace Manager" -ForegroundColor Cyan
  Write-Host "=================================================`n" -ForegroundColor Cyan
    
  Write-Host "Commands:" -ForegroundColor Yellow
  Write-Host "  New-WorkspaceEnvironment -Name <name> [-Type <type>] [-EnableMocks]" -ForegroundColor White
  Write-Host "  Switch-WorkspaceEnvironment -Name <name>" -ForegroundColor White
  Write-Host "  Start-WorkspaceEnvironment [-Name <name>] [-UseDocker]" -ForegroundColor White
  Write-Host "  Stop-WorkspaceEnvironment [-UseDocker]" -ForegroundColor White
  Write-Host "  Get-WorkspaceEnvironments [-Detailed]" -ForegroundColor White
  Write-Host "  Open-Workspace" -ForegroundColor White
  Write-Host "`nExamples:" -ForegroundColor Yellow
  Write-Host "  New-WorkspaceEnvironment -Name 'dev' -Type 'development' -EnableMocks" -ForegroundColor White
  Write-Host "  Switch-WorkspaceEnvironment -Name 'dev'" -ForegroundColor White
  Write-Host "  Start-WorkspaceEnvironment -Name 'dev'" -ForegroundColor White
  Write-Host "  Get-WorkspaceEnvironments -Detailed" -ForegroundColor White
}

# Export functions
Export-ModuleMember -Function New-WorkspaceEnvironment, Switch-WorkspaceEnvironment, 
Start-WorkspaceEnvironment, Stop-WorkspaceEnvironment,
Get-WorkspaceEnvironments, Open-Workspace, Show-WorkspaceHelp

# Display introduction when imported
Write-ServiceLog "Web3 Crypto Streaming Service workspace manager loaded" "INFO"
Write-ServiceLog "Use Show-WorkspaceHelp to see available commands" "INFO"
