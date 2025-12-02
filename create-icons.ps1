# Create icons for Tauri
$ErrorActionPreference = "Stop"
$iconsDir = "C:\Birch Vault\apps\desktop\src-tauri\icons"

Write-Host "Creating icons directory at: $iconsDir"

# Force create directory
if (Test-Path $iconsDir) { 
    Remove-Item $iconsDir -Recurse -Force 
    Write-Host "Removed existing directory"
}
New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null
Write-Host "Created directory"

# Create a valid 32x32 ICO file
$base64Ico = "AAABAAEAICAAAAEAIACoEAAAFgAAACgAAAAgAAAAQAAAAAEAIAAAAAAAABAAABMLAAATCwAAAAAAAAAAAAD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wAiyV7/Islf/yLJX/8iyV//Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/////////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/////////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX//////////////////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX//////////////////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/////////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX//////////////////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf//////////////////yLJX/8iyV//Islf/////////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX//////////////////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf//////////////////yLJX/8iyV//Islf/////////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/////////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV///////yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/////////yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV//Islf/yLJX/8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJXv8iyV7/Isle/yLJX/////8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
$bytes = [System.Convert]::FromBase64String($base64Ico)
[System.IO.File]::WriteAllBytes("$iconsDir\icon.ico", $bytes)
Write-Host "Wrote icon.ico"

# Verify
if (Test-Path "$iconsDir\icon.ico") {
    $size = (Get-Item "$iconsDir\icon.ico").Length
    Write-Host "SUCCESS: icon.ico created ($size bytes)"
} else {
    Write-Host "FAILED: icon.ico was not created"
    exit 1
}

# List contents
Write-Host ""
Write-Host "Contents of icons directory:"
Get-ChildItem $iconsDir | Format-Table Name, Length

