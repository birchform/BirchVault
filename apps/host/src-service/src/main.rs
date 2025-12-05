// ============================================
// Birch Host Background Service
// Remote GitHub Actions runner control
// ============================================

use anyhow::{Context, Result};
use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use std::ffi::OsString;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use windows_service::{
    define_windows_service,
    service::{
        ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus,
        ServiceType,
    },
    service_control_handler::{self, ServiceControlHandlerResult},
    service_dispatcher,
};

const SERVICE_NAME: &str = "BirchHostService";
const SERVICE_TYPE: ServiceType = ServiceType::OWN_PROCESS;

// ============================================
// Configuration
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ServiceConfig {
    supabase_url: String,
    supabase_anon_key: String,
    machine_id: Option<String>,
    runner_path: Option<String>,
}

impl ServiceConfig {
    fn load() -> Result<Self> {
        // Try to load from keyring
        let keyring = keyring::Entry::new(SERVICE_NAME, "config")?;
        let config_str = keyring.get_password()?;
        let config: ServiceConfig = serde_json::from_str(&config_str)?;
        Ok(config)
    }

    fn save(&self) -> Result<()> {
        let keyring = keyring::Entry::new(SERVICE_NAME, "config")?;
        let config_str = serde_json::to_string(self)?;
        keyring.set_password(&config_str)?;
        Ok(())
    }
}

// ============================================
// Supabase Client
// ============================================

struct SupabaseClient {
    client: reqwest::Client,
    url: String,
    anon_key: String,
}

impl SupabaseClient {
    fn new(url: &str, anon_key: &str) -> Self {
        Self {
            client: reqwest::Client::new(),
            url: url.to_string(),
            anon_key: anon_key.to_string(),
        }
    }

