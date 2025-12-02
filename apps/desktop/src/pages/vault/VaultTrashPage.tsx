import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Key,
  CreditCard,
  StickyNote,
  User,
  Code,
  Wifi,
  FileText,
  Trash2,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { useVaultStore, TrashedVaultItem } from '../../store/vault';
import { decryptVaultItem, type VaultItem, type VaultItemType } from '@birchvault/core';
import { ConfirmDialog } from '@birchvault/ui';
import { useState } from 'react';

const itemTypeIcons: Record<VaultItemType, React.ElementType> = {
  login: Key,
  card: CreditCard,
  securenote: StickyNote,
  identity: User,
  apikey: Code,
  wifi: Wifi,
  document: FileText,
};

export function VaultTrashPage() {
  const navigate = useNavigate();
  const {
    trashedItems,
    rawItems,
    loadTrashedItems,
    restoreItemFromTrash,
    permanentlyDelete,
    encryptionKey,
    setTrashedItems,
  } = useVaultStore();

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    itemId: string | null;
    itemName: string;
  }>({ isOpen: false, itemId: null, itemName: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  // Load trashed items
  useEffect(() => {
    loadTrashedItems();
  }, [loadTrashedItems]);

  // Decrypt trashed items
  useEffect(() => {
    async function decryptTrashedItems() {
      if (!encryptionKey) return;

      const trashedRawItems = rawItems.filter((item) => item.deletedAt !== null);
      const decryptedItems: TrashedVaultItem[] = [];

      for (const rawItem of trashedRawItems) {
        try {
          const encryptedData = JSON.parse(rawItem.encryptedData);
          const decrypted = await decryptVaultItem<VaultItem>(encryptedData, encryptionKey);
          decryptedItems.push({
            ...decrypted,
            deletedAt: rawItem.deletedAt!,
          });
        } catch (err) {
          console.error('Failed to decrypt trashed item:', rawItem.id, err);
        }
      }

      setTrashedItems(decryptedItems);
    }

    decryptTrashedItems();
  }, [rawItems, encryptionKey, setTrashedItems]);

  const handleRestore = async (id: string) => {
    setIsRestoring(id);
    try {
      await restoreItemFromTrash(id);
    } catch (err) {
      console.error('Error restoring item:', err);
    } finally {
      setIsRestoring(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteConfirmation.itemId) return;

    setIsDeleting(true);
    try {
      await permanentlyDelete(deleteConfirmation.itemId);
      setDeleteConfirmation({ isOpen: false, itemId: null, itemName: '' });
    } catch (err) {
      console.error('Error permanently deleting item:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDaysUntilPermanentDelete = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const now = new Date();
    const daysSinceDelete = Math.floor(
      (now.getTime() - deleted.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, 30 - daysSinceDelete);
  };

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
          <h2 className="text-xl font-semibold">Trash</h2>
          <p className="text-sm text-muted-foreground">
            Items are permanently deleted after 30 days
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {trashedItems.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Trash is empty</p>
            <p className="text-sm mt-1">Deleted items will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {trashedItems.map((item) => {
              const Icon = itemTypeIcons[item.type];
              const daysLeft = getDaysUntilPermanentDelete(item.deletedAt);

              return (
                <div
                  key={item.id}
                  className="p-4 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          {daysLeft > 0
                            ? `${daysLeft} days until permanent deletion`
                            : 'Will be deleted soon'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestore(item.id)}
                        disabled={isRestoring === item.id}
                        className="p-2 hover:bg-accent rounded-lg transition-colors text-primary"
                        title="Restore"
                      >
                        {isRestoring === item.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirmation({
                            isOpen: true,
                            itemId: item.id,
                            itemName: item.name,
                          })
                        }
                        className="p-2 hover:bg-accent rounded-lg transition-colors text-destructive"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Permanent Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        title="Delete Permanently?"
        description={`"${deleteConfirmation.itemName}" will be permanently deleted. This action cannot be undone.`}
        confirmText="Delete Forever"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handlePermanentDelete}
        onCancel={() =>
          setDeleteConfirmation({ isOpen: false, itemId: null, itemName: '' })
        }
        isLoading={isDeleting}
      />
    </div>
  );
}








