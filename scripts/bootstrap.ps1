#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Birch Projects Bootstrap Script
.DESCRIPTION
    Automated setup script for all Birch projects on a new Windows computer.
    Installs prerequisites, dependencies, and configures the development environment.
.NOTES
    Run this script as Administrator in PowerShell.
#>

param(
    [switch]$SkipPrerequisites,
    [switch]$SkipBuild,
    [switch]$SkipService
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors for output
function Write-Step { param($msg) Write-Host "`n[$([char]0x2192)] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "  [!] $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "  [X] $msg" -ForegroundColor Red }

# Banner
Write-Host @"

  ____  _          _       ____            _           _       
 | __ )(_)_ __ ___| |__   |  _ \ _ __ ___ (_) ___  ___| |_ ___ 
 |  _ \| | '__/ __| '_ \  | |_) | '__/ _ \| |/ _ \/ __| __/ __|
 | |_) | | | | (__| | | | |  __/| | | (_) | |  __/ (__| |_\__ \
 |____/|_|_|  \___|_| |_| |_|   |_|  \___// |\___|\___|\__|___/
                                        |__/                   
                    Bootstrap Script v1.0

"@ -ForegroundColor Magenta

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host "Root directory: $RootDir" -ForegroundColor Gray

# ============================================
# PHASE 1: Check Windows Version
# ============================================
Write-Step "Checking Windows version..."

$WinVer = [System.Environment]::OSVersion.Version
if ($WinVer.Major -lt 10) {
    Write-Fail "Windows 10 or later is required. You have Windows $($WinVer.Major).$($WinVer.Minor)"
    exit 1
}
Write-Success "Windows $($WinVer.Major).$($WinVer.Minor) detected"

# ============================================
# PHASE 2: Install Prerequisites
# ============================================
if (-not $SkipPrerequisites) {
    Write-Step "Checking winget availability..."
    
    $wingetPath = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $wingetPath) {
        Write-Fail "winget is not available. Please install App Installer from Microsoft Store."
        Write-Host "  https://apps.microsoft.com/store/detail/app-installer/9NBLGGH4NNS1" -ForegroundColor Gray
        exit 1
    }
    Write-Success "winget is available"

    # Function to check and install a package
    function Install-WingetPackage {
        param(
            [string]$PackageId,
            [string]$DisplayName,
            [string]$TestCommand,
            [string]$Override = ""
        )
        
        Write-Step "Checking $DisplayName..."
        
        $installed = $false
        if ($TestCommand) {
            try {
                $null = Invoke-Expression $TestCommand 2>$null
                $installed = $true
            } catch { }
        }
        
        if ($installed) {
            Write-Success "$DisplayName is already installed"
            return $true
        }
        
        Write-Warning "$DisplayName not found, installing..."
        
        $args = @("install", $PackageId, "--accept-source-agreements", "--accept-package-agreements", "-e")
        if ($Override) {
            $args += @("--override", $Override)
        }
        
        $process = Start-Process -FilePath "winget" -ArgumentList $args -Wait -PassThru -NoNewWindow
        
        if ($process.ExitCode -eq 0) {
            Write-Success "$DisplayName installed successfully"
            return $true
        } else {
            Write-Warning "$DisplayName installation returned code $($process.ExitCode) - may already be installed"
            return $true
        }
    }

    # Install Node.js
    Install-WingetPackage -PackageId "OpenJS.NodeJS.LTS" -DisplayName "Node.js LTS" -TestCommand "node --version"

    # Install pnpm
    Install-WingetPackage -PackageId "pnpm.pnpm" -DisplayName "pnpm" -TestCommand "pnpm --version"

    # Install Rust
    Install-WingetPackage -PackageId "Rustlang.Rustup" -DisplayName "Rust (rustup)" -TestCommand "rustc --version"

    # Install Git
    Install-WingetPackage -PackageId "Git.Git" -DisplayName "Git" -TestCommand "git --version"

    # Install Visual Studio Build Tools
    Write-Step "Checking Visual Studio Build Tools..."
    $vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    $hasBuildTools = $false
    if (Test-Path $vsWhere) {
        $vsInstalls = & $vsWhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
        if ($vsInstalls) {
            $hasBuildTools = $true
        }
    }
    
    if ($hasBuildTools) {
        Write-Success "Visual Studio Build Tools are installed"
    } else {
        Write-Warning "Visual Studio Build Tools not found, installing..."
        $override = "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
        Install-WingetPackage -PackageId "Microsoft.VisualStudio.2022.BuildTools" -DisplayName "VS Build Tools" -TestCommand "" -Override $override
    }

    # Refresh PATH
    Write-Step "Refreshing environment variables..."
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    # Add Rust to path if not present
    $cargoPath = "$env:USERPROFILE\.cargo\bin"
    if (Test-Path $cargoPath) {
        if ($env:Path -notlike "*$cargoPath*") {
            $env:Path = "$cargoPath;$env:Path"
        }
    }
    
    Write-Success "Environment refreshed"
}

# ============================================
# PHASE 3: Verify Installations
# ============================================
Write-Step "Verifying installations..."

$allGood = $true

try {
    $nodeVer = node --version
    Write-Success "Node.js $nodeVer"
} catch {
    Write-Fail "Node.js not found"
    $allGood = $false
}

try {
    $pnpmVer = pnpm --version
    Write-Success "pnpm $pnpmVer"
} catch {
    Write-Warning "pnpm not found - trying corepack..."
    try {
        corepack enable
        corepack prepare pnpm@latest --activate
        $pnpmVer = pnpm --version
        Write-Success "pnpm $pnpmVer (via corepack)"
    } catch {
        Write-Fail "pnpm not available"
        $allGood = $false
    }
}

try {
    $rustVer = rustc --version
    Write-Success "Rust: $rustVer"
} catch {
    Write-Fail "Rust not found"
    $allGood = $false
}

try {
    $gitVer = git --version
    Write-Success "Git: $gitVer"
} catch {
    Write-Fail "Git not found"
    $allGood = $false
}

if (-not $allGood) {
    Write-Host "`n" -NoNewline
    Write-Fail "Some prerequisites are missing. Please install them and run this script again."
    Write-Host "  You may need to close and reopen PowerShell after installing." -ForegroundColor Gray
    exit 1
}

# ============================================
# PHASE 4: Install Dependencies
# ============================================
Write-Step "Installing dependencies..."

# Birch Dev
$birchDevPath = Join-Path $RootDir "Birch Dev"
if (Test-Path $birchDevPath) {
    Write-Host "  Installing Birch Dev dependencies..." -ForegroundColor Gray
    Push-Location $birchDevPath
    npm install --legacy-peer-deps 2>&1 | Out-Null
    Pop-Location
    Write-Success "Birch Dev dependencies installed"
} else {
    Write-Warning "Birch Dev folder not found at $birchDevPath"
}

# Birch Host
$birchHostPath = Join-Path $RootDir "Birch Host"
if (Test-Path $birchHostPath) {
    Write-Host "  Installing Birch Host dependencies..." -ForegroundColor Gray
    Push-Location $birchHostPath
    npm install --legacy-peer-deps 2>&1 | Out-Null
    Pop-Location
    Write-Success "Birch Host dependencies installed"
} else {
    Write-Warning "Birch Host folder not found at $birchHostPath"
}

# Birch Launcher
$birchLauncherPath = Join-Path $RootDir "Birch Launcher"
if (Test-Path $birchLauncherPath) {
    Write-Host "  Installing Birch Launcher dependencies..." -ForegroundColor Gray
    Push-Location $birchLauncherPath
    npm install --legacy-peer-deps 2>&1 | Out-Null
    Pop-Location
    Write-Success "Birch Launcher dependencies installed"
} else {
    Write-Warning "Birch Launcher folder not found at $birchLauncherPath"
}

# Birch Vault
$birchVaultPath = Join-Path $RootDir "Birch Vault"
if (Test-Path $birchVaultPath) {
    Write-Host "  Installing Birch Vault dependencies (pnpm)..." -ForegroundColor Gray
    Push-Location $birchVaultPath
    pnpm install 2>&1 | Out-Null
    Pop-Location
    Write-Success "Birch Vault dependencies installed"
} else {
    Write-Warning "Birch Vault folder not found at $birchVaultPath"
}

# ============================================
# PHASE 5: Build Applications
# ============================================
if (-not $SkipBuild) {
    Write-Step "Building applications (this may take a while)..."

    # Birch Dev
    if (Test-Path $birchDevPath) {
        Write-Host "  Building Birch Dev..." -ForegroundColor Gray
        Push-Location $birchDevPath
        try {
            npm run tauri:build 2>&1 | Out-Null
            Write-Success "Birch Dev built"
        } catch {
            Write-Warning "Birch Dev build failed - you can build it later with 'npm run tauri:build'"
        }
        Pop-Location
    }

    # Birch Host
    if (Test-Path $birchHostPath) {
        Write-Host "  Building Birch Host..." -ForegroundColor Gray
        Push-Location $birchHostPath
        try {
            npm run tauri:build 2>&1 | Out-Null
            Write-Success "Birch Host built"
        } catch {
            Write-Warning "Birch Host build failed - you can build it later with 'npm run tauri:build'"
        }
        Pop-Location
    }

    # Birch Launcher
    if (Test-Path $birchLauncherPath) {
        Write-Host "  Building Birch Launcher..." -ForegroundColor Gray
        Push-Location $birchLauncherPath
        try {
            npm run tauri:build 2>&1 | Out-Null
            Write-Success "Birch Launcher built"
        } catch {
            Write-Warning "Birch Launcher build failed - you can build it later with 'npm run tauri:build'"
        }
        Pop-Location
    }

    # Birch Vault
    if (Test-Path $birchVaultPath) {
        Write-Host "  Building Birch Vault..." -ForegroundColor Gray
        Push-Location $birchVaultPath
        try {
            pnpm build 2>&1 | Out-Null
            Write-Success "Birch Vault built"
        } catch {
            Write-Warning "Birch Vault build failed - you can build it later with 'pnpm build'"
        }
        Pop-Location
    }
}

# ============================================
# PHASE 6: Install Birch Host Service
# ============================================
if (-not $SkipService) {
    Write-Step "Setting up Birch Host background service..."
    
    $serviceScript = Join-Path $birchHostPath "scripts\install-service.ps1"
    if (Test-Path $serviceScript) {
        Write-Host "  Running service installer..." -ForegroundColor Gray
        & $serviceScript
    } else {
        Write-Warning "Service installer not found at $serviceScript"
        Write-Host "  The background service will be available after implementation." -ForegroundColor Gray
    }
}

# ============================================
# PHASE 7: Launch Birch Launcher
# ============================================
Write-Step "Setup complete!"

$launcherExe = Join-Path $birchLauncherPath "src-tauri\target\release\birch-launcher.exe"

Write-Host @"

  Setup completed successfully!
  
  Next steps:
  1. Launch Birch Launcher to complete first-time setup
  2. Enter your Supabase credentials when prompted
  3. Log in with your email/password
  4. Set up your master password and PIN

"@ -ForegroundColor Green

if (Test-Path $launcherExe) {
    $response = Read-Host "Would you like to launch Birch Launcher now? (Y/n)"
    if ($response -ne "n" -and $response -ne "N") {
        Write-Host "  Launching Birch Launcher..." -ForegroundColor Cyan
        Start-Process $launcherExe
    }
} else {
    Write-Host "  Birch Launcher executable not found at:" -ForegroundColor Yellow
    Write-Host "  $launcherExe" -ForegroundColor Gray
    Write-Host "  Build it first with: cd 'Birch Launcher' && npm run tauri:build" -ForegroundColor Gray
}

Write-Host "`nThank you for using Birch Projects!" -ForegroundColor Magenta




