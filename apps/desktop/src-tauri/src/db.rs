// ============================================
// BirchVault Desktop - Database Layer
// ============================================

use crate::error::{AppError, Result};
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use uuid::Uuid;

// ============================================
// Data Types
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultItem {
    pub id: String,
    pub encrypted_data: String,
    pub item_type: String,
    pub folder_id: Option<String>,
    pub is_favorite: bool,
    pub deleted_at: Option<String>,
    pub synced_at: Option<String>,
    pub local_updated_at: String,
    pub server_updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub synced_at: Option<String>,
    pub local_updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncQueueItem {
    pub id: i64,
    pub operation: String,
    pub table_name: String,
    pub record_id: String,
    pub payload: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserSession {
    pub user_id: String,
    pub email: String,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: String,
    pub last_sync_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub auto_lock_minutes: i32,
    pub clipboard_clear_seconds: i32,
    pub start_minimized: bool,
    pub start_on_boot: bool,
    pub theme: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            auto_lock_minutes: 15,
            clipboard_clear_seconds: 30,
            start_minimized: false,
            start_on_boot: false,
            theme: "system".to_string(),
        }
    }
}

// ============================================
// Database Manager
// ============================================

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// Initialize database with the given path
    pub fn new(db_path: PathBuf) -> Result<Self> {
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(&db_path)?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.initialize_schema()?;
        Ok(db)
    }

    /// Initialize database schema
    fn initialize_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            r#"
            -- Vault items table
            CREATE TABLE IF NOT EXISTS vault_items (
                id TEXT PRIMARY KEY,
                encrypted_data TEXT NOT NULL,
                item_type TEXT NOT NULL,
                folder_id TEXT,
                is_favorite INTEGER DEFAULT 0,
                deleted_at TEXT,
                synced_at TEXT,
                local_updated_at TEXT NOT NULL,
                server_updated_at TEXT,
                FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
            );

            -- Folders table
            CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                synced_at TEXT,
                local_updated_at TEXT NOT NULL
            );

            -- Sync queue for offline changes
            CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                operation TEXT NOT NULL,
                table_name TEXT NOT NULL,
                record_id TEXT NOT NULL,
                payload TEXT,
                created_at TEXT NOT NULL
            );

            -- User session
            CREATE TABLE IF NOT EXISTS user_session (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                user_id TEXT NOT NULL,
                email TEXT NOT NULL,
                access_token TEXT NOT NULL,
                refresh_token TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                last_sync_at TEXT
            );

            -- App settings
            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                auto_lock_minutes INTEGER DEFAULT 15,
                clipboard_clear_seconds INTEGER DEFAULT 30,
                start_minimized INTEGER DEFAULT 0,
                start_on_boot INTEGER DEFAULT 0,
                theme TEXT DEFAULT 'system'
            );

            -- Indexes for performance
            CREATE INDEX IF NOT EXISTS idx_vault_items_folder ON vault_items(folder_id);
            CREATE INDEX IF NOT EXISTS idx_vault_items_type ON vault_items(item_type);
            CREATE INDEX IF NOT EXISTS idx_vault_items_deleted ON vault_items(deleted_at);
            CREATE INDEX IF NOT EXISTS idx_vault_items_synced ON vault_items(synced_at);
            CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);

            -- Insert default settings if not exists
            INSERT OR IGNORE INTO app_settings (id) VALUES (1);
            "#,
        )?;

        Ok(())
    }

    // ============================================
    // Vault Items CRUD
    // ============================================

    pub fn get_all_vault_items(&self) -> Result<Vec<VaultItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, encrypted_data, item_type, folder_id, is_favorite, 
                   deleted_at, synced_at, local_updated_at, server_updated_at
            FROM vault_items
            WHERE deleted_at IS NULL
            ORDER BY local_updated_at DESC
            "#,
        )?;

        let items = stmt
            .query_map([], |row| {
                Ok(VaultItem {
                    id: row.get(0)?,
                    encrypted_data: row.get(1)?,
                    item_type: row.get(2)?,
                    folder_id: row.get(3)?,
                    is_favorite: row.get::<_, i32>(4)? == 1,
                    deleted_at: row.get(5)?,
                    synced_at: row.get(6)?,
                    local_updated_at: row.get(7)?,
                    server_updated_at: row.get(8)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(items)
    }

    pub fn get_trashed_items(&self) -> Result<Vec<VaultItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, encrypted_data, item_type, folder_id, is_favorite, 
                   deleted_at, synced_at, local_updated_at, server_updated_at
            FROM vault_items
            WHERE deleted_at IS NOT NULL
            ORDER BY deleted_at DESC
            "#,
        )?;

        let items = stmt
            .query_map([], |row| {
                Ok(VaultItem {
                    id: row.get(0)?,
                    encrypted_data: row.get(1)?,
                    item_type: row.get(2)?,
                    folder_id: row.get(3)?,
                    is_favorite: row.get::<_, i32>(4)? == 1,
                    deleted_at: row.get(5)?,
                    synced_at: row.get(6)?,
                    local_updated_at: row.get(7)?,
                    server_updated_at: row.get(8)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(items)
    }

    pub fn get_vault_item(&self, id: &str) -> Result<Option<VaultItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, encrypted_data, item_type, folder_id, is_favorite, 
                   deleted_at, synced_at, local_updated_at, server_updated_at
            FROM vault_items
            WHERE id = ?1
            "#,
        )?;

        let item = stmt
            .query_row([id], |row| {
                Ok(VaultItem {
                    id: row.get(0)?,
                    encrypted_data: row.get(1)?,
                    item_type: row.get(2)?,
                    folder_id: row.get(3)?,
                    is_favorite: row.get::<_, i32>(4)? == 1,
                    deleted_at: row.get(5)?,
                    synced_at: row.get(6)?,
                    local_updated_at: row.get(7)?,
                    server_updated_at: row.get(8)?,
                })
            })
            .optional()?;

        Ok(item)
    }

    pub fn insert_vault_item(&self, item: &VaultItem) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            INSERT INTO vault_items (id, encrypted_data, item_type, folder_id, is_favorite, 
                                     deleted_at, synced_at, local_updated_at, server_updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            "#,
            params![
                item.id,
                item.encrypted_data,
                item.item_type,
                item.folder_id,
                item.is_favorite as i32,
                item.deleted_at,
                item.synced_at,
                item.local_updated_at,
                item.server_updated_at,
            ],
        )?;

        // Add to sync queue
        self.add_to_sync_queue_internal(&conn, "create", "vault_items", &item.id, Some(item))?;

        Ok(())
    }

    pub fn update_vault_item(&self, item: &VaultItem) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            r#"
            UPDATE vault_items 
            SET encrypted_data = ?2, item_type = ?3, folder_id = ?4, is_favorite = ?5,
                deleted_at = ?6, local_updated_at = ?7
            WHERE id = ?1
            "#,
            params![
                item.id,
                item.encrypted_data,
                item.item_type,
                item.folder_id,
                item.is_favorite as i32,
                item.deleted_at,
                now,
            ],
        )?;

        // Add to sync queue
        self.add_to_sync_queue_internal(&conn, "update", "vault_items", &item.id, Some(item))?;

        Ok(())
    }

    pub fn soft_delete_vault_item(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            r#"
            UPDATE vault_items 
            SET deleted_at = ?2, local_updated_at = ?2
            WHERE id = ?1
            "#,
            params![id, now],
        )?;

        // Add to sync queue
        self.add_to_sync_queue_internal(&conn, "update", "vault_items", id, None::<&VaultItem>)?;

        Ok(())
    }

    pub fn restore_vault_item(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            r#"
            UPDATE vault_items 
            SET deleted_at = NULL, local_updated_at = ?2
            WHERE id = ?1
            "#,
            params![id, now],
        )?;

        // Add to sync queue
        self.add_to_sync_queue_internal(&conn, "update", "vault_items", id, None::<&VaultItem>)?;

        Ok(())
    }

    pub fn permanently_delete_vault_item(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute("DELETE FROM vault_items WHERE id = ?1", [id])?;

        // Add to sync queue
        self.add_to_sync_queue_internal(&conn, "delete", "vault_items", id, None::<&VaultItem>)?;

        Ok(())
    }

    // ============================================
    // Folders CRUD
    // ============================================

    pub fn get_all_folders(&self) -> Result<Vec<Folder>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, name, synced_at, local_updated_at
            FROM folders
            ORDER BY name ASC
            "#,
        )?;

        let folders = stmt
            .query_map([], |row| {
                Ok(Folder {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    synced_at: row.get(2)?,
                    local_updated_at: row.get(3)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(folders)
    }

    pub fn insert_folder(&self, folder: &Folder) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            INSERT INTO folders (id, name, synced_at, local_updated_at)
            VALUES (?1, ?2, ?3, ?4)
            "#,
            params![
                folder.id,
                folder.name,
                folder.synced_at,
                folder.local_updated_at,
            ],
        )?;

        self.add_to_sync_queue_internal(&conn, "create", "folders", &folder.id, Some(folder))?;

        Ok(())
    }

    pub fn update_folder(&self, folder: &Folder) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        conn.execute(
            r#"
            UPDATE folders 
            SET name = ?2, local_updated_at = ?3
            WHERE id = ?1
            "#,
            params![folder.id, folder.name, now],
        )?;

        self.add_to_sync_queue_internal(&conn, "update", "folders", &folder.id, Some(folder))?;

        Ok(())
    }

    pub fn delete_folder(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // Remove folder_id from items in this folder
        conn.execute(
            "UPDATE vault_items SET folder_id = NULL WHERE folder_id = ?1",
            [id],
        )?;

        // Delete the folder
        conn.execute("DELETE FROM folders WHERE id = ?1", [id])?;

        self.add_to_sync_queue_internal(&conn, "delete", "folders", id, None::<&Folder>)?;

        Ok(())
    }

    // ============================================
    // Sync Queue
    // ============================================

    fn add_to_sync_queue_internal<T: Serialize>(
        &self,
        conn: &Connection,
        operation: &str,
        table_name: &str,
        record_id: &str,
        payload: Option<&T>,
    ) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        let payload_json = payload.map(|p| serde_json::to_string(p).ok()).flatten();

        conn.execute(
            r#"
            INSERT INTO sync_queue (operation, table_name, record_id, payload, created_at)
            VALUES (?1, ?2, ?3, ?4, ?5)
            "#,
            params![operation, table_name, record_id, payload_json, now],
        )?;

        Ok(())
    }

    pub fn get_pending_sync_items(&self) -> Result<Vec<SyncQueueItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, operation, table_name, record_id, payload, created_at
            FROM sync_queue
            ORDER BY created_at ASC
            "#,
        )?;

        let items = stmt
            .query_map([], |row| {
                Ok(SyncQueueItem {
                    id: row.get(0)?,
                    operation: row.get(1)?,
                    table_name: row.get(2)?,
                    record_id: row.get(3)?,
                    payload: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(items)
    }

    pub fn remove_from_sync_queue(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM sync_queue WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn clear_sync_queue(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM sync_queue", [])?;
        Ok(())
    }

    pub fn mark_item_synced(&self, table_name: &str, record_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        match table_name {
            "vault_items" => {
                conn.execute(
                    "UPDATE vault_items SET synced_at = ?2, server_updated_at = ?2 WHERE id = ?1",
                    params![record_id, now],
                )?;
            }
            "folders" => {
                conn.execute(
                    "UPDATE folders SET synced_at = ?2 WHERE id = ?1",
                    params![record_id, now],
                )?;
            }
            _ => {}
        }

        Ok(())
    }

    // ============================================
    // User Session
    // ============================================

    pub fn get_session(&self) -> Result<Option<UserSession>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            r#"
            SELECT user_id, email, access_token, refresh_token, expires_at, last_sync_at
            FROM user_session
            WHERE id = 1
            "#,
        )?;

        let session = stmt
            .query_row([], |row| {
                Ok(UserSession {
                    user_id: row.get(0)?,
                    email: row.get(1)?,
                    access_token: row.get(2)?,
                    refresh_token: row.get(3)?,
                    expires_at: row.get(4)?,
                    last_sync_at: row.get(5)?,
                })
            })
            .optional()?;

        Ok(session)
    }

    pub fn save_session(&self, session: &UserSession) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            INSERT OR REPLACE INTO user_session 
            (id, user_id, email, access_token, refresh_token, expires_at, last_sync_at)
            VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6)
            "#,
            params![
                session.user_id,
                session.email,
                session.access_token,
                session.refresh_token,
                session.expires_at,
                session.last_sync_at,
            ],
        )?;
        Ok(())
    }

    pub fn update_last_sync(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();
        conn.execute("UPDATE user_session SET last_sync_at = ?1 WHERE id = 1", [now])?;
        Ok(())
    }

    pub fn clear_session(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM user_session WHERE id = 1", [])?;
        Ok(())
    }

    // ============================================
    // App Settings
    // ============================================

    pub fn get_settings(&self) -> Result<AppSettings> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            r#"
            SELECT auto_lock_minutes, clipboard_clear_seconds, start_minimized, 
                   start_on_boot, theme
            FROM app_settings
            WHERE id = 1
            "#,
        )?;

        let settings = stmt
            .query_row([], |row| {
                Ok(AppSettings {
                    auto_lock_minutes: row.get(0)?,
                    clipboard_clear_seconds: row.get(1)?,
                    start_minimized: row.get::<_, i32>(2)? == 1,
                    start_on_boot: row.get::<_, i32>(3)? == 1,
                    theme: row.get(4)?,
                })
            })
            .unwrap_or_default();

        Ok(settings)
    }

    pub fn save_settings(&self, settings: &AppSettings) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            UPDATE app_settings 
            SET auto_lock_minutes = ?1, clipboard_clear_seconds = ?2, 
                start_minimized = ?3, start_on_boot = ?4, theme = ?5
            WHERE id = 1
            "#,
            params![
                settings.auto_lock_minutes,
                settings.clipboard_clear_seconds,
                settings.start_minimized as i32,
                settings.start_on_boot as i32,
                settings.theme,
            ],
        )?;
        Ok(())
    }

    // ============================================
    // Bulk Operations for Sync
    // ============================================

    pub fn bulk_upsert_vault_items(&self, items: &[VaultItem]) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        for item in items {
            tx.execute(
                r#"
                INSERT OR REPLACE INTO vault_items 
                (id, encrypted_data, item_type, folder_id, is_favorite, deleted_at, 
                 synced_at, local_updated_at, server_updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                "#,
                params![
                    item.id,
                    item.encrypted_data,
                    item.item_type,
                    item.folder_id,
                    item.is_favorite as i32,
                    item.deleted_at,
                    item.synced_at,
                    item.local_updated_at,
                    item.server_updated_at,
                ],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    pub fn bulk_upsert_folders(&self, folders: &[Folder]) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        for folder in folders {
            tx.execute(
                r#"
                INSERT OR REPLACE INTO folders (id, name, synced_at, local_updated_at)
                VALUES (?1, ?2, ?3, ?4)
                "#,
                params![
                    folder.id,
                    folder.name,
                    folder.synced_at,
                    folder.local_updated_at,
                ],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    /// Clear all data (used when logging out)
    pub fn clear_all_data(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            r#"
            DELETE FROM vault_items;
            DELETE FROM folders;
            DELETE FROM sync_queue;
            DELETE FROM user_session;
            "#,
        )?;
        Ok(())
    }

    /// Get items that need to be synced (modified since last sync)
    pub fn get_unsynced_items(&self) -> Result<Vec<VaultItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, encrypted_data, item_type, folder_id, is_favorite, 
                   deleted_at, synced_at, local_updated_at, server_updated_at
            FROM vault_items
            WHERE synced_at IS NULL 
               OR local_updated_at > COALESCE(synced_at, '1970-01-01')
            "#,
        )?;

        let items = stmt
            .query_map([], |row| {
                Ok(VaultItem {
                    id: row.get(0)?,
                    encrypted_data: row.get(1)?,
                    item_type: row.get(2)?,
                    folder_id: row.get(3)?,
                    is_favorite: row.get::<_, i32>(4)? == 1,
                    deleted_at: row.get(5)?,
                    synced_at: row.get(6)?,
                    local_updated_at: row.get(7)?,
                    server_updated_at: row.get(8)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(items)
    }
}