    async fn update_machine_status(&self, machine_id: &str, is_online: bool) -> Result<()> {
        let url = format!("{}/rest/v1/birch_machines?id=eq.{}", self.url, machine_id);
        
        self.client
            .patch(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", format!("Bearer {}", self.anon_key))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "last_seen": chrono::Utc::now().to_rfc3339(),
                "is_online": is_online
            }))
            .send()
            .await?;
        
        Ok(())
    }

    async fn update_runner_status(
        &self,
        machine_id: &str,
        status: &str,
        current_job: Option<&str>,
    ) -> Result<()> {
        let url = format!(
            "{}/rest/v1/host_machines?machine_id=eq.{}",
            self.url, machine_id
        );
        
        let mut body = serde_json::json!({
            "runner_status": status
        });
        
        if let Some(job) = current_job {
            body["current_job"] = serde_json::Value::String(job.to_string());
        } else {
            body["current_job"] = serde_json::Value::Null;
        }
        
        self.client
            .patch(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", format!("Bearer {}", self.anon_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
        
        Ok(())
    }

    async fn get_pending_commands(&self, host_machine_id: &str) -> Result<Vec<HostCommand>> {
        let url = format!(
            "{}/rest/v1/host_commands?host_machine_id=eq.{}&status=eq.pending&select=*",
            self.url, host_machine_id
        );
        
        let response = self.client
            .get(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", format!("Bearer {}", self.anon_key))
            .send()
            .await?;
        
        let commands: Vec<HostCommand> = response.json().await?;
        Ok(commands)
    }

    async fn update_command_status(
        &self,
        command_id: &str,
        status: &str,
        result: Option<&str>,
    ) -> Result<()> {
        let url = format!("{}/rest/v1/host_commands?id=eq.{}", self.url, command_id);
        
        let mut body = serde_json::json!({
            "status": status,
            "executed_at": chrono::Utc::now().to_rfc3339()
        });
        
        if let Some(r) = result {
            body["result"] = serde_json::Value::String(r.to_string());
        }
        
        self.client
            .patch(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", format!("Bearer {}", self.anon_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
        
        Ok(())
    }

    async fn add_log(&self, host_machine_id: &str, level: &str, message: &str) -> Result<()> {
        let url = format!("{}/rest/v1/host_logs", self.url);
        
        self.client
            .post(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", format!("Bearer {}", self.anon_key))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "host_machine_id": host_machine_id,
                "level": level,
                "message": message
            }))
            .send()
            .await?;
        
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
struct HostCommand {
    id: String,
    command: String,
    pin_verified: bool,
}

// ============================================
// Runner Manager
// ============================================

struct RunnerManager {
    runner_path: Option<String>,
    runner_process: Option<Child>,
}

impl RunnerManager {
    fn new(runner_path: Option<String>) -> Self {
        Self {
            runner_path,
            runner_process: None,
        }
    }

    async fn start(&mut self) -> Result<()> {
        let path = self.runner_path.as_ref()
            .context("Runner path not configured")?;
        
        let run_cmd = format!("{}\\run.cmd", path);
        
        if !std::path::Path::new(&run_cmd).exists() {
            anyhow::bail!("run.cmd not found at {}", run_cmd);
        }

        let child = Command::new("cmd")
            .args(["/C", &run_cmd])
            .current_dir(path)
            .spawn()
            .context("Failed to start runner")?;
        
        self.runner_process = Some(child);
        info!("Runner started");
        Ok(())
    }

    async fn stop(&mut self) -> Result<()> {
        if let Some(mut process) = self.runner_process.take() {
            process.kill().await?;
            info!("Runner stopped");
        }
        Ok(())
    }

    fn is_running(&mut self) -> bool {
        if let Some(ref mut process) = self.runner_process {
            match process.try_wait() {
                Ok(Some(_)) => {
                    self.runner_process = None;
                    false
                }
                Ok(None) => true,
                Err(_) => false,
            }
        } else {
            false
        }
    }
}

// ============================================
// Service State
// ============================================

struct ServiceState {
    running: AtomicBool,
    config: Option<ServiceConfig>,
    supabase: Option<SupabaseClient>,
    runner: Mutex<RunnerManager>,
}

impl ServiceState {
    fn new() -> Self {
        Self {
            running: AtomicBool::new(true),
            config: None,
            supabase: None,
            runner: Mutex::new(RunnerManager::new(None)),
        }
    }

    async fn initialize(&mut self) -> Result<()> {
        let config = ServiceConfig::load()
            .context("Failed to load configuration. Run the GUI app first to configure.")?;
        
        let supabase = SupabaseClient::new(&config.supabase_url, &config.supabase_anon_key);
        
        {
            let mut runner = self.runner.lock().await;
            runner.runner_path = config.runner_path.clone();
        }
        
        self.config = Some(config);
        self.supabase = Some(supabase);
        
        Ok(())
    }

    fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }
}

// ============================================
// Service Entry Point
// ============================================

define_windows_service!(ffi_service_main, service_main);

fn service_main(arguments: Vec<OsString>) {
    if let Err(e) = run_service(arguments) {
        error!("Service error: {}", e);
    }
}

fn run_service(_arguments: Vec<OsString>) -> Result<()> {
    let state = Arc::new(std::sync::Mutex::new(ServiceState::new()));
    let state_clone = Arc::clone(&state);

    let event_handler = move |control_event| -> ServiceControlHandlerResult {
        match control_event {
            ServiceControl::Stop | ServiceControl::Shutdown => {
                if let Ok(mut s) = state_clone.lock() {
                    s.stop();
                }
                ServiceControlHandlerResult::NoError
            }
            ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,
            _ => ServiceControlHandlerResult::NotImplemented,
        }
    };

    let status_handle = service_control_handler::register(SERVICE_NAME, event_handler)?;

    // Set service as running
    status_handle.set_service_status(ServiceStatus {
        service_type: SERVICE_TYPE,
        current_state: ServiceState::Running,
        controls_accepted: ServiceControlAccept::STOP | ServiceControlAccept::SHUTDOWN,
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    })?;

    // Create tokio runtime
    let rt = tokio::runtime::Runtime::new()?;
    
    rt.block_on(async {
        // Initialize
        {
            let mut s = state.lock().unwrap();
            if let Err(e) = s.initialize().await {
                error!("Failed to initialize: {}", e);
                return;
            }
        }

        // Main service loop
        let mut heartbeat_counter = 0u32;
        
        loop {
            {
                let s = state.lock().unwrap();
                if !s.is_running() {
                    break;
                }
            }

            // Heartbeat every 30 seconds (6 iterations at 5s interval)
            heartbeat_counter += 1;
            if heartbeat_counter >= 6 {
                heartbeat_counter = 0;
                
                let s = state.lock().unwrap();
                if let (Some(config), Some(supabase)) = (&s.config, &s.supabase) {
                    if let Some(machine_id) = &config.machine_id {
                        if let Err(e) = supabase.update_machine_status(machine_id, true).await {
                            warn!("Failed to send heartbeat: {}", e);
                        }
                    }
                }
            }

            // Check for pending commands
            {
                let s = state.lock().unwrap();
                if let (Some(config), Some(supabase)) = (&s.config, &s.supabase) {
                    if let Some(machine_id) = &config.machine_id {
                        match supabase.get_pending_commands(machine_id).await {
                            Ok(commands) => {
                                for cmd in commands {
                                    if !cmd.pin_verified {
                                        let _ = supabase.update_command_status(
                                            &cmd.id,
                                            "failed",
                                            Some("PIN not verified"),
                                        ).await;
                                        continue;
                                    }

                                    let _ = supabase.update_command_status(&cmd.id, "executing", None).await;

                                    let result = match cmd.command.as_str() {
                                        "start" => {
                                            let mut runner = s.runner.lock().await;
                                            match runner.start().await {
                                                Ok(_) => {
                                                    let _ = supabase.update_runner_status(machine_id, "idle", None).await;
                                                    let _ = supabase.add_log(machine_id, "info", "Runner started").await;
                                                    Ok(())
                                                }
                                                Err(e) => Err(e),
                                            }
                                        }
                                        "stop" => {
                                            let mut runner = s.runner.lock().await;
                                            match runner.stop().await {
                                                Ok(_) => {
                                                    let _ = supabase.update_runner_status(machine_id, "stopped", None).await;
                                                    let _ = supabase.add_log(machine_id, "info", "Runner stopped").await;
                                                    Ok(())
                                                }
                                                Err(e) => Err(e),
                                            }
                                        }
                                        _ => {
                                            Err(anyhow::anyhow!("Unknown command: {}", cmd.command))
                                        }
                                    };

                                    match result {
                                        Ok(_) => {
                                            let _ = supabase.update_command_status(&cmd.id, "completed", None).await;
                                        }
                                        Err(e) => {
                                            let _ = supabase.update_command_status(&cmd.id, "failed", Some(&e.to_string())).await;
                                            let _ = supabase.add_log(machine_id, "error", &format!("Command failed: {}", e)).await;
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                warn!("Failed to fetch commands: {}", e);
                            }
                        }
                    }
                }
            }

            // Sleep 5 seconds
            tokio::time::sleep(Duration::from_secs(5)).await;
        }

        // Cleanup
        {
            let s = state.lock().unwrap();
            if let (Some(config), Some(supabase)) = (&s.config, &s.supabase) {
                if let Some(machine_id) = &config.machine_id {
                    let _ = supabase.update_machine_status(machine_id, false).await;
                }
            }
            
            let mut runner = s.runner.lock().await;
            let _ = runner.stop().await;
        }
    });

    // Set service as stopped
    status_handle.set_service_status(ServiceStatus {
        service_type: SERVICE_TYPE,
        current_state: ServiceState::Stopped,
        controls_accepted: ServiceControlAccept::empty(),
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    })?;

    Ok(())
}

// ============================================
// Main
// ============================================

fn main() -> Result<()> {
    env_logger::init();

    // Check if running as a Windows service
    if std::env::args().any(|arg| arg == "--service") {
        service_dispatcher::start(SERVICE_NAME, ffi_service_main)?;
    } else {
        // Run interactively for testing
        println!("Running in interactive mode...");
        println!("Use --service flag when running as Windows service");
        
        let rt = tokio::runtime::Runtime::new()?;
        rt.block_on(async {
            let mut state = ServiceState::new();
            if let Err(e) = state.initialize().await {
                eprintln!("Failed to initialize: {}", e);
                eprintln!("Make sure to configure the service through the Birch Host GUI first.");
                return;
            }
            
            println!("Service initialized successfully");
            println!("Press Ctrl+C to stop...");
            
            loop {
                tokio::time::sleep(Duration::from_secs(5)).await;
                println!("Heartbeat...");
            }
        });
    }

    Ok(())
}




