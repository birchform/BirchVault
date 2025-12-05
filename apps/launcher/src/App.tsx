import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { 
  FolderOpen, 
  Play, 
  RefreshCw, 
  Package, 
  X,
  Rocket,
  HardDrive,
  FolderSearch,
  Download,
  CheckCircle2,
  Wrench,
  ArrowUpCircle
} from 'lucide-react';
import { useLauncherStore, AppInfo } from './store/launcher';
import { SyncWrapper } from './components/SyncWrapper';

function formatFileSize(bytes: number): string {
  const kb = 1024;
  const mb = kb * 1024;
  const gb = mb * 1024;

  if (bytes >= gb) {
    return `${(bytes / gb).toFixed(1)} GB`;
  } else if (bytes >= mb) {
    return `${(bytes / mb).toFixed(1)} MB`;
  } else if (bytes >= kb) {
    return `${(bytes / kb).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

export default function App() {
  const { 
    folderPath, 
    apps, 
    isScanning,
    lastScanTime,
    setFolderPath, 
    setApps, 
    setScanning,
    setLastScanTime,
    clearFolder 
  } = useLauncherStore();
  
  const [launchingApp, setLaunchingApp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Scan folder on mount if path exists
  useEffect(() => {
    if (folderPath) {
      scanFolder(folderPath);
    }
  }, []);

  const selectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Applications Folder',
      });
      
      if (selected && typeof selected === 'string') {
        setFolderPath(selected);
        await scanFolder(selected);
      }
    } catch (err) {
      setError(`Failed to select folder: ${err}`);
    }
  };

  const scanFolder = async (path: string) => {
    setScanning(true);
    setError(null);
    
    try {
      const result = await invoke<AppInfo[]>('scan_folder', { path });
      setApps(result);
      setLastScanTime(Date.now());
      
      // Load icons in background (don't block UI)
      loadIcons(result);
    } catch (err) {
      setError(`Failed to scan folder: ${err}`);
      setApps([]);
    } finally {
      setScanning(false);
    }
  };

  // Load icons for all apps in background
  const loadIcons = async (appList: AppInfo[]) => {
    const updates: Map<string, string> = new Map();
    
    await Promise.all(
      appList.map(async (app) => {
        if (!app.path) return;
        try {
          const icon = await invoke<string>('extract_icon', { exePath: app.path });
          updates.set(app.name, icon);
        } catch {
          // Silently fail - will use fallback icon
        }
      })
    );
    
    // Batch update all icons at once
    if (updates.size > 0) {
      const updatedApps = appList.map((app: AppInfo) => ({
        ...app,
        icon_base64: updates.get(app.name) || app.icon_base64,
      }));
      setApps(updatedApps);
    }
  };

  const launchApp = async (app: AppInfo) => {
    setLaunchingApp(app.path);
    setError(null);
    
    try {
      await invoke('launch_app', { path: app.path });
    } catch (err) {
      setError(`Failed to launch ${app.display_name}: ${err}`);
    } finally {
      setTimeout(() => setLaunchingApp(null), 500);
    }
  };

  const installApp = async (app: AppInfo) => {
    if (!app.installer_path) {
      setError(`No installer found for ${app.display_name}. Try rebuilding the app first.`);
      return;
    }
    
    setError(null);
    
    try {
      await invoke('run_installer', { path: app.installer_path });
      
      // Optimistic update - mark as installed after launching installer
      const updatedApps = apps.map((a: AppInfo) => 
        a.name === app.name 
          ? { ...a, status: 'Installed' as const, update_available: false }
          : a
      );
      setApps(updatedApps);
      
    } catch (err) {
      setError(`Failed to run installer for ${app.display_name}: ${err}`);
    }
  };

  const handleRefresh = () => {
    if (folderPath) {
      scanFolder(folderPath);
    }
  };

  return (
    <SyncWrapper>
    <div className="min-h-screen flex flex-col no-select">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-5 bg-card/50 shrink-0">
        <div className="flex items-center gap-3">
          <Rocket className="w-6 h-6 text-primary" />
          <span className="text-base font-semibold">Birch Launcher</span>
        </div>
        
        <div className="flex items-center gap-2">
          {folderPath && (
            <>
              <button
                onClick={handleRefresh}
                disabled={isScanning}
                className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-muted-foreground ${isScanning ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={clearFolder}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title="Change Folder"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        {!folderPath ? (
          <WelcomeView onSelectFolder={selectFolder} />
        ) : (
          <div className="max-w-5xl mx-auto">
            {/* Folder Info Bar */}
            <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 min-w-0">
                <FolderOpen className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{folderPath}</p>
                  <p className="text-xs text-muted-foreground">
                    {apps.length} application{apps.length !== 1 ? 's' : ''} found
                    {lastScanTime && (
                      <span className="ml-2">
                        • Last scan: {new Date(lastScanTime).toLocaleTimeString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={selectFolder}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 transition-colors shrink-0"
              >
                Change
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/30 text-error text-sm">
                {error}
              </div>
            )}

            {/* Apps Grid */}
            {isScanning ? (
              <div className="flex flex-col items-center justify-center py-20">
                <RefreshCw className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Scanning folder...</p>
              </div>
            ) : apps.length === 0 ? (
              <EmptyState onRefresh={handleRefresh} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {apps.map((app, index) => (
                  <AppCard
                    key={app.path || app.name}
                    app={app}
                    index={index}
                    isLaunching={launchingApp === app.path}
                    onLaunch={() => launchApp(app)}
                    onInstall={() => installApp(app)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="h-8 border-t border-border flex items-center justify-center px-5 bg-card/30 shrink-0">
        <p className="text-xs text-muted-foreground">
          Birch Launcher v0.1.0
        </p>
      </footer>
    </div>
    </SyncWrapper>
  );
}

function WelcomeView({ onSelectFolder }: { onSelectFolder: () => void }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-6">
          <FolderSearch className="w-10 h-10 text-primary" />
        </div>
        
        <h1 className="text-2xl font-bold mb-3">Welcome to Birch Launcher</h1>
        <p className="text-muted-foreground mb-8">
          Select a folder containing your applications to get started. 
          The launcher will find all executable files and let you launch them with a single click.
        </p>
        
        <button
          onClick={onSelectFolder}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
        >
          <FolderOpen className="w-5 h-5" />
          Select Folder
        </button>

        <div className="mt-10 p-4 rounded-xl bg-card border border-border text-left">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            How it works
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Choose a folder containing your .exe applications</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>View all discovered applications in a clean grid</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Click to launch any app instantly</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
      <h3 className="text-lg font-medium text-muted-foreground mb-2">
        No Applications Found
      </h3>
      <p className="text-sm text-muted-foreground/70 mb-6 text-center max-w-sm">
        No .exe files were found in the selected folder. 
        Make sure the folder contains executable applications.
      </p>
      <button
        onClick={onRefresh}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Scan Again
      </button>
    </div>
  );
}

function AppCard({ 
  app, 
  index,
  isLaunching, 
  onLaunch,
  onInstall,
}: { 
  app: AppInfo; 
  index: number;
  isLaunching: boolean; 
  onLaunch: () => void;
  onInstall: () => void;
}) {
  // Get fallback icon based on app name
  const getFallbackIcon = () => {
    const name = app.name.toLowerCase();
    if (name.includes('dev')) return '🛠️';
    if (name.includes('host')) return '🖥️';
    if (name.includes('vault')) return '🔐';
    return '📦';
  };

  const getStatusBadge = () => {
    // Check for update available first (takes priority over Installed status)
    if (app.status === 'Installed' && app.update_available) {
      return (
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
          <ArrowUpCircle className="w-3 h-3" />
          Update Available
        </span>
      );
    }
    
    switch (app.status) {
      case 'Installed':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            Installed
          </span>
        );
      case 'InstallerAvailable':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
            <Download className="w-3 h-3" />
            Not Installed
          </span>
        );
      case 'DevBuild':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
            <Wrench className="w-3 h-3" />
            Dev Build
          </span>
        );
    }
  };

  const canLaunch = app.status === 'Installed' || (app.status === 'DevBuild' && app.path);
  const canInstall = app.status === 'InstallerAvailable' && app.installer_path;
  const canUpdate = app.status === 'Installed' && app.update_available && app.installer_path;

  return (
    <div 
      className="app-card group p-5 rounded-2xl bg-card border border-border hover:border-opacity-50 transition-all animate-fade-in-up overflow-hidden"
      style={{ 
        animationDelay: `${index * 80}ms`,
        borderColor: `${app.icon_color}30`,
      }}
    >
      {/* Status Badge */}
      <div className="flex justify-between items-start mb-3">
        <div 
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${app.icon_color}20, ${app.icon_color}10)`,
          }}
        >
          {app.icon_base64 ? (
            <img 
              src={app.icon_base64} 
              alt={app.display_name} 
              className="w-10 h-10 object-contain"
            />
          ) : (
            getFallbackIcon()
          )}
        </div>
        {getStatusBadge()}
      </div>
      
      {/* App Info */}
      <h3 
        className="font-semibold text-lg mb-1 truncate" 
        title={app.display_name}
        style={{ color: app.icon_color }}
      >
        {app.display_name}
      </h3>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        {app.size > 0 && (
          <>
            <HardDrive className="w-3 h-3" />
            <span>{formatFileSize(app.size)}</span>
          </>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2 min-w-0">
        {canInstall && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInstall();
            }}
            className="flex-1 min-w-0 px-3 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-1.5 bg-amber-500/15 text-amber-400 hover:bg-amber-500 hover:text-white"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="truncate">Install</span>
          </button>
        )}
        
        {canUpdate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInstall();
            }}
            className="flex-1 min-w-0 px-3 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-1.5 bg-orange-500/15 text-orange-400 hover:bg-orange-500 hover:text-white"
          >
            <ArrowUpCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">Update</span>
          </button>
        )}
        
        {canLaunch && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLaunch();
            }}
            disabled={isLaunching}
            className="flex-1 min-w-0 px-3 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ 
              backgroundColor: isLaunching ? `${app.icon_color}30` : `${app.icon_color}15`,
              color: app.icon_color,
            }}
            onMouseEnter={(e) => {
              if (!isLaunching) {
                e.currentTarget.style.backgroundColor = app.icon_color;
                e.currentTarget.style.color = '#fff';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${app.icon_color}15`;
              e.currentTarget.style.color = app.icon_color;
            }}
          >
            {isLaunching ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate">Launching...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 shrink-0" />
                <span className="truncate">Launch</span>
              </>
            )}
          </button>
        )}
        
        {!canLaunch && !canInstall && !canUpdate && (
          <div className="flex-1 px-4 py-3 rounded-xl text-sm text-muted-foreground text-center">
            No action available
          </div>
        )}
      </div>
    </div>
  );
}

