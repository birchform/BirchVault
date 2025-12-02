// ============================================
// Vault State Store (Zustand)
// ============================================

import { create } from 'zustand';
import type { VaultItem, Folder } from '@birchvault/core';

// Extended VaultItem with trash metadata
export type TrashedVaultItem = VaultItem & {
  deletedAt: string;
};

interface VaultState {
  items: VaultItem[];
  trashedItems: TrashedVaultItem[];
  folders: Folder[];
  selectedItemId: string | null;
  selectedFolderId: string | null;
  searchQuery: string;
  isLoading: boolean;
  encryptionKey: CryptoKey | null;
  
  // Actions
  setItems: (items: VaultItem[]) => void;
  addItem: (item: VaultItem) => void;
  updateItem: (item: VaultItem) => void;
  removeItem: (id: string) => void;
  
  // Trash actions
  setTrashedItems: (items: TrashedVaultItem[]) => void;
  trashItem: (id: string) => void;
  restoreItem: (id: string) => void;
  permanentlyDeleteItem: (id: string) => void;
  
  setFolders: (folders: Folder[]) => void;
  addFolder: (folder: Folder) => void;
  removeFolder: (id: string) => void;
  
  setSelectedItemId: (id: string | null) => void;
  setSelectedFolderId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setEncryptionKey: (key: CryptoKey | null) => void;
  
  clear: () => void;
}

export const useVaultStore = create<VaultState>()((set) => ({
  items: [],
  trashedItems: [],
  folders: [],
  selectedItemId: null,
  selectedFolderId: null,
  searchQuery: '',
  isLoading: false,
  encryptionKey: null,

  setItems: (items: VaultItem[]) => set({ items }),
  addItem: (item: VaultItem) => set((state) => ({ items: [...state.items, item] as VaultItem[] })),
  updateItem: (item: VaultItem) =>
    set((state) => ({
      items: state.items.map((existingItem) =>
        existingItem.id === item.id ? item : existingItem
      ),
    })),
  removeItem: (id: string) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
    })),

  // Trash actions
  setTrashedItems: (trashedItems: TrashedVaultItem[]) => set({ trashedItems }),
  trashItem: (id: string) =>
    set((state) => {
      const itemToTrash = state.items.find((item) => item.id === id);
      if (!itemToTrash) return state;
      
      const trashedItem: TrashedVaultItem = {
        ...itemToTrash,
        deletedAt: new Date().toISOString(),
      };
      
      return {
        items: state.items.filter((item) => item.id !== id),
        trashedItems: [...state.trashedItems, trashedItem],
        selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
      };
    }),
  restoreItem: (id: string) =>
    set((state) => {
      const itemToRestore = state.trashedItems.find((item) => item.id === id);
      if (!itemToRestore) return state;
      
      // Remove deletedAt when restoring
      const { deletedAt, ...restoredItem } = itemToRestore;
      
      return {
        trashedItems: state.trashedItems.filter((item) => item.id !== id),
        items: [...state.items, restoredItem as VaultItem],
      };
    }),
  permanentlyDeleteItem: (id: string) =>
    set((state) => ({
      trashedItems: state.trashedItems.filter((item) => item.id !== id),
    })),

  setFolders: (folders: Folder[]) => set({ folders }),
  addFolder: (folder: Folder) => set((state) => ({ folders: [...state.folders, folder] as Folder[] })),
  removeFolder: (id: string) =>
    set((state) => ({
      folders: state.folders.filter((folder) => folder.id !== id),
      selectedFolderId: state.selectedFolderId === id ? null : state.selectedFolderId,
    })),

  setSelectedItemId: (selectedItemId) => set({ selectedItemId }),
  setSelectedFolderId: (selectedFolderId) => set({ selectedFolderId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLoading: (isLoading) => set({ isLoading }),
  setEncryptionKey: (encryptionKey) => set({ encryptionKey }),

  clear: () =>
    set({
      items: [],
      trashedItems: [],
      folders: [],
      selectedItemId: null,
      selectedFolderId: null,
      searchQuery: '',
      encryptionKey: null,
    }),
}));
