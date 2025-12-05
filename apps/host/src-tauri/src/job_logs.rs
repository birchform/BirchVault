use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use regex::Regex;
use chrono::DateTime;

// ============================================
// Job Step Data Structures
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobStep {
    pub name: String,
    pub status: StepStatus,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub duration_ms: Option<u64>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum StepStatus {
    Pending,
    Running,
    Succeeded,
    Failed,
    Skipped,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobLogEntry {
    pub timestamp: String,
    pub level: String,
    pub component: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobDetails {
    pub job_name: Option<String>,
    pub workflow_file: Option<String>,
    pub status: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub steps: Vec<JobStep>,
    pub errors: Vec<JobLogEntry>,
    pub warnings: Vec<JobLogEntry>,
    pub raw_log_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerLogFile {
    pub filename: String,
    pub path: String,
    pub timestamp: String,
    pub size_bytes: u64,
}

// ============================================
// Log Parsing Functions
// ============================================

/// List all available worker log files
pub fn list_worker_logs(runner_path: &str) -> Vec<WorkerLogFile> {
    let diag_path = Path::new(runner_path).join("_diag");
    let mut logs = Vec::new();

    if let Ok(entries) = fs::read_dir(&diag_path) {
        for entry in entries.flatten() {
            let filename = entry.file_name().to_string_lossy().to_string();
            if filename.starts_with("Worker_") && filename.ends_with(".log") {
                if let Ok(metadata) = entry.metadata() {
                    // Extract timestamp from filename: Worker_20251205-005006-utc.log
                    let timestamp = filename
                        .strip_prefix("Worker_")
                        .and_then(|s| s.strip_suffix("-utc.log"))
                        .unwrap_or("")
                        .to_string();

                    logs.push(WorkerLogFile {
                        filename: filename.clone(),
                        path: entry.path().to_string_lossy().to_string(),
                        timestamp,
                        size_bytes: metadata.len(),
                    });
                }
            }
        }
    }

    // Sort by timestamp descending (newest first)
    logs.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    logs
}

/// Parse a worker log file and extract job details
pub fn parse_worker_log(log_path: &str) -> Result<JobDetails, String> {
    let content = fs::read_to_string(log_path)
        .map_err(|e| format!("Failed to read log file: {}", e))?;

    let lines: Vec<&str> = content.lines().collect();
    
    let job_name: Option<String> = None;
    let mut workflow_file: Option<String> = None;
    let mut status = "Unknown".to_string();
    let mut started_at: Option<String> = None;
    let mut completed_at: Option<String> = None;
    let mut steps: Vec<JobStep> = Vec::new();
    let mut errors: Vec<JobLogEntry> = Vec::new();
    let mut warnings: Vec<JobLogEntry> = Vec::new();

    // Regex patterns
    let log_line_re = Regex::new(r"^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}Z) (INFO|ERR|WARN)\s+(\w+)\] (.*)$").unwrap();
    let step_processing_re = Regex::new(r"Processing step: DisplayName='([^']+)'").unwrap();
    let step_result_re = Regex::new(r"Step result: (\w+)").unwrap();
    let job_result_re = Regex::new(r"Job result after all job steps finish: (\w+)").unwrap();
    let exception_re = Regex::new(r"Caught exception from step: (.+)").unwrap();

    let mut current_step: Option<JobStep> = None;

    for line in &lines {
        // Check for workflow file in JSON section
        if line.contains(".github/workflows/") && workflow_file.is_none() {
            if let Some(start) = line.find(".github/workflows/") {
                let rest = &line[start..];
                if let Some(end) = rest.find('"') {
                    workflow_file = Some(rest[..end].to_string());
                }
            }
        }

        // Parse structured log lines
        if let Some(caps) = log_line_re.captures(line) {
            let timestamp = caps.get(1).map(|m| m.as_str()).unwrap_or("");
            let level = caps.get(2).map(|m| m.as_str()).unwrap_or("");
            let component = caps.get(3).map(|m| m.as_str()).unwrap_or("");
            let message = caps.get(4).map(|m| m.as_str()).unwrap_or("");

            // Track start time
            if started_at.is_none() && component == "Worker" {
                started_at = Some(timestamp.to_string());
            }

            // Look for step processing
            if let Some(step_caps) = step_processing_re.captures(message) {
                // Save previous step if exists
                if let Some(mut step) = current_step.take() {
                    step.end_time = Some(timestamp.to_string());
                    if let (Some(start), Some(end)) = (&step.start_time, &step.end_time) {
                        step.duration_ms = calculate_duration(start, end);
                    }
                    steps.push(step);
                }

                let step_name = step_caps.get(1).map(|m| m.as_str()).unwrap_or("Unknown").to_string();
                current_step = Some(JobStep {
                    name: step_name,
                    status: StepStatus::Pending,
                    start_time: None,
                    end_time: None,
                    duration_ms: None,
                    error_message: None,
                });
            }

            // Look for "Starting the step"
            if message.contains("Starting the step.") {
                if let Some(ref mut step) = current_step {
                    step.status = StepStatus::Running;
                    step.start_time = Some(timestamp.to_string());
                }
            }

            // Look for step result
            if let Some(result_caps) = step_result_re.captures(message) {
                let result = result_caps.get(1).map(|m| m.as_str()).unwrap_or("");
                if let Some(ref mut step) = current_step {
                    step.status = match result {
                        "Succeeded" => StepStatus::Succeeded,
                        "Failed" => StepStatus::Failed,
                        "Skipped" => StepStatus::Skipped,
                        _ => StepStatus::Pending,
                    };
                    step.end_time = Some(timestamp.to_string());
                    if let (Some(start), Some(end)) = (&step.start_time, &step.end_time) {
                        step.duration_ms = calculate_duration(start, end);
                    }
                }
            }

            // Look for "Skipping step"
            if message.contains("Skipping step due to condition evaluation") {
                if let Some(ref mut step) = current_step {
                    step.status = StepStatus::Skipped;
                    step.end_time = Some(timestamp.to_string());
                }
            }

            // Look for exceptions/errors in steps
            if let Some(exc_caps) = exception_re.captures(message) {
                let error_msg = exc_caps.get(1).map(|m| m.as_str()).unwrap_or("").to_string();
                if let Some(ref mut step) = current_step {
                    step.error_message = Some(error_msg.clone());
                    step.status = StepStatus::Failed;
                }
            }

            // Look for job final result
            if let Some(job_caps) = job_result_re.captures(message) {
                let result = job_caps.get(1).map(|m| m.as_str()).unwrap_or("Unknown");
                status = result.to_string();
                completed_at = Some(timestamp.to_string());
            }

            // Collect errors
            if level == "ERR" {
                errors.push(JobLogEntry {
                    timestamp: timestamp.to_string(),
                    level: "error".to_string(),
                    component: component.to_string(),
                    message: message.to_string(),
                });
            }

            // Collect warnings
            if level == "WARN" {
                warnings.push(JobLogEntry {
                    timestamp: timestamp.to_string(),
                    level: "warning".to_string(),
                    component: component.to_string(),
                    message: message.to_string(),
                });
            }
        }

        // Also capture error lines without timestamp (multi-line errors)
        if line.contains("command not found") || line.contains("FileNotFoundException") {
            errors.push(JobLogEntry {
                timestamp: "".to_string(),
                level: "error".to_string(),
                component: "".to_string(),
                message: line.to_string(),
            });
        }
    }

    // Don't forget the last step
    if let Some(mut step) = current_step.take() {
        if step.end_time.is_none() {
            step.end_time = completed_at.clone();
        }
        if let (Some(start), Some(end)) = (&step.start_time, &step.end_time) {
            step.duration_ms = calculate_duration(start, end);
        }
        steps.push(step);
    }

    // Filter out internal/duplicate steps and keep meaningful ones
    let meaningful_steps: Vec<JobStep> = steps
        .into_iter()
        .filter(|s| {
            !s.name.starts_with("Post ") || s.status == StepStatus::Failed
        })
        .collect();

    Ok(JobDetails {
        job_name,
        workflow_file,
        status,
        started_at,
        completed_at,
        steps: meaningful_steps,
        errors,
        warnings,
        raw_log_path: log_path.to_string(),
    })
}

/// Get the most recent job details
pub fn get_latest_job_details(runner_path: &str) -> Result<JobDetails, String> {
    let logs = list_worker_logs(runner_path);
    
    if logs.is_empty() {
        return Err("No worker logs found".to_string());
    }

    // Get the most recent log
    let latest = &logs[0];
    parse_worker_log(&latest.path)
}

/// Calculate duration between two timestamps
fn calculate_duration(start: &str, end: &str) -> Option<u64> {
    let start_dt = DateTime::parse_from_str(&format!("{} +0000", start), "%Y-%m-%d %H:%M:%SZ %z").ok()?;
    let end_dt = DateTime::parse_from_str(&format!("{} +0000", end), "%Y-%m-%d %H:%M:%SZ %z").ok()?;
    
    let duration = end_dt.signed_duration_since(start_dt);
    Some(duration.num_milliseconds().max(0) as u64)
}

// ============================================
// Tauri Commands
// ============================================

#[tauri::command]
pub fn list_job_logs(runner_path: String) -> Result<Vec<WorkerLogFile>, String> {
    Ok(list_worker_logs(&runner_path))
}

#[tauri::command]
pub fn get_job_details(log_path: String) -> Result<JobDetails, String> {
    parse_worker_log(&log_path)
}

#[tauri::command]
pub fn get_latest_job(runner_path: String) -> Result<JobDetails, String> {
    get_latest_job_details(&runner_path)
}

