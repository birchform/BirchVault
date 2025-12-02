// ============================================
// Desktop Vault Store (Zustand)
// ============================================

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { VaultItem, Folder, VaultItemType } from '@birchvault/core';

// Extended VaultItem with trash metadata
export interface TrashedVaultItem extends VaultItem {
  deletedAt: string;
}

// Raw item from Tauri (encrypted)
interface RawVaultItem {
  id: string;
  encryptedData: string;
  itemType: string;
  folderId: string | null;
  isFavorite: boolean;
  deletedAt: string | null;
  syncedAt: string | null;
  localUpdatedAt: string;
  serverUpdatedAt: string | null;
}

interface RawFolder {
  id: string;
  name: string;
  syncedAt: string | null;
  localUpdatedAt: string;
}

interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingChanges: number;
  isOnline: boolean;
}

interface VaultState {
  // Data
  items: VaultItem[];
  trashedItems: TrashedVaultItem[];
  folders: Folder[];
  rawItems: RawVaultItem[];
  rawTrashedItems: RawVaultItem[];
  
  // UI State
  selectedItemId: string | null;
  selectedFolderId: string | null;
  searchQuery: string;
  filterType: VaultItemType | 'all' | 'favorites' | 'trash';
  isLoading: boolean;
  
  // Encryption
  encryptionKey: CryptoKey | null;
  
  // Sync
  syncStatus: SyncStatus;
  
  // Setters
  setItems: (items: VaultItem[]) => void;
  setTrashedItems: (items: TrashedVaultItem[]) => void;
  setFolders: (folders: Folder[]) => void;
  setSelectedItemId: (id: string | null) => void;
  setSelectedFolderId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterType: (type: VaultItemType | 'all' | 'favorites' | 'trash') => void;
  setLoading: (loading: boolean) => void;
  setEncryptionKey: (key: CryptoKey | null) => void;
  setSyncStatus: (status: SyncStatus) => void;
  
  // Item Actions
  addItem: (item: VaultItem) => void;
  updateItem: (item: VaultItem) => void;
  removeItem: (id: string) => void;
  trashItem: (id: string) => void;
  restoreItem: (id: string) => void;
  permanentlyDeleteItem: (id: string) => void;
  
  // Folder Actions
  addFolder: (folder: Folder) => void;
  updateFolder: (folder: Folder) => void;
  removeFolder: (id: string) => void;
  
  // API Actions
  loadVault: () => Promise<void>;
  loadTrashedItems: () => Promise<void>;
  createItem: (encryptedData: string, type: VaultItemType, folderId?: string, isFavorite?: boolean) => Promise<RawVaultItem>;
  saveItem: (id: string, encryptedData: string, type: VaultItemType, folderId?: string, isFavorite?: boolean) => Promise<RawVaultItem>;
  deleteItem: (id: string) => Promise<void>;
  restoreItemFromTrash: (id: string) => Promise<void>;
  permanentlyDelete: (id: string) => Promise<void>;
  createFolder: (name: string) => Promise<RawFolder>;
  saveFolder: (id: string, name: string) => Promise<RawFolder>;
  deleteFolder: (id: string) => Promise<void>;
  sync: () => Promise<SyncStatus>;
  getSyncStatus: () => Promise<SyncStatus>;
  
  // Utilities
  clear: () => void;
  getFilteredItems: () => VaultItem[];
}

