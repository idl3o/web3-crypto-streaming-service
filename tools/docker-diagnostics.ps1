<#
.SYNOPSIS
    Docker diagnostics tool for Web3 Crypto Streaming Service
.DESCRIPTION
    Collects Docker diagnostics information to help troubleshoot container issues
    for the Web3 Crypto Streaming Service project.
.EXAMPLE
    .\docker-diagnostics.ps1
    Runs basic diagnostics

.EXAMPLE
    .\docker-diagnostics.ps1 -Upload
    Collects and uploads diagnostics to Docker for analysis
    
.EXAMPLE
    .\docker-diagnostics.ps1 -Check
    Performs Docker health checks
#>

param (
    [switch] $Upload,
    [switch] $IncludeEnvVars,
    [switch] $FullLogs,
    [string] $OutputPath = "$PSScriptRoot\..\logs\docker-diagnostics",
    [switch] $SkipNetworkTests,
    [switch] $Check,
    [int] $Timeout = 300 # Add timeout parameter
)

# Validate parameters
if ($OutputPath.Contains(';') -or $OutputPath.Contains('&') -or $OutputPath.Contains('|')) {
    Write-Error "Invalid characters in OutputPath"
    exit 1
}

$ErrorActionPreference = "Stop"
$diagnoseExe = "C:\Program Files\Docker\Docker\resources\com.docker.diagnose.exe"
$projectRoot = (Get-Item (Split-Path -Parent $PSScriptRoot)).FullName
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path -Path $OutputPath -ChildPath "docker-diagnostics-$timestamp.log"

# Ensure output directory exists
if (-not (Test-Path $OutputPath)) {
    try {
        # Add error handling for directory creation
        New-Item -ItemType Directory -Path $OutputPath -Force -ErrorAction Stop | Out-Null
    }
    catch {
        Write-Error "Failed to create output directory: $_"
        exit 1
    }
}

function Write-Log {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Message,
        
        [ValidateSet("INFO", "WARNING", "ERROR", "SUCCESS")]
        [string] $Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    Add-Content -Path $logFile -Value $logMessage
    
    switch ($Level) {
        "WARNING" { Write-Host $logMessage -ForegroundColor Yellow }
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        default { Write-Host $logMessage }
    }
}

function Test-DockerInstallation {
    Write-Log -Message "Checking Docker installation..."
    
    if (-not (Test-Path $diagnoseExe)) {
        Write-Log -Message "Docker diagnostic executable not found at: $diagnoseExe" -Level "ERROR"
        Write-Log -Message "Ensure Docker Desktop is properly installed" -Level "ERROR"
        return $false
    }
    
    try {
        $dockerVersion = docker version --format '{{.Server.Version}}'
        Write-Log -Message "Docker version: $dockerVersion" -Level "SUCCESS"
        return $true
    }
    catch {
        Write-Log -Message "Error checking Docker version: $_" -Level "ERROR"
        Write-Log -Message "Docker Engine may not be running" -Level "ERROR"
        return $false
    }
}

function Test-DockerComposeAvailability {
    Write-Log -Message "Checking Docker Compose availability..."
    
    try {
        $composeVersion = docker compose version
        Write-Log -Message "Docker Compose: $composeVersion" -Level "SUCCESS"
        return $true
    }
    catch {
        Write-Log -Message "Error checking Docker Compose: $_" -Level "ERROR"
        return $false
    }
}

function Get-DockerInfo {
    Write-Log -Message "Collecting Docker information..."
    
    try {
        $infoOutput = Join-Path -Path $OutputPath -ChildPath "docker-info-$timestamp.txt"
        docker info > $infoOutput
        Write-Log -Message "Docker info saved to: $infoOutput" -Level "SUCCESS"
    }
    catch {
        Write-Log -Message "Error collecting Docker info: $_" -Level "ERROR"
    }
    
    try {
        $systemOutput = Join-Path -Path $OutputPath -ChildPath "docker-system-$timestamp.txt"
        docker system df -v > $systemOutput
        Write-Log -Message "Docker system info saved to: $systemOutput" -Level "SUCCESS"
    }
    catch {
        Write-Log -Message "Error collecting Docker system info: $_" -Level "ERROR"
    }
}

