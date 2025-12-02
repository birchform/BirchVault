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
  FolderPlus,
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
  Trash,
  Code,
  Clock,
  Eye,
  EyeOff,
  X,
  Lock,
  Wifi,
  FileText,
  RefreshCw,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useVaultStore, type TrashedVaultItem } from '@/store/vault';
import { useAuthStore, type Subscription, type PlanId } from '@/store/auth';
import { logout } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { decryptVaultItem, generatePassword, generateId, encryptVaultItem, encryptFile, type VaultItem, type VaultItemType, type LoginItem, type CardItem, type IdentityItem, type SecureNoteItem, type ApiKeyItem, type WifiItem, type DocumentItem, type Folder as FolderType2 } from '@birchvault/core';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Folder as FolderType } from '@birchvault/core';

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

export default function VaultPage() {
  const router = useRouter();
  const { user, subscription, clear: clearAuth, setSubscription, getEffectivePlan, getPlanLimits } = useAuthStore();
  const {
    items,
    trashedItems,
    folders,
    selectedItemId,
    selectedFolderId,
    searchQuery,
    encryptionKey,
    setItems,
    setTrashedItems,
    setFolders,
    addItem,
    addFolder,
    removeFolder,
    trashItem,
    setSelectedItemId,
    setSelectedFolderId,
    setSearchQuery,
    setLoading,
    isLoading,
  } = useVaultStore();

  const [filterType, setFilterType] = useState<VaultItemType | 'all' | 'favorites'>('all');
  const [showNewItemMenu, setShowNewItemMenu] = useState(false);
  const [newItemType, setNewItemType] = useState<VaultItemType | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    itemId: string | null;
    itemName: string;
  }>({ isOpen: false, itemId: null, itemName: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Folder management state
  const [folderModal, setFolderModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    folder: FolderType | null;
  }>({ isOpen: false, mode: 'create', folder: null });
  const [folderName, setFolderName] = useState('');
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [folderDeleteConfirmation, setFolderDeleteConfirmation] = useState<{
    isOpen: boolean;
    folder: FolderType | null;
  }>({ isOpen: false, folder: null });

  // Drag and drop state
  const [draggedItemIds, setDraggedItemIds] = useState<string[]>([]);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Bulk selection state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Get plan info
  const effectivePlan = getEffectivePlan();
  const planLimits = getPlanLimits();
  const itemCount = items.length;
  const maxItems = planLimits.maxItems;
  const isAtLimit = maxItems !== null && itemCount >= maxItems;
  const isNearLimit = maxItems !== null && itemCount >= maxItems - 1;
  // Folders are available for premium and above plans
  const userCanUseFolders = effectivePlan !== 'free';

  // Folder management functions
  const openCreateFolderModal = () => {
    setFolderName('');
    setFolderModal({ isOpen: true, mode: 'create', folder: null });
  };

  const openEditFolderModal = (folder: FolderType) => {
    setFolderName(folder.name);
    setFolderModal({ isOpen: true, mode: 'edit', folder });
  };

  const closeFolderModal = () => {
    setFolderModal({ isOpen: false, mode: 'create', folder: null });
    setFolderName('');
  };

  const handleSaveFolder = async () => {
    if (!folderName.trim()) return;
    
    setIsSavingFolder(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) return;

      if (folderModal.mode === 'create') {
        const { data, error } = await supabase
          .from('folders')
          .insert({
            name: folderName.trim(),
            user_id: currentUser.id,
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create folder:', error);
          return;
        }

        if (data) {
          addFolder({
            id: data.id,
            name: data.name,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          });
        }
      } else if (folderModal.mode === 'edit' && folderModal.folder) {
        const { error } = await supabase
          .from('folders')
          .update({ name: folderName.trim(), updated_at: new Date().toISOString() })
          .eq('id', folderModal.folder.id);

        if (error) {
          console.error('Failed to update folder:', error);
          return;
        }

        // Update in local state
        setFolders(folders.map(f => 
          f.id === folderModal.folder!.id 
            ? { ...f, name: folderName.trim(), updatedAt: new Date().toISOString() }
            : f
        ));
      }

      closeFolderModal();
    } catch (err) {
      console.error('Error saving folder:', err);
    } finally {
      setIsSavingFolder(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderDeleteConfirmation.folder) return;

    try {
      const supabase = getSupabaseClient();
      const folderId = folderDeleteConfirmation.folder.id;

      // First, remove folder_id from all items in this folder
      await supabase
        .from('vault_items')
        .update({ folder_id: null })
        .eq('folder_id', folderId);

      // Then delete the folder
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);

      if (error) {
        console.error('Failed to delete folder:', error);
        return;
      }

      // Update local state
      removeFolder(folderId);
      
      // Clear selected folder if it was the deleted one
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }

      // Update items in local state to remove folderId
      setItems(items.map(item => 
        item.folderId === folderId 
          ? { ...item, folderId: undefined }
          : item
      ));

      setFolderDeleteConfirmation({ isOpen: false, folder: null });
    } catch (err) {
      console.error('Error deleting folder:', err);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    // If item is in selection, drag all selected items
    if (selectedItemIds.has(itemId)) {
      setDraggedItemIds(Array.from(selectedItemIds));
    } else {
      setDraggedItemIds([itemId]);
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleDragEnd = () => {
    setDraggedItemIds([]);
    setDragOverFolderId(null);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolderId(null);

    if (draggedItemIds.length === 0) return;

    try {
      const supabase = getSupabaseClient();
      
      // Update items in database
      for (const itemId of draggedItemIds) {
        const item = items.find(i => i.id === itemId);
        if (!item) continue;

        // Update the item with new folder
        const updatedItem = { ...item, folderId: folderId || undefined };
        const encrypted = await import('@birchvault/core').then(m => 
          m.encryptVaultItem(updatedItem, encryptionKey!)
        );

        await supabase
          .from('vault_items')
          .update({ 
            encrypted_data: JSON.stringify(encrypted),
            folder_id: folderId 
          })
          .eq('id', itemId);
      }

      // Update local state
      setItems(items.map(item => 
        draggedItemIds.includes(item.id)
          ? { ...item, folderId: folderId || undefined }
          : item
      ));

      // Clear selection after move
      setSelectedItemIds(new Set());
      setDraggedItemIds([]);
    } catch (err) {
      console.error('Error moving items to folder:', err);
    }
  };

  // Bulk selection handlers
  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItemIds);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItemIds(newSelection);
    setIsSelectionMode(newSelection.size > 0);
  };

  const selectAllItems = () => {
    if (selectedItemIds.size === filteredItems.length) {
      // Deselect all
      setSelectedItemIds(new Set());
      setIsSelectionMode(false);
    } else {
      // Select all filtered items
      setSelectedItemIds(new Set(filteredItems.map(i => i.id)));
      setIsSelectionMode(true);
    }
  };

  const clearSelection = () => {
    setSelectedItemIds(new Set());
    setIsSelectionMode(false);
  };

  const moveSelectedToFolder = async (folderId: string | null) => {
    if (selectedItemIds.size === 0) return;

    try {
      const supabase = getSupabaseClient();
      
      for (const itemId of selectedItemIds) {
        const item = items.find(i => i.id === itemId);
        if (!item) continue;

        const updatedItem = { ...item, folderId: folderId || undefined };
        const encrypted = await import('@birchvault/core').then(m => 
          m.encryptVaultItem(updatedItem, encryptionKey!)
        );

        await supabase
          .from('vault_items')
          .update({ 
            encrypted_data: JSON.stringify(encrypted),
            folder_id: folderId 
          })
          .eq('id', itemId);
      }

      // Update local state
      setItems(items.map(item => 
        selectedItemIds.has(item.id)
          ? { ...item, folderId: folderId || undefined }
          : item
      ));

      clearSelection();
    } catch (err) {
      console.error('Error moving items to folder:', err);
    }
  };

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

        // Load active vault items (not deleted)
        const { data: vaultItems, error } = await supabase
          .from('vault_items')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null);

        if (error) {
          console.error('Failed to load vault items:', error);
          return;
        }

        // Load trashed items
        const { data: trashedDbItems } = await supabase
          .from('vault_items')
          .select('*')
          .eq('user_id', user.id)
          .not('deleted_at', 'is', null);

        // Decrypt active items
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

        // Decrypt trashed items
        const decryptedTrashedItems: TrashedVaultItem[] = [];
        for (const item of trashedDbItems || []) {
          try {
            const encryptedData = JSON.parse(item.encrypted_data);
            const decrypted = await decryptVaultItem<VaultItem>(encryptedData, encryptionKey);
            decryptedTrashedItems.push({
              ...decrypted,
              deletedAt: item.deleted_at,
            });
          } catch (err) {
            console.error('Failed to decrypt trashed item:', item.id, err);
          }
        }

        // Load folders
        const { data: folderData } = await supabase
          .from('folders')
          .select('*')
          .eq('user_id', user.id)
          .order('name');

        setItems(decryptedItems);
        setTrashedItems(decryptedTrashedItems);
        setFolders(folderData?.map(f => ({
          id: f.id,
          name: f.name,
          createdAt: f.created_at,
          updatedAt: f.updated_at,
        })) || []);
      } catch (err) {
        console.error('Error loading vault:', err);
      } finally {
        setLoading(false);
      }
    }

    loadVaultData();
  }, [encryptionKey, setItems, setFolders, setLoading, setSubscription, router]);

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

  const handleDeleteClick = (item: VaultItem) => {
    setDeleteConfirmation({
      isOpen: true,
      itemId: item.id,
      itemName: item.name,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.itemId) return;

    setIsDeleting(true);
    try {
      const supabase = getSupabaseClient();
      
      // Soft delete: set deleted_at timestamp
      const { error } = await supabase
        .from('vault_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deleteConfirmation.itemId);

      if (error) {
        console.error('Failed to delete item:', error);
        return;
      }

      // Update local state
      trashItem(deleteConfirmation.itemId);
      
      // Close dialog
      setDeleteConfirmation({ isOpen: false, itemId: null, itemName: '' });
    } catch (err) {
      console.error('Error deleting item:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, itemId: null, itemName: '' });
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
            onClick={() => {
              setFilterType('favorites');
              setSelectedFolderId(null);
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
                  }}
                  count={items.filter((i) => i.type === type).length}
                />
              );
            })}
          </div>

          {/* Folders Section */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Folders
              </p>
              {userCanUseFolders ? (
                <button
                  onClick={openCreateFolderModal}
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="New folder"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              ) : (
                <Link
                  href="/pricing"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                  title="Upgrade to Premium to use folders"
                >
                  <Lock className="w-3 h-3" />
                  <span>Upgrade</span>
                </Link>
              )}
            </div>
            
            {userCanUseFolders ? (
              <>
                {/* "No Folder" drop target - removes folder from items */}
                {draggedItemIds.length > 0 && (
                  <div
                    onDragOver={(e) => handleDragOver(e, 'none')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, null)}
                    className={`px-3 py-2 mb-1 rounded-lg border-2 border-dashed transition-colors ${
                      dragOverFolderId === 'none'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted-foreground/30 text-muted-foreground'
                    }`}
                  >
                    <span className="text-sm">Remove from folder</span>
                  </div>
                )}
                {folders.length > 0 ? (
                  folders.map((folder) => (
                    <div 
                      key={folder.id} 
                      className="group relative"
                      onDragOver={(e) => handleDragOver(e, folder.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, folder.id)}
                    >
                      <div className={`rounded-lg transition-all ${
                        dragOverFolderId === folder.id 
                          ? 'ring-2 ring-primary bg-primary/10' 
                          : ''
                      }`}>
                        <SidebarItem
                          icon={Folder}
                          label={folder.name}
                          active={selectedFolderId === folder.id}
                          onClick={() => {
                            setSelectedFolderId(folder.id);
                            setFilterType('all');
                          }}
                          count={items.filter((i) => i.folderId === folder.id).length}
                        />
                      </div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditFolderModal(folder);
                          }}
                          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          title="Edit folder"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderDeleteConfirmation({ isOpen: true, folder });
                          }}
                          className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                          title="Delete folder"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground px-3 py-2">
                    No folders yet. Create one to organise your vault.
                  </p>
                )}
              </>
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 rounded-lg">
                <p className="mb-1">Organise your vault with folders.</p>
                <Link href="/pricing" className="text-primary hover:underline">
                  Upgrade to Premium →
                </Link>
              </div>
            )}
          </div>

          {/* Trash */}
          <div className="pt-4">
            <Link
              href="/vault/trash"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <Trash className="w-4 h-4" />
              <span className="flex-1 text-left">Trash</span>
              {trashedItems.length > 0 && (
                <span className="text-xs opacity-60">{trashedItems.length}</span>
              )}
            </Link>
          </div>
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
            href="/organisations"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Users className="w-4 h-4" />
            Organisations
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
                      {([
                        { type: 'login', icon: Key, label: 'Login' },
                        { type: 'card', icon: CreditCard, label: 'Card' },
                        { type: 'identity', icon: User, label: 'Identity' },
                        { type: 'securenote', icon: StickyNote, label: 'Secure Note' },
                        { type: 'apikey', icon: Code, label: 'API Key' },
                        { type: 'wifi', icon: Wifi, label: 'WiFi Network' },
                        { type: 'document', icon: FileText, label: 'Document' },
                      ] as const).map(({ type, icon: TypeIcon, label }) => (
                        <button
                          key={type}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-accent transition-colors w-full text-left"
                          onClick={() => {
                            setNewItemType(type);
                            setSelectedItemId(null);
                            setShowNewItemMenu(false);
                          }}
                        >
                          <TypeIcon className="w-4 h-4" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Expiring Soon Widget */}
          <ExpiringApiKeysWidget items={items} onSelectItem={setSelectedItemId} />

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
                {/* Select All Header */}
                {userCanUseFolders && (
                  <div className="px-4 py-2 bg-muted/30 flex items-center gap-3 border-b border-border">
                    <div
                      onClick={selectAllItems}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                        selectedItemIds.size === filteredItems.length && filteredItems.length > 0
                          ? 'bg-primary border-primary'
                          : selectedItemIds.size > 0
                          ? 'bg-primary/50 border-primary'
                          : 'border-muted-foreground/30 hover:border-muted-foreground'
                      }`}
                    >
                      {selectedItemIds.size > 0 && (
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {selectedItemIds.size > 0 
                        ? `${selectedItemIds.size} of ${filteredItems.length} selected`
                        : `${filteredItems.length} items`
                      }
                    </span>
                    {selectedItemIds.size > 0 && (
                      <button
                        onClick={clearSelection}
                        className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
                {filteredItems.map((item) => {
                  const Icon = itemTypeIcons[item.type];
                  // Calculate expiry status for API keys
                  let expiryIndicator = null;
                  if (item.type === 'apikey' && item.apiKey?.expiresAt) {
                    const expiry = new Date(item.apiKey.expiresAt);
                    const now = new Date();
                    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    if (daysUntilExpiry < 0) {
                      expiryIndicator = <span className="w-2 h-2 rounded-full bg-destructive" title="Expired" />;
                    } else if (daysUntilExpiry <= 7) {
                      expiryIndicator = <span className="w-2 h-2 rounded-full bg-orange-500" title={`Expires in ${daysUntilExpiry} days`} />;
                    } else if (daysUntilExpiry <= 30) {
                      expiryIndicator = <span className="w-2 h-2 rounded-full bg-amber-500" title={`Expires in ${daysUntilExpiry} days`} />;
                    }
                  }
                  const isSelected = selectedItemIds.has(item.id);
                  const isDragging = draggedItemIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      draggable={userCanUseFolders}
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (isSelectionMode) {
                          toggleItemSelection(item.id);
                        } else {
                          setSelectedItemId(item.id);
                        }
                      }}
                      className={`w-full p-4 text-left hover:bg-accent/50 transition-colors cursor-pointer group ${
                        selectedItemId === item.id ? 'bg-accent' : ''
                      } ${isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : ''} ${
                        isDragging ? 'opacity-50' : ''
                      } ${userCanUseFolders ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Selection checkbox */}
                        {userCanUseFolders && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItemSelection(item.id);
                            }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'bg-primary border-primary' 
                                : 'border-muted-foreground/30 opacity-0 group-hover:opacity-100'
                            } ${isSelectionMode ? 'opacity-100' : ''}`}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        )}
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{item.name}</p>
                            {item.favorite && (
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            )}
                            {expiryIndicator}
                          </div>
                          {item.type === 'login' && item.login?.username && (
                            <p className="text-sm text-muted-foreground truncate">
                              {item.login.username}
                            </p>
                          )}
                          {item.type === 'apikey' && item.apiKey?.environment && (
                            <p className="text-sm text-muted-foreground truncate">
                              {item.apiKey.environment}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Item Detail / New Item Panel */}
        <div className="flex-1 flex flex-col">
          {newItemType ? (
            <NewItemPanel
              type={newItemType}
              folders={folders}
              canUseFolders={userCanUseFolders}
              onSave={(item) => {
                addItem(item);
                setNewItemType(null);
                setSelectedItemId(item.id);
              }}
              onCancel={() => setNewItemType(null)}
            />
          ) : selectedItem ? (
            <ItemDetail
              item={selectedItem}
              onCopyPassword={handleCopyPassword}
              onDelete={handleDeleteClick}
              onEdit={(item) => router.push(`/vault/edit/${item.id}`)}
            />
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        title="Move to Trash?"
        description={`"${deleteConfirmation.itemName}" will be moved to trash. You can restore it within 30 days.`}
        confirmText="Move to Trash"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
      />

      {/* Folder Modal */}
      {folderModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeFolderModal} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {folderModal.mode === 'create' ? 'Create Folder' : 'Edit Folder'}
              </h3>
              <button
                onClick={closeFolderModal}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <label htmlFor="folderName" className="block text-sm font-medium mb-2">
                Folder Name
              </label>
              <input
                id="folderName"
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveFolder()}
                placeholder="e.g., Work, Personal, Banking"
                className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeFolderModal}
                className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFolder}
                disabled={!folderName.trim() || isSavingFolder}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSavingFolder ? 'Saving...' : folderModal.mode === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Delete Confirmation */}
      <ConfirmDialog
        isOpen={folderDeleteConfirmation.isOpen}
        title="Delete Folder?"
        description={`"${folderDeleteConfirmation.folder?.name}" will be deleted. Items in this folder will not be deleted, but will no longer be in a folder.`}
        confirmText="Delete Folder"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteFolder}
        onCancel={() => setFolderDeleteConfirmation({ isOpen: false, folder: null })}
      />

      {/* Bulk Action Bar */}
      {selectedItemIds.size > 0 && userCanUseFolders && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-card border border-border rounded-xl shadow-xl px-4 py-3 flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedItemIds.size} item{selectedItemIds.size !== 1 ? 's' : ''} selected
            </span>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Move to:</span>
              <select
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') return;
                  moveSelectedToFolder(value === 'none' ? null : value);
                }}
                className="px-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                defaultValue=""
              >
                <option value="" disabled>Select folder...</option>
                <option value="none">No folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-4 w-px bg-border" />
            <button
              onClick={clearSelection}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
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
  onDelete,
  onEdit,
}: {
  item: VaultItem;
  onCopyPassword: (password: string) => void;
  onDelete: (item: VaultItem) => void;
  onEdit: (item: VaultItem) => void;
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
          <button 
            onClick={() => onEdit(item)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            title="Edit item"
          >
            <Edit className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-2 hover:bg-accent rounded-lg transition-colors text-destructive"
            title="Move to Trash"
          >
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

        {item.type === 'apikey' && item.apiKey && (
          <ApiKeyDetail item={item} />
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

function ApiKeyDetail({ item }: { item: VaultItem }) {
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  if (item.type !== 'apikey' || !item.apiKey) return null;

  const { key, secret, endpoint, environment, expiresAt, renewalReminderAt } = item.apiKey;

  // Calculate expiry status
  const getExpiryStatus = () => {
    if (!expiresAt) return null;
    const expiry = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', label: 'Expired', color: 'text-destructive bg-destructive/10' };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'critical', label: `Expires in ${daysUntilExpiry} days`, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'warning', label: `Expires in ${daysUntilExpiry} days`, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/20' };
    }
    return null;
  };

  const expiryStatus = getExpiryStatus();

  return (
    <div className="space-y-4">
      {expiryStatus && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${expiryStatus.color}`}>
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">{expiryStatus.label}</span>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">API Key</p>
        <div className="flex items-center gap-2">
          <p className="flex-1 font-mono text-sm break-all">
            {showKey ? key : '•'.repeat(Math.min(key.length, 32))}
          </p>
          <button
            onClick={() => setShowKey(!showKey)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            {showKey ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(key)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {secret && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Secret / Token</p>
          <div className="flex items-center gap-2">
            <p className="flex-1 font-mono text-sm break-all">
              {showSecret ? secret : '•'.repeat(Math.min(secret.length, 32))}
            </p>
            <button
              onClick={() => setShowSecret(!showSecret)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              {showSecret ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(secret)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {endpoint && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">API Endpoint</p>
          <a
            href={endpoint}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
          >
            {endpoint}
          </a>
        </div>
      )}

      {environment && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Environment</p>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            environment === 'production' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
            environment === 'staging' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
            environment === 'development' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
          }`}>
            {environment.charAt(0).toUpperCase() + environment.slice(1)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {expiresAt && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Expiry Date</p>
            <p className="text-sm">{new Date(expiresAt).toLocaleDateString()}</p>
          </div>
        )}
        {renewalReminderAt && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Renewal Reminder</p>
            <p className="text-sm">{new Date(renewalReminderAt).toLocaleDateString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ExpiringApiKeysWidget({
  items,
  onSelectItem,
}: {
  items: VaultItem[];
  onSelectItem: (id: string) => void;
}) {
  // Get API keys expiring within 30 days (or already expired)
  const expiringKeys = items
    .filter((item) => {
      if (item.type !== 'apikey' || !item.apiKey?.expiresAt) return false;
      const expiry = new Date(item.apiKey.expiresAt);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 30;
    })
    .sort((a, b) => {
      if (a.type !== 'apikey' || b.type !== 'apikey') return 0;
      const aExpiry = new Date(a.apiKey?.expiresAt || 0).getTime();
      const bExpiry = new Date(b.apiKey?.expiresAt || 0).getTime();
      return aExpiry - bExpiry;
    });

  if (expiringKeys.length === 0) return null;

  return (
    <div className="p-4 border-b border-border bg-amber-50 dark:bg-amber-900/10">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-amber-600" />
        <h3 className="text-sm font-medium text-amber-800 dark:text-amber-400">
          Expiring Soon ({expiringKeys.length})
        </h3>
      </div>
      <div className="space-y-2">
        {expiringKeys.slice(0, 3).map((item) => {
          if (item.type !== 'apikey' || !item.apiKey?.expiresAt) return null;
          const expiry = new Date(item.apiKey.expiresAt);
          const now = new Date();
          const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          let statusColor = 'text-amber-600';
          let statusBg = 'bg-amber-100 dark:bg-amber-900/20';
          let statusText = `${daysUntilExpiry}d`;
          
          if (daysUntilExpiry < 0) {
            statusColor = 'text-destructive';
            statusBg = 'bg-destructive/10';
            statusText = 'Expired';
          } else if (daysUntilExpiry <= 7) {
            statusColor = 'text-orange-600';
            statusBg = 'bg-orange-100 dark:bg-orange-900/20';
          }

          return (
            <button
              key={item.id}
              onClick={() => onSelectItem(item.id)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Code className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-sm truncate">{item.name}</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusBg} ${statusColor}`}>
                {statusText}
              </span>
            </button>
          );
        })}
        {expiringKeys.length > 3 && (
          <p className="text-xs text-amber-600 text-center">
            +{expiringKeys.length - 3} more
          </p>
        )}
      </div>
    </div>
  );
}

