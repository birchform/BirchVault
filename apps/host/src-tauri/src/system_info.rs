use serde::{Deserialize, Serialize};
use sysinfo::System;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub cpu_cores: usize,
    pub total_memory_gb: f64,
    pub available_memory_gb: f64,
    pub cpu_brand: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceRecommendation {
    pub recommended_cores: usize,
    pub max_cores: usize,
    pub recommended_memory_gb: f64,
    pub max_memory_gb: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ResourceSettings {
    pub cpu_cores: Option<usize>,      // None = use all cores
    pub memory_limit_gb: Option<f64>,   // None = no limit
    pub priority: ProcessPriority,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProcessPriority {
    Low,
    BelowNormal,
    #[default]
    Normal,
}

pub fn get_system_info() -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_cores = sys.cpus().len();
    let total_memory_bytes = sys.total_memory();
    let available_memory_bytes = sys.available_memory();

    // Convert bytes to GB
    let total_memory_gb = total_memory_bytes as f64 / 1_073_741_824.0;
    let available_memory_gb = available_memory_bytes as f64 / 1_073_741_824.0;

    let cpu_brand = sys
        .cpus()
        .first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_else(|| "Unknown CPU".to_string());

    SystemInfo {
        cpu_cores,
        total_memory_gb,
        available_memory_gb,
        cpu_brand,
    }
}

pub fn get_recommendations(system_info: &SystemInfo) -> ResourceRecommendation {
    // Recommended: 50% of resources (leaves plenty for normal use)
    // Max: 75% of resources (still leaves some headroom)
    
    let recommended_cores = (system_info.cpu_cores / 2).max(1);
    let max_cores = ((system_info.cpu_cores * 3) / 4).max(1);

    let recommended_memory_gb = (system_info.total_memory_gb / 2.0 * 10.0).round() / 10.0;
    let max_memory_gb = (system_info.total_memory_gb * 0.75 * 10.0).round() / 10.0;

    ResourceRecommendation {
        recommended_cores,
        max_cores,
        recommended_memory_gb,
        max_memory_gb,
    }
}

#[cfg(windows)]
pub mod windows_resources {
    use super::ProcessPriority;
    use windows::Win32::System::Threading::{
        OpenProcess, SetPriorityClass, SetProcessAffinityMask,
        BELOW_NORMAL_PRIORITY_CLASS, IDLE_PRIORITY_CLASS, NORMAL_PRIORITY_CLASS,
        PROCESS_SET_INFORMATION, PROCESS_QUERY_INFORMATION,
    };

    pub fn set_process_priority(pid: u32, priority: &ProcessPriority) -> anyhow::Result<()> {
        unsafe {
            let handle = OpenProcess(
                PROCESS_SET_INFORMATION | PROCESS_QUERY_INFORMATION,
                false,
                pid,
            )?;

            let priority_class = match priority {
                ProcessPriority::Low => IDLE_PRIORITY_CLASS,
                ProcessPriority::BelowNormal => BELOW_NORMAL_PRIORITY_CLASS,
                ProcessPriority::Normal => NORMAL_PRIORITY_CLASS,
            };

            SetPriorityClass(handle, priority_class)?;
        }
        Ok(())
    }

    pub fn set_cpu_affinity(pid: u32, cores: usize) -> anyhow::Result<()> {
        unsafe {
            let handle = OpenProcess(
                PROCESS_SET_INFORMATION | PROCESS_QUERY_INFORMATION,
                false,
                pid,
            )?;

            // Create affinity mask for first N cores
            // e.g., 4 cores = 0b1111 = 15
            let mask: usize = (1 << cores) - 1;

            SetProcessAffinityMask(handle, mask)?;
        }
        Ok(())
    }
}

