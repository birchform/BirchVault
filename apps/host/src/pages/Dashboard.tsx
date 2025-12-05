import { useEffect } from 'react';
import { Activity, Server, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import StatusCard from '../components/StatusCard';
import LogViewer from '../components/LogViewer';
import { useRunnerStore } from '../store/useRunnerStore';

export default function Dashboard() {
  const { jobs, fetchJobs, jobsLoading, settings } = useRunnerStore();

  useEffect(() => {
    fetchJobs();
    // Refresh jobs every 30 seconds
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const successCount = jobs.filter(
    (j) => j.conclusion === 'success'
  ).length;
  const failureCount = jobs.filter(
    (j) => j.conclusion === 'failure'
  ).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-github-text mb-2">Dashboard</h1>
        <p className="text-github-muted">
          Monitor and control your GitHub Actions self-hosted runner
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Status Card - Left Column */}
        <div className="col-span-5">
          <StatusCard />
        </div>

        {/* Stats and Quick Info - Right Column */}
        <div className="col-span-7 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-github-surface rounded-xl border border-github-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-github-info/20 rounded-lg">
                  <Activity className="w-5 h-5 text-github-info" />
                </div>
                <span className="text-sm text-github-muted">Recent Runs</span>
              </div>
              <p className="text-3xl font-bold text-github-text">{jobs.length}</p>
            </div>

            <div className="bg-github-surface rounded-xl border border-github-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-github-accent/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-github-accent" />
                </div>
                <span className="text-sm text-github-muted">Successful</span>
              </div>
              <p className="text-3xl font-bold text-github-accent">{successCount}</p>
            </div>

            <div className="bg-github-surface rounded-xl border border-github-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-github-danger/20 rounded-lg">
                  <XCircle className="w-5 h-5 text-github-danger" />
                </div>
                <span className="text-sm text-github-muted">Failed</span>
              </div>
              <p className="text-3xl font-bold text-github-danger">{failureCount}</p>
            </div>
          </div>

          {/* Runner Info */}
          <div className="bg-github-surface rounded-xl border border-github-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-github-text flex items-center gap-2">
                <Server className="w-5 h-5 text-github-muted" />
                Runner Configuration
              </h3>
              <button
                onClick={() => fetchJobs()}
                disabled={jobsLoading}
                className="p-2 hover:bg-github-bg rounded-lg transition-colors text-github-muted hover:text-github-text"
              >
                <RefreshCw
                  className={`w-4 h-4 ${jobsLoading ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-github-muted">Path</span>
                <span className="text-github-text font-mono truncate max-w-[300px]">
                  {settings.runnerPath || 'Not configured'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-github-muted">Repository</span>
                <span className="text-github-text">
                  {settings.githubOwner}/{settings.githubRepo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-github-muted">API Access</span>
                <span
                  className={
                    settings.githubToken ? 'text-github-accent' : 'text-github-warning'
                  }
                >
                  {settings.githubToken ? 'Configured' : 'Public only'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Console Output - Full Width */}
        <div className="col-span-12">
          <LogViewer maxHeight="h-64" />
        </div>
      </div>
    </div>
  );
}

