// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod sync;

use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Read;
use std::path::Path;
use std::process::Command;

#[cfg(target_os = "windows")]
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
#[cfg(target_os = "windows")]
use image::ImageFormat;
#[cfg(target_os = "windows")]
use std::io::Cursor;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AppStatus {
    Installed,
    InstallerAvailable,
    DevBuild,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub display_name: String,
    pub path: String,
    pub size: u64,
    pub icon_color: String,
    pub status: AppStatus,
    pub installer_path: Option<String>,
    pub update_available: bool,
}

// Known Birch apps with their identifiers
const KNOWN_APPS: &[(&str, &str, &str)] = &[
    ("birch-dev", "Birch Dev", "#10b981"),
    ("birch-host", "Birch Host", "#6366f1"),
    ("birchvault-desktop", "BirchVault", "#8b5cf6"),
    ("birch-launcher", "Birch Launcher", "#f59e0b"),
    ("birchvault", "BirchVault", "#8b5cf6"),
];

fn get_display_name(file_name: &str) -> String {
    let lower = file_name.to_lowercase();
    
    // Check known apps first
    for (id, display, _) in KNOWN_APPS {
        if lower == *id || lower.contains(id) {
            return display.to_string();
        }
    }
    
    // Convert kebab-case to Title Case
    file_name
        .split('-')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().chain(chars).collect(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn get_icon_color(file_name: &str) -> String {
    let lower = file_name.to_lowercase();
    
    for (id, _, color) in KNOWN_APPS {
        if lower == *id || lower.contains(id) {
            return color.to_string();
        }
    }
    
    "#f59e0b".to_string() // Amber (default)
}

fn is_birch_launcher(file_name: &str) -> bool {
    let lower = file_name.to_lowercase();
    lower == "birch launcher"
        || lower == "birch-launcher"
        || lower == "birchlauncher"
}

fn get_app_id(file_name: &str) -> String {
    // Normalize: replace spaces and underscores with hyphens, lowercase
    let normalized = file_name
        .to_lowercase()
        .replace(' ', "-")
        .replace('_', "-");
    
    // Check known apps
    for (id, _, _) in KNOWN_APPS {
        // Match if the normalized name contains the app id
        // or if the app id with spaces/underscores matches
        let id_with_spaces = id.replace('-', " ");
        let id_with_underscores = id.replace('-', "_");
        
        if normalized.contains(id) 
            || file_name.to_lowercase().contains(&id_with_spaces)
            || file_name.to_lowercase().contains(&id_with_underscores)
            || file_name.to_lowercase().contains(id) {
            return id.to_string();
        }
    }
    
    // Return normalized name as fallback
    normalized
}

/// Compute SHA256 hash of a file (first 1MB only for speed)
fn compute_file_hash(path: &Path) -> Option<String> {
    let mut file = File::open(path).ok()?;
    let mut hasher = Sha256::new();
    
    // Read first 1MB for speed (enough to detect differences)
    let mut buffer = vec![0u8; 1024 * 1024];
    let bytes_read = file.read(&mut buffer).ok()?;
    hasher.update(&buffer[..bytes_read]);
    
    // Also include file size in hash to catch size-only differences
    let size = fs::metadata(path).ok()?.len();
    hasher.update(size.to_le_bytes());
    
    let hash = hasher.finalize();
    Some(format!("{:x}", hash))
}

// Check standard installation directories for installed apps
fn find_installed_apps() -> HashMap<String, (AppInfo, String)> {
    let mut installed: HashMap<String, (AppInfo, String)> = HashMap::new();
    
    // Common installation paths on Windows
    let install_dirs = [
        std::env::var("ProgramFiles").unwrap_or_default(),
        std::env::var("ProgramFiles(x86)").unwrap_or_default(),
        std::env::var("LOCALAPPDATA").unwrap_or_default(),
        format!("{}\\Programs", std::env::var("LOCALAPPDATA").unwrap_or_default()),
    ];
    
    for base_dir in install_dirs.iter().filter(|d| !d.is_empty()) {
        let base_path = Path::new(base_dir);
        if !base_path.exists() {
            continue;
        }
        
        // Look for Birch app folders
        if let Ok(entries) = fs::read_dir(base_path) {
            for entry in entries.flatten() {
                let dir_name = entry.file_name().to_string_lossy().to_lowercase();
                
                // Check if this might be a Birch app folder
                if dir_name.contains("birch") {
                    let app_dir = entry.path();
                    
                    // Look for .exe in this folder
                    if let Ok(files) = fs::read_dir(&app_dir) {
                        for file in files.flatten() {
                            let file_path = file.path();
                            if let Some(ext) = file_path.extension() {
                                if ext.to_string_lossy().to_lowercase() == "exe" {
                                    let file_name = file_path
                                        .file_stem()
                                        .map(|s| s.to_string_lossy().to_string())
                                        .unwrap_or_default();
                                    
                                    if is_birch_launcher(&file_name) {
                                        continue;
                                    }
                                    
                                    let size = file.metadata().map(|m| m.len()).unwrap_or(0);
                                    if size < 1_000_000 {
                                        continue;
                                    }
                                    
                                    let app_id = get_app_id(&file_name);
                                    let full_path = file_path.to_string_lossy().to_string();
                                    let file_hash = compute_file_hash(&file_path).unwrap_or_default();
                                    
                                    installed.insert(app_id.clone(), (AppInfo {
                                        display_name: get_display_name(&file_name),
                                        icon_color: get_icon_color(&file_name),
                                        name: file_name,
                                        path: full_path,
                                        size,
                                        status: AppStatus::Installed,
                                        installer_path: None,
                                        update_available: false,
                                    }, file_hash));
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    installed
}

// Find installers in the project folder
fn find_installers(base_path: &Path, installers: &mut HashMap<String, String>, depth: usize) {
    if depth > 10 {
        return;
    }
    
    let entries = match fs::read_dir(base_path) {
        Ok(e) => e,
        Err(_) => return,
    };
    
    for entry in entries.flatten() {
        let entry_path = entry.path();
        
        if entry_path.is_dir() {
            let dir_name = entry_path
                .file_name()
                .map(|s| s.to_string_lossy().to_lowercase())
                .unwrap_or_default();
            
            // Only recurse into relevant directories
            if dir_name == "node_modules"
                || dir_name == ".git"
                || dir_name == "deps"
                || dir_name == "debug"
                || dir_name == ".cargo"
            {
                continue;
            }
            
            // Specifically look in bundle/nsis folders
            if dir_name == "bundle" || dir_name == "nsis" || dir_name == "release" 
                || dir_name == "target" || dir_name == "src-tauri" 
                || dir_name.starts_with("birch") {
                find_installers(&entry_path, installers, depth + 1);
            }
        } else if let Some(ext) = entry_path.extension() {
            if ext.to_string_lossy().to_lowercase() == "exe" {
                let file_name = entry_path
                    .file_stem()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default();
                
                let lower = file_name.to_lowercase();
                
                // Look for setup/installer files
                if lower.contains("setup") || lower.contains("install") {
                    // Skip Birch Launcher installer
                    if lower.contains("launcher") {
                        continue;
                    }
                    
                    let app_id = get_app_id(&file_name);
                    let full_path = entry_path.to_string_lossy().to_string();
                    
                    installers.insert(app_id, full_path);
                }
            }
        }
    }
}

/// Dev build info: (path, size, hash)
type DevBuildInfo = (String, u64, String);

// Find dev builds (release exes) in the project folder
fn find_dev_builds(base_path: &Path, builds: &mut HashMap<String, DevBuildInfo>, depth: usize) {
    if depth > 12 {
        return;
    }
    
    let entries = match fs::read_dir(base_path) {
        Ok(e) => e,
        Err(_) => return,
    };
    
    for entry in entries.flatten() {
        let entry_path = entry.path();
        
        if entry_path.is_dir() {
            let dir_name = entry_path
                .file_name()
                .map(|s| s.to_string_lossy().to_lowercase())
                .unwrap_or_default();
            
            // Skip non-relevant directories
            if dir_name == "node_modules"
                || dir_name == ".git"
                || dir_name == "deps"
                || dir_name == "build"
                || dir_name == "incremental"
                || dir_name == ".fingerprint"
                || dir_name == "bundle"
                || dir_name == "debug"
                || dir_name == ".cargo"
            {
                continue;
            }
            
            find_dev_builds(&entry_path, builds, depth + 1);
        } else if let Some(ext) = entry_path.extension() {
            if ext.to_string_lossy().to_lowercase() == "exe" {
                let file_name = entry_path
                    .file_stem()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default();
                
                let lower = file_name.to_lowercase();
                let path_str = entry_path.to_string_lossy().to_lowercase();
                
                // Skip installers, launchers, and non-release builds
                if lower.contains("setup") || lower.contains("install") || is_birch_launcher(&file_name) {
                    continue;
                }
                
                // Only include release builds
                if !path_str.contains("target\\release\\") && !path_str.contains("target/release/") {
                    continue;
                }
                
                // Must be directly in release folder, not a subdirectory
                let release_idx = path_str.find("target\\release\\")
                    .or_else(|| path_str.find("target/release/"));
                
                if let Some(idx) = release_idx {
                    let after_release = &path_str[idx + 15..];
                    if after_release.contains('\\') || after_release.contains('/') {
                        continue;
                    }
                }
                
                let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                if size < 1_000_000 {
                    continue;
                }
                
                let app_id = get_app_id(&file_name);
                let full_path = entry_path.to_string_lossy().to_string();
                let file_hash = compute_file_hash(&entry_path).unwrap_or_default();
                
                builds.insert(app_id, (full_path, size, file_hash));
            }
        }
    }
}

#[tauri::command]
fn scan_folder(path: String) -> Result<Vec<AppInfo>, String> {
    let folder_path = Path::new(&path);

    if !folder_path.exists() {
        return Err("Folder does not exist".to_string());
    }

    if !folder_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let mut apps: Vec<AppInfo> = Vec::new();
    let mut found_app_ids: HashMap<String, bool> = HashMap::new();

    // 1. Find installed apps
    let installed = find_installed_apps();

    // 2. Find installers in the project folder
    let mut installers: HashMap<String, String> = HashMap::new();
    find_installers(folder_path, &mut installers, 0);

    // 3. Find dev builds
    let mut dev_builds: HashMap<String, DevBuildInfo> = HashMap::new();
    find_dev_builds(folder_path, &mut dev_builds, 0);

    // 4. Process installed apps - check for updates using hash comparison
    for (app_id, (mut app, installed_hash)) in installed {
        found_app_ids.insert(app_id.clone(), true);
        
        // Check if dev build has different hash (= update available)
        if let Some((_, _, dev_hash)) = dev_builds.get(&app_id) {
            if !installed_hash.is_empty() && !dev_hash.is_empty() && dev_hash != &installed_hash {
                // Hashes differ - update available!
                app.update_available = true;
                
                // Set installer path if we have one
                if let Some(installer) = installers.get(&app_id) {
                    app.installer_path = Some(installer.clone());
                }
            }
        }
        
        apps.push(app);
    }

    // 5. For apps not installed, check if we have an installer
    for (app_id, installer_path) in &installers {
        if found_app_ids.contains_key(app_id) {
            continue; // Already processed
        }
        
        // Check if we have a dev build to get metadata from
        if let Some((dev_path, size, _)) = dev_builds.get(app_id) {
            let file_name = Path::new(dev_path)
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default();
            
            found_app_ids.insert(app_id.clone(), true);
            apps.push(AppInfo {
                display_name: get_display_name(&file_name),
                icon_color: get_icon_color(&file_name),
                name: file_name,
                path: dev_path.clone(),
                size: *size,
                status: AppStatus::InstallerAvailable,
                installer_path: Some(installer_path.clone()),
                update_available: false,
            });
        } else {
            // Only have installer, no dev build
            let file_name = app_id.clone();
            found_app_ids.insert(app_id.clone(), true);
            apps.push(AppInfo {
                display_name: get_display_name(&file_name),
                icon_color: get_icon_color(&file_name),
                name: file_name.clone(),
                path: String::new(),
                size: 0,
                status: AppStatus::InstallerAvailable,
                installer_path: Some(installer_path.clone()),
                update_available: false,
            });
        }
    }

    // 6. Add remaining dev builds (no installer, not installed)
    for (app_id, (dev_path, size, _)) in &dev_builds {
        if found_app_ids.contains_key(app_id) {
            continue;
        }
        
        let file_name = Path::new(dev_path)
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        
        apps.push(AppInfo {
            display_name: get_display_name(&file_name),
            icon_color: get_icon_color(&file_name),
            name: file_name,
            path: dev_path.clone(),
            size: *size,
            status: AppStatus::DevBuild,
            installer_path: None,
            update_available: false,
        });
    }

    // Sort by display name
    apps.sort_by(|a, b| a.display_name.to_lowercase().cmp(&b.display_name.to_lowercase()));

    Ok(apps)
}

#[tauri::command]
fn launch_app(path: String) -> Result<(), String> {
    let app_path = Path::new(&path);
    
    if !app_path.exists() {
        return Err("Application not found".to_string());
    }
    
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        
        // DETACHED_PROCESS detaches from parent console without hiding GUI windows
        const DETACHED_PROCESS: u32 = 0x00000008;
        
        // Get the directory containing the exe to use as working directory
        let working_dir = app_path.parent().unwrap_or(Path::new("."));
        
        Command::new(&path)
            .current_dir(working_dir)
            .creation_flags(DETACHED_PROCESS)
            .spawn()
            .map_err(|e| format!("Failed to launch application: {}", e))?;
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        let working_dir = app_path.parent().unwrap_or(Path::new("."));
        
        Command::new(&path)
            .current_dir(working_dir)
            .spawn()
            .map_err(|e| format!("Failed to launch application: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
fn run_installer(path: String) -> Result<(), String> {
    let installer_path = Path::new(&path);
    
    if !installer_path.exists() {
        return Err("Installer not found".to_string());
    }
    
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x00000008;
        
        let working_dir = installer_path.parent().unwrap_or(Path::new("."));
        
        // Try to find MSI installer (supports passive mode with progress bar)
        let msi_path = path
            .replace("_x64-setup.exe", "_x64_en-US.msi")
            .replace("-setup.exe", "_en-US.msi");
        
        if Path::new(&msi_path).exists() {
            // Use MSI with /passive (shows progress, no interaction required)
            Command::new("msiexec")
                .args(["/i", &msi_path, "/passive", "/norestart"])
                .current_dir(working_dir)
                .creation_flags(DETACHED_PROCESS)
                .spawn()
                .map_err(|e| format!("Failed to run MSI installer: {}", e))?;
        } else {
            // Fall back to NSIS installer with /S (silent mode)
            Command::new(&path)
                .arg("/S")
                .current_dir(working_dir)
                .creation_flags(DETACHED_PROCESS)
                .spawn()
                .map_err(|e| format!("Failed to run installer: {}", e))?;
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        let working_dir = installer_path.parent().unwrap_or(Path::new("."));
        
        Command::new(&path)
            .current_dir(working_dir)
            .spawn()
            .map_err(|e| format!("Failed to run installer: {}", e))?;
    }
    
    Ok(())
}

/// Extract icon from an exe file and return as base64 PNG
#[tauri::command]
fn extract_icon(exe_path: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::Shell::ExtractIconExW;
        use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, GetIconInfo, ICONINFO};
        use windows::Win32::Graphics::Gdi::{
            CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits, SelectObject,
            BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
        };
        use windows::core::PCWSTR;
        
        let wide_path: Vec<u16> = exe_path.encode_utf16().chain(std::iter::once(0)).collect();
        let mut large_icon = [windows::Win32::UI::WindowsAndMessaging::HICON::default()];
        
        unsafe {
            let count = ExtractIconExW(
                PCWSTR(wide_path.as_ptr()),
                0,
                Some(large_icon.as_mut_ptr()),
                None,
                1,
            );
            
            if count == 0 || large_icon[0].is_invalid() {
                return Err("No icon found".to_string());
            }
            
            let hicon = large_icon[0];
            
            // Get icon info
            let mut icon_info = ICONINFO::default();
            if GetIconInfo(hicon, &mut icon_info).is_err() {
                DestroyIcon(hicon).ok();
                return Err("Failed to get icon info".to_string());
            }
            
            // Get bitmap dimensions
            let hdc = CreateCompatibleDC(None);
            if hdc.is_invalid() {
                DestroyIcon(hicon).ok();
                return Err("Failed to create DC".to_string());
            }
            
            let hbm = icon_info.hbmColor;
            if hbm.is_invalid() {
                DeleteDC(hdc).ok();
                DestroyIcon(hicon).ok();
                return Err("Invalid bitmap".to_string());
            }
            
            // Setup bitmap info
            let mut bmi = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: 48,
                    biHeight: -48, // Top-down
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB.0,
                    ..Default::default()
                },
                ..Default::default()
            };
            
            let mut pixels: Vec<u8> = vec![0; (48 * 48 * 4) as usize];
            
            let _old = SelectObject(hdc, hbm);
            let result = GetDIBits(
                hdc,
                hbm,
                0,
                48,
                Some(pixels.as_mut_ptr() as *mut _),
                &mut bmi,
                DIB_RGB_COLORS,
            );
            
            // Cleanup
            DeleteObject(icon_info.hbmColor).ok();
            if !icon_info.hbmMask.is_invalid() {
                DeleteObject(icon_info.hbmMask).ok();
            }
            DeleteDC(hdc).ok();
            DestroyIcon(hicon).ok();
            
            if result == 0 {
                return Err("Failed to get bitmap bits".to_string());
            }
            
            // Convert BGRA to RGBA
            for chunk in pixels.chunks_exact_mut(4) {
                chunk.swap(0, 2); // Swap B and R
            }
            
            // Create PNG
            let img = image::RgbaImage::from_raw(48, 48, pixels)
                .ok_or("Failed to create image")?;
            
            let mut png_data = Cursor::new(Vec::new());
            img.write_to(&mut png_data, ImageFormat::Png)
                .map_err(|e| format!("Failed to encode PNG: {}", e))?;
            
            let base64_str = BASE64.encode(png_data.into_inner());
            Ok(format!("data:image/png;base64,{}", base64_str))
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Err("Icon extraction not supported on this platform".to_string())
    }
}

#[tauri::command]
fn get_file_size_formatted(size: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    
    if size >= GB {
        format!("{:.1} GB", size as f64 / GB as f64)
    } else if size >= MB {
        format!("{:.1} MB", size as f64 / MB as f64)
    } else if size >= KB {
        format!("{:.1} KB", size as f64 / KB as f64)
    } else {
        format!("{} B", size)
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            scan_folder,
            launch_app,
            run_installer,
            get_file_size_formatted,
            extract_icon,
            // Sync commands
            sync::get_machine_id,
            sync::get_hostname,
            sync::get_supabase_config,
            sync::set_supabase_config,
            sync::show_input_dialog,
            sync::show_message_dialog,
            sync::generate_salt,
            sync::derive_key_from_pin,
            sync::derive_key_from_master_password,
            sync::generate_symmetric_key,
            sync::encrypt_data,
            sync::decrypt_data,
        ])
        .setup(|_app| {
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