function Test-DockerNetworking {
    if ($SkipNetworkTests) {
        Write-Log -Message "Skipping network tests as requested" -Level "INFO"
        return
    }
    
    Write-Log -Message "Testing Docker networking..."
    
    try {
        Write-Log -Message "Listing Docker networks..."
        $networksOutput = Join-Path -Path $OutputPath -ChildPath "docker-networks-$timestamp.txt"
        docker network ls --no-trunc > $networksOutput
        
        # Test DNS resolution inside a container
        Write-Log -Message "Testing DNS resolution in container..."
        $dnsResult = docker run --rm alpine nslookup google.com
        if ($LASTEXITCODE -eq 0) {
            Write-Log -Message "DNS resolution test: PASSED" -Level "SUCCESS"
        }
        else {
            Write-Log -Message "DNS resolution test: FAILED" -Level "WARNING"
        }
        
        # Test connectivity to Docker Hub
        Write-Log -Message "Testing connectivity to Docker Hub..."
        $hubResult = docker pull hello-world
        if ($LASTEXITCODE -eq 0) {
            Write-Log -Message "Docker Hub connectivity: PASSED" -Level "SUCCESS"
        }
        else {
            Write-Log -Message "Docker Hub connectivity: FAILED" -Level "WARNING"
        }
    }
    catch {
        Write-Log -Message "Error during network tests: $_" -Level "ERROR"
    }
}

function Get-ProjectDockerStatus {
    Write-Log -Message "Checking Web3 Crypto Streaming Service Docker status..."
    
    $composeFile = Join-Path -Path $projectRoot -ChildPath "docker-compose.yml"
    
    if (-not (Test-Path $composeFile)) {
        Write-Log -Message "docker-compose.yml not found in project directory" -Level "WARNING"
        return
    }
    
    try {
        # Go to project root directory
        Push-Location $projectRoot
        
        # List containers
        $containersOutput = Join-Path -Path $OutputPath -ChildPath "project-containers-$timestamp.txt"
        docker compose ps > $containersOutput
        Write-Log -Message "Project containers saved to: $containersOutput" -Level "SUCCESS"
        
        # Check container health
        $healthOutput = Join-Path -Path $OutputPath -ChildPath "container-health-$timestamp.txt"
        docker compose ps --format "table {{.Name}}\t{{.Service}}\t{{.Status}}\t{{.Health}}" > $healthOutput
        Write-Log -Message "Container health saved to: $healthOutput" -Level "SUCCESS"
        
        # Get container logs if requested
        if ($FullLogs) {
            Write-Log -Message "Collecting container logs..."
            $logsDir = Join-Path -Path $OutputPath -ChildPath "container-logs"
            
            if (-not (Test-Path $logsDir)) {
                New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
            }
            
            $containers = docker compose ps -q
            if ($containers) {
                foreach ($container in $containers -split "`n") {
                    if ($container.Trim() -ne "") {
                        $containerName = (docker inspect --format "{{.Name}}" $container).TrimStart('/')
                        $logFile = Join-Path -Path $logsDir -ChildPath "$containerName-$timestamp.log"
                        docker logs $container > $logFile
                        Write-Log -Message "Logs for $containerName saved to: $logFile" -Level "SUCCESS"
                    }
                }
            }
        }
        
        # Check Docker networks being used
        $networkOutput = Join-Path -Path $OutputPath -ChildPath "project-networks-$timestamp.txt"
        docker compose config --services | ForEach-Object {
            docker compose config --services $_ | Out-File -Append -FilePath $networkOutput
        }
        Write-Log -Message "Project network config saved to: $networkOutput" -Level "SUCCESS"
    }
    catch {
        Write-Log -Message "Error checking project Docker status: $_" -Level "ERROR"
    }
    finally {
        Pop-Location
    }
}

function Invoke-DockerDiagnostics {
    if ($Upload) {
        Write-Log -Message "Running Docker diagnostics with upload..."
        try {
            $output = & $diagnoseExe gather -upload
            $diagnosticsId = ($output | Select-String -Pattern 'id: (.+)').Matches.Groups[1].Value
            if ($diagnosticsId) {
                Write-Log -Message "Diagnostics uploaded with ID: $diagnosticsId" -Level "SUCCESS"
                Write-Log -Message "You can share this ID with Docker support for troubleshooting." -Level "INFO"
            }
            else {
                Write-Log -Message "Diagnostics completed but no ID found." -Level "WARNING"
            }
        }
        catch {
            Write-Log -Message "Error running Docker diagnostics: $_" -Level "ERROR"
        }
    }
    else {
        Write-Log -Message "Running Docker diagnostics without upload..."
        try {
            $outputZip = Join-Path -Path $OutputPath -ChildPath "docker-diagnostics-$timestamp.zip"
            & $diagnoseExe gather -output $outputZip
            if (Test-Path $outputZip) {
                Write-Log -Message "Diagnostics saved to: $outputZip" -Level "SUCCESS"
            }
            else {
                Write-Log -Message "Diagnostics command completed but output file not found" -Level "WARNING"
            }
        }
        catch {
            Write-Log -Message "Error running Docker diagnostics: $_" -Level "ERROR"
        }
    }
}

