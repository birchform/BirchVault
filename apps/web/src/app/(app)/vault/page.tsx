'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  Plus,
  Key,
  CreditCard,
  StickyNote,
  User,
  Folder,
  Star,
  MoreVertical,
  Copy,
  Trash2,
  Edit,
  LogOut,
  Settings,
  ChevronRight,
  Users,
  Crown,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useVaultStore } from '@/store/vault';
import { useAuthStore, type Subscription, type PlanId } from '@/store/auth';
import { logout } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { decryptVaultItem, type VaultItem, type VaultItemType } from '@birchvault/core';

const itemTypeIcons: Record<VaultItemType, React.ElementType> = {
  login: Key,
  card: CreditCard,
  securenote: StickyNote,
  identity: User,
};

const itemTypeLabels: Record<VaultItemType, string> = {
  login: 'Logins',
  card: 'Cards',
  securenote: 'Secure Notes',
  identity: 'Identities',
};

export default function VaultPage() {
  const router = useRouter();
  const { user, clear: clearAuth, setSubscription, getEffectivePlan, getPlanLimits } = useAuthStore();
  const {
    items,
    folders,
    selectedItemId,
    selectedFolderId,
    searchQuery,
    encryptionKey,
    setItems,
    setSelectedItemId,
    setSelectedFolderId,
    setSearchQuery,
    setLoading,
    isLoading,
  } = useVaultStore();

  const [filterType, setFilterType] = useState<VaultItemType | 'all' | 'favorites'>('all');
  const [showNewItemMenu, setShowNewItemMenu] = useState(false);

  // Get plan info
  const effectivePlan = getEffectivePlan();
  const planLimits = getPlanLimits();
  const itemCount = items.length;
  const maxItems = planLimits.maxItems;
  const isAtLimit = maxItems !== null && itemCount >= maxItems;
  const isNearLimit = maxItems !== null && itemCount >= maxItems - 1;

  // Load vault items and subscription from database
  useEffect(() => {
    async function loadVaultData() {
      if (!encryptionKey) {
        console.log('No encryption key available');
        return;
      }

      setLoading(true);
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        // Load subscription
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('plan_id, status, plan_override, plan_override_expires_at')
          .eq('user_id', user.id)
          .single();

        if (subData) {
          setSubscription({
            planId: (subData.plan_id || 'free') as PlanId,
            planOverride: subData.plan_override as PlanId | null,
            planOverrideExpiresAt: subData.plan_override_expires_at,
            status: subData.status || 'active',
          });
        } else {
          // Default to free plan
          setSubscription({
            planId: 'free',
            planOverride: null,
            planOverrideExpiresAt: null,
            status: 'active',
          });
        }

        // Load vault items
        const { data: vaultItems, error } = await supabase
          .from('vault_items')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('Failed to load vault items:', error);
          return;
        }

        // Decrypt all items
        const decryptedItems: VaultItem[] = [];
        for (const item of vaultItems || []) {
          try {
            const encryptedData = JSON.parse(item.encrypted_data);
            const decrypted = await decryptVaultItem<VaultItem>(encryptedData, encryptionKey);
            decryptedItems.push(decrypted);
          } catch (err) {
            console.error('Failed to decrypt item:', item.id, err);
          }
        }

        setItems(decryptedItems);
      } catch (err) {
        console.error('Error loading vault:', err);
      } finally {
        setLoading(false);
      }
    }

    loadVaultData();
  }, [encryptionKey, setItems, setLoading, setSubscription, router]);

  // Filter items based on search, folder, and type
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder =
      !selectedFolderId || item.folderId === selectedFolderId;
    const matchesType =
      filterType === 'all' ||
      (filterType === 'favorites' && item.favorite) ||
      item.type === filterType;
    return matchesSearch && matchesFolder && matchesType;
  });

  const selectedItem = items.find((item) => item.id === selectedItemId);

  const handleLogout = async () => {
    await logout();
    clearAuth();
    router.push('/');
  };

  const handleCopyPassword = async (password: string) => {
    await navigator.clipboard.writeText(password);
    // TODO: Show toast notification
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-bold">BirchVault</span>
          </Link>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search vault..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarItem
            icon={Key}
            label="All Items"
            active={filterType === 'all'}
            onClick={() => {
              setFilterType('all');
              setSelectedFolderId(null);
            }}
            count={items.length}
          />
          <SidebarItem
            icon={Star}
            label="Favorites"
            active={filterType === 'favorites'}
            onClick={() => setFilterType('favorites')}
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
                  onClick={() => setFilterType(type)}
                  count={items.filter((i) => i.type === type).length}
                />
              );
            })}
          </div>

          {folders.length > 0 && (
            <div className="pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Folders
              </p>
              {folders.map((folder) => (
                <SidebarItem
                  key={folder.id}
                  icon={Folder}
                  label={folder.name}
                  active={selectedFolderId === folder.id}
                  onClick={() => {
                    setSelectedFolderId(folder.id);
                    setFilterType('all');
                  }}
                  count={items.filter((i) => i.folderId === folder.id).length}
                />
              ))}
            </div>
          )}
        </nav>

        {/* Plan & Usage */}
        <div className="p-4 border-t border-border">
          <div className={`rounded-lg p-3 ${isAtLimit ? 'bg-destructive/10 border border-destructive/20' : isNearLimit ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-muted/50'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Crown className={`w-4 h-4 ${effectivePlan === 'free' ? 'text-muted-foreground' : 'text-amber-500'}`} />
                <span className="text-sm font-medium">{planLimits.name} Plan</span>
              </div>
              {effectivePlan === 'free' && (
                <Link 
                  href="/pricing" 
                  className="text-xs text-primary hover:underline"
                >
                  Upgrade
                </Link>
              )}
            </div>
            
            {maxItems !== null ? (
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Vault items</span>
                  <span className={isAtLimit ? 'text-destructive font-medium' : isNearLimit ? 'text-amber-600 font-medium' : ''}>
                    {itemCount} / {maxItems}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      isAtLimit ? 'bg-destructive' : isNearLimit ? 'bg-amber-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min((itemCount / maxItems) * 100, 100)}%` }}
                  />
                </div>
                {isAtLimit && (
                  <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Limit reached - upgrade to add more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Unlimited items</p>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="p-4 border-t border-border space-y-1">
          <Link
            href="/organizations"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Users className="w-4 h-4" />
            Organizations
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
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
      <main className="flex-1 flex">
        {/* Item List */}
        <div className="w-80 border-r border-border flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">
              {filterType === 'all'
                ? 'All Items'
                : filterType === 'favorites'
                ? 'Favorites'
                : itemTypeLabels[filterType]}
            </h2>
            <div className="relative">
              <button
                onClick={() => setShowNewItemMenu(!showNewItemMenu)}
                className={`p-2 hover:bg-accent rounded-lg transition-colors ${isAtLimit ? 'opacity-50' : ''}`}
                title={isAtLimit ? 'Upgrade to add more items' : 'Add new item'}
              >
                <Plus className="w-4 h-4" />
              </button>

              {showNewItemMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-lg py-1 z-10">
                  {isAtLimit ? (
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2 text-destructive mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium text-sm">Limit Reached</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        You&apos;ve reached the {maxItems} item limit on the Free plan.
                      </p>
                      <Link
                        href="/pricing"
                        className="block w-full text-center px-3 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors"
                        onClick={() => setShowNewItemMenu(false)}
                      >
                        Upgrade to Premium
                      </Link>
                    </div>
                  ) : (
                    <>
                      <Link
                        href="/vault/new?type=login"
                        className="flex items-center gap-2 px-4 py-2 hover:bg-accent transition-colors"
                        onClick={() => setShowNewItemMenu(false)}
                      >
                        <Key className="w-4 h-4" />
                        <span>Login</span>
                      </Link>
                      <Link
                        href="/vault/new?type=card"
                        className="flex items-center gap-2 px-4 py-2 hover:bg-accent transition-colors"
                        onClick={() => setShowNewItemMenu(false)}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Card</span>
                      </Link>
                      <Link
                        href="/vault/new?type=identity"
                        className="flex items-center gap-2 px-4 py-2 hover:bg-accent transition-colors"
                        onClick={() => setShowNewItemMenu(false)}
                      >
                        <User className="w-4 h-4" />
                        <span>Identity</span>
                      </Link>
                      <Link
                        href="/vault/new?type=securenote"
                        className="flex items-center gap-2 px-4 py-2 hover:bg-accent transition-colors"
                        onClick={() => setShowNewItemMenu(false)}
                      >
                        <StickyNote className="w-4 h-4" />
                        <span>Secure Note</span>
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p>Loading vault items...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No items found</p>
                <p className="text-sm mt-1">
                  {searchQuery ? 'Try a different search' : 'Add your first item'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const Icon = itemTypeIcons[item.type];
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`w-full p-4 text-left hover:bg-accent/50 transition-colors ${
                        selectedItemId === item.id ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{item.name}</p>
                            {item.favorite && (
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          {item.type === 'login' && item.login?.username && (
                            <p className="text-sm text-muted-foreground truncate">
                              {item.login.username}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Item Detail */}
        <div className="flex-1 flex flex-col">
          {selectedItem ? (
            <ItemDetail item={selectedItem} onCopyPassword={handleCopyPassword} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select an item to view details</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

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
        active ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && (
        <span className="text-xs opacity-60">{count}</span>
      )}
    </button>
  );
}

function ItemDetail({
  item,
  onCopyPassword,
}: {
  item: VaultItem;
  onCopyPassword: (password: string) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const Icon = itemTypeIcons[item.type];

  return (
    <>
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{item.name}</h2>
            <p className="text-sm text-muted-foreground">
              Last updated {new Date(item.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-accent rounded-lg transition-colors">
            <Star
              className={`w-5 h-5 ${
                item.favorite ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
              }`}
            />
          </button>
          <button className="p-2 hover:bg-accent rounded-lg transition-colors">
            <Edit className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="p-2 hover:bg-accent rounded-lg transition-colors text-destructive">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {item.type === 'login' && item.login && (
          <div className="space-y-4">
            {item.login.username && (
              <DetailField
                label="Username"
                value={item.login.username}
                onCopy={() => navigator.clipboard.writeText(item.login?.username || '')}
              />
            )}
            {item.login.password && (
              <DetailField
                label="Password"
                value={showPassword ? item.login.password : '••••••••••••'}
                onCopy={() => onCopyPassword(item.login?.password || '')}
                onToggleVisibility={() => setShowPassword(!showPassword)}
                isPassword
              />
            )}
            {item.login.uris && item.login.uris.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Website</p>
                {item.login.uris.map((uri, index) => (
                  <a
                    key={index}
                    href={uri.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline block"
                  >
                    {uri.uri}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {item.type === 'card' && item.card && (
          <div className="space-y-4">
            {item.card.cardholderName && (
              <DetailField label="Cardholder Name" value={item.card.cardholderName} />
            )}
            {item.card.number && (
              <DetailField
                label="Card Number"
                value={item.card.number}
                onCopy={() => navigator.clipboard.writeText(item.card?.number || '')}
              />
            )}
            {(item.card.expMonth || item.card.expYear) && (
              <DetailField
                label="Expiration"
                value={`${item.card.expMonth}/${item.card.expYear}`}
              />
            )}
            {item.card.code && (
              <DetailField
                label="Security Code"
                value="•••"
                onCopy={() => navigator.clipboard.writeText(item.card?.code || '')}
              />
            )}
          </div>
        )}

        {item.type === 'securenote' && item.notes && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Note</p>
            <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap">
              {item.notes}
            </div>
          </div>
        )}

        {item.notes && item.type !== 'securenote' && (
          <div className="mt-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
            <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
              {item.notes}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DetailField({
  label,
  value,
  onCopy,
  onToggleVisibility,
  isPassword,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  onToggleVisibility?: () => void;
  isPassword?: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className={`flex-1 ${isPassword ? 'font-mono' : ''}`}>{value}</p>
        {onToggleVisibility && (
          <button
            onClick={onToggleVisibility}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            {isPassword ? (
              <span className="text-xs text-muted-foreground">Show</span>
            ) : null}
          </button>
        )}
        {onCopy && (
          <button
            onClick={onCopy}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
