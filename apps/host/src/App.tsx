import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { SyncWrapper } from './components/SyncWrapper';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import { useRunnerStore } from './store/useRunnerStore';

function App() {
  const { initializeSettings, pollStatus } = useRunnerStore();

  useEffect(() => {
    // Initialize settings from localStorage
    initializeSettings();

    // Start polling for status updates
    const interval = setInterval(pollStatus, 1000);
    return () => clearInterval(interval);
  }, [initializeSettings, pollStatus]);

  return (
    <SyncWrapper>
      <div className="flex h-screen bg-github-bg">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </SyncWrapper>
  );
}

export default App;

