use crate::system_info::{windows_resources, ResourceSettings, ProcessPriority};
use chrono::{DateTime, Utc};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::mpsc;

// Windows: hide console window
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

// ============================================
// Log Entry with Timestamp
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Info,
    Error,
    Warning,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: DateTime<Utc>,
    pub level: LogLevel,
    pub message: String,
}

impl LogEntry {
    pub fn info(message: String) -> Self {
        Self {
            timestamp: Utc::now(),
            level: LogLevel::Info,
            message,
        }
    }

    pub fn error(message: String) -> Self {
        Self {
            timestamp: Utc::now(),
            level: LogLevel::Error,
            message,
        }
    }

    pub fn warning(message: String) -> Self {
        Self {
            timestamp: Utc::now(),
            level: LogLevel::Warning,
            message,
        }
    }
}

// ============================================
// Runner Status
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunnerStatus {
    pub state: RunnerState,
    pub started_at: Option<DateTime<Utc>>,
    pub runner_path: Option<String>,
    pub current_job: Option<String>,
    pub resource_settings: Option<ResourceSettings>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RunnerState {
    Stopped,
    Starting,
    Idle,
    Running,
    Error,
}

struct RunnerProcess {
    child: Child,
    kill_tx: mpsc::Sender<()>,
}

pub struct RunnerManager {
    process: Arc<Mutex<Option<RunnerProcess>>>,
    status: Arc<Mutex<RunnerStatus>>,
    output_buffer: Arc<Mutex<Vec<LogEntry>>>,
}

impl RunnerManager {
    pub fn new() -> Self {
        Self {
            process: Arc::new(Mutex::new(None)),
            status: Arc::new(Mutex::new(RunnerStatus {
                state: RunnerState::Stopped,
                started_at: None,
                runner_path: None,
                current_job: None,
                resource_settings: None,
            })),
            output_buffer: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub async fn start(&self, path: &str, resource_settings: Option<ResourceSettings>) -> anyhow::Result<()> {
        // Check if already running
        {
            let process = self.process.lock();
            if process.is_some() {
                anyhow::bail!("Runner is already running");
            }
        }

        // Update status to starting
        {
            let mut status = self.status.lock();
            status.state = RunnerState::Starting;
            status.runner_path = Some(path.to_string());
        }

        // Clear output buffer
        {
            let mut buffer = self.output_buffer.lock();
            buffer.clear();
        }

        let run_cmd = std::path::Path::new(path).join("run.cmd");
        if !run_cmd.exists() {
            let mut status = self.status.lock();
            status.state = RunnerState::Error;
            anyhow::bail!("run.cmd not found at {}", run_cmd.display());
        }

        // Create kill channel
        let (kill_tx, mut kill_rx) = mpsc::channel::<()>(1);

        // Spawn the runner process (hidden window on Windows)
        #[cfg(target_os = "windows")]
        let mut child = {
            #[allow(unused_imports)]
            use std::os::windows::process::CommandExt;
            
            // Build enhanced PATH with Git Bash to ensure bash is available for GitHub Actions
            let current_path = std::env::var("PATH").unwrap_or_default();
            let git_paths = [
                r"C:\Program Files\Git\bin",
                r"C:\Program Files\Git\usr\bin",
                r"C:\Program Files (x86)\Git\bin",
            ];
            let enhanced_path = format!("{};{}", git_paths.join(";"), current_path);
            
            Command::new("cmd")
                .args(["/C", run_cmd.to_str().unwrap()])
                .current_dir(path)
                .env("PATH", &enhanced_path)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .stdin(Stdio::null())
                .kill_on_drop(true)
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()?
        };

        #[cfg(not(target_os = "windows"))]
        let mut child = Command::new("sh")
            .args(["-c", run_cmd.to_str().unwrap()])
            .current_dir(path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .stdin(Stdio::null())
            .kill_on_drop(true)
            .spawn()?;

        let stdout = child.stdout.take().expect("Failed to capture stdout");
        let stderr = child.stderr.take().expect("Failed to capture stderr");

        // Get the PID before storing (for resource limits)
        let pid = child.id();

        // Store the process
        {
            let mut process = self.process.lock();
            *process = Some(RunnerProcess {
                child,
                kill_tx: kill_tx.clone(),
            });
        }

        // Apply resource settings if provided
        if let Some(ref settings) = resource_settings {
            if let Some(pid) = pid {
                // Apply CPU affinity
                if let Some(cores) = settings.cpu_cores {
                    if let Err(e) = windows_resources::set_cpu_affinity(pid, cores) {
                        log::warn!("Failed to set CPU affinity: {}", e);
                    } else {
                        log::info!("Set CPU affinity to {} cores", cores);
                    }
                }

                // Apply process priority
                if settings.priority != ProcessPriority::Normal {
                    if let Err(e) = windows_resources::set_process_priority(pid, &settings.priority) {
                        log::warn!("Failed to set process priority: {}", e);
                    } else {
                        log::info!("Set process priority to {:?}", settings.priority);
                    }
                }
            }
        }

        // Update status
        {
            let mut status = self.status.lock();
            status.state = RunnerState::Idle;
            status.started_at = Some(Utc::now());
            status.resource_settings = resource_settings;
        }

        // Spawn task to read stdout
        let output_buffer = self.output_buffer.clone();
        let status_clone = self.status.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                // Parse the line to detect job status
                if line.contains("Running job:") {
                    let mut status = status_clone.lock();
                    status.state = RunnerState::Running;
                    // Extract job name if possible
                    if let Some(job_name) = line.split("Running job:").nth(1) {
                        status.current_job = Some(job_name.trim().to_string());
                    }
                } else if line.contains("Job") && line.contains("completed") {
                    let mut status = status_clone.lock();
                    status.state = RunnerState::Idle;
                    status.current_job = None;
                } else if line.contains("Listening for Jobs") {
                    let mut status = status_clone.lock();
                    status.state = RunnerState::Idle;
                } 
                // Detect job failures - these indicate the job finished (even if failed)
                else if line.contains("failed") || 
                        line.contains("Failed") || 
                        line.contains("Job completed with result: Failed") ||
                        line.contains("Process completed with exit code") ||
                        line.contains("##[error]") ||
                        line.contains("Exiting with return code") {
                    let mut status = status_clone.lock();
                    // Job finished (albeit failed), go back to idle
                    status.state = RunnerState::Idle;
                    status.current_job = None;
                }

                // Determine log level from content
                let entry = if line.contains("error") || line.contains("Error") || line.contains("ERROR") {
                    LogEntry::error(line)
                } else if line.contains("warn") || line.contains("Warn") || line.contains("WARN") {
                    LogEntry::warning(line)
                } else {
                    LogEntry::info(line)
                };

                let mut buffer = output_buffer.lock();
                buffer.push(entry);
                // Keep only last 2000 entries (increased from 500 for better history)
                if buffer.len() > 2000 {
                    buffer.remove(0);
                }
            }
        });

        // Spawn task to read stderr
        let output_buffer = self.output_buffer.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let entry = LogEntry::error(line);
                let mut buffer = output_buffer.lock();
                buffer.push(entry);
                if buffer.len() > 2000 {
                    buffer.remove(0);
                }
            }
        });

        // Spawn task to handle process exit
        let process_ref = self.process.clone();
        let status_ref = self.status.clone();
        tokio::spawn(async move {
            tokio::select! {
                _ = kill_rx.recv() => {
                    // Kill signal received
                }
                _ = async {
                    // Wait a bit then check periodically if process is still running
                    loop {
                        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                        let mut process = process_ref.lock();
                        if let Some(ref mut p) = *process {
                            match p.child.try_wait() {
                                Ok(Some(_)) => {
                                    // Process exited
                                    *process = None;
                                    let mut status = status_ref.lock();
                                    status.state = RunnerState::Stopped;
                                    status.current_job = None;
                                    break;
                                }
                                Ok(None) => {
                                    // Still running
                                }
                                Err(_) => {
                                    *process = None;
                                    let mut status = status_ref.lock();
                                    status.state = RunnerState::Error;
                                    break;
                                }
                            }
                        } else {
                            break;
                        }
                    }
                } => {}
            }
        });

        Ok(())
    }

    pub async fn stop(&self) -> anyhow::Result<()> {
        // Take the process out of the lock before awaiting
        let process_opt = {
            let mut process = self.process.lock();
            process.take()
        };

        if let Some(mut p) = process_opt {
            // Send kill signal
            let _ = p.kill_tx.send(()).await;
            
            // Get PID before killing - we need to kill the entire process tree
            if let Some(pid) = p.child.id() {
                // Windows: use taskkill to kill entire process tree
                // This ensures Runner.Listener.exe (child of cmd.exe) is also killed
                #[cfg(target_os = "windows")]
                {
                    use std::os::windows::process::CommandExt;
                    let _ = std::process::Command::new("taskkill")
                        .args(["/F", "/T", "/PID", &pid.to_string()])
                        .creation_flags(CREATE_NO_WINDOW)
                        .output();
                }
                
                #[cfg(not(target_os = "windows"))]
                {
                    let _ = p.child.kill().await;
                }
            } else {
                // Fallback if we can't get PID
                let _ = p.child.kill().await;
            }
        }

        {
            let mut status = self.status.lock();
            status.state = RunnerState::Stopped;
            status.current_job = None;
        }

        Ok(())
    }

    pub async fn get_status(&self) -> RunnerStatus {
        self.status.lock().clone()
    }

    pub async fn get_output(&self) -> Vec<LogEntry> {
        self.output_buffer.lock().clone()
    }

    pub async fn get_output_strings(&self) -> Vec<String> {
        self.output_buffer.lock()
            .iter()
            .map(|e| {
                let timestamp = e.timestamp.format("%H:%M:%S").to_string();
                let level = match e.level {
                    LogLevel::Error => "[ERR]",
                    LogLevel::Warning => "[WARN]",
                    LogLevel::Info => "[INFO]",
                };
                format!("[{}] {} {}", timestamp, level, e.message)
            })
            .collect()
    }

    pub async fn get_errors_only(&self) -> Vec<LogEntry> {
        self.output_buffer.lock()
            .iter()
            .filter(|e| matches!(e.level, LogLevel::Error | LogLevel::Warning))
            .cloned()
            .collect()
    }

    pub async fn clear_output(&self) {
        self.output_buffer.lock().clear();
    }

    /// Sync local status with GitHub API status to prevent drift
    /// Call this when GitHub API reports a job has completed but local state shows running
    pub async fn sync_with_github(&self, github_status: &str, _github_conclusion: Option<&str>) {
        let mut status = self.status.lock();
        
        // If GitHub says completed but we think we're running, fix it
        if status.state == RunnerState::Running && github_status == "completed" {
            log::info!("Syncing status with GitHub: job completed, updating local state to Idle");
            status.state = RunnerState::Idle;
            status.current_job = None;
        }
    }

    /// Force reset the status to idle (useful when status gets stuck)
    pub async fn force_reset_status(&self) {
        let mut status = self.status.lock();
        if status.state == RunnerState::Running {
            log::warn!("Force resetting runner status from Running to Idle");
            status.state = RunnerState::Idle;
            status.current_job = None;
        }
    }

    pub async fn generate_diagnostics_report(&self) -> String {
        let status = self.status.lock().clone();
        let logs = self.output_buffer.lock().clone();
        
        let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ");
        
        // Get recent errors
        let errors: Vec<&LogEntry> = logs.iter()
            .filter(|e| matches!(e.level, LogLevel::Error | LogLevel::Warning))
            .collect();
        
        // Format errors section
        let errors_section = if errors.is_empty() {
            "None".to_string()
        } else {
            errors.iter()
                .map(|e| {
                    let ts = e.timestamp.format("%H:%M:%S").to_string();
                    format!("[{}] {}", ts, e.message)
                })
                .collect::<Vec<_>>()
                .join("\n")
        };
        
        // Get last 50 log entries
        let log_start = if logs.len() > 50 { logs.len() - 50 } else { 0 };
        let recent_logs: Vec<String> = logs[log_start..].iter()
            .map(|e| {
                let ts = e.timestamp.format("%H:%M:%S").to_string();
                let level = match e.level {
                    LogLevel::Error => "ERR",
                    LogLevel::Warning => "WARN",
                    LogLevel::Info => "INFO",
                };
                format!("[{}] {} {}", ts, level, e.message)
            })
            .collect();
        
        format!(
r#"=== Birch Host Diagnostics Report ===
Generated: {}
Tool Version: 0.1.0

[RUNNER STATUS]
State: {:?}
Started At: {}
Runner Path: {}
Current Job: {}

[ERRORS]
{}

[RECENT LOG]
{}
"#,
            now,
            status.state,
            status.started_at.map(|t| t.format("%Y-%m-%dT%H:%M:%SZ").to_string()).unwrap_or("N/A".to_string()),
            status.runner_path.as_deref().unwrap_or("N/A"),
            status.current_job.as_deref().unwrap_or("None"),
            errors_section,
            recent_logs.join("\n")
        )
    }
}

