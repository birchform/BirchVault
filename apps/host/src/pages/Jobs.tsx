import { useEffect, useState } from 'react';
import { RefreshCw, ExternalLink, ListChecks, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { open } from '@tauri-apps/plugin-shell';
import JobCard from '../components/JobCard';
import JobDetail from '../components/JobDetail';
import { useRunnerStore } from '../store/useRunnerStore';

export default function Jobs() {
  const { jobs, fetchJobs, jobsLoading, settings } = useRunnerStore();
  const [showLocalLogs, setShowLocalLogs] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const openRepoActions = async () => {
    try {
      await open(
        `https://github.com/${settings.githubOwner}/${settings.githubRepo}/actions`
      );
    } catch (e) {
      console.error('Failed to open URL:', e);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-github-text mb-2">Recent Jobs</h1>
          <p className="text-github-muted">
            Workflow runs from {settings.githubOwner}/{settings.githubRepo}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openRepoActions}
            className="flex items-center gap-2 px-4 py-2 bg-github-surface border border-github-border rounded-lg hover:bg-github-bg transition-colors text-github-text"
          >
            <ExternalLink className="w-4 h-4" />
            Open in GitHub
          </button>
          <button
            onClick={() => fetchJobs()}
            disabled={jobsLoading}
            className="flex items-center gap-2 px-4 py-2 bg-github-accent hover:bg-github-accentHover rounded-lg transition-colors text-white"
          >
            <RefreshCw className={`w-4 h-4 ${jobsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Local Job Logs Panel */}
      {settings.runnerPath && (
        <div className="mb-6">
          <button
            onClick={() => setShowLocalLogs(!showLocalLogs)}
            className="flex items-center gap-2 w-full px-4 py-3 bg-github-surface border border-github-border rounded-xl hover:bg-github-bg transition-colors text-left"
          >
            <FileText className="w-5 h-5 text-github-accent" />
            <span className="flex-1 font-medium text-github-text">Local Job Logs (Step-by-Step)</span>
            {showLocalLogs ? (
              <ChevronUp className="w-5 h-5 text-github-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-github-muted" />
            )}
          </button>
          
          {showLocalLogs && (
            <div className="mt-2 bg-github-surface rounded-xl border border-github-border overflow-hidden" style={{ height: '500px' }}>
              <JobDetail runnerPath={settings.runnerPath} />
            </div>
          )}
        </div>
      )}

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="bg-github-surface rounded-xl border border-github-border p-12 text-center">
          <ListChecks className="w-12 h-12 text-github-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-github-text mb-2">
            No workflow runs found
          </h3>
          <p className="text-github-muted mb-4">
            {settings.githubToken
              ? 'No recent workflow runs in this repository.'
              : 'Add a GitHub token in Settings to see private workflow runs.'}
          </p>
          <button
            onClick={() => fetchJobs()}
            disabled={jobsLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-github-bg border border-github-border rounded-lg hover:border-github-muted transition-colors text-github-text"
          >
            <RefreshCw className={`w-4 h-4 ${jobsLoading ? 'animate-spin' : ''}`} />
            Try Again
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

