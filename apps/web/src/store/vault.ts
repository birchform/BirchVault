// ============================================
// Vault State Store (Zustand)
// ============================================

import { create } from 'zustand';
import type { VaultItem, Folder } from '@birchvault/core';

interface VaultState {
  items: VaultItem[];
  folders: Folder[];
  selectedItemId: string | null;
  selectedFolderId: string | null;
  searchQuery: string;
  isLoading: boolean;
  encryptionKey: CryptoKey | null;
  
  // Actions
  setItems: (items: VaultItem[]) => void;
  addItem: (item: VaultItem) => void;
  updateItem: (id: string, updates: Partial<VaultItem>) => void;
  removeItem: (id: string) => void;
  
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
  folders: [],
  selectedItemId: null,
  selectedFolderId: null,
  searchQuery: '',
  isLoading: false,
  encryptionKey: null,

  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  updateItem: (id, updates) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
    })),

  setFolders: (folders) => set({ folders }),
  addFolder: (folder) => set((state) => ({ folders: [...state.folders, folder] })),
  removeFolder: (id) =>
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
      folders: [],
      selectedItemId: null,
      selectedFolderId: null,
      searchQuery: '',
      encryptionKey: null,
    }),
}));







