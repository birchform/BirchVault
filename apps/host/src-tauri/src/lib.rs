mod job_logs;
mod runner;
mod sync;
mod system_info;

use runner::{RunnerManager, RunnerStatus, LogEntry};
use system_info::{get_recommendations, get_system_info, ResourceSettings, SystemInfo, ResourceRecommendation};
use std::sync::Arc;
use tauri::State;

#[tauri::command]
async fn start_runner(
    manager: State<'_, Arc<RunnerManager>>,
    path: String,
    resource_settings: Option<ResourceSettings>,
) -> Result<(), String> {
    manager.start(&path, resource_settings).await.map_err(|e| e.to_string())
}

#[tauri::command]
fn get_system_info_cmd() -> SystemInfo {
    get_system_info()
}

#[tauri::command]
fn get_resource_recommendations() -> ResourceRecommendation {
    let sys_info = get_system_info();
    get_recommendations(&sys_info)
}

#[tauri::command]
async fn stop_runner(manager: State<'_, Arc<RunnerManager>>) -> Result<(), String> {
    manager.stop().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_runner_status(manager: State<'_, Arc<RunnerManager>>) -> Result<RunnerStatus, String> {
    Ok(manager.get_status().await)
}

#[tauri::command]
async fn get_runner_output(manager: State<'_, Arc<RunnerManager>>) -> Result<Vec<LogEntry>, String> {
    Ok(manager.get_output().await)
}

#[tauri::command]
async fn get_runner_output_strings(manager: State<'_, Arc<RunnerManager>>) -> Result<Vec<String>, String> {
    Ok(manager.get_output_strings().await)
}

#[tauri::command]
async fn get_runner_errors(manager: State<'_, Arc<RunnerManager>>) -> Result<Vec<LogEntry>, String> {
    Ok(manager.get_errors_only().await)
}

#[tauri::command]
async fn get_diagnostics_report(manager: State<'_, Arc<RunnerManager>>) -> Result<String, String> {
    Ok(manager.generate_diagnostics_report().await)
}

#[tauri::command]
async fn clear_runner_output(manager: State<'_, Arc<RunnerManager>>) -> Result<(), String> {
    manager.clear_output().await;
    Ok(())
}

#[tauri::command]
async fn sync_runner_with_github(
    manager: State<'_, Arc<RunnerManager>>,
    github_status: String,
    github_conclusion: Option<String>,
) -> Result<(), String> {
    manager.sync_with_github(&github_status, github_conclusion.as_deref()).await;
    Ok(())
}

#[tauri::command]
async fn force_reset_runner_status(manager: State<'_, Arc<RunnerManager>>) -> Result<(), String> {
    manager.force_reset_status().await;
    Ok(())
}

#[tauri::command]
fn detect_runner_path() -> Result<String, String> {
    // Try to find the runner in common locations
    let possible_paths = vec![
        // Inside Birch Host folder (preferred location)
        Some(std::path::PathBuf::from(r"C:\Cursor Access Folder\Birch Host\actions-runner")),
        // Sibling folder to this app's exe
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.join("../../actions-runner"))),
        // Legacy locations
        Some(std::path::PathBuf::from(r"C:\Cursor Access Folder\actions-runner")),
        Some(std::path::PathBuf::from(r"C:\actions-runner")),
        // User's home directory
        dirs::home_dir().map(|h| h.join("actions-runner")),
    ];

    for path_opt in possible_paths {
        if let Some(path) = path_opt {
            let run_cmd = path.join("run.cmd");
            if run_cmd.exists() {
                return Ok(path.to_string_lossy().to_string());
            }
        }
    }

    Err("Could not detect runner path. Please configure it manually.".to_string())
}

#[tauri::command]
async fn fetch_github_jobs(
    owner: String,
    repo: String,
    token: Option<String>,
) -> Result<Vec<serde_json::Value>, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://api.github.com/repos/{}/{}/actions/runs?per_page=10",
        owner, repo
    );

    let mut request = client
        .get(&url)
        .header("User-Agent", "Runner-Manager")
        .header("Accept", "application/vnd.github+json");

    if let Some(t) = token {
        request = request.header("Authorization", format!("Bearer {}", t));
    }

    let response = request.send().await.map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("GitHub API error: {}", response.status()));
    }

    let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    let runs = data["workflow_runs"]
        .as_array()
        .cloned()
        .unwrap_or_default();

    Ok(runs)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    let manager = Arc::new(RunnerManager::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(manager)
        .invoke_handler(tauri::generate_handler![
            start_runner,
            stop_runner,
            get_runner_status,
            get_runner_output,
            get_runner_output_strings,
            get_runner_errors,
            get_diagnostics_report,
            clear_runner_output,
            sync_runner_with_github,
            force_reset_runner_status,
            detect_runner_path,
            fetch_github_jobs,
            get_system_info_cmd,
            get_resource_recommendations,
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
            // Job log commands
            job_logs::list_job_logs,
            job_logs::get_job_details,
            job_logs::get_latest_job,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