export const useVaultStore = create<VaultState>()((set, get) => ({
  // Initial state
  items: [],
  trashedItems: [],
  folders: [],
  rawItems: [],
  rawTrashedItems: [],
  selectedItemId: null,
  selectedFolderId: null,
  searchQuery: '',
  filterType: 'all',
  isLoading: false,
  encryptionKey: null,
  syncStatus: {
    isSyncing: false,
    lastSyncAt: null,
    pendingChanges: 0,
    isOnline: true,
  },

  // Setters
  setItems: (items) => set({ items }),
  setTrashedItems: (trashedItems) => set({ trashedItems }),
  setFolders: (folders) => set({ folders }),
  setSelectedItemId: (selectedItemId) => set({ selectedItemId }),
  setSelectedFolderId: (selectedFolderId) => set({ selectedFolderId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterType: (filterType) => set({ filterType }),
  setLoading: (isLoading) => set({ isLoading }),
  setEncryptionKey: (encryptionKey) => set({ encryptionKey }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),

  // Item mutations (local state only)
  addItem: (item) => set((state) => ({
    items: [...state.items, item],
  })),
  
  updateItem: (item) => set((state) => ({
    items: state.items.map((i) => (i.id === item.id ? item : i)),
  })),
  
  removeItem: (id) => set((state) => ({
    items: state.items.filter((i) => i.id !== id),
    selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
  })),
  
  trashItem: (id) => set((state) => {
    const item = state.items.find((i) => i.id === id);
    if (!item) return state;
    
    const trashedItem: TrashedVaultItem = {
      ...item,
      deletedAt: new Date().toISOString(),
    };
    
    return {
      items: state.items.filter((i) => i.id !== id),
      trashedItems: [...state.trashedItems, trashedItem],
      selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
    };
  }),
  
  restoreItem: (id) => set((state) => {
    const item = state.trashedItems.find((i) => i.id === id);
    if (!item) return state;
    
    const { deletedAt, ...restoredItem } = item;
    
    return {
      trashedItems: state.trashedItems.filter((i) => i.id !== id),
      items: [...state.items, restoredItem as VaultItem],
    };
  }),
  
  permanentlyDeleteItem: (id) => set((state) => ({
    trashedItems: state.trashedItems.filter((i) => i.id !== id),
  })),

  // Folder mutations
  addFolder: (folder) => set((state) => ({
    folders: [...state.folders, folder],
  })),
  
  updateFolder: (folder) => set((state) => ({
    folders: state.folders.map((f) => (f.id === folder.id ? folder : f)),
  })),
  
  removeFolder: (id) => set((state) => ({
    folders: state.folders.filter((f) => f.id !== id),
    selectedFolderId: state.selectedFolderId === id ? null : state.selectedFolderId,
  })),

  // API Actions
  loadVault: async () => {
    set({ isLoading: true });
    try {
      const [rawItems, rawTrashedItems, rawFolders] = await Promise.all([
        invoke<RawVaultItem[]>('get_vault_items'),
        invoke<RawVaultItem[]>('get_trashed_items'),
        invoke<RawFolder[]>('get_folders'),
      ]);
      
      set({
        rawItems,
        rawTrashedItems,
        folders: rawFolders.map((f) => ({
          id: f.id,
          name: f.name,
          createdAt: f.localUpdatedAt,
          updatedAt: f.localUpdatedAt,
        })),
        isLoading: false,
      });
      
      // Note: Items need to be decrypted by the caller using encryptionKey
    } catch (error) {
      console.error('Failed to load vault:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  loadTrashedItems: async () => {
    try {
      const rawTrashedItems = await invoke<RawVaultItem[]>('get_trashed_items');
      set({ rawTrashedItems }); // Replace, don't append
      // Note: Items need to be decrypted by the caller
    } catch (error) {
      console.error('Failed to load trashed items:', error);
      throw error;
    }
  },

  createItem: async (encryptedData, type, folderId, isFavorite = false) => {
    const result = await invoke<RawVaultItem>('create_vault_item', {
      request: {
        encryptedData,
        itemType: type,
        folderId: folderId || null,
        isFavorite,
      },
    });
    return result;
  },

  saveItem: async (id, encryptedData, type, folderId, isFavorite = false) => {
    const result = await invoke<RawVaultItem>('update_vault_item', {
      request: {
        id,
        encryptedData,
        itemType: type,
        folderId: folderId || null,
        isFavorite,
      },
    });
    return result;
  },

  deleteItem: async (id) => {
    await invoke('delete_vault_item', { id });
    get().trashItem(id);
  },

  restoreItemFromTrash: async (id) => {
    await invoke('restore_vault_item', { id });
    get().restoreItem(id);
  },

  permanentlyDelete: async (id) => {
    await invoke('permanently_delete_vault_item', { id });
    get().permanentlyDeleteItem(id);
  },

  createFolder: async (name) => {
    const result = await invoke<RawFolder>('create_folder', {
      request: { name },
    });
    
    get().addFolder({
      id: result.id,
      name: result.name,
      createdAt: result.localUpdatedAt,
      updatedAt: result.localUpdatedAt,
    });
    
    return result;
  },

  saveFolder: async (id, name) => {
    const result = await invoke<RawFolder>('update_folder', {
      request: { id, name },
    });
    
    get().updateFolder({
      id: result.id,
      name: result.name,
      createdAt: result.localUpdatedAt,
      updatedAt: result.localUpdatedAt,
    });
    
    return result;
  },

  deleteFolder: async (id) => {
    await invoke('delete_folder', { id });
    get().removeFolder(id);
  },

  sync: async () => {
    set((state) => ({
      syncStatus: { ...state.syncStatus, isSyncing: true },
    }));
    
    try {
      const status = await invoke<SyncStatus>('sync_vault');
      set({ syncStatus: status });
      
      // Reload vault after sync
      await get().loadVault();
      
      return status;
    } catch (error) {
      console.error('Sync failed:', error);
      const status = await invoke<SyncStatus>('get_sync_status');
      set({ syncStatus: status });
      throw error;
    }
  },

  getSyncStatus: async () => {
    const status = await invoke<SyncStatus>('get_sync_status');
    set({ syncStatus: status });
    return status;
  },

  // Utilities
  clear: () => set({
    items: [],
    trashedItems: [],
    folders: [],
    rawItems: [],
    rawTrashedItems: [],
    selectedItemId: null,
    selectedFolderId: null,
    searchQuery: '',
    filterType: 'all',
    encryptionKey: null,
  }),

  getFilteredItems: () => {
    const { items, trashedItems, searchQuery, selectedFolderId, filterType } = get();
    
    // If viewing trash, return trashed items (filtered by search)
    if (filterType === 'trash') {
      return trashedItems.filter((item) => {
        const matchesSearch = !searchQuery ||
          item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      });
    }
    
    return items.filter((item) => {
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFolder = !selectedFolderId || item.folderId === selectedFolderId;
      const matchesType =
        filterType === 'all' ||
        (filterType === 'favorites' && item.favorite) ||
        item.type === filterType;
      
      return matchesSearch && matchesFolder && matchesType;
    });
  },
}));




