import { Play, Square, Loader2, AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { useRunnerStore, RunnerState } from '../store/useRunnerStore';
import { useState } from 'react';

const statusConfig: Record<
  RunnerState,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  stopped: {
    label: 'Stopped',
    color: 'text-github-muted',
    bgColor: 'bg-github-muted/20',
    icon: Square,
  },
  starting: {
    label: 'Starting...',
    color: 'text-github-warning',
    bgColor: 'bg-github-warning/20',
    icon: Loader2,
  },
  idle: {
    label: 'Idle - Listening',
    color: 'text-github-accent',
    bgColor: 'bg-github-accent/20',
    icon: CheckCircle2,
  },
  running: {
    label: 'Running Job',
    color: 'text-github-info',
    bgColor: 'bg-github-info/20',
    icon: Loader2,
  },
  error: {
    label: 'Error',
    color: 'text-github-danger',
    bgColor: 'bg-github-danger/20',
    icon: AlertCircle,
  },
};

export default function StatusCard() {
  const { status, isLoading, error, startRunner, stopRunner, settings, forceResetStatus, jobs } =
    useRunnerStore();
  const [isResetting, setIsResetting] = useState(false);

  const config = statusConfig[status.state];
  const StatusIcon = config.icon;
  const isRunning = status.state !== 'stopped' && status.state !== 'error';

  // Check if status might be stale (running for over 1 hour with no matching in-progress job)
  const isStaleStatus = (): boolean => {
    if (status.state !== 'running' || !status.started_at) return false;
    
    const startTime = new Date(status.started_at).getTime();
    const now = Date.now();
    const runningForOverAnHour = (now - startTime) > 3600000; // 1 hour
    
    // Also check if GitHub API shows no in-progress jobs
    const hasInProgressJob = jobs.some(j => j.status === 'in_progress');
    
    return runningForOverAnHour || (!hasInProgressJob && jobs.length > 0 && !!status.current_job);
  };

  const handleForceReset = async () => {
    setIsResetting(true);
    try {
      await forceResetStatus();
    } finally {
      setIsResetting(false);
    }
  };

  const formatUptime = () => {
    if (!status.started_at) return null;
    const start = new Date(status.started_at);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const handleToggle = async () => {
    if (isRunning) {
      await stopRunner();
    } else {
      await startRunner();
    }
  };

  return (
    <div className="bg-github-surface rounded-xl border border-github-border p-6">
      {/* Status Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-github-text">Runner Status</h2>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor}`}
        >
          <StatusIcon
            className={`w-4 h-4 ${config.color} ${
              status.state === 'starting' || status.state === 'running'
                ? 'animate-spin'
                : ''
            }`}
          />
          <span className={`text-sm font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="relative">
          <div
            className={`w-32 h-32 rounded-full ${config.bgColor} flex items-center justify-center ${
              status.state === 'idle' ? 'status-pulse' : ''
            }`}
          >
            <div
              className={`w-24 h-24 rounded-full ${
                status.state === 'stopped'
                  ? 'bg-github-bg'
                  : status.state === 'error'
                  ? 'bg-github-danger/30'
                  : 'bg-github-accent/30'
              } flex items-center justify-center`}
            >
              <StatusIcon
                className={`w-12 h-12 ${config.color} ${
                  status.state === 'starting' || status.state === 'running'
                    ? 'animate-spin-slow'
                    : ''
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {status.started_at && (
          <div className="bg-github-bg rounded-lg p-4">
            <div className="flex items-center gap-2 text-github-muted mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wide">Uptime</span>
            </div>
            <p className="text-lg font-mono text-github-text">{formatUptime()}</p>
          </div>
        )}

        {status.current_job && (
          <div className="bg-github-bg rounded-lg p-4 col-span-2">
            <div className="text-github-muted text-xs uppercase tracking-wide mb-1">
              Current Job
            </div>
            <p className="text-github-text font-medium truncate">
              {status.current_job}
            </p>
          </div>
        )}
      </div>

      {/* Stale Status Warning */}
      {isStaleStatus() && (
        <div className="bg-github-warning/10 border border-github-warning/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-github-warning">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Status may be stale - no matching job found on GitHub</span>
            </div>
            <button
              onClick={handleForceReset}
              disabled={isResetting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-github-warning/20 text-github-warning text-xs font-medium hover:bg-github-warning/30 transition-colors disabled:opacity-50"
              title="Force reset status to idle"
            >
              {isResetting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Reset Status
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-github-danger/10 border border-github-danger/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-github-danger">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Control Button */}
      <button
        onClick={handleToggle}
        disabled={isLoading || !settings.runnerPath}
        className={`w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-200 ${
          isRunning
            ? 'bg-github-danger hover:bg-github-danger/80 text-white'
            : 'bg-github-accent hover:bg-github-accentHover text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isRunning ? (
          <>
            <Square className="w-5 h-5" />
            Stop Runner
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            Start Runner
          </>
        )}
      </button>

      {!settings.runnerPath && (
        <p className="text-center text-github-warning text-sm mt-3">
          Configure runner path in Settings first
        </p>
      )}
    </div>
  );
}

