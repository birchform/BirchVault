import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  GitBranch,
  ExternalLink,
  Hash,
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-shell';

interface Job {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  head_branch: string;
  head_sha: string;
  run_number: number;
  event: string;
}

interface JobCardProps {
  job: Job;
}

const statusConfig: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  completed: {
    icon: CheckCircle2,
    color: 'text-github-accent',
    bgColor: 'bg-github-accent/20',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-github-accent',
    bgColor: 'bg-github-accent/20',
  },
  failure: {
    icon: XCircle,
    color: 'text-github-danger',
    bgColor: 'bg-github-danger/20',
  },
  cancelled: {
    icon: XCircle,
    color: 'text-github-muted',
    bgColor: 'bg-github-muted/20',
  },
  in_progress: {
    icon: Loader2,
    color: 'text-github-warning',
    bgColor: 'bg-github-warning/20',
  },
  queued: {
    icon: Clock,
    color: 'text-github-info',
    bgColor: 'bg-github-info/20',
  },
  pending: {
    icon: Clock,
    color: 'text-github-info',
    bgColor: 'bg-github-info/20',
  },
};

export default function JobCard({ job }: JobCardProps) {
  const statusKey = job.conclusion || job.status;
  const config = statusConfig[statusKey] || statusConfig.pending;
  const StatusIcon = config.icon;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const handleOpenInBrowser = async () => {
    try {
      await open(job.html_url);
    } catch (e) {
      console.error('Failed to open URL:', e);
    }
  };

  return (
    <div className="bg-github-surface border border-github-border rounded-lg p-4 hover:border-github-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Left side */}
        <div className="flex-1 min-w-0">
          {/* Title and status */}
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
              <StatusIcon
                className={`w-4 h-4 ${config.color} ${
                  statusKey === 'in_progress' ? 'animate-spin' : ''
                }`}
              />
            </div>
            <h3 className="font-medium text-github-text truncate">{job.name}</h3>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-4 text-sm text-github-muted">
            <div className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              <span>#{job.run_number}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              <span className="truncate max-w-[150px]">{job.head_branch}</span>
            </div>
            <span className="text-github-muted/70">{formatDate(job.created_at)}</span>
          </div>

          {/* Event type */}
          <div className="mt-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-github-bg text-github-muted">
              {job.event}
            </span>
          </div>
        </div>

        {/* Right side - actions */}
        <button
          onClick={handleOpenInBrowser}
          className="p-2 hover:bg-github-bg rounded-lg transition-colors text-github-muted hover:text-github-info"
          title="Open in browser"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

