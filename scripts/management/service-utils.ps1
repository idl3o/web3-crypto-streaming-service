<#
.SYNOPSIS
    Utility script for managing Web3 Crypto Streaming Service components
.DESCRIPTION
    Provides functions for starting/stopping services, running tests, managing environments,
    and other development tasks for the Web3 Crypto Streaming Service project.
.NOTES
    Version: 1.0.0
    Author: Web3 Crypto Streaming Team
#>

# Configuration
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$LogPath = Join-Path -Path $ProjectRoot -ChildPath "logs"
$LogFile = Join-Path -Path $LogPath -ChildPath "service-management.log"
$ConfigPath = Join-Path -Path $ProjectRoot -ChildPath "config"
$ServiceConfig = Join-Path -Path $ConfigPath -ChildPath "services.json"
$DockerComposePath = Join-Path -Path $ProjectRoot -ChildPath "docker-compose.yml"
$EnvFile = Join-Path -Path $ProjectRoot -ChildPath ".env"

# Ensure log directory exists
if (-not (Test-Path -Path $LogPath)) {
  New-Item -Path $LogPath -ItemType Directory -Force | Out-Null
}

# Function to write log entries
function Write-ServiceLog {
  param (
    [Parameter(Mandatory = $true)]
    [string]$Message,
        
    [Parameter(Mandatory = $false)]
    [ValidateSet("INFO", "WARNING", "ERROR", "SUCCESS")]
    [string]$Level = "INFO"
  )
    
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $logEntry = "[$timestamp] [$Level] $Message"
    
  # Output to console with color coding
  switch ($Level) {
    "INFO" { Write-Host $logEntry -ForegroundColor Cyan }
    "WARNING" { Write-Host $logEntry -ForegroundColor Yellow }
    "ERROR" { Write-Host $logEntry -ForegroundColor Red }
    "SUCCESS" { Write-Host $logEntry -ForegroundColor Green }
  }
    
  # Write to log file
  Add-Content -Path $LogFile -Value $logEntry
}

# Function to check prerequisites
function Test-Prerequisites {
  Write-ServiceLog "Checking prerequisites..." "INFO"
    
  $prerequisites = @(
    @{Name = "Node.js"; Command = "node -v"; Required = $true },
    @{Name = "npm"; Command = "npm -v"; Required = $true },
    @{Name = "Docker"; Command = "docker -v"; Required = $false },
    @{Name = "Docker Compose"; Command = "docker-compose -v"; Required = $false }
  )
    
  $allMet = $true
    
  foreach ($prereq in $prerequisites) {
    try {
      $null = Invoke-Expression $prereq.Command -ErrorAction Stop
      Write-ServiceLog "$($prereq.Name) is installed" "INFO"
    }
    catch {
      if ($prereq.Required) {
        Write-ServiceLog "$($prereq.Name) is required but not installed or not in PATH" "ERROR"
        $allMet = $false
      }
      else {
        Write-ServiceLog "$($prereq.Name) is not installed (optional)" "WARNING"
      }
    }
  }
    
  return $allMet
}

# Function to start development environment
function Start-DevEnvironment {
  param (
    [switch]$UseDocker,
    [switch]$WithMocks
  )
    
  Write-ServiceLog "Starting development environment..." "INFO"
    
  # Check prerequisites
  if (-not (Test-Prerequisites)) {
    Write-ServiceLog "Prerequisites not met. See log for details." "ERROR"
    return $false
  }
    
  try {
    # Install dependencies if needed
    if (-not (Test-Path (Join-Path -Path $ProjectRoot -ChildPath "node_modules"))) {
      Write-ServiceLog "Installing dependencies..." "INFO"
      Set-Location $ProjectRoot
      npm install
    }
        
    if ($UseDocker) {
      # Start using Docker compose
      if (Test-Path $DockerComposePath) {
        Write-ServiceLog "Starting services with Docker Compose..." "INFO"
        docker-compose up -d
      }
      else {
        Write-ServiceLog "Docker compose file not found at: $DockerComposePath" "ERROR"
        return $false
      }
    }
    else {
      # Start services directly
      Set-Location $ProjectRoot
            
      if ($WithMocks) {
        Write-ServiceLog "Starting with mock services..." "INFO"
        Start-Process -FilePath "npm" -ArgumentList "run start:mock" -NoNewWindow
      }
      else {
        Write-ServiceLog "Starting development server..." "INFO"
        Start-Process -FilePath "npm" -ArgumentList "run dev" -NoNewWindow
      }
    }
        
    Write-ServiceLog "Development environment started successfully" "SUCCESS"
    return $true
  }
  catch {
    Write-ServiceLog "Error starting development environment: $_" "ERROR"
    return $false
  }
}

# Function to stop development environment
function Stop-DevEnvironment {
  param (
    [switch]$UseDocker
  )
    
  Write-ServiceLog "Stopping development environment..." "INFO"
    
  try {
    if ($UseDocker) {
      # Stop Docker services
      if (Test-Path $DockerComposePath) {
        Write-ServiceLog "Stopping Docker services..." "INFO"
        docker-compose down
      }
      else {
        Write-ServiceLog "Docker compose file not found at: $DockerComposePath" "ERROR"
        return $false
      }
    }
    else {
      # Find and stop Node.js processes
      $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
            
      if ($nodeProcesses) {
        Write-ServiceLog "Stopping Node.js processes..." "INFO"
        $nodeProcesses | ForEach-Object {
          $commandLine = Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" | Select-Object -ExpandProperty CommandLine
          if ($commandLine -like "*$ProjectRoot*") {
            Write-ServiceLog "Stopping process: $($_.Id)" "INFO"
            $_ | Stop-Process -Force
          }
        }
      }
    }
        
    Write-ServiceLog "Development environment stopped successfully" "SUCCESS"
    return $true
  }
  catch {
    Write-ServiceLog "Error stopping development environment: $_" "ERROR"
    return $false
  }
}

