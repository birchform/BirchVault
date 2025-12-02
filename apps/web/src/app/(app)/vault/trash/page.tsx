'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  Trash2,
  RotateCcw,
  Key,
  CreditCard,
  StickyNote,
  User,
  ArrowLeft,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useVaultStore, type TrashedVaultItem } from '@/store/vault';
import { getSupabaseClient } from '@/lib/supabase';
import { decryptVaultItem, type VaultItem, type VaultItemType } from '@birchvault/core';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const itemTypeIcons: Record<VaultItemType, React.ElementType> = {
  login: Key,
  card: CreditCard,
  securenote: StickyNote,
  identity: User,
};

const TRASH_RETENTION_DAYS = 30;

function getDaysUntilDeletion(deletedAt: string): number {
  const deletedDate = new Date(deletedAt);
  const expiryDate = new Date(deletedDate.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

export default function TrashPage() {
  const router = useRouter();
  const {
    trashedItems,
    encryptionKey,
    setTrashedItems,
    restoreItem,
    permanentlyDeleteItem,
  } = useVaultStore();

  const [isLoading, setIsLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<{ isOpen: boolean; item: TrashedVaultItem | null }>({
    isOpen: false,
    item: null,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item: TrashedVaultItem | null }>({
    isOpen: false,
    item: null,
  });
  const [emptyTrashConfirm, setEmptyTrashConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load trashed items if not already loaded
  useEffect(() => {
    async function loadTrashedItems() {
      if (!encryptionKey) {
        router.push('/unlock');
        return;
      }

      setIsLoading(true);
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        // Load trashed items
        const { data: trashedDbItems } = await supabase
          .from('vault_items')
          .select('*')
          .eq('user_id', user.id)
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false });

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

        setTrashedItems(decryptedTrashedItems);
      } catch (err) {
        console.error('Error loading trash:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadTrashedItems();
  }, [encryptionKey, router, setTrashedItems]);

  const handleRestore = async () => {
    if (!restoreConfirm.item) return;

    setIsProcessing(true);
    try {
      const supabase = getSupabaseClient();

      // Clear deleted_at to restore
      const { error } = await supabase
        .from('vault_items')
        .update({ deleted_at: null })
        .eq('id', restoreConfirm.item.id);

      if (error) {
        console.error('Failed to restore item:', error);
        return;
      }

      // Update local state
      restoreItem(restoreConfirm.item.id);
      setRestoreConfirm({ isOpen: false, item: null });
      setSelectedItemId(null);
    } catch (err) {
      console.error('Error restoring item:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteConfirm.item) return;

    setIsProcessing(true);
    try {
      const supabase = getSupabaseClient();

      // Permanently delete from database
      const { error } = await supabase
        .from('vault_items')
        .delete()
        .eq('id', deleteConfirm.item.id);

      if (error) {
        console.error('Failed to delete item:', error);
        return;
      }

      // Update local state
      permanentlyDeleteItem(deleteConfirm.item.id);
      setDeleteConfirm({ isOpen: false, item: null });
      setSelectedItemId(null);
    } catch (err) {
      console.error('Error deleting item:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmptyTrash = async () => {
    setIsProcessing(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Delete all trashed items for this user
      const { error } = await supabase
        .from('vault_items')
        .delete()
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null);

      if (error) {
        console.error('Failed to empty trash:', error);
        return;
      }

      // Clear local state
      setTrashedItems([]);
      setEmptyTrashConfirm(false);
      setSelectedItemId(null);
    } catch (err) {
      console.error('Error emptying trash:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedItem = trashedItems.find((item) => item.id === selectedItemId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/vault"
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Trash</h1>
                  <p className="text-sm text-muted-foreground">
                    {trashedItems.length} item{trashedItems.length !== 1 ? 's' : ''} • Items are permanently deleted after {TRASH_RETENTION_DAYS} days
                  </p>
                </div>
              </div>
            </div>
            {trashedItems.length > 0 && (
              <button
                onClick={() => setEmptyTrashConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                Empty Trash
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading trash...</p>
            </div>
          </div>
        ) : trashedItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Trash2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold mb-2">Trash is Empty</h2>
              <p className="text-muted-foreground mb-6">
                Items you delete will appear here for {TRASH_RETENTION_DAYS} days before being permanently removed.
              </p>
              <Link
                href="/vault"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Vault
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Item List */}
            <div className="w-80 border-r border-border flex flex-col">
              <div className="flex-1 overflow-y-auto divide-y divide-border">
                {trashedItems.map((item) => {
                  const Icon = itemTypeIcons[item.type];
                  const daysLeft = getDaysUntilDeletion(item.deletedAt);

                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`w-full p-4 text-left hover:bg-accent/50 transition-colors ${
                        selectedItemId === item.id ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {daysLeft === 0 ? (
                              <span className="text-destructive">Expires today</span>
                            ) : (
                              <span>{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Item Detail */}
            <div className="flex-1 flex flex-col">
              {selectedItem ? (
                <TrashItemDetail
                  item={selectedItem}
                  onRestore={() => setRestoreConfirm({ isOpen: true, item: selectedItem })}
                  onDelete={() => setDeleteConfirm({ isOpen: true, item: selectedItem })}
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
          </>
        )}
      </main>

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={restoreConfirm.isOpen}
        title="Restore Item?"
        description={`"${restoreConfirm.item?.name}" will be restored to your vault.`}
        confirmText="Restore"
        cancelText="Cancel"
        variant="default"
        onConfirm={handleRestore}
        onCancel={() => setRestoreConfirm({ isOpen: false, item: null })}
        isLoading={isProcessing}
      />

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Permanently Delete?"
        description={`"${deleteConfirm.item?.name}" will be permanently deleted. This action cannot be undone.`}
        confirmText="Delete Forever"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handlePermanentDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, item: null })}
        isLoading={isProcessing}
      />

      {/* Empty Trash Confirmation Dialog */}
      <ConfirmDialog
        isOpen={emptyTrashConfirm}
        title="Empty Trash?"
        description={`All ${trashedItems.length} item${trashedItems.length !== 1 ? 's' : ''} in trash will be permanently deleted. This action cannot be undone.`}
        confirmText="Empty Trash"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleEmptyTrash}
        onCancel={() => setEmptyTrashConfirm(false)}
        isLoading={isProcessing}
      />
    </div>
  );
}

function TrashItemDetail({
  item,
  onRestore,
  onDelete,
}: {
  item: TrashedVaultItem;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const Icon = itemTypeIcons[item.type];
  const daysLeft = getDaysUntilDeletion(item.deletedAt);
  const deletedDate = new Date(item.deletedAt);

  return (
    <>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{item.name}</h2>
              <p className="text-sm text-muted-foreground">
                Deleted on {deletedDate.toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className={`rounded-lg p-4 flex items-start gap-3 ${
          daysLeft <= 3 ? 'bg-destructive/10 border border-destructive/20' : 'bg-amber-500/10 border border-amber-500/20'
        }`}>
          <AlertTriangle className={`w-5 h-5 mt-0.5 ${daysLeft <= 3 ? 'text-destructive' : 'text-amber-500'}`} />
          <div className="flex-1">
            <p className={`font-medium ${daysLeft <= 3 ? 'text-destructive' : 'text-amber-600'}`}>
              {daysLeft === 0
                ? 'This item will be permanently deleted today'
                : `This item will be permanently deleted in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Restore it to keep it in your vault, or delete it now to remove it immediately.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={onRestore}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Restore Item
          </button>
          <button
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-destructive text-destructive rounded-lg font-medium hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Forever
          </button>
        </div>
      </div>

      {/* Content Preview */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Type</p>
            <p className="capitalize">{item.type}</p>
          </div>

          {item.type === 'login' && item.login && (
            <>
              {item.login.username && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Username</p>
                  <p>{item.login.username}</p>
                </div>
              )}
              {item.login.uris && item.login.uris.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Website</p>
                  <p className="text-primary">{item.login.uris[0].uri}</p>
                </div>
              )}
            </>
          )}

          {item.type === 'card' && item.card && (
            <>
              {item.card.cardholderName && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Cardholder</p>
                  <p>{item.card.cardholderName}</p>
                </div>
              )}
              {item.card.number && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Card Number</p>
                  <p>•••• •••• •••• {item.card.number.slice(-4)}</p>
                </div>
              )}
            </>
          )}

          {item.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
              <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                {item.notes.length > 200 ? `${item.notes.substring(0, 200)}...` : item.notes}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <p className="text-sm font-medium text-muted-foreground mb-1">Created</p>
            <p className="text-sm">{new Date(item.createdAt).toLocaleString()}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Last Updated</p>
            <p className="text-sm">{new Date(item.updatedAt).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </>
  );
}




