// ============================================
// Birch Host - Multi-Machine Dashboard
// Placeholder until full cloud sync is enabled
// ============================================

import { useState } from 'react';
import {
  Monitor,
  Server,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';

// Placeholder page - will be fully functional once cloud sync is configured
export function MachinesPage() {
  const [isSyncEnabled] = useState(false);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Server className="w-7 h-7 text-emerald-400" />
            Machines
          </h1>
          <p className="text-slate-400 mt-1">
            Manage runners across all your machines
          </p>
        </div>
        <button
          disabled
          className="p-2 bg-slate-800 rounded-lg opacity-50 cursor-not-allowed"
        >
          <RefreshCw className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Stats Placeholder */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="text-2xl font-bold text-white">--</div>
          <div className="text-sm text-slate-400">Total Machines</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="text-2xl font-bold text-emerald-400">--</div>
          <div className="text-sm text-slate-400">Online</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="text-2xl font-bold text-blue-400">--</div>
          <div className="text-sm text-slate-400">Runners Active</div>
        </div>
      </div>

      {/* Cloud Sync Setup Prompt */}
      {!isSyncEnabled && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <CloudOff className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Cloud Sync Required
          </h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Enable cloud sync to view and control runners on all your machines from anywhere.
            Click the cloud icon in the bottom right corner to set up.
          </p>
          
          <div className="bg-slate-900/50 rounded-lg p-4 max-w-md mx-auto">
            <h3 className="text-sm font-medium text-white mb-2">
              With cloud sync, you can:
            </h3>
            <ul className="text-sm text-slate-400 space-y-1 text-left">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                View all your machines in one dashboard
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Start/stop runners remotely
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                See real-time runner status
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Get notifications for job completion
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Local Machine Status - Always shown */}
      <div className="mt-6">
        <h2 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-emerald-400" />
          This Machine
        </h2>
        <div className="bg-slate-800/50 rounded-xl border border-emerald-500/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Monitor className="w-6 h-6 text-slate-400" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-800" />
              </div>
              <div>
                <h3 className="font-medium text-white">Local Runner</h3>
                <p className="text-xs text-slate-500">
                  Control your local runner from the Dashboard page
                </p>
              </div>
            </div>
            <Cloud className="w-5 h-5 text-slate-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MachinesPage;
