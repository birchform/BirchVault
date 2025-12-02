// ============================================
// BirchVault Desktop - Error Types
// ============================================

use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Keyring error: {0}")]
    Keyring(#[from] keyring::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Authentication failed: {0}")]
    Auth(String),

    #[error("Sync error: {0}")]
    Sync(String),

    #[error("Encryption error: {0}")]
    Encryption(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Invalid operation: {0}")]
    InvalidOperation(String),

    #[error("Vault is locked")]
    VaultLocked,

    #[error("Network unavailable")]
    NetworkUnavailable,
}

// Convert AppError to a serializable format for Tauri
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;







