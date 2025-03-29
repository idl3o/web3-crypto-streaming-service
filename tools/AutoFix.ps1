<#
.SYNOPSIS
    Automatic issue detection and fixing script for Web3 Crypto Streaming Service
.DESCRIPTION
    This script performs various maintenance tasks including:
    - Environment validation
    - Code quality checks
    - Security scanning
    - Dependency updates
    - Common issue fixes
.EXAMPLE
    .\AutoFix.ps1 -Fix All
    Runs all available fixes
.EXAMPLE
    .\AutoFix.ps1 -Fix Environment
    Only validates and fixes environment configuration
.NOTES
    Author: Web3 Crypto Streaming Service Team
    Version: 1.0
#>

param (
    [Parameter(Position = 0)]
    [ValidateSet("All", "Environment", "Security", "Formatting", "Dependencies", "Diagnostics")]
    [string[]] $Fix = @("All"),
    
    [switch] $Scan,
    [switch] $AutoFix,
    [switch] $Verbose,
    [switch] $NoBackup,
    [string] $LogFile = "autofix.log"
)

# Script configuration
$config = @{
    rootDir = (Get-Item (Split-Path -Parent $PSScriptRoot)).FullName
    backupDir = Join-Path -Path (Get-Item (Split-Path -Parent $PSScriptRoot)).FullName -ChildPath "backups/$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    envFile = ".env"
    envExampleFile = ".env.example"
    packageFile = "package.json"
    securityExclusions = @(".git", "node_modules", "dist", "backups")
    issuesFound = 0
    issuesFixed = 0
    logFile = $LogFile
}

# Initialize log file
function Initialize-LogFile {
    if (Test-Path $config.logFile) {
        Remove-Item $config.logFile -Force
    }
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $config.logFile -Value "Web3 Crypto Streaming Service AutoFix Log - $timestamp"
    Add-Content -Path $config.logFile -Value "=================================================="
    Add-Content -Path $config.logFile -Value ""
}

