// ============================================
// BirchVault Desktop - Tauri Commands
// ============================================

use crate::db::{AppSettings, Database, Folder, UserSession, VaultItem};
use crate::error::{AppError, Result};
use crate::sync::{SupabaseConfig, SyncEngine, SyncStatus};
use chrono::Utc;
use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;
use uuid::Uuid;

// ============================================
// App State
// ============================================

pub struct AppState {
    pub db: Arc<Database>,
    pub sync_engine: Arc<SyncEngine>,
    pub is_locked: Arc<RwLock<bool>>,
    pub master_key_hash: Arc<RwLock<Option<String>>>,
}

impl AppState {
    pub fn new(db: Arc<Database>, config: SupabaseConfig) -> Self {
        let sync_engine = Arc::new(SyncEngine::new(db.clone(), config));
        Self {
            db,
            sync_engine,
            is_locked: Arc::new(RwLock::new(true)),
            master_key_hash: Arc::new(RwLock::new(None)),
        }
    }
}

// ============================================
// Request/Response Types
// ============================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub email: String,
    pub password_hash: String,
    pub master_key_hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub user_id: String,
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVaultItemRequest {
    pub encrypted_data: String,
    pub item_type: String,
    pub folder_id: Option<String>,
    pub is_favorite: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVaultItemRequest {
    pub id: String,
    pub encrypted_data: String,
    pub item_type: String,
    pub folder_id: Option<String>,
    pub is_favorite: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFolderRequest {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFolderRequest {
    pub id: String,
    pub name: String,
}

// ============================================
// Authentication Commands
// ============================================

#[tauri::command]
pub async fn login(
    state: State<'_, AppState>,
    request: LoginRequest,
) -> std::result::Result<LoginResponse, String> {
    let result: Result<LoginResponse> = async {
        // Authenticate with Supabase
        let session = state
            .sync_engine
            .authenticate(&request.email, &request.password_hash)
            .await?;

        // Save session to database
        state.db.save_session(&session)?;

        // Store master key hash in keyring for biometric unlock later
        if let Ok(entry) = Entry::new("birchvault", &request.email) {
            let _ = entry.set_password(&request.master_key_hash);
        }

        // Store master key hash in memory
        {
            let mut key_hash = state.master_key_hash.write().await;
            *key_hash = Some(request.master_key_hash);
        }

        // Unlock the vault
        {
            let mut locked = state.is_locked.write().await;
            *locked = false;
        }

        // Perform initial sync
        state.sync_engine.initial_sync(&session).await?;

        Ok(LoginResponse {
            user_id: session.user_id,
            email: session.email,
        })
    }
    .await;

    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn logout(state: State<'_, AppState>) -> std::result::Result<(), String> {
    let result: Result<()> = async {
        // Lock the vault
        {
            let mut locked = state.is_locked.write().await;
            *locked = true;
        }

        // Clear master key hash
        {
            let mut key_hash = state.master_key_hash.write().await;
            *key_hash = None;
        }

        // Clear all local data
        state.sync_engine.logout().await?;

        Ok(())
    }
    .await;

    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn unlock_vault(
    state: State<'_, AppState>,
    master_key_hash: String,
) -> std::result::Result<LoginResponse, String> {
    let result: Result<LoginResponse> = async {
        let session = state
            .db
            .get_session()?
            .ok_or(AppError::Auth("No session found".to_string()))?;

        // Verify master key hash matches stored hash
        if let Ok(entry) = Entry::new("birchvault", &session.email) {
            if let Ok(stored_hash) = entry.get_password() {
                if stored_hash != master_key_hash {
                    return Err(AppError::Auth("Invalid master password".to_string()));
                }
            }
        }

        // Store master key hash in memory
        {
            let mut key_hash = state.master_key_hash.write().await;
            *key_hash = Some(master_key_hash);
        }

        // Unlock the vault
        {
            let mut locked = state.is_locked.write().await;
            *locked = false;
        }

        Ok(LoginResponse {
            user_id: session.user_id,
            email: session.email,
        })
    }
    .await;

    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn lock_vault(state: State<'_, AppState>) -> std::result::Result<(), String> {
    let mut locked = state.is_locked.write().await;
    *locked = true;

    let mut key_hash = state.master_key_hash.write().await;
    *key_hash = None;

    Ok(())
}

#[tauri::command]
pub async fn is_vault_locked(state: State<'_, AppState>) -> std::result::Result<bool, String> {
    let locked = state.is_locked.read().await;
    Ok(*locked)
}

#[tauri::command]
pub async fn get_session(
    state: State<'_, AppState>,
) -> std::result::Result<Option<UserSession>, String> {
    state.db.get_session().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn has_stored_session(state: State<'_, AppState>) -> std::result::Result<bool, String> {
    let session = state.db.get_session().map_err(|e| e.to_string())?;
    Ok(session.is_some())
}

// ============================================
// Vault Items Commands
// ============================================

fn check_locked(is_locked: bool) -> Result<()> {
    if is_locked {
        Err(AppError::VaultLocked)
    } else {
        Ok(())
    }
}

#[tauri::command]
pub async fn get_vault_items(
    state: State<'_, AppState>,
) -> std::result::Result<Vec<VaultItem>, String> {
    let locked = state.is_locked.read().await;
    check_locked(*locked).map_err(|e| e.to_string())?;

    state.db.get_all_vault_items().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_trashed_items(
    state: State<'_, AppState>,
) -> std::result::Result<Vec<VaultItem>, String> {
    let locked = state.is_locked.read().await;
    check_locked(*locked).map_err(|e| e.to_string())?;

    state.db.get_trashed_items().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_vault_item(
    state: State<'_, AppState>,
    id: String,
) -> std::result::Result<Option<VaultItem>, String> {
    let locked = state.is_locked.read().await;
    check_locked(*locked).map_err(|e| e.to_string())?;

    state.db.get_vault_item(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_vault_item(
    state: State<'_, AppState>,
    request: CreateVaultItemRequest,
) -> std::result::Result<VaultItem, String> {
    let locked = state.is_locked.read().await;
    check_locked(*locked).map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    let item = VaultItem {
        id: Uuid::new_v4().to_string(),
        encrypted_data: request.encrypted_data,
        item_type: request.item_type,
        folder_id: request.folder_id,
        is_favorite: request.is_favorite,
        deleted_at: None,
        synced_at: None,
        local_updated_at: now,
        server_updated_at: None,
    };

    state.db.insert_vault_item(&item).map_err(|e| e.to_string())?;
    Ok(item)
}

#[tauri::command]
pub async fn update_vault_item(
    state: State<'_, AppState>,
    request: UpdateVaultItemRequest,
) -> std::result::Result<VaultItem, String> {
    let locked = state.is_locked.read().await;
    check_locked(*locked).map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    let item = VaultItem {
        id: request.id.clone(),
        encrypted_data: request.encrypted_data,
        item_type: request.item_type,
        folder_id: request.folder_id,
        is_favorite: request.is_favorite,
        deleted_at: None,
        synced_at: None,
        local_updated_at: now,
        server_updated_at: None,
    };

    state.db.update_vault_item(&item).map_err(|e| e.to_string())?;
    Ok(item)
}

#[tauri::command]
pub async fn delete_vault_item(
    state: State<'_, AppState>,
    id: String,
) -> std::result::Result<(), String> {
    let locked = state.is_locked.read().await;
    check_locked(*locked).map_err(|e| e.to_string())?;

    state
        .db
        .soft_delete_vault_item(&id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn restore_vault_item(
    state: State<'_, AppState>,
    id: String,
) -> std::result::Result<(), String> {
    let locked = state.is_locked.read().await;
    check_locked(*locked).map_err(|e| e.to_string())?;

    state
        .db
        .restore_vault_item(&id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn permanently_delete_vault_item(
    state: State<'_, AppState>,
    id: String,
) -> std::result::Result<(), String> {
    let locked = state.is_locked.read().await;
    check_locked(*locked).map_err(|e| e.to_string())?;

    state
        .db
        .permanently_delete_vault_item(&id)
        .map_err(|e| e.to_string())
}

// ============================================
// Folders Commands
// ============================================

#[tauri::command]
pub async fn get_folders(state: State<'_, AppState>) -> std::result::Result<Vec<Folder>, String> {
    let locked = state.is_locked.read().await;
    check_locked(*locked).map_err(|e| e.to_string())?;

    state.db.get_all_folders().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_folder(
    state: State<'_, AppState>,
    request: CreateFolderRequest,
) -> std::result::Result<Folder, String> {
    let locked = state.is_locked.read().await;
    check_locked(*locked).map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    let folder = Folder {
        id: Uuid::new_v4().to_string(),
        name: request.name,
        synced_at: None,
        local_updated_at: now,
    };

    state.db.insert_folder(&folder).map_err(|e| e.to_string())?;
    Ok(folder)
}

#[tauri::command]
pub async fn update_folder(
    state: State<'_, AppState>,
    request: UpdateFolderRequest,
) -> std::result::Result<Folder, String> {
    let locked = state.is_locked.read().await;
    check_locked(*locked).map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    let folder = Folder {
        id: request.id.clone(),
        name: request.name,
        synced_at: None,
        local_updated_at: now,
    };

    state.db.update_folder(&folder).map_err(|e| e.to_string())?;
    Ok(folder)
}

#[tauri::command]
pub async fn delete_folder(state: State<'_, AppState>, id: String) -> std::result::Result<(), String> {
    let locked = state.is_locked.read().await;
    check_locked(*locked).map_err(|e| e.to_string())?;

    state.db.delete_folder(&id).map_err(|e| e.to_string())
}

// ============================================
// Sync Commands
// ============================================

#[tauri::command]
pub async fn sync_vault(state: State<'_, AppState>) -> std::result::Result<SyncStatus, String> {
    let locked = state.is_locked.read().await;
    check_locked(*locked).map_err(|e| e.to_string())?;

    state.sync_engine.sync().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_sync_status(
    state: State<'_, AppState>,
) -> std::result::Result<SyncStatus, String> {
    Ok(state.sync_engine.get_status().await)
}

#[tauri::command]
pub async fn check_connectivity(state: State<'_, AppState>) -> std::result::Result<bool, String> {
    Ok(state.sync_engine.check_connectivity().await)
}

// ============================================
// Settings Commands
// ============================================

#[tauri::command]
pub async fn get_settings(
    state: State<'_, AppState>,
) -> std::result::Result<AppSettings, String> {
    state.db.get_settings().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_settings(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> std::result::Result<(), String> {
    state.db.save_settings(&settings).map_err(|e| e.to_string())
}

// ============================================
// Clipboard Commands
// ============================================

#[tauri::command]
pub async fn copy_to_clipboard(
    app_handle: tauri::AppHandle,
    text: String,
    clear_after_seconds: Option<u32>,
) -> std::result::Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    app_handle
        .clipboard()
        .write_text(&text)
        .map_err(|e| e.to_string())?;

    // Schedule clipboard clear if requested
    if let Some(seconds) = clear_after_seconds {
        let handle = app_handle.clone();
        let original_text = text.clone();
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_secs(seconds as u64)).await;
            if let Ok(current) = handle.clipboard().read_text() {
                // Only clear if clipboard still contains our text
                if current == original_text {
                    let _ = handle.clipboard().write_text("");
                }
            }
        });
    }

    Ok(())
}

#[tauri::command]
pub async fn clear_clipboard(app_handle: tauri::AppHandle) -> std::result::Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app_handle
        .clipboard()
        .write_text("")
        .map_err(|e| e.to_string())
}

// ============================================
// Utility Commands
// ============================================

#[tauri::command]
pub fn generate_uuid() -> String {
    Uuid::new_v4().to_string()
}

#[tauri::command]
pub fn get_current_timestamp() -> String {
    Utc::now().to_rfc3339()
}
