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
use tauri::Manager;

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
        .plugin(tauri_plugin_updater::Builder::new().build())
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

            // Supabase configuration
            let config = SupabaseConfig {
                url: std::env::var("SUPABASE_URL")
                    .unwrap_or_else(|_| "https://lbkumiynfiolodygvvnq.supabase.co".to_string()),
                anon_key: std::env::var("SUPABASE_ANON_KEY")
                    .unwrap_or_else(|_| "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxia3VtaXluZmlvbG9keWd2dm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTk0NzcsImV4cCI6MjA2OTk5NTQ3N30.Wm_VrmiVcrb-Xnn5wmbmy8mDEzRS6nxQ2QoXJHXbixE".to_string()),
            };

            // Create app state
            let state = AppState::new(db, config);
            app.manage(state);

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