# Write to log and console
function Write-Log {
    param (
        [Parameter(Mandatory = $true)]
        [string] $Message,
        
        [ValidateSet("INFO", "WARNING", "ERROR", "SUCCESS")]
        [string] $Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Write to log file
    Add-Content -Path $config.logFile -Value $logMessage
    
    # Write to console with appropriate color
    switch ($Level) {
        "WARNING" { Write-Host $logMessage -ForegroundColor Yellow }
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        default { Write-Host $logMessage }
    }
}

# Create backup of a file before modifying
function Backup-File {
    param (
        [Parameter(Mandatory = $true)]
        [string] $FilePath
    )
    
    if ($NoBackup) {
        return
    }
    
    if (-not (Test-Path $config.backupDir)) {
        New-Item -ItemType Directory -Path $config.backupDir -Force | Out-Null
    }
    
    $fileName = Split-Path -Leaf $FilePath
    $relativePath = (Resolve-Path -Relative $FilePath).TrimStart(".\")
    $backupPath = Join-Path -Path $config.backupDir -ChildPath $relativePath
    $backupDir = Split-Path -Parent $backupPath
    
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }
    
    Copy-Item -Path $FilePath -Destination $backupPath -Force
    Write-Log -Level "INFO" -Message "Created backup of $relativePath"
}

# Check environment configuration
function Test-Environment {
    Write-Log -Level "INFO" -Message "Checking environment configuration..."
    
    $envPath = Join-Path -Path $config.rootDir -ChildPath $config.envFile
    $envExamplePath = Join-Path -Path $config.rootDir -ChildPath $config.envExampleFile
    
    if (-not (Test-Path $envPath)) {
        Write-Log -Level "WARNING" -Message "$config.envFile file is missing"
        $config.issuesFound++
        
        if ($AutoFix) {
            if (Test-Path $envExamplePath) {
                Copy-Item -Path $envExamplePath -Destination $envPath
                Write-Log -Level "SUCCESS" -Message "Created $config.envFile from $config.envExampleFile template"
                $config.issuesFixed++
            } else {
                Write-Log -Level "ERROR" -Message "Cannot create $config.envFile, template file is missing"
            }
        } else {
            Write-Log -Level "INFO" -Message "Recommendation: Create $config.envFile from $config.envExampleFile template"
        }
        return
    }
    
    # Read .env and .env.example files to compare variables
    if (Test-Path $envExamplePath) {
        $envVars = Get-Content $envPath | Where-Object { $_ -match '^[A-Za-z0-9_]+=.+' } | ForEach-Object { ($_ -split '=')[0] }
        $exampleVars = Get-Content $envExamplePath | Where-Object { $_ -match '^[A-Za-z0-9_]+=.+' } | ForEach-Object { ($_ -split '=')[0] }
        
        # Find missing variables
        $missingVars = $exampleVars | Where-Object { $_ -notin $envVars }
        
        if ($missingVars.Count -gt 0) {
            Write-Log -Level "WARNING" -Message "Missing environment variables: $($missingVars -join ', ')"
            $config.issuesFound += $missingVars.Count
            
            if ($AutoFix) {
                Backup-File -FilePath $envPath
                
                foreach ($var in $missingVars) {
                    $exampleLine = Get-Content $envExamplePath | Where-Object { $_ -match "^$var=" } | Select-Object -First 1
                    Add-Content -Path $envPath -Value $exampleLine
                    Write-Log -Level "SUCCESS" -Message "Added missing variable: $var"
                    $config.issuesFixed++
                }
            } else {
                Write-Log -Level "INFO" -Message "Recommendation: Add missing environment variables to $config.envFile"
            }
        } else {
            Write-Log -Level "SUCCESS" -Message "All required environment variables are present"
        }
    }
    
    # Check for empty API keys
    $emptyApiKeys = Get-Content $envPath | Where-Object { 
        $_ -match '^[A-Za-z0-9_]+_API_KEY=$' -or $_ -match '^[A-Za-z0-9_]+_KEY=$' 
    }
    
    if ($emptyApiKeys.Count -gt 0) {
        Write-Log -Level "WARNING" -Message "Found $($emptyApiKeys.Count) empty API keys in $config.envFile"
        $config.issuesFound += $emptyApiKeys.Count
        Write-Log -Level "INFO" -Message "Recommendation: Fill in empty API keys in $config.envFile"
    }
}

# Check for code quality issues
function Test-CodeQuality {
    Write-Log -Level "INFO" -Message "Checking code quality..."
    
    # Check for ESLint and Prettier
    $packagePath = Join-Path -Path $config.rootDir -ChildPath $config.packageFile
    
    if (Test-Path $packagePath) {
        $packageJson = Get-Content $packagePath -Raw | ConvertFrom-Json
        
        $hasESLint = $false
        $hasPrettier = $false
        
        if ($packageJson.devDependencies.PSObject.Properties.Name -contains "eslint") {
            $hasESLint = $true
        }
        
        if ($packageJson.devDependencies.PSObject.Properties.Name -contains "prettier") {
            $hasPrettier = $true
        }
        
        if (-not $hasESLint -or -not $hasPrettier) {
            Write-Log -Level "WARNING" -Message "Missing linting tools: $(if (-not $hasESLint) {'ESLint'})$(if (-not $hasESLint -and -not $hasPrettier) {', '})$(if (-not $hasPrettier) {'Prettier'})"
            $config.issuesFound++
            
            if ($AutoFix) {
                Backup-File -FilePath $packagePath
                
                $installCmd = "npm install --save-dev"
                if (-not $hasESLint) {
                    $installCmd += " eslint"
                }
                if (-not $hasPrettier) {
                    $installCmd += " prettier"
                }
                
                try {
                    Push-Location $config.rootDir
                    Invoke-Expression $installCmd
                    Write-Log -Level "SUCCESS" -Message "Installed missing linting tools"
                    $config.issuesFixed++
                } catch {
                    Write-Log -Level "ERROR" -Message "Failed to install linting tools: $_"
                } finally {
                    Pop-Location
                }
            } else {
                Write-Log -Level "INFO" -Message "Recommendation: Install missing linting tools with npm"
            }
        } else {
            Write-Log -Level "SUCCESS" -Message "ESLint and Prettier are properly configured"
        }
    } else {
        Write-Log -Level "WARNING" -Message "package.json not found, skipping code quality checks"
    }
    
    # Check for console.log statements in production code
    $jsFiles = Get-ChildItem -Path $config.rootDir -Recurse -Include "*.js", "*.vue" -Exclude "node_modules", "dist" | Where-Object { 
        $_.DirectoryName -notmatch "node_modules" -and 
        $_.DirectoryName -notmatch "dist" -and
        $_.DirectoryName -notmatch "test" -and
        $_.DirectoryName -notmatch "tests"
    }
    
    $consoleLogCount = 0
    
    foreach ($file in $jsFiles) {
        $content = Get-Content $file -Raw
        $matches = [regex]::Matches($content, 'console\.log\(')
        $consoleLogCount += $matches.Count
    }
    
    if ($consoleLogCount -gt 0) {
        Write-Log -Level "WARNING" -Message "Found $consoleLogCount console.log statements in production code"
        $config.issuesFound += $consoleLogCount
        Write-Log -Level "INFO" -Message "Recommendation: Remove or replace console.log statements with proper logging"
    }
}

# Check for security issues
function Test-Security {
    Write-Log -Level "INFO" -Message "Checking for security issues..."
    
    # Check for hardcoded API keys and secrets
    $sourceFiles = Get-ChildItem -Path $config.rootDir -Recurse -File -Include "*.js", "*.vue", "*.ts", "*.json" | 
        Where-Object { 
            $relativePath = $_.FullName.Substring($config.rootDir.Length + 1)
            -not ($config.securityExclusions | Where-Object { $relativePath.StartsWith($_) })
        }
    
    $apiKeyPattern = '(api[_-]?key|api[_-]?secret|auth[_-]?token|password|secret)["\s]*[:=]["\s]*["\']([a-zA-Z0-9_\-\.]{8,})["\']'
    
    $securityIssues = @()
    
    foreach ($file in $sourceFiles) {
        $content = Get-Content $file -Raw
        $matches = [regex]::Matches($content, $apiKeyPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        
        foreach ($match in $matches) {
            $securityIssues += @{
                File = $file.FullName.Substring($config.rootDir.Length + 1)
                Line = ($content.Substring(0, $match.Index).Split("`n")).Length
                Match = $match.Value
            }
        }
    }
    
    if ($securityIssues.Count -gt 0) {
        Write-Log -Level "WARNING" -Message "Found $($securityIssues.Count) potential hardcoded secrets/API keys"
        $config.issuesFound += $securityIssues.Count
        
        foreach ($issue in $securityIssues) {
            Write-Log -Level "WARNING" -Message "Potential secret in $($issue.File):$($issue.Line)"
            
            if ($Verbose) {
                Write-Log -Level "WARNING" -Message "   $($issue.Match)"
            }
        }
        
        Write-Log -Level "INFO" -Message "Recommendation: Move secrets to environment variables"
    } else {
        Write-Log -Level "SUCCESS" -Message "No hardcoded API keys or secrets found"
    }
    
    # Check if .env is in .gitignore
    $gitignorePath = Join-Path -Path $config.rootDir -ChildPath ".gitignore"
    if (Test-Path $gitignorePath) {
        $gitignoreContent = Get-Content $gitignorePath -Raw
        
        if ($gitignoreContent -notmatch "\.env") {
            Write-Log -Level "WARNING" -Message ".env file is not excluded in .gitignore"
            $config.issuesFound++
            
            if ($AutoFix) {
                Backup-File -FilePath $gitignorePath
                Add-Content -Path $gitignorePath -Value "`n# Environment Variables`n.env`n.env.*`n!.env.example"
                Write-Log -Level "SUCCESS" -Message "Added .env to .gitignore"
                $config.issuesFixed++
            } else {
                Write-Log -Level "INFO" -Message "Recommendation: Add .env to .gitignore file"
            }
        } else {
            Write-Log -Level "SUCCESS" -Message ".env file is properly excluded in .gitignore"
        }
    } else {
        Write-Log -Level "WARNING" -Message ".gitignore file not found"
        $config.issuesFound++
    }
    
    # Check for vulnerable dependencies if npm is available
    $npmAudit = $null
    try {
        Push-Location $config.rootDir
        $npmAudit = Invoke-Expression "npm audit --json" | ConvertFrom-Json -ErrorAction SilentlyContinue
        Pop-Location
        
        if ($npmAudit -and $npmAudit.vulnerabilities) {
            $vulnCount = 0
            $highSeverityCount = 0
            
            foreach ($vuln in $npmAudit.vulnerabilities.PSObject.Properties) {
                $vulnCount++
                if ($vuln.Value.severity -eq "high" -or $vuln.Value.severity -eq "critical") {
                    $highSeverityCount++
                    if ($Verbose) {
                        Write-Log -Level "WARNING" -Message "Vulnerability in $($vuln.Name): $($vuln.Value.severity) - $($vuln.Value.title)"
                    }
                }
            }
            
            if ($vulnCount -gt 0) {
                Write-Log -Level "WARNING" -Message "Found $vulnCount vulnerabilities ($highSeverityCount high or critical)"
                $config.issuesFound += $vulnCount
                
                if ($AutoFix) {
                    try {
                        Invoke-Expression "npm audit fix"
                        Write-Log -Level "SUCCESS" -Message "Attempted to fix vulnerabilities with npm audit fix"
                        $config.issuesFixed++
                    } catch {
                        Write-Log -Level "ERROR" -Message "Failed to fix vulnerabilities: $_"
                    }
                } else {
                    Write-Log -Level "INFO" -Message "Recommendation: Run 'npm audit fix' to address vulnerabilities"
                }
            } else {
                Write-Log -Level "SUCCESS" -Message "No vulnerable dependencies found"
            }
        }
    } catch {
        Write-Log -Level "WARNING" -Message "Could not check for vulnerable dependencies with npm audit"
    }
}

# Check dependencies
function Test-Dependencies {
    Write-Log -Level "INFO" -Message "Checking dependencies..."
    
    $packagePath = Join-Path -Path $config.rootDir -ChildPath $config.packageFile
    
    if (Test-Path $packagePath) {
        # Check for outdated dependencies
        try {
            Push-Location $config.rootDir
            $outdated = Invoke-Expression "npm outdated --json" | ConvertFrom-Json -ErrorAction SilentlyContinue
            Pop-Location
            
            if ($outdated -and $outdated.PSObject.Properties.Count -gt 0) {
                $outdatedCount = $outdated.PSObject.Properties.Count
                Write-Log -Level "WARNING" -Message "Found $outdatedCount outdated packages"
                $config.issuesFound += $outdatedCount
                
                if ($Verbose) {
                    foreach ($package in $outdated.PSObject.Properties) {
                        Write-Log -Level "INFO" -Message "Package $($package.Name): current $($package.Value.current), latest $($package.Value.latest)"
                    }
                }
                
                if ($AutoFix) {
                    try {
                        Invoke-Expression "npm update"
                        Write-Log -Level "SUCCESS" -Message "Updated dependencies with npm update"
                        $config.issuesFixed++
                    } catch {
                        Write-Log -Level "ERROR" -Message "Failed to update dependencies: $_"
                    }
                } else {
                    Write-Log -Level "INFO" -Message "Recommendation: Run 'npm update' to update dependencies"
                }
            } else {
                Write-Log -Level "SUCCESS" -Message "All dependencies are up to date"
            }
        } catch {
            Write-Log -Level "WARNING" -Message "Could not check for outdated dependencies: $_"
        }
        
        # Check for duplicate dependencies
        $packageJson = Get-Content $packagePath -Raw | ConvertFrom-Json
        $allDependencies = @{}
        
        if ($packageJson.dependencies -ne $null) {
            $packageJson.dependencies.PSObject.Properties | ForEach-Object {
                $allDependencies[$_.Name] = $_.Value
            }
        }
        
        if ($packageJson.devDependencies -ne $null) {
            $packageJson.devDependencies.PSObject.Properties | ForEach-Object {
                if ($allDependencies.ContainsKey($_.Name)) {
                    Write-Log -Level "WARNING" -Message "Package $($_.Name) is listed in both dependencies and devDependencies"
                    $config.issuesFound++
                }
            }
        }
    } else {
        Write-Log -Level "WARNING" -Message "package.json not found, skipping dependency checks"
    }
}

# Run diagnostics
function Test-Diagnostics {
    Write-Log -Level "INFO" -Message "Running diagnostics..."
    
    # Check for proper file structure
    $essentialDirectories = @("src", "public", "tests")
    $missingDirectories = @()
    
    foreach ($dir in $essentialDirectories) {
        $dirPath = Join-Path -Path $config.rootDir -ChildPath $dir
        if (-not (Test-Path $dirPath -PathType Container)) {
            $missingDirectories += $dir
        }
    }
    
    if ($missingDirectories.Count -gt 0) {
        Write-Log -Level "WARNING" -Message "Missing essential directories: $($missingDirectories -join ', ')"
        $config.issuesFound += $missingDirectories.Count
        
        if ($AutoFix) {
            foreach ($dir in $missingDirectories) {
                $dirPath = Join-Path -Path $config.rootDir -ChildPath $dir
                New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
                Write-Log -Level "SUCCESS" -Message "Created missing directory: $dir"
                $config.issuesFixed++
            }
        } else {
            Write-Log -Level "INFO" -Message "Recommendation: Create missing essential directories"
        }
    } else {
        Write-Log -Level "SUCCESS" -Message "All essential directories are present"
    }
    
    # Check for proper Git configuration
    $gitConfigPath = Join-Path -Path $config.rootDir -ChildPath ".git/config"
    if (Test-Path $gitConfigPath) {
        $gitConfig = Get-Content $gitConfigPath -Raw
        
        if ($gitConfig -notmatch "autocrlf") {
            Write-Log -Level "WARNING" -Message "Git autocrlf not configured, may cause line ending issues"
            $config.issuesFound++
            
            if ($AutoFix) {
                try {
                    Push-Location $config.rootDir
                    Invoke-Expression "git config core.autocrlf input"
                    Write-Log -Level "SUCCESS" -Message "Set git config core.autocrlf to input"
                    $config.issuesFixed++
                } catch {
                    Write-Log -Level "ERROR" -Message "Failed to configure Git: $_"
                } finally {
                    Pop-Location
                }
            } else {
                Write-Log -Level "INFO" -Message "Recommendation: Run 'git config core.autocrlf input' to normalize line endings"
            }
        }
    }
    
    # Check for common build artifacts that should be in .gitignore
    $gitignorePath = Join-Path -Path $config.rootDir -ChildPath ".gitignore"
    if (Test-Path $gitignorePath) {
        $gitignoreContent = Get-Content $gitignorePath -Raw
        $requiredIgnores = @("node_modules/", "dist/", "coverage/", "*.log")
        $missingIgnores = @()
        
        foreach ($ignore in $requiredIgnores) {
            if ($gitignoreContent -notmatch [regex]::Escape($ignore)) {
                $missingIgnores += $ignore
            }
        }
        
        if ($missingIgnores.Count -gt 0) {
            Write-Log -Level "WARNING" -Message "Missing .gitignore entries: $($missingIgnores -join ', ')"
            $config.issuesFound += $missingIgnores.Count
            
            if ($AutoFix) {
                Backup-File -FilePath $gitignorePath
                Add-Content -Path $gitignorePath -Value "`n# Added by AutoFix`n$($missingIgnores -join "`n")"
                Write-Log -Level "SUCCESS" -Message "Added missing entries to .gitignore"
                $config.issuesFixed++
            } else {
                Write-Log -Level "INFO" -Message "Recommendation: Add missing entries to .gitignore"
            }
        }
    }
}

# Format code
function Format-Code {
    Write-Log -Level "INFO" -Message "Checking code formatting..."
    
    # Check if prettier is available
    $eslintrcPath = Join-Path -Path $config.rootDir -ChildPath ".eslintrc.js"
    $prettierrcPath = Join-Path -Path $config.rootDir -ChildPath ".prettierrc"
    
    $needsEslintConfig = -not (Test-Path $eslintrcPath)
    $needsPrettierConfig = -not (Test-Path $prettierrcPath)
    
    if ($needsEslintConfig -or $needsPrettierConfig) {
        if ($needsEslintConfig) {
            Write-Log -Level "WARNING" -Message "Missing ESLint configuration file"
            $config.issuesFound++
        }
        
        if ($needsPrettierConfig) {
            Write-Log -Level "WARNING" -Message "Missing Prettier configuration file"
            $config.issuesFound++
        }
        
        if ($AutoFix) {
            if ($needsEslintConfig) {
                $eslintConfig = @"
module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es6: true
  },
  extends: [
    'plugin:vue/essential',
    'eslint:recommended'
  ],
  parserOptions: {
    parser: 'babel-eslint'
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
  }
};
"@
                Set-Content -Path $eslintrcPath -Value $eslintConfig
                Write-Log -Level "SUCCESS" -Message "Created default .eslintrc.js config"
                $config.issuesFixed++
            }
            
            if ($needsPrettierConfig) {
                $prettierConfig = @"
{
  "singleQuote": true,
  "semi": true,
  "tabWidth": 2,
  "trailingComma": "none",
  "printWidth": 100
}
"@
                Set-Content -Path $prettierrcPath -Value $prettierConfig
                Write-Log -Level "SUCCESS" -Message "Created default .prettierrc config"
                $config.issuesFixed++
            }
            
            try {
                Push-Location $config.rootDir
                if (-not (Test-Path "node_modules/.bin/eslint")) {
                    Invoke-Expression "npm install --save-dev eslint eslint-plugin-vue babel-eslint"
                    Write-Log -Level "INFO" -Message "Installed ESLint dependencies"
                }
                if (-not (Test-Path "node_modules/.bin/prettier")) {
                    Invoke-Expression "npm install --save-dev prettier"
                    Write-Log -Level "INFO" -Message "Installed Prettier"
                }
                Pop-Location
            } catch {
                Write-Log -Level "ERROR" -Message "Failed to install linting tools: $_"
            }
        } else {
            Write-Log -Level "INFO" -Message "Recommendation: Create ESLint and Prettier configuration files"
        }
    }
    
    # Try to format code if ESLint and Prettier are available
    if (Test-Path (Join-Path -Path $config.rootDir -ChildPath "node_modules/.bin/eslint")) {
        if ($AutoFix) {
            try {
                Push-Location $config.rootDir
                Write-Log -Level "INFO" -Message "Running ESLint fix..."
                Invoke-Expression "npx eslint --fix 'src/**/*.{js,vue}'"
                Write-Log -Level "SUCCESS" -Message "Fixed code style issues with ESLint"
                $config.issuesFixed++
                Pop-Location
            } catch {
                Write-Log -Level "WARNING" -Message "ESLint fix encountered issues: $_"
            }
        } else {
            try {
                Push-Location $config.rootDir
                $eslintOutput = Invoke-Expression "npx eslint 'src/**/*.{js,vue}'" -ErrorAction SilentlyContinue
                if ($eslintOutput) {
                    Write-Log -Level "WARNING" -Message "ESLint found code style issues"
                    $config.issuesFound++
                    Write-Log -Level "INFO" -Message "Recommendation: Run 'npx eslint --fix' to fix code style issues"
                } else {
                    Write-Log -Level "SUCCESS" -Message "No ESLint issues found"
                }
                Pop-Location
            } catch {
                Write-Log -Level "WARNING" -Message "Could not run ESLint check: $_"
            }
        }
    }
}

# Main execution block
function Start-AutoFix {
    Initialize-LogFile
    
    Write-Log -Level "INFO" -Message "Starting Web3 Crypto Streaming Service AutoFix"
    Write-Log -Level "INFO" -Message "Root directory: $($config.rootDir)"
    
    if ($Fix -contains "All" -or $Fix -contains "Environment") {
        Test-Environment
    }
    
    if ($Fix -contains "All" -or $Fix -contains "Security") {
        Test-Security
    }
    
    if ($Fix -contains "All" -or $Fix -contains "Dependencies") {
        Test-Dependencies
    }
    
    if ($Fix -contains "All" -or $Fix -contains "Formatting") {
        Format-Code
    }
    
    if ($Fix -contains "All" -or $Fix -contains "Diagnostics") {
        Test-Diagnostics
    }
    
    if ($Fix -contains "All" -or $Fix -contains "CodeQuality") {
        Test-CodeQuality
    }
    
    # Summary
    Write-Log -Level "INFO" -Message "========== AutoFix Summary =========="
    Write-Log -Level "INFO" -Message "Issues Found: $($config.issuesFound)"
    Write-Log -Level "INFO" -Message "Issues Fixed: $($config.issuesFixed)"
    Write-Log -Level "INFO" -Message "Unfixed Issues: $($config.issuesFound - $config.issuesFixed)"
    
    if ($config.issuesFound - $config.issuesFixed -gt 0) {
        $fixableMessage = if ($AutoFix) { "Manual intervention required" } else { "Run with -AutoFix to attempt automatic fixes" }
        Write-Log -Level "WARNING" -Message $fixableMessage
    } elseif ($config.issuesFound -eq 0) {
        Write-Log -Level "SUCCESS" -Message "No issues detected!"
    } else {
        Write-Log -Level "SUCCESS" -Message "All detected issues fixed!"
    }
    
    Write-Log -Level "INFO" -Message "Log file: $($config.logFile)"
}

# Run the script
Start-AutoFix