function Get-EnvironmentInfo {
    Write-Log -Message "Collecting environment information..."
    
    $envOutput = Join-Path -Path $OutputPath -ChildPath "environment-$timestamp.txt"
    
    "OS: $((Get-WmiObject -Class Win32_OperatingSystem).Caption)" | Out-File -FilePath $envOutput
    "OS Version: $((Get-WmiObject -Class Win32_OperatingSystem).Version)" | Out-File -FilePath $envOutput -Append
    "CPU: $((Get-WmiObject -Class Win32_Processor).Name)" | Out-File -FilePath $envOutput -Append
    "Memory: $([math]::Round((Get-WmiObject -Class Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)) GB" | Out-File -FilePath $envOutput -Append
    "PowerShell Version: $($PSVersionTable.PSVersion)" | Out-File -FilePath $envOutput -Append
    
    # Include environment variables if requested
    if ($IncludeEnvVars) {
        Write-Log -Message "Including environment variables..."
        "`nEnvironment Variables:" | Out-File -FilePath $envOutput -Append
        Get-ChildItem Env: | Where-Object { -not $_.Name.StartsWith("API_") -and -not $_.Name.EndsWith("KEY") -and -not $_.Name.Contains("SECRET") -and -not $_.Name.Contains("TOKEN") } |
        Format-Table -AutoSize -Property Name, Value | Out-File -FilePath $envOutput -Append
    }
    
    Write-Log -Message "Environment information saved to: $envOutput" -Level "SUCCESS"
}

function Show-DockerComposeIssues {
    Write-Log -Message "Checking for common Docker Compose issues..."
    
    $composeFile = Join-Path -Path $projectRoot -ChildPath "docker-compose.yml"
    
    if (-not (Test-Path $composeFile)) {
        Write-Log -Message "docker-compose.yml not found in project directory" -Level "WARNING"
        return
    }
    
    # Check compose file syntax
    try {
        Push-Location $projectRoot
        docker compose config > $null
        Write-Log -Message "Docker Compose file syntax: VALID" -Level "SUCCESS"
        Pop-Location
    }
    catch {
        Write-Log -Message "Docker Compose file syntax: INVALID" -Level "ERROR"
        Write-Log -Message "Error: $_" -Level "ERROR"
        Pop-Location
        return
    }
    
    # Check frequently encountered issues
    $composeContent = Get-Content -Path $composeFile -Raw
    
    # Check for port conflicts
    $portPattern = '(\d+):(\d+)'
    $ports = [regex]::Matches($composeContent, $portPattern)
    $hostPorts = $ports | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
    
    foreach ($port in $hostPorts) {
        $portCheck = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue -InformationLevel Quiet
        if ($portCheck) {
            Write-Log -Message "Port $port is already in use on the host" -Level "WARNING"
        }
    }
    
    # Check for volume mounting issues
    if ($composeContent -match "\.:/app" -or $composeContent -match "\.\./") {
        Write-Log -Message "Possible volume mounting issue with relative paths" -Level "WARNING"
    }
    
    # Check if running in WSL2 mode
    try {
        $dockerInfo = docker info --format '{{.Name}}'
        if ($dockerInfo -like "*WSL*") {
            Write-Log -Message "Docker is running in WSL2 mode" -Level "INFO"
            # Check for WSL2-specific issues
            if ($composeContent -match "host.docker.internal" -and $composeContent -notmatch "extra_hosts") {
                Write-Log -Message "Using host.docker.internal without extra_hosts definition may cause issues in WSL2" -Level "WARNING"
            }
        }
        else {
            Write-Log -Message "Docker is not running in WSL2 mode" -Level "INFO"
        }
    }
    catch {
        Write-Log -Message "Could not determine Docker engine mode: $_" -Level "WARNING"
    }
}

function Get-DockerResourceUsage {
    Write-Log -Message "Collecting Docker resource usage information..."
    
    try {
        $statsOutput = Join-Path -Path $OutputPath -ChildPath "docker-stats-$timestamp.txt"
        docker stats --no-stream --no-trunc > $statsOutput
        Write-Log -Message "Docker resource stats saved to: $statsOutput" -Level "SUCCESS"
    }
    catch {
        Write-Log -Message "Error collecting Docker stats: $_" -Level "ERROR"
    }
}

