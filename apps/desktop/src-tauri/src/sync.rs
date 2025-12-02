// ============================================
// BirchVault Desktop - Sync Engine
// ============================================

use crate::db::{Database, Folder, UserSession, VaultItem};
use crate::error::{AppError, Result};
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

// ============================================
// Supabase API Types
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupabaseConfig {
    pub url: String,
    pub anon_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SupabaseVaultItem {
    id: String,
    user_id: String,
    encrypted_data: String,
    #[serde(rename = "type")]
    item_type: String,
    folder_id: Option<String>,
    deleted_at: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SupabaseFolder {
    id: String,
    user_id: String,
    name: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SupabaseAuthResponse {
    access_token: String,
    refresh_token: String,
    expires_at: i64,
    user: SupabaseUser,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SupabaseUser {
    id: String,
    email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SupabaseError {
    message: String,
    #[serde(default)]
    error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub is_syncing: bool,
    pub last_sync_at: Option<String>,
    pub pending_changes: usize,
    pub is_online: bool,
}

// ============================================
// Sync Engine
// ============================================

pub struct SyncEngine {
    db: Arc<Database>,
    client: Client,
    config: SupabaseConfig,
    status: Arc<RwLock<SyncStatus>>,
}

impl SyncEngine {
    pub fn new(db: Arc<Database>, config: SupabaseConfig) -> Self {
        Self {
            db,
            client: Client::new(),
            config,
            status: Arc::new(RwLock::new(SyncStatus {
                is_syncing: false,
                last_sync_at: None,
                pending_changes: 0,
                is_online: true,
            })),
        }
    }

    pub async fn get_status(&self) -> SyncStatus {
        let status = self.status.read().await;
        let pending = self.db.get_pending_sync_items().unwrap_or_default().len();
        SyncStatus {
            is_syncing: status.is_syncing,
            last_sync_at: status.last_sync_at.clone(),
            pending_changes: pending,
            is_online: status.is_online,
        }
    }

    /// Check if we're online by pinging Supabase
    pub async fn check_connectivity(&self) -> bool {
        let url = format!("{}/rest/v1/", self.config.url);
        match self.client.head(&url).send().await {
            Ok(resp) => {
                let online = resp.status().is_success() || resp.status().as_u16() == 401;
                let mut status = self.status.write().await;
                status.is_online = online;
                online
            }
            Err(_) => {
                let mut status = self.status.write().await;
                status.is_online = false;
                false
            }
        }
    }

    /// Authenticate with Supabase and get tokens
    pub async fn authenticate(&self, email: &str, password_hash: &str) -> Result<UserSession> {
        let url = format!("{}/auth/v1/token?grant_type=password", self.config.url);
        println!("[Auth] Authenticating user: {}", email);

        let body = serde_json::json!({
            "email": email,
            "password": password_hash,
        });

        let response = self
            .client
            .post(&url)
            .header("apikey", &self.config.anon_key)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        println!("[Auth] Response status: {}", response.status());

        if !response.status().is_success() {
            let error: SupabaseError = response.json().await.unwrap_or(SupabaseError {
                message: "Authentication failed".to_string(),
                error: None,
            });
            println!("[Auth] Error: {}", error.message);
            return Err(AppError::Auth(error.message));
        }

        let auth_response: SupabaseAuthResponse = response.json().await?;
        println!("[Auth] Authenticated! User ID: {}", auth_response.user.id);
        let expires_at =
            DateTime::from_timestamp(auth_response.expires_at, 0).unwrap_or(Utc::now());

        Ok(UserSession {
            user_id: auth_response.user.id,
            email: auth_response.user.email,
            access_token: auth_response.access_token,
            refresh_token: auth_response.refresh_token,
            expires_at: expires_at.to_rfc3339(),
            last_sync_at: None,
        })
    }

    /// Refresh the access token
    pub async fn refresh_token(&self, session: &UserSession) -> Result<UserSession> {
        let url = format!(
            "{}/auth/v1/token?grant_type=refresh_token",
            self.config.url
        );

        let body = serde_json::json!({
            "refresh_token": session.refresh_token,
        });

        let response = self
            .client
            .post(&url)
            .header("apikey", &self.config.anon_key)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(AppError::Auth("Failed to refresh token".to_string()));
        }

        let auth_response: SupabaseAuthResponse = response.json().await?;
        let expires_at =
            DateTime::from_timestamp(auth_response.expires_at, 0).unwrap_or(Utc::now());

        Ok(UserSession {
            user_id: auth_response.user.id,
            email: auth_response.user.email,
            access_token: auth_response.access_token,
            refresh_token: auth_response.refresh_token,
            expires_at: expires_at.to_rfc3339(),
            last_sync_at: session.last_sync_at.clone(),
        })
    }

    /// Full bidirectional sync
    pub async fn sync(&self) -> Result<SyncStatus> {
        // Set syncing status
        {
            let mut status = self.status.write().await;
            if status.is_syncing {
                return Ok(status.clone());
            }
            status.is_syncing = true;
        }

        let result = self.perform_sync().await;

        // Update status
        {
            let mut status = self.status.write().await;
            status.is_syncing = false;
            if result.is_ok() {
                status.last_sync_at = Some(Utc::now().to_rfc3339());
            }
        }

        match result {
            Ok(_) => {
                self.db.update_last_sync()?;
                Ok(self.get_status().await)
            }
            Err(e) => Err(e),
        }
    }

    async fn perform_sync(&self) -> Result<()> {
        let session = self
            .db
            .get_session()?
            .ok_or(AppError::Auth("Not logged in".to_string()))?;

        // Check if token needs refresh
        let session = self.ensure_valid_token(session).await?;

        // 1. Push local changes to server
        self.push_changes(&session).await?;

        // 2. Pull server changes
        self.pull_changes(&session).await?;

        Ok(())
    }

    async fn ensure_valid_token(&self, session: UserSession) -> Result<UserSession> {
        let expires_at = DateTime::parse_from_rfc3339(&session.expires_at)
            .map_err(|_| AppError::Auth("Invalid token expiry".to_string()))?;

        // Refresh if token expires in less than 5 minutes
        if expires_at.timestamp() < Utc::now().timestamp() + 300 {
            let new_session = self.refresh_token(&session).await?;
            self.db.save_session(&new_session)?;
            Ok(new_session)
        } else {
            Ok(session)
        }
    }

    /// Push local changes to the server
    async fn push_changes(&self, session: &UserSession) -> Result<()> {
        let pending_items = self.db.get_pending_sync_items()?;

        for item in pending_items {
            let result = match item.operation.as_str() {
                "create" | "update" => {
                    self.push_upsert(&session, &item.table_name, &item.record_id)
                        .await
                }
                "delete" => {
                    self.push_delete(&session, &item.table_name, &item.record_id)
                        .await
                }
                _ => Ok(()),
            };

            match result {
                Ok(_) => {
                    self.db.remove_from_sync_queue(item.id)?;
                    self.db.mark_item_synced(&item.table_name, &item.record_id)?;
                }
                Err(e) => {
                    log::warn!("Failed to sync item {}: {}", item.record_id, e);
                    // Continue with other items, don't fail the whole sync
                }
            }
        }

        Ok(())
    }

    async fn push_upsert(&self, session: &UserSession, table: &str, id: &str) -> Result<()> {
        match table {
            "vault_items" => {
                if let Some(item) = self.db.get_vault_item(id)? {
                    let url = format!("{}/rest/v1/vault_items", self.config.url);
                    let body = serde_json::json!({
                        "id": item.id,
                        "user_id": session.user_id,
                        "encrypted_data": item.encrypted_data,
                        "type": item.item_type,
                        "folder_id": item.folder_id,
                        "deleted_at": item.deleted_at,
                    });

                    let response = self
                        .client
                        .post(&url)
                        .header("apikey", &self.config.anon_key)
                        .header("Authorization", format!("Bearer {}", session.access_token))
                        .header("Content-Type", "application/json")
                        .header("Prefer", "resolution=merge-duplicates")
                        .json(&body)
                        .send()
                        .await?;

                    if !response.status().is_success() {
                        let status = response.status();
                        let text = response.text().await.unwrap_or_default();
                        return Err(AppError::Sync(format!(
                            "Failed to sync vault item: {} - {}",
                            status, text
                        )));
                    }
                }
            }
            "folders" => {
                let folders = self.db.get_all_folders()?;
                if let Some(folder) = folders.iter().find(|f| f.id == id) {
                    let url = format!("{}/rest/v1/folders", self.config.url);
                    let body = serde_json::json!({
                        "id": folder.id,
                        "user_id": session.user_id,
                        "name": folder.name,
                    });

                    let response = self
                        .client
                        .post(&url)
                        .header("apikey", &self.config.anon_key)
                        .header("Authorization", format!("Bearer {}", session.access_token))
                        .header("Content-Type", "application/json")
                        .header("Prefer", "resolution=merge-duplicates")
                        .json(&body)
                        .send()
                        .await?;

                    if !response.status().is_success() {
                        return Err(AppError::Sync("Failed to sync folder".to_string()));
                    }
                }
            }
            _ => {}
        }

        Ok(())
    }

    async fn push_delete(&self, session: &UserSession, table: &str, id: &str) -> Result<()> {
        let url = format!("{}/rest/v1/{}?id=eq.{}", self.config.url, table, id);

        let response = self
            .client
            .delete(&url)
            .header("apikey", &self.config.anon_key)
            .header("Authorization", format!("Bearer {}", session.access_token))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(AppError::Sync(format!("Failed to delete {} {}", table, id)));
        }

        Ok(())
    }

    /// Pull changes from the server
    async fn pull_changes(&self, session: &UserSession) -> Result<()> {
        // Get last sync timestamp
        let last_sync = session.last_sync_at.clone();

        // Pull folders
        self.pull_folders(session, last_sync.as_deref()).await?;

        // Pull vault items
        self.pull_vault_items(session, last_sync.as_deref()).await?;

        Ok(())
    }

    async fn pull_folders(&self, session: &UserSession, since: Option<&str>) -> Result<()> {
        let mut url = format!(
            "{}/rest/v1/folders?user_id=eq.{}",
            self.config.url, session.user_id
        );

        if let Some(since) = since {
            url.push_str(&format!("&updated_at=gt.{}", since));
        }

        let response = self
            .client
            .get(&url)
            .header("apikey", &self.config.anon_key)
            .header("Authorization", format!("Bearer {}", session.access_token))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(AppError::Sync("Failed to pull folders".to_string()));
        }

        let server_folders: Vec<SupabaseFolder> = response.json().await?;
        let now = Utc::now().to_rfc3339();

        let folders: Vec<Folder> = server_folders
            .into_iter()
            .map(|f| Folder {
                id: f.id,
                name: f.name,
                synced_at: Some(now.clone()),
                local_updated_at: f.updated_at,
            })
            .collect();

        self.db.bulk_upsert_folders(&folders)?;

        Ok(())
    }

    async fn pull_vault_items(&self, session: &UserSession, since: Option<&str>) -> Result<()> {
        let mut url = format!(
            "{}/rest/v1/vault_items?user_id=eq.{}",
            self.config.url, session.user_id
        );

        if let Some(since) = since {
            url.push_str(&format!("&updated_at=gt.{}", since));
        }

        println!("[Sync] Pulling vault items from: {}", url);

        let response = self
            .client
            .get(&url)
            .header("apikey", &self.config.anon_key)
            .header("Authorization", format!("Bearer {}", session.access_token))
            .send()
            .await?;

        println!("[Sync] Response status: {}", response.status());

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            println!("[Sync] Error response: {}", error_text);
            return Err(AppError::Sync("Failed to pull vault items".to_string()));
        }

        let server_items: Vec<SupabaseVaultItem> = response.json().await?;
        println!("[Sync] Received {} vault items from server", server_items.len());
        let now = Utc::now().to_rfc3339();

        let items: Vec<VaultItem> = server_items
            .into_iter()
            .map(|i| VaultItem {
                id: i.id,
                encrypted_data: i.encrypted_data,
                item_type: i.item_type,
                folder_id: i.folder_id,
                is_favorite: false, // Favorite flag is stored in encrypted_data
                deleted_at: i.deleted_at,
                synced_at: Some(now.clone()),
                local_updated_at: i.updated_at.clone(),
                server_updated_at: Some(i.updated_at),
            })
            .collect();

        self.db.bulk_upsert_vault_items(&items)?;
        println!("[Sync] Stored {} items in local database", items.len());

        Ok(())
    }

    /// Initial full sync when logging in
    pub async fn initial_sync(&self, session: &UserSession) -> Result<()> {
        // Pull all data from server
        self.pull_folders(session, None).await?;
        self.pull_vault_items(session, None).await?;

        // Clear sync queue as we just synced everything
        self.db.clear_sync_queue()?;
        self.db.update_last_sync()?;

        Ok(())
    }

    /// Logout and clear all local data
    pub async fn logout(&self) -> Result<()> {
        self.db.clear_all_data()?;
        Ok(())
    }
}