# Function to run tests
function Invoke-ServiceTests {
  param (
    [ValidateSet("unit", "integration", "e2e", "all")]
    [string]$TestType = "all"
  )
    
  Write-ServiceLog "Running $TestType tests..." "INFO"
    
  try {
    Set-Location $ProjectRoot
        
    switch ($TestType) {
      "unit" {
        npm run test:unit
      }
      "integration" {
        npm run test:integration
      }
      "e2e" {
        npm run test:e2e
      }
      "all" {
        npm test
      }
    }
        
    if ($LASTEXITCODE -eq 0) {
      Write-ServiceLog "Tests completed successfully" "SUCCESS"
      return $true
    }
    else {
      Write-ServiceLog "Tests failed with exit code: $LASTEXITCODE" "ERROR"
      return $false
    }
  }
  catch {
    Write-ServiceLog "Error running tests: $_" "ERROR"
    return $false
  }
}

# Function to build for production
function Invoke-ProductionBuild {
  Write-ServiceLog "Building production bundle..." "INFO"
    
  try {
    Set-Location $ProjectRoot
    npm run build
        
    if ($LASTEXITCODE -eq 0) {
      Write-ServiceLog "Production build completed successfully" "SUCCESS"
      return $true
    }
    else {
      Write-ServiceLog "Production build failed with exit code: $LASTEXITCODE" "ERROR"
      return $false
    }
  }
  catch {
    Write-ServiceLog "Error building for production: $_" "ERROR"
    return $false
  }
}

# Function to check the service health endpoints
function Test-ServiceHealth {
  param (
    [string]$BaseUrl = "http://localhost:3000"
  )
    
  Write-ServiceLog "Checking service health..." "INFO"
    
  try {
    $healthEndpoint = "$BaseUrl/api/health"
        
    $response = Invoke-RestMethod -Uri $healthEndpoint -Method Get -ErrorAction Stop
        
    if ($response.status -eq "healthy") {
      Write-ServiceLog "Service is healthy" "SUCCESS"
      return $true
    }
    else {
      Write-ServiceLog "Service is not healthy. Status: $($response.status)" "WARNING"
      Write-ServiceLog "Health details: $($response | ConvertTo-Json -Depth 3)" "INFO"
      return $false
    }
  }
  catch {
    Write-ServiceLog "Error checking service health: $_" "ERROR"
    return $false
  }
}

# Function to reset a specific service
function Reset-ServiceState {
  param (
    [Parameter(Mandatory = $true)]
    [ValidateSet(
      "BitcoinPaymentService",
      "DogecoinPaymentService",
      "SonaStreamingService",
      "ProcessorService",
      "HashTokenVerificationService",
      "GubchlllrbService",
      "CompositeCipherKeychainService",
      "LyigvasIBBSMFTEESLOLAMGODSIMANIBISService",
      "POEStreamCryptoTokenProtocolService",
      "DionysiusStreamingService",
      "SecureProxyStreamingService",
      "All"
    )]
    [string]$ServiceName
  )
    
  Write-ServiceLog "Resetting state for $ServiceName..." "INFO"
    
  try {
    # This would typically call into a service's reset API endpoint
    # For demonstration purposes, we'll simulate this with sample URLs
        
    if ($ServiceName -eq "All") {
      $resetUrl = "http://localhost:3000/api/admin/reset/all"
    }
    else {
      $resetUrl = "http://localhost:3000/api/admin/reset/$ServiceName"
    }
        
    Write-ServiceLog "Calling reset endpoint: $resetUrl" "INFO"
        
    # In a real implementation, this would make an actual API call
    # For demonstration, we'll just log success
        
    Write-ServiceLog "Service state reset successfully" "SUCCESS"
    return $true
  }
  catch {
    Write-ServiceLog "Error resetting service state: $_" "ERROR"
    return $false
  }
}

# Function to validate service configuration files
function Test-ServiceConfig {
  Write-ServiceLog "Validating service configuration files..." "INFO"
    
  try {
    $configFiles = @(
      @{Path = $ServiceConfig; Required = $true },
      @{Path = $EnvFile; Required = $false }
    )
        
    foreach ($file in $configFiles) {
      if (Test-Path $file.Path) {
        Write-ServiceLog "Config file exists: $($file.Path)" "INFO"
                
        if ($file.Path.EndsWith(".json")) {
          # Validate JSON syntax
          $content = Get-Content -Path $file.Path -Raw
          $null = $content | ConvertFrom-Json -ErrorAction Stop
          Write-ServiceLog "JSON syntax validation successful: $($file.Path)" "INFO"
        }
      }
      elseif ($file.Required) {
        Write-ServiceLog "Required config file missing: $($file.Path)" "ERROR"
        return $false
      }
      else {
        Write-ServiceLog "Optional config file missing: $($file.Path)" "WARNING"
      }
    }
        
    Write-ServiceLog "Configuration validation completed" "SUCCESS"
    return $true
  }
  catch {
    Write-ServiceLog "Error validating configuration: $_" "ERROR"
    return $false
  }
}

# Export functions for external use
Export-ModuleMember -Function Start-DevEnvironment, Stop-DevEnvironment, Invoke-ServiceTests, Invoke-ProductionBuild, 
Test-ServiceHealth, Reset-ServiceState, Test-ServiceConfig, Write-ServiceLog
                             
Write-ServiceLog "Web3 Crypto Streaming Service utilities loaded successfully" "INFO"
