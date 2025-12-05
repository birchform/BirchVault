import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  CheckCircle2,
  XCircle,
  Clock,
  SkipForward,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  RefreshCw,
  Copy,
  Check,
  X,
} from 'lucide-react';

// Types matching Rust structs
interface JobStep {
  name: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';
  start_time: string | null;
  end_time: string | null;
  duration_ms: number | null;
  error_message: string | null;
}

interface JobLogEntry {
  timestamp: string;
  level: string;
  component: string;
  message: string;
}

interface JobDetails {
  job_name: string | null;
  workflow_file: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  steps: JobStep[];
  errors: JobLogEntry[];
  warnings: JobLogEntry[];
  raw_log_path: string;
}

interface WorkerLogFile {
  filename: string;
  path: string;
  timestamp: string;
  size_bytes: number;
}

interface JobDetailProps {
  runnerPath: string;
  onClose?: () => void;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function StepIcon({ status }: { status: JobStep['status'] }) {
  switch (status) {
    case 'succeeded':
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case 'failed':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'running':
      return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
    case 'skipped':
      return <SkipForward className="w-5 h-5 text-gray-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
}

function StepRow({ step, isExpanded, onToggle }: { step: JobStep; isExpanded: boolean; onToggle: () => void }) {
  const hasError = !!step.error_message;
  
  return (
    <div className="border-b border-github-border last:border-b-0">
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-github-surface/50 transition-colors ${
          step.status === 'failed' ? 'bg-red-500/5' : ''
        }`}
        onClick={onToggle}
      >
        {hasError ? (
          <ChevronRight className={`w-4 h-4 text-github-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        ) : (
          <div className="w-4" />
        )}
        <StepIcon status={step.status} />
        <span className={`flex-1 ${step.status === 'skipped' ? 'text-github-muted' : 'text-github-text'}`}>
          {step.name}
        </span>
        <span className="text-sm text-github-muted">
          {formatDuration(step.duration_ms)}
        </span>
      </div>
      
      {isExpanded && step.error_message && (
        <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/20">
          <pre className="text-sm text-red-400 whitespace-pre-wrap font-mono overflow-x-auto">
            {step.error_message}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function JobDetail({ runnerPath, onClose }: JobDetailProps) {
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [logFiles, setLogFiles] = useState<WorkerLogFile[]>([]);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [showErrors, setShowErrors] = useState(true);
  const [copied, setCopied] = useState(false);

  // Load log files list
  useEffect(() => {
    async function loadLogFiles() {
      try {
        const files = await invoke<WorkerLogFile[]>('list_job_logs', { runnerPath });
        setLogFiles(files);
        if (files.length > 0 && !selectedLog) {
          setSelectedLog(files[0].path);
        }
      } catch (e) {
        console.error('Failed to load log files:', e);
      }
    }
    loadLogFiles();
  }, [runnerPath]);

  // Load job details when selected log changes
  useEffect(() => {
    async function loadJobDetails() {
      if (!selectedLog) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const details = await invoke<JobDetails>('get_job_details', { logPath: selectedLog });
        setJobDetails(details);
        
        // Auto-expand failed steps
        const failedIndices = new Set<number>();
        details.steps.forEach((step, idx) => {
          if (step.status === 'failed' && step.error_message) {
            failedIndices.add(idx);
          }
        });
        setExpandedSteps(failedIndices);
      } catch (e) {
        setError(e as string);
      } finally {
        setLoading(false);
      }
    }
    loadJobDetails();
  }, [selectedLog]);

  const toggleStep = (index: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const copyErrors = async () => {
    if (!jobDetails) return;
    
    const errorText = jobDetails.errors
      .map(e => `[${e.timestamp}] [${e.component}] ${e.message}`)
      .join('\n');
    
    const stepErrors = jobDetails.steps
      .filter(s => s.error_message)
      .map(s => `Step "${s.name}": ${s.error_message}`)
      .join('\n\n');
    
    const fullText = `=== Errors ===\n${errorText}\n\n=== Step Errors ===\n${stepErrors}`;
    
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const refresh = async () => {
    if (selectedLog) {
      setLoading(true);
      try {
        const details = await invoke<JobDetails>('get_job_details', { logPath: selectedLog });
        setJobDetails(details);
      } catch (e) {
        setError(e as string);
      } finally {
        setLoading(false);
      }
    }
  };

  // Count stats
  const stats = jobDetails ? {
    total: jobDetails.steps.length,
    succeeded: jobDetails.steps.filter(s => s.status === 'succeeded').length,
    failed: jobDetails.steps.filter(s => s.status === 'failed').length,
    skipped: jobDetails.steps.filter(s => s.status === 'skipped').length,
  } : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-github-border bg-github-bg">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-github-accent" />
          <h2 className="text-lg font-semibold text-github-text">Job Details</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Log file selector */}
          <select
            value={selectedLog || ''}
            onChange={(e) => setSelectedLog(e.target.value)}
            className="px-3 py-1.5 bg-github-surface border border-github-border rounded-lg text-sm text-github-text"
          >
            {logFiles.map((file) => (
              <option key={file.path} value={file.path}>
                {file.timestamp.replace('-', ' ').replace('-utc', '')}
              </option>
            ))}
          </select>
          
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 hover:bg-github-surface rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-github-muted ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-github-surface rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-github-muted" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-github-accent animate-spin" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center text-red-400">
          <AlertTriangle className="w-6 h-6 mr-2" />
          {error}
        </div>
      ) : jobDetails ? (
        <div className="flex-1 overflow-auto">
          {/* Job Summary */}
          <div className="px-6 py-4 bg-github-surface/50 border-b border-github-border">
            <div className="flex items-center gap-4 mb-3">
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                jobDetails.status === 'Succeeded' ? 'bg-green-500/20 text-green-400' :
                jobDetails.status === 'Failed' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {jobDetails.status}
              </span>
              {jobDetails.workflow_file && (
                <span className="text-sm text-github-muted">
                  {jobDetails.workflow_file}
                </span>
              )}
            </div>
            
            {stats && (
              <div className="flex items-center gap-6 text-sm">
                <span className="text-github-muted">
                  {stats.total} steps
                </span>
                <span className="text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {stats.succeeded}
                </span>
                <span className="text-red-400 flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> {stats.failed}
                </span>
                <span className="text-github-muted flex items-center gap-1">
                  <SkipForward className="w-4 h-4" /> {stats.skipped}
                </span>
              </div>
            )}
          </div>

          {/* Steps List */}
          <div className="border-b border-github-border">
            <div className="px-4 py-2 bg-github-bg text-sm font-medium text-github-muted">
              Steps
            </div>
            {jobDetails.steps.map((step, idx) => (
              <StepRow
                key={idx}
                step={step}
                isExpanded={expandedSteps.has(idx)}
                onToggle={() => toggleStep(idx)}
              />
            ))}
          </div>

          {/* Errors Section */}
          {(jobDetails.errors.length > 0 || jobDetails.warnings.length > 0) && (
            <div>
              <div
                className="px-4 py-2 bg-github-bg text-sm font-medium text-github-muted flex items-center justify-between cursor-pointer"
                onClick={() => setShowErrors(!showErrors)}
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Errors & Warnings ({jobDetails.errors.length + jobDetails.warnings.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); copyErrors(); }}
                    className="p-1 hover:bg-github-surface rounded"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showErrors ? '' : '-rotate-90'}`} />
                </div>
              </div>
              
              {showErrors && (
                <div className="max-h-64 overflow-auto bg-github-surface/30">
                  {jobDetails.errors.map((err, idx) => (
                    <div key={`err-${idx}`} className="px-4 py-2 border-b border-github-border/50 text-sm">
                      <span className="text-red-400 font-mono">[ERROR]</span>
                      <span className="text-github-muted ml-2">{err.timestamp}</span>
                      <div className="text-github-text mt-1 font-mono text-xs break-all">
                        {err.message}
                      </div>
                    </div>
                  ))}
                  {jobDetails.warnings.map((warn, idx) => (
                    <div key={`warn-${idx}`} className="px-4 py-2 border-b border-github-border/50 text-sm">
                      <span className="text-yellow-400 font-mono">[WARN]</span>
                      <span className="text-github-muted ml-2">{warn.timestamp}</span>
                      <div className="text-github-text mt-1 font-mono text-xs break-all">
                        {warn.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-github-muted">
          No job logs found
        </div>
      )}
    </div>
  );
}

