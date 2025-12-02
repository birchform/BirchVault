import { useState, useCallback } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
}

export function useUpdater() {
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const checkForUpdates = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const update = await check();
      if (update) {
        setAvailable(true);
        setUpdateInfo({ version: update.version, date: update.date, body: update.body });
        setChecking(false);
        return update;
      }
      setChecking(false);
      return null;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to check');
      setChecking(false);
      return null;
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    setDownloading(true);
    setProgress(0);
    try {
      const update = await check();
      if (!update) return false;
      let dl = 0, total = 0;
      await update.downloadAndInstall((ev) => {
        if (ev.event === 'Started') total = ev.data.contentLength || 0;
        else if (ev.event === 'Progress') { dl += ev.data.chunkLength; setProgress(total > 0 ? (dl/total)*100 : 0); }
        else if (ev.event === 'Finished') setProgress(100);
      });
      await relaunch();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setDownloading(false);
      return false;
    }
  }, []);

  const dismissUpdate = useCallback(() => { setAvailable(false); setUpdateInfo(null); }, []);

  return { checking, available, downloading, progress, error, updateInfo, checkForUpdates, downloadAndInstall, dismissUpdate };
}

