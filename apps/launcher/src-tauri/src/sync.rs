use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupabaseConfig {
    pub url: String,
    #[serde(rename = "anonKey")]
    pub anon_key: String,
}

/// Get a unique machine identifier based on hostname and a generated UUID
#[tauri::command]
pub fn get_machine_id() -> Result<String, String> {
    let hostname = hostname::get()
        .map_err(|e| format!("Failed to get hostname: {}", e))?
        .to_string_lossy()
        .to_string();
    
    // Get or create a persistent machine UUID
    let config_dir = get_config_dir()?;
    let machine_id_file = config_dir.join("machine_id");
    
    let uuid = if machine_id_file.exists() {
        fs::read_to_string(&machine_id_file)
            .map_err(|e| format!("Failed to read machine ID: {}", e))?
    } else {
        let new_uuid = uuid::Uuid::new_v4().to_string();
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config dir: {}", e))?;
        fs::write(&machine_id_file, &new_uuid)
            .map_err(|e| format!("Failed to write machine ID: {}", e))?;
        new_uuid
    };
    
    Ok(format!("{}_{}", hostname, uuid))
}

/// Get the computer's hostname
#[tauri::command]
pub fn get_hostname() -> Result<String, String> {
    hostname::get()
        .map_err(|e| format!("Failed to get hostname: {}", e))
        .map(|h| h.to_string_lossy().to_string())
}

/// Get stored Supabase configuration
#[tauri::command]
pub fn get_supabase_config() -> Result<Option<SupabaseConfig>, String> {
    let config_path = get_config_dir()?.join("supabase_config.json");
    
    if !config_path.exists() {
        return Ok(None);
    }
    
    let contents = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;
    
    let config: SupabaseConfig = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse config: {}", e))?;
    
    Ok(Some(config))
}

/// Store Supabase configuration
#[tauri::command]
pub fn set_supabase_config(config: SupabaseConfig) -> Result<(), String> {
    let config_dir = get_config_dir()?;
    fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config dir: {}", e))?;
    
    let config_path = config_dir.join("supabase_config.json");
    let contents = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    
    fs::write(&config_path, contents)
        .map_err(|e| format!("Failed to write config: {}", e))?;
    
    Ok(())
}

/// Show an input dialog and return the user's input
#[tauri::command]
pub async fn show_input_dialog(
    _app: tauri::AppHandle,
    _title: String,
    _message: String,
    _placeholder: Option<String>,
    _is_password: Option<bool>,
) -> Result<Option<String>, String> {
    // This is a workaround - we'll need to handle input via the frontend
    // For now, return an error indicating the frontend should handle this
    Err("INPUT_REQUIRED".to_string())
}

/// Show a message dialog
#[tauri::command]
pub async fn show_message_dialog(
    app: tauri::AppHandle,
    title: String,
    message: String,
    kind: Option<String>,
) -> Result<(), String> {
    use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
    
    let dialog_kind = match kind.as_deref() {
        Some("error") => MessageDialogKind::Error,
        Some("warning") => MessageDialogKind::Warning,
        _ => MessageDialogKind::Info,
    };
    
    app.dialog()
        .message(message)
        .title(title)
        .kind(dialog_kind)
        .blocking_show();
    
    Ok(())
}

/// Generate a random salt for key derivation
#[tauri::command]
pub fn generate_salt(length: usize) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    use rand::RngCore;
    
    let mut salt = vec![0u8; length];
    rand::thread_rng().fill_bytes(&mut salt);
    Ok(STANDARD.encode(&salt))
}

/// Derive a key from a PIN using PBKDF2
#[tauri::command]
pub fn derive_key_from_pin(
    pin: String,
    salt: String,
    iterations: u32,
) -> Result<DerivedKey, String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    use pbkdf2::pbkdf2_hmac;
    use sha2::Sha256;
    
    let salt_bytes = STANDARD.decode(&salt)
        .map_err(|e| format!("Invalid salt: {}", e))?;
    
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(pin.as_bytes(), &salt_bytes, iterations, &mut key);
    
    Ok(DerivedKey {
        key: STANDARD.encode(&key),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DerivedKey {
    pub key: String,
}

/// Derive a key from a master password using PBKDF2
#[tauri::command]
pub fn derive_key_from_master_password(
    master_password: String,
    salt: String,
    iterations: u32,
) -> Result<DerivedKey, String> {
    derive_key_from_pin(master_password, salt, iterations)
}

/// Generate a symmetric key for encryption
#[tauri::command]
pub fn generate_symmetric_key() -> Result<DerivedKey, String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    use rand::RngCore;
    
    let mut key = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut key);
    
    Ok(DerivedKey {
        key: STANDARD.encode(&key),
    })
}

/// Encrypt data using AES-GCM
#[tauri::command]
pub fn encrypt_data(key: String, data: String) -> Result<EncryptedData, String> {
    use aes_gcm::{
        aead::{Aead, KeyInit},
        Aes256Gcm, Nonce,
    };
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    use rand::RngCore;
    
    let key_bytes = STANDARD.decode(&key)
        .map_err(|e| format!("Invalid key: {}", e))?;
    
    if key_bytes.len() != 32 {
        return Err("Key must be 32 bytes".to_string());
    }
    
    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;
    
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    let ciphertext = cipher.encrypt(nonce, data.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;
    
    // Combine nonce and ciphertext
    let mut combined = nonce_bytes.to_vec();
    combined.extend(ciphertext);
    
    Ok(EncryptedData {
        encrypted: STANDARD.encode(&combined),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedData {
    pub encrypted: String,
}

/// Decrypt data using AES-GCM
#[tauri::command]
pub fn decrypt_data(key: String, encrypted_data: String) -> Result<DecryptedData, String> {
    use aes_gcm::{
        aead::{Aead, KeyInit},
        Aes256Gcm, Nonce,
    };
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    
    let key_bytes = STANDARD.decode(&key)
        .map_err(|e| format!("Invalid key: {}", e))?;
    
    if key_bytes.len() != 32 {
        return Err("Key must be 32 bytes".to_string());
    }
    
    let combined = STANDARD.decode(&encrypted_data)
        .map_err(|e| format!("Invalid encrypted data: {}", e))?;
    
    if combined.len() < 12 {
        return Err("Encrypted data too short".to_string());
    }
    
    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    
    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;
    
    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;
    
    let decrypted = String::from_utf8(plaintext)
        .map_err(|e| format!("Invalid UTF-8: {}", e))?;
    
    Ok(DecryptedData { decrypted })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecryptedData {
    pub decrypted: String,
}

fn get_config_dir() -> Result<PathBuf, String> {
    dirs::config_dir()
        .map(|p| p.join("birch"))
        .ok_or_else(|| "Could not determine config directory".to_string())
}

