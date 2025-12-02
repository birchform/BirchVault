'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  ArrowLeft,
  Key,
  Smartphone,
  Fingerprint,
  Lock,
  AlertTriangle,
  Check,
  Copy,
  QrCode,
  Trash2,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useVaultStore } from '@/store/vault';
import { deriveKeys } from '@birchvault/core';
import { getSupabaseClient } from '@/lib/supabase';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'account' | 'security' | '2fa'>('account');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/vault"
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your account and security settings
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="flex gap-8">
          {/* Sidebar */}
          <nav className="w-48 space-y-1">
            <TabButton
              active={activeTab === 'account'}
              onClick={() => setActiveTab('account')}
              icon={<Key className="w-4 h-4" />}
              label="Account"
            />
            <TabButton
              active={activeTab === 'security'}
              onClick={() => setActiveTab('security')}
              icon={<Lock className="w-4 h-4" />}
              label="Security"
            />
            <TabButton
              active={activeTab === '2fa'}
              onClick={() => setActiveTab('2fa')}
              icon={<Shield className="w-4 h-4" />}
              label="Two-Factor Auth"
            />
          </nav>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'account' && <AccountSettings user={user} />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === '2fa' && <TwoFactorSettings />}
          </div>
        </div>
      </main>
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
  const router = useRouter();
  const { clear: clearAuth } = useAuthStore();
  const { clear: clearVault } = useVaultStore();
  
  const [name, setName] = useState(user?.user_metadata?.name || '');
  
  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleDeleteAccount = async () => {
    if (!masterPassword || !user?.email) {
      setDeleteError('Please enter your master password');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      // Derive auth hash from master password
      const { authHash } = await deriveKeys(masterPassword, user.email);

      // Get access token
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setDeleteError('Session expired. Please log in again.');
        setIsDeleting(false);
        return;
      }

      // Call delete API
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ authHash }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDeleteError(data.error || 'Failed to delete account');
        setIsDeleting(false);
        return;
      }

      // Success - show message and redirect
      setDeleteSuccess(true);
      
      // Clear local state after a delay
      setTimeout(() => {
        clearAuth();
        clearVault();
        router.push('/');
      }, 3000);
    } catch (error) {
      console.error('Delete account error:', error);
      setDeleteError('An unexpected error occurred');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
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

          <div>
            <label className="block text-sm font-medium mb-2">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Your name"
            />
          </div>

          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
            Save Changes
          </button>
        </div>
      </div>

      <div className="pt-6 border-t border-border">
        <h3 className="text-lg font-medium mb-4 text-destructive">Danger Zone</h3>
        <button 
          onClick={() => setShowDeleteDialog(true)}
          className="border border-destructive text-destructive px-4 py-2 rounded-lg font-medium hover:bg-destructive/10 transition-colors"
        >
          Delete Account
        </button>
        <p className="text-xs text-muted-foreground mt-2">
          Your account will be scheduled for deletion. You can restore it within 60 days.
        </p>
      </div>

      {/* Delete Account Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl">
            <button
              onClick={() => {
                setShowDeleteDialog(false);
                setMasterPassword('');
                setDeleteError('');
                setDeleteSuccess(false);
              }}
              disabled={isDeleting}
              className="absolute top-4 right-4 p-1 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            {deleteSuccess ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-green-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Account Scheduled for Deletion</h2>
                <p className="text-muted-foreground mb-4">
                  You will receive an email with a link to restore your account if you change your mind.
                  Your account will be permanently deleted after 60 days.
                </p>
                <p className="text-sm text-muted-foreground">Redirecting to home page...</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-7 h-7 text-destructive" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Delete Your Account?</h2>
                  <p className="text-muted-foreground text-sm">
                    Your account will be scheduled for deletion. You have 60 days to restore it via the email we&apos;ll send you.
                    After 60 days, all your data will be permanently deleted.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Enter your master password to confirm
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={masterPassword}
                        onChange={(e) => setMasterPassword(e.target.value)}
                        placeholder="Master password"
                        disabled={isDeleting}
                        className="w-full px-4 py-3 pr-12 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Eye className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>

                  {deleteError && (
                    <p className="text-sm text-destructive">{deleteError}</p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowDeleteDialog(false);
                        setMasterPassword('');
                        setDeleteError('');
                      }}
                      disabled={isDeleting}
                      className="flex-1 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting || !masterPassword}
                      className="flex-1 py-3 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Deleting...
                        </span>
                      ) : (
                        'Delete Account'
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Security Settings</h2>

        <div className="space-y-4">
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

          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Session Timeout</p>
                  <p className="text-sm text-muted-foreground">
                    Auto-lock after inactivity
                  </p>
                </div>
              </div>
              <select className="px-3 py-1 border border-input rounded-lg bg-background">
                <option value="5">5 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Active Sessions</p>
                  <p className="text-sm text-muted-foreground">
                    Manage devices logged into your account
                  </p>
                </div>
              </div>
              <button className="text-primary hover:underline text-sm">
                View All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TwoFactorSettings() {
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [webauthnEnabled, setWebauthnEnabled] = useState(false);
  const [showTotpSetup, setShowTotpSetup] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [passkeys, setPasskeys] = useState<{ id: string; name: string; createdAt: string }[]>([]);

  const handleSetupTOTP = async () => {
    // Generate TOTP secret (in real app, call API)
    const mockSecret = 'JBSWY3DPEHPK3PXP';
    setTotpSecret(mockSecret);
    setBackupCodes([
      '1234-5678',
      'ABCD-EFGH',
      '9876-5432',
      'WXYZ-1234',
      'QWER-TYUI',
    ]);
    setShowTotpSetup(true);
  };

  const handleVerifyTOTP = async () => {
    // Verify TOTP code (in real app, call API)
    if (verificationCode.length === 6) {
      setTotpEnabled(true);
      setShowTotpSetup(false);
    }
  };

  const handleAddPasskey = async () => {
    // In real app, use WebAuthn API
    const newPasskey = {
      id: Math.random().toString(36).substring(7),
      name: 'This device',
      createdAt: new Date().toISOString(),
    };
    setPasskeys([...passkeys, newPasskey]);
    setWebauthnEnabled(true);
  };

  const handleRemovePasskey = (id: string) => {
    setPasskeys(passkeys.filter((p) => p.id !== id));
    if (passkeys.length <= 1) {
      setWebauthnEnabled(false);
    }
  };

  return (
    <div className="space-y-6">
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
                  <button
                    onClick={handleSetupTOTP}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Set Up
                  </button>
                )}
              </div>

              {showTotpSetup && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">1. Scan QR Code</h4>
                      <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center">
                        <QrCode className="w-32 h-32 text-gray-800" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Or enter manually: <code className="bg-muted px-1 rounded">{totpSecret}</code>
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">2. Enter Code</h4>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring text-center text-2xl tracking-widest font-mono"
                        maxLength={6}
                      />
                      <button
                        onClick={handleVerifyTOTP}
                        disabled={verificationCode.length !== 6}
                        className="w-full mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        Verify & Enable
                      </button>
                    </div>
                  </div>

                  {backupCodes.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <h4 className="font-medium mb-3">Backup Codes</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Save these codes in a secure place. Each code can only be used once.
                      </p>
                      <div className="grid grid-cols-2 gap-2 bg-muted/50 p-4 rounded-lg font-mono text-sm">
                        {backupCodes.map((code, i) => (
                          <div key={i}>{code}</div>
                        ))}
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(backupCodes.join('\n'))}
                        className="mt-3 flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Copy className="w-4 h-4" />
                        Copy all codes
                      </button>
                    </div>
                  )}
                </div>
              )}

              {totpEnabled && !showTotpSetup && (
                <div className="mt-4 flex gap-2">
                  <button className="text-sm text-muted-foreground hover:text-foreground">
                    View backup codes
                  </button>
                  <span className="text-muted-foreground">•</span>
                  <button
                    onClick={() => setTotpEnabled(false)}
                    className="text-sm text-destructive hover:underline"
                  >
                    Disable
                  </button>
                </div>
              )}
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
                    Use Face ID, Touch ID, or Windows Hello
                  </p>
                </div>
                <button
                  onClick={handleAddPasskey}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Add Passkey
                </button>
              </div>

              {passkeys.length > 0 && (
                <div className="mt-4 space-y-2">
                  {passkeys.map((passkey) => (
                    <div
                      key={passkey.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Fingerprint className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{passkey.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Added {new Date(passkey.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemovePasskey(passkey.id)}
                        className="p-2 hover:bg-accent rounded-lg transition-colors text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}