// Inline panel for creating new items
function NewItemPanel({
  type,
  folders,
  canUseFolders,
  onSave,
  onCancel,
}: {
  type: VaultItemType;
  folders: FolderType[];
  canUseFolders: boolean;
  onSave: (item: VaultItem) => void;
  onCancel: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [folderId, setFolderId] = useState('');
  const [favorite, setFavorite] = useState(false);

  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [uri, setUri] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Card fields
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvv, setCvv] = useState('');

  // Identity fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // API Key fields
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiEnvironment, setApiEnvironment] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // WiFi fields
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiSecurityType, setWifiSecurityType] = useState<'wpa3' | 'wpa2' | 'wpa' | 'wep' | 'open' | ''>('');
  const [wifiHidden, setWifiHidden] = useState(false);
  const [wifiRouterUrl, setWifiRouterUrl] = useState('');
  const [showWifiPassword, setShowWifiPassword] = useState(false);

  // Document fields
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentDescription, setDocumentDescription] = useState('');

  const Icon = itemTypeIcons[type];

  const handleGeneratePassword = () => {
    const newPassword = generatePassword({
      length: 20,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeAmbiguous: true,
    });
    setPassword(newPassword);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { encryptionKey } = useVaultStore.getState();
      if (!encryptionKey) {
        alert('No encryption key found. Please log out and log in again.');
        setIsLoading(false);
        return;
      }

      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Not logged in');
        setIsLoading(false);
        return;
      }

      const now = new Date().toISOString();
      const baseItem = {
        id: generateId(),
        name,
        notes,
        folderId: folderId || undefined,
        favorite,
        createdAt: now,
        updatedAt: now,
      };

      let newItem: VaultItem;

      switch (type) {
        case 'login':
          newItem = { ...baseItem, type: 'login' as const, login: { username, password, uris: uri ? [{ uri: uri.startsWith('http') ? uri : `https://${uri}` }] : [] } } satisfies LoginItem;
          break;
        case 'card':
          newItem = { ...baseItem, type: 'card' as const, card: { cardholderName, number: cardNumber, expMonth, expYear, code: cvv } } satisfies CardItem;
          break;
        case 'identity':
          newItem = { ...baseItem, type: 'identity' as const, identity: { firstName, lastName, email, phone } } satisfies IdentityItem;
          break;
        case 'securenote':
          newItem = { ...baseItem, type: 'securenote' as const, secureNote: { type: 0 as const } } satisfies SecureNoteItem;
          break;
        case 'apikey':
          newItem = { ...baseItem, type: 'apikey' as const, apiKey: { key: apiKeyValue, secret: apiSecret || undefined, endpoint: apiEndpoint || undefined, environment: apiEnvironment || undefined } } satisfies ApiKeyItem;
          break;
        case 'wifi':
          newItem = { ...baseItem, type: 'wifi' as const, wifi: { ssid: wifiSsid, password: wifiPassword || undefined, securityType: wifiSecurityType || undefined, hidden: wifiHidden || undefined, routerAdminUrl: wifiRouterUrl || undefined } } satisfies WifiItem;
          break;
        case 'document':
          if (!documentFile) {
            alert('Please select a file to upload');
            setIsLoading(false);
            return;
          }
          const storageKey = `${user.id}/${generateId()}-${documentFile.name}`;
          newItem = { ...baseItem, type: 'document' as const, document: { fileName: documentFile.name, fileSize: documentFile.size, mimeType: documentFile.type || 'application/octet-stream', storageKey, description: documentDescription || undefined } } satisfies DocumentItem;
          break;
        default:
          throw new Error('Unknown item type');
      }

      // Handle document upload
      if (type === 'document' && documentFile) {
        const encryptedBlob = await encryptFile(documentFile, encryptionKey);
        const docStorageKey = (newItem as DocumentItem).document.storageKey;
        const { error: uploadError } = await supabase.storage.from('vault-documents').upload(docStorageKey, encryptedBlob, { contentType: 'application/octet-stream', upsert: false });
        if (uploadError) {
          alert(`Failed to upload document: ${uploadError.message}`);
          setIsLoading(false);
          return;
        }
      }

      // Encrypt and save
      const encryptedData = await encryptVaultItem(newItem, encryptionKey);
      const { error } = await supabase.from('vault_items').insert({ id: newItem.id, user_id: user.id, folder_id: folderId || null, encrypted_data: JSON.stringify(encryptedData), type });

      if (error) {
        alert(`Failed to save: ${error.message}`);
        setIsLoading(false);
        return;
      }

      onSave(newItem);
    } catch (err) {
      console.error('Error saving vault item:', err);
      alert('Failed to save vault item');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">New {itemTypeLabels[type].replace(/s$/, '')}</h2>
            <p className="text-sm text-muted-foreground">Add a new item to your vault</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-accent rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" required />
        </div>

        {type === 'login' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 pr-10 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="button" onClick={handleGeneratePassword} className="p-2 border border-border rounded-lg hover:bg-accent" title="Generate"><RefreshCw className="w-4 h-4" /></button>
                <button type="button" onClick={() => navigator.clipboard.writeText(password)} className="p-2 border border-border rounded-lg hover:bg-accent" title="Copy"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website URL</label>
              <input type="text" value={uri} onChange={(e) => setUri(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="example.com" />
            </div>
          </>
        )}

        {type === 'card' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Cardholder Name</label>
              <input type="text" value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Card Number</label>
              <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">MM</label>
                <input type="text" value={expMonth} onChange={(e) => setExpMonth(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" maxLength={2} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">YY</label>
                <input type="text" value={expYear} onChange={(e) => setExpYear(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" maxLength={4} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CVV</label>
                <input type="password" value={cvv} onChange={(e) => setCvv(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" maxLength={4} />
              </div>
            </div>
          </>
        )}

        {type === 'identity' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </>
        )}

        {type === 'apikey' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">API Key *</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type={showApiKey ? 'text' : 'password'} value={apiKeyValue} onChange={(e) => setApiKeyValue(e.target.value)} className="w-full px-3 py-2 pr-10 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono" required />
                  <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="button" onClick={() => navigator.clipboard.writeText(apiKeyValue)} className="p-2 border border-border rounded-lg hover:bg-accent"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Secret / Token</label>
              <input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Endpoint</label>
              <input type="text" value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://api.example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Environment</label>
              <select value={apiEnvironment} onChange={(e) => setApiEnvironment(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select...</option>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>
          </>
        )}

        {type === 'wifi' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Network Name (SSID) *</label>
              <input type="text" value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type={showWifiPassword ? 'text' : 'password'} value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} className="w-full px-3 py-2 pr-10 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono" />
                  <button type="button" onClick={() => setShowWifiPassword(!showWifiPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showWifiPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="button" onClick={() => navigator.clipboard.writeText(wifiPassword)} className="p-2 border border-border rounded-lg hover:bg-accent"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Security Type</label>
              <select value={wifiSecurityType} onChange={(e) => setWifiSecurityType(e.target.value as typeof wifiSecurityType)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select...</option>
                <option value="wpa3">WPA3</option>
                <option value="wpa2">WPA2</option>
                <option value="wpa">WPA</option>
                <option value="wep">WEP</option>
                <option value="open">Open</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Router Admin URL</label>
              <input type="text" value={wifiRouterUrl} onChange={(e) => setWifiRouterUrl(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="192.168.1.1" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={wifiHidden} onChange={(e) => setWifiHidden(e.target.checked)} className="w-4 h-4 rounded border-input" />
              <span className="text-sm">Hidden network</span>
            </label>
          </>
        )}

        {type === 'document' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">File *</label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                {documentFile ? (
                  <div className="flex items-center justify-between bg-accent/50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-primary" />
                      <div className="text-left">
                        <p className="font-medium text-sm truncate max-w-[150px]">{documentFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(documentFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setDocumentFile(null)} className="p-1 hover:bg-accent rounded"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload</p>
                    <p className="text-xs text-muted-foreground">Max 50MB</p>
                    <input type="file" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 50 * 1024 * 1024) { alert('File too large'); return; }
                        setDocumentFile(file);
                        if (!name) setName(file.name.replace(/\.[^/.]+$/, ''));
                      }
                    }} />
                  </label>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={documentDescription} onChange={(e) => setDocumentDescription(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
        </div>

        {canUseFolders && folders.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">Folder</label>
            <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">No folder</option>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} className="w-4 h-4 rounded border-input" />
          <span className="text-sm">Mark as favorite</span>
        </label>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 text-center border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
          <button type="submit" disabled={isLoading || !name} className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
