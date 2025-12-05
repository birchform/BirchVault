#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Birch Host Service Installer
.DESCRIPTION
    Installs or uninstalls the Birch Host background service for remote runner control.
.PARAMETER Action
    install - Install and start the service
    uninstall - Stop and remove the service
    status - Check service status
.EXAMPLE
    .\install-service.ps1 -Action install
#>

param(
    [ValidateSet('install', 'uninstall', 'status', 'restart')]
    [string]$Action = 'install'
)

$ErrorActionPreference = "Stop"

$ServiceName = "BirchHostService"
$ServiceDisplayName = "Birch Host Runner Service"
$ServiceDescription = "Background service for remote GitHub Actions runner control"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$ServiceExe = Join-Path $RootDir "src-service\target\release\birch-host-service.exe"

function Write-Status { param($msg) Write-Host "  $msg" -ForegroundColor Gray }
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "[X] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "[i] $msg" -ForegroundColor Cyan }

Write-Host "`n  Birch Host Service Manager`n" -ForegroundColor Magenta

switch ($Action) {
    'install' {
        Write-Info "Installing $ServiceDisplayName..."
        
        # Check if executable exists
        if (-not (Test-Path $ServiceExe)) {
            Write-Fail "Service executable not found at: $ServiceExe"
            Write-Status "Please build the service first:"
            Write-Host "  cd `"$RootDir\src-service`"" -ForegroundColor Yellow
            Write-Host "  cargo build --release" -ForegroundColor Yellow
            exit 1
        }

        # Check if service already exists
        $existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($existingService) {
            Write-Status "Service already exists, stopping..."
            Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
            
            Write-Status "Removing existing service..."
            sc.exe delete $ServiceName | Out-Null
            Start-Sleep -Seconds 2
        }

        # Create the service
        Write-Status "Creating Windows service..."
        $params = @{
            Name = $ServiceName
            BinaryPathName = $ServiceExe
            DisplayName = $ServiceDisplayName
            Description = $ServiceDescription
            StartupType = "Automatic"
        }
        
        New-Service @params | Out-Null

        # Configure recovery options (restart on failure)
        Write-Status "Configuring recovery options..."
        sc.exe failure $ServiceName reset= 86400 actions= restart/60000/restart/60000/restart/60000 | Out-Null

        # Start the service
        Write-Status "Starting service..."
        Start-Service -Name $ServiceName

        # Verify
        $service = Get-Service -Name $ServiceName
        if ($service.Status -eq 'Running') {
            Write-Success "$ServiceDisplayName installed and running"
        } else {
            Write-Fail "Service installed but not running. Status: $($service.Status)"
            Write-Status "Check Windows Event Viewer for errors"
        }
    }

    'uninstall' {
        Write-Info "Uninstalling $ServiceDisplayName..."

        $existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if (-not $existingService) {
            Write-Status "Service is not installed"
            exit 0
        }

        # Stop the service
        Write-Status "Stopping service..."
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2

        # Remove the service
        Write-Status "Removing service..."
        sc.exe delete $ServiceName | Out-Null

        Write-Success "$ServiceDisplayName uninstalled"
    }

    'status' {
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if (-not $service) {
            Write-Info "Service is not installed"
        } else {
            Write-Info "Service Status: $($service.Status)"
            Write-Status "Startup Type: $($service.StartType)"
            
            if ($service.Status -eq 'Running') {
                # Get process info
                $process = Get-Process -Name "birch-host-service" -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Status "PID: $($process.Id)"
                    Write-Status "Memory: $([math]::Round($process.WorkingSet64 / 1MB, 2)) MB"
                    Write-Status "CPU Time: $($process.TotalProcessorTime)"
                }
            }
        }
    }

    'restart' {
        Write-Info "Restarting $ServiceDisplayName..."
        
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if (-not $service) {
            Write-Fail "Service is not installed"
            exit 1
        }

        Restart-Service -Name $ServiceName -Force

        $service = Get-Service -Name $ServiceName
        if ($service.Status -eq 'Running') {
            Write-Success "Service restarted"
        } else {
            Write-Fail "Service failed to restart. Status: $($service.Status)"
        }
    }
}

Write-Host ""




