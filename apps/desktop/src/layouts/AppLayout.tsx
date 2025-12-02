import { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  Key,
  Star,
  CreditCard,
  StickyNote,
  User,
  Code,
  Wifi,
  FileText,
  Folder,
  FolderPlus,
  Trash,
  Settings,
  LogOut,
  RefreshCw,
  Crown,
  Lock,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { useAuthStore, PlanId } from '../store/auth';
import { useVaultStore } from '../store/vault';
import { useSettingsStore } from '../store/settings';
import { SearchInput } from '@birchvault/ui';
import type { VaultItemType } from '@birchvault/core';

const itemTypeIcons: Record<VaultItemType, React.ElementType> = {
  login: Key,
  card: CreditCard,
  securenote: StickyNote,
  identity: User,
  apikey: Code,
  wifi: Wifi,
  document: FileText,
};

const itemTypeLabels: Record<VaultItemType, string> = {
  login: 'Logins',
  card: 'Cards',
  securenote: 'Secure Notes',
  identity: 'Identities',
  apikey: 'API Keys',
  wifi: 'WiFi Networks',
  document: 'Documents',
};

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, lock, getEffectivePlan, getPlanLimits } = useAuthStore();
  const {
    items,
    folders,
    trashedItems,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    selectedFolderId,
    setSelectedFolderId,
    syncStatus,
    sync,
  } = useVaultStore();
  const { loadSettings, applyTheme } = useSettingsStore();

  // Load and apply theme on mount
  useEffect(() => {
    loadSettings().then(() => {
      applyTheme();
    });
  }, [loadSettings, applyTheme]);

  const effectivePlan = getEffectivePlan();
  const planLimits = getPlanLimits();
  const itemCount = items.length;
  const maxItems = planLimits.maxItems;
  const isAtLimit = maxItems !== null && itemCount >= maxItems;
  const userCanUseFolders = effectivePlan !== 'free';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleLock = async () => {
    await lock();
    navigate('/unlock');
  };

  const handleSync = async () => {
    try {
      await sync();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <Link to="/vault" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-bold">BirchVault</span>
          </Link>
        </div>

        {/* Search */}
        <div className="p-4">
          <SearchInput
            placeholder="Search vault..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarItem
            icon={Key}
            label="All Items"
            active={filterType === 'all' && !selectedFolderId}
            onClick={() => {
              setFilterType('all');
              setSelectedFolderId(null);
              navigate('/vault');
            }}
            count={items.length}
          />
          <SidebarItem
            icon={Star}
            label="Favorites"
            active={filterType === 'favorites'}
            onClick={() => {
              setFilterType('favorites');
              setSelectedFolderId(null);
              navigate('/vault');
            }}
            count={items.filter((i) => i.favorite).length}
          />

          <div className="pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Types
            </p>
            {(Object.keys(itemTypeLabels) as VaultItemType[]).map((type) => {
              const Icon = itemTypeIcons[type];
              return (
                <SidebarItem
                  key={type}
                  icon={Icon}
                  label={itemTypeLabels[type]}
                  active={filterType === type}
                  onClick={() => {
                    setFilterType(type);
                    setSelectedFolderId(null);
                    navigate('/vault');
                  }}
                  count={items.filter((i) => i.type === type).length}
                />
              );
            })}
          </div>

          {/* Folders */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Folders
              </p>
              {userCanUseFolders ? (
                <button
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="New folder"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1 text-xs text-primary">
                  <Lock className="w-3 h-3" />
                  <span>Premium</span>
                </div>
              )}
            </div>
            {userCanUseFolders && folders.length > 0 ? (
              folders.map((folder) => (
                <SidebarItem
                  key={folder.id}
                  icon={Folder}
                  label={folder.name}
                  active={selectedFolderId === folder.id}
                  onClick={() => {
                    setSelectedFolderId(folder.id);
                    setFilterType('all');
                    navigate('/vault');
                  }}
                  count={items.filter((i) => i.folderId === folder.id).length}
                />
              ))
            ) : userCanUseFolders ? (
              <p className="text-xs text-muted-foreground px-3 py-2">
                No folders yet.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground px-3 py-2">
                Upgrade to use folders.
              </p>
            )}
          </div>

          {/* Trash */}
          <div className="pt-4">
            <SidebarItem
              icon={Trash}
              label="Trash"
              active={filterType === 'trash'}
              onClick={() => {
                setFilterType('trash');
                setSelectedFolderId(null);
                navigate('/vault');
              }}
              count={trashedItems.length}
            />
          </div>
        </nav>

        {/* Plan & Sync Status */}
        <div className="p-4 border-t border-border space-y-3">
          {/* Sync Status */}
          <button
            onClick={handleSync}
            disabled={syncStatus.isSyncing}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors text-sm"
          >
            <div className="flex items-center gap-2">
              {syncStatus.isOnline ? (
                <Cloud className="w-4 h-4 text-green-500" />
              ) : (
                <CloudOff className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-muted-foreground">
                {syncStatus.isSyncing
                  ? 'Syncing...'
                  : syncStatus.pendingChanges > 0
                  ? `${syncStatus.pendingChanges} pending`
                  : 'Synced'}
              </span>
            </div>
            <RefreshCw
              className={`w-4 h-4 text-muted-foreground ${
                syncStatus.isSyncing ? 'animate-spin' : ''
              }`}
            />
          </button>

          {/* Plan */}
          <div className="rounded-lg p-3 bg-muted/50">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Crown
                  className={`w-4 h-4 ${
                    effectivePlan === 'free'
                      ? 'text-muted-foreground'
                      : 'text-amber-500'
                  }`}
                />
                <span className="text-sm font-medium">{planLimits.name}</span>
              </div>
            </div>
            {maxItems !== null && (
              <div className="text-xs text-muted-foreground">
                {itemCount} / {maxItems} items
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="p-4 border-t border-border space-y-1">
          <SidebarItem
            icon={Settings}
            label="Settings"
            active={location.pathname === '/settings'}
            onClick={() => navigate('/settings')}
          />
        </div>

        {/* User Menu */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLock}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title="Lock vault"
            >
              <Lock className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

// Sidebar Item Component
function SidebarItem({
  icon: Icon,
  label,
  active,
  onClick,
  count,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
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
      <Icon className="w-4 h-4" />
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && <span className="text-xs opacity-60">{count}</span>}
    </button>
  );
}







