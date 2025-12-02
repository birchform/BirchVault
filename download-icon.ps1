# Download a valid placeholder icon for Tauri build
$iconsDir = "C:\Birch Vault\apps\desktop\src-tauri\icons"

# Ensure directory exists
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null
}

# Download Tauri default icon (a placeholder)
$iconUrl = "https://raw.githubusercontent.com/nicholassm/tauri-vite-template/refs/heads/main/src-tauri/icons/icon.ico"
$outputPath = "$iconsDir\icon.ico"

try {
    Write-Host "Downloading icon..."
    Invoke-WebRequest -Uri $iconUrl -OutFile $outputPath -UseBasicParsing
    Write-Host "Icon downloaded successfully!"
    
    $size = (Get-Item $outputPath).Length
    Write-Host "File size: $size bytes"
} catch {
    Write-Host "Download failed: $_"
    Write-Host ""
    Write-Host "Alternative: Please manually download an icon:"
    Write-Host "1. Get any 256x256 or larger PNG image"
    Write-Host "2. Run: npx tauri icon <your-image.png>"
}




