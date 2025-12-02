import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Lock,
  Shield,
  Key,
  Smartphone,
  Fingerprint,
  Monitor,
  Clipboard,
  Bell,
  Check,
  Copy,
  QrCode,
  Trash2,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { useSettingsStore, AppSettings, COLOR_THEMES, ColorTheme } from '../../store/settings';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'app'>('account');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center gap-4">
        <button
          onClick={() => navigate('/vault')}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-semibold text-xl">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account and app settings
          </p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <nav className="w-48 p-4 border-r border-border space-y-1">
          <TabButton
            active={activeTab === 'account'}
            onClick={() => setActiveTab('account')}
            icon={<User className="w-4 h-4" />}
            label="Account"
          />
          <TabButton
            active={activeTab === 'security'}
            onClick={() => setActiveTab('security')}
            icon={<Lock className="w-4 h-4" />}
            label="Security"
          />
          <TabButton
            active={activeTab === 'app'}
            onClick={() => setActiveTab('app')}
            icon={<Monitor className="w-4 h-4" />}
            label="App Settings"
          />
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'account' && <AccountSettings user={user} />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'app' && <AppSettingsTab />}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-accent text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function AccountSettings({ user }: { user: any }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold mb-4">Account Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2 rounded-lg border border-input bg-muted/50 text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Email cannot be changed
            </p>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Change Master Password</p>
                  <p className="text-sm text-muted-foreground">
                    Update your vault's master password
                  </p>
                </div>
              </div>
              <button className="text-primary hover:underline text-sm">
                Change
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-border">
        <h3 className="text-lg font-medium mb-4 text-destructive">Danger Zone</h3>
        <button className="border border-destructive text-destructive px-4 py-2 rounded-lg font-medium hover:bg-destructive/10 transition-colors">
          Delete Account
        </button>
        <p className="text-xs text-muted-foreground mt-2">
          This action cannot be undone. All your data will be permanently deleted.
        </p>
      </div>
    </div>
  );
}

function SecuritySettings() {
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [webauthnEnabled, setWebauthnEnabled] = useState(false);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold mb-2">Two-Factor Authentication</h2>
        <p className="text-muted-foreground mb-6">
          Add an extra layer of security to your account
        </p>

        {/* TOTP Section */}
        <div className="p-6 border border-border rounded-xl mb-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Authenticator App</h3>
                  <p className="text-sm text-muted-foreground">
                    Use an app like Google Authenticator or Authy
                  </p>
                </div>
                {totpEnabled ? (
                  <div className="flex items-center gap-2 text-green-500">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Enabled</span>
                  </div>
                ) : (
                  <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                    Set Up
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Passkeys Section */}
        <div className="p-6 border border-border rounded-xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Passkeys (Biometric)</h3>
                  <p className="text-sm text-muted-foreground">
                    Use Windows Hello or Touch ID to unlock
                  </p>
                </div>
                <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  Add Passkey
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppSettingsTab() {
  const { settings, setSettings, setTheme, setColorTheme, saveSettings, loadSettings, syncThemeToSupabase } = useSettingsStore();
  const { user, accessToken } = useAuthStore();
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    checkAutoStart();
  }, [loadSettings]);

  // Sync theme to Supabase when it changes
  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    setTheme(theme);
    if (accessToken && user?.id) {
      await syncThemeToSupabase(accessToken, user.id);
    }
  };

  const handleColorThemeChange = async (colorTheme: ColorTheme) => {
    setColorTheme(colorTheme);
    if (accessToken && user?.id) {
      await syncThemeToSupabase(accessToken, user.id);
    }
  };

  const checkAutoStart = async () => {
    try {
      const enabled = await isEnabled();
      setAutoStartEnabled(enabled);
    } catch (err) {
      console.error('Failed to check autostart:', err);
    }
  };

  const handleAutoStartChange = async (enabled: boolean) => {
    try {
      if (enabled) {
        await enable();
      } else {
        await disable();
      }
      setAutoStartEnabled(enabled);
      setSettings({ startOnBoot: enabled });
    } catch (err) {
      console.error('Failed to toggle autostart:', err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings();
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold mb-4">App Settings</h2>

        <div className="space-y-4">
          {/* Appearance Mode (Light/Dark/System) */}
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sun className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Appearance</p>
                  <p className="text-sm text-muted-foreground">
                    Choose light or dark mode (syncs across devices)
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`p-2 rounded-lg transition-colors ${
                    settings.theme === 'light'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                  title="Light"
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`p-2 rounded-lg transition-colors ${
                    settings.theme === 'dark'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                  title="Dark"
                >
                  <Moon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleThemeChange('system')}
                  className={`p-2 rounded-lg transition-colors ${
                    settings.theme === 'system'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                  title="System"
                >
                  <Laptop className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Color Theme */}
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 rounded-full bg-primary" />
              <div>
                <p className="font-medium">Color Theme</p>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred color palette (syncs across devices)
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {COLOR_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleColorThemeChange(theme.id)}
                  className={`p-3 rounded-lg border transition-colors text-left ${
                    settings.colorTheme === theme.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full ${
                        theme.id === 'birch'
                          ? 'bg-amber-600'
                          : theme.id === 'forest'
                          ? 'bg-green-600'
                          : theme.id === 'ocean'
                          ? 'bg-blue-500'
                          : 'bg-purple-600'
                      }`}
                    />
                    <span className="font-medium text-sm">{theme.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {theme.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Auto-lock */}
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Auto-lock</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically lock vault after inactivity
                  </p>
                </div>
              </div>
              <select
                value={settings.autoLockMinutes}
                onChange={(e) =>
                  setSettings({ autoLockMinutes: parseInt(e.target.value) })
                }
                className="px-3 py-1 border border-input rounded-lg bg-background"
              >
                <option value="1">1 minute</option>
                <option value="5">5 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="0">Never</option>
              </select>
            </div>
          </div>

          {/* Clipboard clear */}
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clipboard className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Clear Clipboard</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically clear copied passwords
                  </p>
                </div>
              </div>
              <select
                value={settings.clipboardClearSeconds}
                onChange={(e) =>
                  setSettings({ clipboardClearSeconds: parseInt(e.target.value) })
                }
                className="px-3 py-1 border border-input rounded-lg bg-background"
              >
                <option value="10">10 seconds</option>
                <option value="30">30 seconds</option>
                <option value="60">1 minute</option>
                <option value="120">2 minutes</option>
                <option value="0">Never</option>
              </select>
            </div>
          </div>

          {/* Start on boot */}
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Start on Boot</p>
                  <p className="text-sm text-muted-foreground">
                    Launch BirchVault when your computer starts
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoStartEnabled}
                  onChange={(e) => handleAutoStartChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          {/* Start minimized */}
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Start Minimized</p>
                  <p className="text-sm text-muted-foreground">
                    Start in system tray when launched
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.startMinimized}
                  onChange={(e) => setSettings({ startMinimized: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}








