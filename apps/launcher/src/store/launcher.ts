import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppStatus = 'Installed' | 'InstallerAvailable' | 'DevBuild';

export interface AppInfo {
  name: string;
  display_name: string;
  path: string;
  size: number;
  icon_color: string;
  status: AppStatus;
  installer_path: string | null;
  update_available: boolean;
  icon_base64?: string; // Base64 encoded icon
}

interface LauncherState {
  folderPath: string | null;
  apps: AppInfo[];
  isScanning: boolean;
  lastScanTime: number | null;
  
  setFolderPath: (path: string | null) => void;
  setApps: (apps: AppInfo[]) => void;
  setScanning: (scanning: boolean) => void;
  setLastScanTime: (time: number) => void;
  clearFolder: () => void;
}

export const useLauncherStore = create<LauncherState>()(
  persist(
    (set) => ({
      folderPath: null,
      apps: [],
      isScanning: false,
      lastScanTime: null,
      
      setFolderPath: (path) => set({ folderPath: path }),
      setApps: (apps) => set({ apps }),
      setScanning: (scanning) => set({ isScanning: scanning }),
      setLastScanTime: (time) => set({ lastScanTime: time }),
      clearFolder: () => set({ folderPath: null, apps: [], lastScanTime: null }),
    }),
    {
      name: 'birch-launcher-storage',
      partialize: (state) => ({ 
        folderPath: state.folderPath,
      }),
    }
  )
);