function Invoke-DockerCheck {
    Write-Log -Message "Running Docker health checks..."
    try {
        # Add timeout for external command execution
        $checkOutput = Start-Job -ScriptBlock { 
            & $using:diagnoseExe check 
        } | Wait-Job -Timeout $Timeout | Receive-Job
        
        if ($null -eq $checkOutput) {
            Write-Log -Message "Health check timed out after $Timeout seconds" -Level "WARNING"
            return
        }
        
        $outputFile = Join-Path -Path $OutputPath -ChildPath "docker-health-check-$timestamp.txt"
        $checkOutput | Out-File -FilePath $outputFile -ErrorAction Stop
        
        # Fix error handling for regex match count
        $warningCount = 0
        $errorCount = 0
        
        if ($checkOutput) {
            $warningMatches = $checkOutput | Select-String -Pattern "WARNING" -AllMatches
            $errorMatches = $checkOutput | Select-String -Pattern "ERROR|FAIL" -AllMatches
            
            if ($warningMatches) {
                $warningCount = $warningMatches.Matches.Count
            }
            
            if ($errorMatches) {
                $errorCount = $errorMatches.Matches.Count
            }
        }
        
        if ($errorCount -gt 0) {
            Write-Log -Message "Health check found $errorCount errors!" -Level "ERROR"
            Write-Log -Message "Check $outputFile for details" -Level "ERROR"
        }
        elseif ($warningCount -gt 0) {
            Write-Log -Message "Health check found $warningCount warnings" -Level "WARNING"
            Write-Log -Message "Check $outputFile for details" -Level "WARNING"
        }
        else {
            Write-Log -Message "Health check passed successfully" -Level "SUCCESS"
        }
        
        Write-Log -Message "Health check results saved to: $outputFile" -Level "SUCCESS"
        
        # Also display the output directly in console if it's not too long
        $outputLines = $checkOutput.Count
        if ($outputLines -lt 30) {
            Write-Log -Message "Health check results:" -Level "INFO"
            foreach ($line in $checkOutput) {
                if ($line -match "ERROR|FAIL") {
                    Write-Host $line -ForegroundColor Red
                }
                elseif ($line -match "WARNING") {
                    Write-Host $line -ForegroundColor Yellow
                }
                elseif ($line -match "OK|PASS") {
                    Write-Host $line -ForegroundColor Green
                }
                else {
                    Write-Host $line
                }
            }
        }
    }
    catch {
        Write-Log -Message "Error running Docker health checks: $_" -Level "ERROR"
    }
}

# Add function to securely handle credentials
function Set-SecureEnvironmentVariable {
    param (
        [string] $Name,
        [string] $Value
    )
    
    if ([string]::IsNullOrEmpty($Name) -or [string]::IsNullOrEmpty($Value)) {
        return $false
    }
    
    try {
        [System.Environment]::SetEnvironmentVariable($Name, $Value, [System.EnvironmentVariableTarget]::Process)
        return $true
    }
    catch {
        Write-Log "Failed to set environment variable $Name: $_" -Level "ERROR"
        return $false
    }
}

# Run diagnostic procedures
Write-Log -Message "Starting Docker diagnostics for Web3 Crypto Streaming Service" -Level "INFO"
Write-Log -Message "Logs will be saved to: $logFile" -Level "INFO"

# Add overall timeout for script execution
$scriptRunTimeout = [System.Diagnostics.Stopwatch]::StartNew()

# Run checks
$dockerInstalled = Test-DockerInstallation
if ($dockerInstalled) {
    if ($Check) {
        # Run health checks only
        Invoke-DockerCheck
    }
    else {
        Test-DockerComposeAvailability
        Get-DockerInfo
        Test-DockerNetworking
        Get-ProjectDockerStatus
        Show-DockerComposeIssues
        Get-DockerResourceUsage
        Get-EnvironmentInfo
        Invoke-DockerDiagnostics
        
        # Check for overall timeout
        if ($scriptRunTimeout.Elapsed.TotalSeconds -gt $Timeout) {
            Write-Log -Message "Script execution timed out after $Timeout seconds" -Level "WARNING"
        }
    }
}

# Clean up any sensitive data
Remove-Variable -Name "diagnoseExe" -ErrorAction SilentlyContinue
[System.GC]::Collect()

Write-Log -Message "Diagnostics complete! Results saved to $OutputPath" -Level "SUCCESS"
Write-Log -Message "Please check the log files for any issues that need to be addressed." -Level "INFO"
