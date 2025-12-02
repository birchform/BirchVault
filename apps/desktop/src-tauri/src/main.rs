// ============================================
// BirchVault Desktop - Main Entry Point
// ============================================

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod error;
mod sync;

use commands::AppState;
use db::Database;
use sync::SupabaseConfig;
use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

fn main() {
    // Initialize logging
    env_logger::init();

    tauri::Builder::default()
        // Plugins
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        // Setup
        .setup(|app| {
            // Get app data directory for database
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            let db_path = app_data_dir.join("vault.db");

            // Initialize database
            let db = Arc::new(
                Database::new(db_path).expect("Failed to initialize database"),
            );

            // Supabase configuration (loaded from environment or config)
            let config = SupabaseConfig {
                url: std::env::var("SUPABASE_URL")
                    .unwrap_or_else(|_| "https://your-project.supabase.co".to_string()),
                anon_key: std::env::var("SUPABASE_ANON_KEY")
                    .unwrap_or_else(|_| "your-anon-key".to_string()),
            };

            // Create app state
            let state = AppState::new(db, config);
            app.manage(state);

            // Setup system tray
            setup_tray(app)?;

            Ok(())
        })
        // Register commands
        .invoke_handler(tauri::generate_handler![
            // Auth commands
            commands::login,
            commands::logout,
            commands::unlock_vault,
            commands::lock_vault,
            commands::is_vault_locked,
            commands::get_session,
            commands::has_stored_session,
            // Vault items commands
            commands::get_vault_items,
            commands::get_trashed_items,
            commands::get_vault_item,
            commands::create_vault_item,
            commands::update_vault_item,
            commands::delete_vault_item,
            commands::restore_vault_item,
            commands::permanently_delete_vault_item,
            // Folders commands
            commands::get_folders,
            commands::create_folder,
            commands::update_folder,
            commands::delete_folder,
            // Sync commands
            commands::sync_vault,
            commands::get_sync_status,
            commands::check_connectivity,
            // Settings commands
            commands::get_settings,
            commands::save_settings,
            // Clipboard commands
            commands::copy_to_clipboard,
            commands::clear_clipboard,
            // Utility commands
            commands::generate_uuid,
            commands::get_current_timestamp,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Create tray menu items
    let lock_item = MenuItem::with_id(app, "lock", "Lock Vault", true, None::<&str>)?;
    let sync_item = MenuItem::with_id(app, "sync", "Sync Now", true, None::<&str>)?;
    let separator = MenuItem::with_id(app, "sep", "─────────", false, None::<&str>)?;
    let show_item = MenuItem::with_id(app, "show", "Show BirchVault", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    // Build menu
    let menu = Menu::with_items(
        app,
        &[&lock_item, &sync_item, &separator, &show_item, &quit_item],
    )?;

    // Create tray icon
    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("BirchVault")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "lock" => {
                // Emit lock event to frontend
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("tray-lock", ());
                }
            }
            "sync" => {
                // Emit sync event to frontend
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("tray-sync", ());
                }
            }
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            use tauri::tray::TrayIconEvent;
            if let TrayIconEvent::Click { .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
