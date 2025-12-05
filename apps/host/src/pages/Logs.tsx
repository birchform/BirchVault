import { useState } from 'react';
import { Terminal, Copy, Check, FileText, AlertTriangle, Filter } from 'lucide-react';
import LogViewer from '../components/LogViewer';
import { useRunnerStore } from '../store/useRunnerStore';

export default function Logs() {
  const { status, output, outputStrings, getErrorsOnly, getDiagnosticsReport } = useRunnerStore();
  
  // Copy button states
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedErrors, setCopiedErrors] = useState(false);
  const [copiedDiagnostics, setCopiedDiagnostics] = useState(false);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  const copyAllLogs = async () => {
    const content = outputStrings.join('\n');
    await navigator.clipboard.writeText(content);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const copyErrorsOnly = async () => {
    const errors = await getErrorsOnly();
    const content = errors
      .map(e => {
        const ts = new Date(e.timestamp).toLocaleTimeString();
        return `[${ts}] [${e.level.toUpperCase()}] ${e.message}`;
      })
      .join('\n');
    
    if (content) {
      await navigator.clipboard.writeText(content);
    } else {
      await navigator.clipboard.writeText('No errors found in the logs.');
    }
    setCopiedErrors(true);
    setTimeout(() => setCopiedErrors(false), 2000);
  };

  const copyDiagnosticsReport = async () => {
    setLoadingDiagnostics(true);
    try {
      const report = await getDiagnosticsReport();
      await navigator.clipboard.writeText(report);
      setCopiedDiagnostics(true);
      setTimeout(() => setCopiedDiagnostics(false), 2000);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  // Count errors
  const errorCount = output.filter(e => e.level === 'error' || e.level === 'warning').length;

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-github-text mb-2">Runner Logs</h1>
        <p className="text-github-muted">
          Real-time console output from the runner process
        </p>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-github-muted" />
          <span className="text-github-muted">Status:</span>
          <span
            className={
              status.state === 'stopped'
                ? 'text-github-muted'
                : status.state === 'error'
                ? 'text-github-danger'
                : 'text-github-accent'
            }
          >
            {status.state.charAt(0).toUpperCase() + status.state.slice(1)}
          </span>
        </div>
        <div className="text-github-muted">|</div>
        <div className="text-github-muted">{output.length} lines</div>
        {errorCount > 0 && (
          <>
            <div className="text-github-muted">|</div>
            <div className="flex items-center gap-1 text-github-danger">
              <AlertTriangle className="w-3.5 h-3.5" />
              {errorCount} {errorCount === 1 ? 'error' : 'errors'}
            </div>
          </>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        {/* Copy All Logs */}
        <button
          onClick={copyAllLogs}
          disabled={output.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-github-surface border border-github-border text-sm text-github-text hover:bg-github-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copiedAll ? (
            <>
              <Check className="w-4 h-4 text-github-accent" />
              <span className="text-github-accent">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy All Logs</span>
            </>
          )}
        </button>

        {/* Copy Errors Only */}
        <button
          onClick={copyErrorsOnly}
          disabled={output.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-github-surface border border-github-border text-sm text-github-text hover:bg-github-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copiedErrors ? (
            <>
              <Check className="w-4 h-4 text-github-accent" />
              <span className="text-github-accent">Copied!</span>
            </>
          ) : (
            <>
              <Filter className="w-4 h-4 text-github-danger" />
              <span>Copy Errors Only</span>
            </>
          )}
        </button>

        {/* Copy Diagnostics Report */}
        <button
          onClick={copyDiagnosticsReport}
          disabled={loadingDiagnostics}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-github-accent/10 border border-github-accent/30 text-sm text-github-accent hover:bg-github-accent/20 transition-colors disabled:opacity-50"
        >
          {copiedDiagnostics ? (
            <>
              <Check className="w-4 h-4" />
              <span>Copied!</span>
            </>
          ) : loadingDiagnostics ? (
            <>
              <div className="w-4 h-4 border-2 border-github-accent/30 border-t-github-accent rounded-full animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              <span>Copy Diagnostics Report</span>
            </>
          )}
        </button>
      </div>

      {/* Full Height Log Viewer */}
      <div className="flex-1 min-h-0">
        <div className="h-full bg-github-surface rounded-xl border border-github-border overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-github-border bg-github-bg">
            <h3 className="text-sm font-medium text-github-text flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Console Output
            </h3>
            <div className="flex items-center gap-2 text-xs text-github-muted">
              <span>Auto-scroll enabled</span>
              <div className="w-2 h-2 rounded-full bg-github-accent animate-pulse" />
            </div>
          </div>
          <LogViewer maxHeight="flex-1 h-[calc(100vh-380px)]" showControls={false} />
        </div>
      </div>
    </div>
  );
}
