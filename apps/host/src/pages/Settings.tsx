import { useState, useEffect } from 'react';
import {
  FolderOpen,
  Github,
  Key,
  Palette,
  Search,
  Save,
  Check,
  AlertCircle,
  Cpu,
  HardDrive,
  Gauge,
  Info,
} from 'lucide-react';
import { useRunnerStore, ProcessPriority } from '../store/useRunnerStore';

export default function Settings() {
  const { settings, updateSettings, detectRunnerPath, systemInfo, recommendations, fetchSystemInfo } = useRunnerStore();
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [localSettings, setLocalSettings] = useState({
    runnerPath: settings.runnerPath,
    githubOwner: settings.githubOwner,
    githubRepo: settings.githubRepo,
    githubToken: settings.githubToken,
    cpuCores: settings.cpuCores,
    memoryLimitGb: settings.memoryLimitGb,
    priority: settings.priority,
  });

  useEffect(() => {
    if (!systemInfo) {
      fetchSystemInfo();
    }
  }, [systemInfo, fetchSystemInfo]);

  // Update local settings when store settings change
  useEffect(() => {
    setLocalSettings({
      runnerPath: settings.runnerPath,
      githubOwner: settings.githubOwner,
      githubRepo: settings.githubRepo,
      githubToken: settings.githubToken,
      cpuCores: settings.cpuCores,
      memoryLimitGb: settings.memoryLimitGb,
      priority: settings.priority,
    });
  }, [settings]);

  const handleDetect = async () => {
    setDetecting(true);
    setDetectError(null);
    try {
      const path = await detectRunnerPath();
      setLocalSettings((s) => ({ ...s, runnerPath: path }));
    } catch (e) {
      setDetectError(String(e));
    } finally {
      setDetecting(false);
    }
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasChanges =
    localSettings.runnerPath !== settings.runnerPath ||
    localSettings.githubOwner !== settings.githubOwner ||
    localSettings.githubRepo !== settings.githubRepo ||
    localSettings.githubToken !== settings.githubToken ||
    localSettings.cpuCores !== settings.cpuCores ||
    localSettings.memoryLimitGb !== settings.memoryLimitGb ||
    localSettings.priority !== settings.priority;

  const applyRecommended = () => {
    if (recommendations) {
      setLocalSettings((s) => ({
        ...s,
        cpuCores: recommendations.recommended_cores,
        memoryLimitGb: recommendations.recommended_memory_gb,
        priority: 'belownormal' as ProcessPriority,
      }));
    }
  };

  const resetToDefault = () => {
    setLocalSettings((s) => ({
      ...s,
      cpuCores: null,
      memoryLimitGb: null,
      priority: 'normal' as ProcessPriority,
    }));
  };

  return (
    <div className="p-8 max-w-3xl overflow-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-github-text mb-2">Settings</h1>
        <p className="text-github-muted">Configure your runner, resources, and GitHub integration</p>
      </div>

      <div className="space-y-8">
        {/* Runner Path */}
        <div className="bg-github-surface rounded-xl border border-github-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-github-info/20 rounded-lg">
              <FolderOpen className="w-5 h-5 text-github-info" />
            </div>
            <div>
              <h3 className="font-semibold text-github-text">Runner Path</h3>
              <p className="text-sm text-github-muted">
                Path to your actions-runner folder
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={localSettings.runnerPath}
                onChange={(e) =>
                  setLocalSettings((s) => ({ ...s, runnerPath: e.target.value }))
                }
                placeholder="C:\actions-runner"
                className="flex-1 px-4 py-2.5 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-muted focus:outline-none focus:border-github-info transition-colors font-mono text-sm"
              />
              <button
                onClick={handleDetect}
                disabled={detecting}
                className="flex items-center gap-2 px-4 py-2.5 bg-github-bg border border-github-border rounded-lg hover:bg-github-border transition-colors text-github-text"
              >
                <Search className={`w-4 h-4 ${detecting ? 'animate-spin' : ''}`} />
                Auto-detect
              </button>
            </div>

            {detectError && (
              <div className="flex items-center gap-2 text-sm text-github-warning">
                <AlertCircle className="w-4 h-4" />
                {detectError}
              </div>
            )}
          </div>
        </div>

        {/* Resource Management */}
        <div className="bg-github-surface rounded-xl border border-github-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-github-accent/20 rounded-lg">
                <Gauge className="w-5 h-5 text-github-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-github-text">Resource Limits</h3>
                <p className="text-sm text-github-muted">
                  Control how much of your PC the runner can use
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={applyRecommended}
                className="px-3 py-1.5 text-xs bg-github-accent/20 text-github-accent rounded-lg hover:bg-github-accent/30 transition-colors"
              >
                Recommended
              </button>
              <button
                onClick={resetToDefault}
                className="px-3 py-1.5 text-xs bg-github-bg text-github-muted rounded-lg hover:bg-github-border transition-colors"
              >
                No Limits
              </button>
            </div>
          </div>

          {/* System Info */}
          {systemInfo && (
            <div className="bg-github-bg rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-github-muted mb-3">
                <Info className="w-4 h-4" />
                <span>Your System</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-github-muted">CPU:</span>
                  <span className="ml-2 text-github-text">{systemInfo.cpu_cores} cores</span>
                  <p className="text-xs text-github-muted truncate">{systemInfo.cpu_brand}</p>
                </div>
                <div>
                  <span className="text-github-muted">RAM:</span>
                  <span className="ml-2 text-github-text">{systemInfo.total_memory_gb.toFixed(1)} GB</span>
                  <p className="text-xs text-github-muted">{systemInfo.available_memory_gb.toFixed(1)} GB available</p>
                </div>
              </div>
            </div>
          )}

          {/* CPU Cores Slider */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm text-github-text">
                <Cpu className="w-4 h-4 text-github-info" />
                CPU Cores
              </label>
              <span className="text-sm font-mono text-github-text">
                {localSettings.cpuCores ?? 'All'} / {systemInfo?.cpu_cores ?? '?'}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={systemInfo?.cpu_cores ?? 8}
              value={localSettings.cpuCores ?? systemInfo?.cpu_cores ?? 8}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setLocalSettings((s) => ({
                  ...s,
                  cpuCores: value === systemInfo?.cpu_cores ? null : value,
                }));
              }}
              className="w-full h-2 bg-github-bg rounded-lg appearance-none cursor-pointer accent-github-accent"
            />
            <div className="flex justify-between text-xs text-github-muted mt-1">
              <span>1 core</span>
              {recommendations && (
                <span className="text-github-accent">
                  Recommended: {recommendations.recommended_cores} | Max: {recommendations.max_cores}
                </span>
              )}
              <span>{systemInfo?.cpu_cores ?? '?'} cores</span>
            </div>
          </div>

          {/* Memory Slider */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm text-github-text">
                <HardDrive className="w-4 h-4 text-github-warning" />
                Memory Limit
              </label>
              <span className="text-sm font-mono text-github-text">
                {localSettings.memoryLimitGb?.toFixed(1) ?? 'No limit'} GB
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={Math.floor(systemInfo?.total_memory_gb ?? 16)}
              step="0.5"
              value={localSettings.memoryLimitGb ?? Math.floor(systemInfo?.total_memory_gb ?? 16)}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                const max = Math.floor(systemInfo?.total_memory_gb ?? 16);
                setLocalSettings((s) => ({
                  ...s,
                  memoryLimitGb: value >= max ? null : value,
                }));
              }}
              className="w-full h-2 bg-github-bg rounded-lg appearance-none cursor-pointer accent-github-warning"
            />
            <div className="flex justify-between text-xs text-github-muted mt-1">
              <span>1 GB</span>
              {recommendations && (
                <span className="text-github-warning">
                  Recommended: {recommendations.recommended_memory_gb.toFixed(1)} GB | Max: {recommendations.max_memory_gb.toFixed(1)} GB
                </span>
              )}
              <span>{systemInfo?.total_memory_gb.toFixed(1) ?? '?'} GB</span>
            </div>
          </div>

          {/* Priority Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm text-github-text">
                <Gauge className="w-4 h-4 text-github-muted" />
                Process Priority
              </label>
            </div>
            <select
              value={localSettings.priority}
              onChange={(e) =>
                setLocalSettings((s) => ({
                  ...s,
                  priority: e.target.value as ProcessPriority,
                }))
              }
              className="w-full px-4 py-2.5 bg-github-bg border border-github-border rounded-lg text-github-text focus:outline-none focus:border-github-info transition-colors"
            >
              <option value="normal">Normal - Full speed, may affect other apps</option>
              <option value="belownormal">Below Normal - Recommended for multitasking</option>
              <option value="low">Low - Minimal impact, videos will be smooth</option>
            </select>
            <p className="mt-2 text-xs text-github-muted">
              Lower priority means other apps (like video players) get preference when CPU is busy.
            </p>
          </div>
        </div>

        {/* GitHub Repository */}
        <div className="bg-github-surface rounded-xl border border-github-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-github-info/20 rounded-lg">
              <Github className="w-5 h-5 text-github-info" />
            </div>
            <div>
              <h3 className="font-semibold text-github-text">GitHub Repository</h3>
              <p className="text-sm text-github-muted">
                Repository to fetch workflow runs from
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-github-muted mb-2">Owner</label>
              <input
                type="text"
                value={localSettings.githubOwner}
                onChange={(e) =>
                  setLocalSettings((s) => ({ ...s, githubOwner: e.target.value }))
                }
                placeholder="birchform"
                className="w-full px-4 py-2.5 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-muted focus:outline-none focus:border-github-info transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-github-muted mb-2">Repository</label>
              <input
                type="text"
                value={localSettings.githubRepo}
                onChange={(e) =>
                  setLocalSettings((s) => ({ ...s, githubRepo: e.target.value }))
                }
                placeholder="BirchVault"
                className="w-full px-4 py-2.5 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-muted focus:outline-none focus:border-github-info transition-colors"
              />
            </div>
          </div>
        </div>

        {/* GitHub Token */}
        <div className="bg-github-surface rounded-xl border border-github-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-github-warning/20 rounded-lg">
              <Key className="w-5 h-5 text-github-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-github-text">
                GitHub Personal Access Token
              </h3>
              <p className="text-sm text-github-muted">
                Optional - required for private repos and higher rate limits
              </p>
            </div>
          </div>

          <input
            type="password"
            value={localSettings.githubToken}
            onChange={(e) =>
              setLocalSettings((s) => ({ ...s, githubToken: e.target.value }))
            }
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="w-full px-4 py-2.5 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-muted focus:outline-none focus:border-github-info transition-colors font-mono text-sm"
          />
          <p className="mt-2 text-xs text-github-muted">
            Create a token with <code className="bg-github-bg px-1 rounded">repo</code>{' '}
            scope at{' '}
            <span className="text-github-info">
              github.com/settings/tokens
            </span>
          </p>
        </div>

        {/* Theme (placeholder for future) */}
        <div className="bg-github-surface rounded-xl border border-github-border p-6 opacity-60">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-github-muted/20 rounded-lg">
              <Palette className="w-5 h-5 text-github-muted" />
            </div>
            <div>
              <h3 className="font-semibold text-github-text">Theme</h3>
              <p className="text-sm text-github-muted">Currently: Dark (coming soon)</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pb-8">
          <button
            onClick={handleSave}
            disabled={!hasChanges && !saved}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              saved
                ? 'bg-github-accent text-white'
                : hasChanges
                ? 'bg-github-accent hover:bg-github-accentHover text-white'
                : 'bg-github-bg border border-github-border text-github-muted cursor-not-allowed'
            }`}
          >
            {saved ? (
              <>
                <Check className="w-5 h-5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
