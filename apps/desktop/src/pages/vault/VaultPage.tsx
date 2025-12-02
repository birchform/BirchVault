import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Key,
  CreditCard,
  StickyNote,
  User,
  Code,
  Wifi,
  FileText,
  Shield,
  Edit,
  Trash2,
  Star,
  Copy,
  Eye,
  EyeOff,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { useVaultStore, TrashedVaultItem } from '../../store/vault';
import { useAuthStore } from '../../store/auth';
import { copyToClipboard } from '../../store/settings';
import { decryptVaultItem, type VaultItem, type VaultItemType } from '@birchvault/core';
import { ConfirmDialog } from '@birchvault/ui';

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

export function VaultPage() {
  const navigate = useNavigate();
  const {
    items,
    trashedItems,
    rawItems,
    rawTrashedItems,
    loadVault,
    isLoading,
    selectedItemId,
    setSelectedItemId,
    filterType,
    selectedFolderId,
    searchQuery,
    encryptionKey,
    setItems,
    setTrashedItems,
    deleteItem,
    restoreItemFromTrash,
    permanentlyDelete,
  } = useVaultStore();
  const { getPlanLimits, getEffectivePlan } = useAuthStore();

  const [showNewItemMenu, setShowNewItemMenu] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    itemId: string | null;
    itemName: string;
  }>({ isOpen: false, itemId: null, itemName: '' });
  const [permanentDeleteConfirmation, setPermanentDeleteConfirmation] = useState<{
    isOpen: boolean;
    itemId: string | null;
    itemName: string;
  }>({ isOpen: false, itemId: null, itemName: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  const planLimits = getPlanLimits();
  const effectivePlan = getEffectivePlan();
  const maxItems = planLimits.maxItems;
  const isAtLimit = maxItems !== null && items.length >= maxItems;
  const isViewingTrash = filterType === 'trash';

  // Load vault on mount (includes both regular and trashed items)
  useEffect(() => {
    console.log('[VaultPage] Loading vault...');
    loadVault().then(() => {
      console.log('[VaultPage] Vault loaded');
    }).catch((err) => {
      console.error('[VaultPage] Failed to load vault:', err);
    });
  }, [loadVault]);

  // Decrypt regular items when rawItems or encryption key changes
  useEffect(() => {
    console.log('[VaultPage] Decrypt regular items effect triggered:', {
      hasEncryptionKey: !!encryptionKey,
      rawItemsCount: rawItems.length,
    });
    
    async function decryptRegularItems() {
      if (!encryptionKey) {
        console.log('[VaultPage] Skipping decryption - no key');
        return;
      }

      if (rawItems.length === 0) {
        setItems([]);
        return;
      }

      console.log('[VaultPage] Decrypting', rawItems.length, 'regular items...');
      const decryptedItems: VaultItem[] = [];
      
      for (const rawItem of rawItems) {
        try {
          const encryptedData = JSON.parse(rawItem.encryptedData);
          const decrypted = await decryptVaultItem<VaultItem>(encryptedData, encryptionKey);
          decryptedItems.push(decrypted);
        } catch (err) {
          console.error('[VaultPage] Failed to decrypt item:', rawItem.id, err);
        }
      }
      
      console.log('[VaultPage] Decrypted', decryptedItems.length, 'regular items');
      setItems(decryptedItems);
    }

    decryptRegularItems();
  }, [rawItems, encryptionKey, setItems]);

  // Decrypt trashed items when rawTrashedItems or encryption key changes
  useEffect(() => {
    console.log('[VaultPage] Decrypt trashed items effect triggered:', {
      hasEncryptionKey: !!encryptionKey,
      rawTrashedItemsCount: rawTrashedItems.length,
    });
    
    async function decryptTrashedItems() {
      if (!encryptionKey) {
        console.log('[VaultPage] Skipping trashed decryption - no key');
        return;
      }

      if (rawTrashedItems.length === 0) {
        setTrashedItems([]);
        return;
      }

      console.log('[VaultPage] Decrypting', rawTrashedItems.length, 'trashed items...');
      const decryptedTrashedItems: TrashedVaultItem[] = [];
      
      for (const rawItem of rawTrashedItems) {
        try {
          const encryptedData = JSON.parse(rawItem.encryptedData);
          const decrypted = await decryptVaultItem<VaultItem>(encryptedData, encryptionKey);
          decryptedTrashedItems.push({
            ...decrypted,
            deletedAt: rawItem.deletedAt!,
          });
        } catch (err) {
          console.error('[VaultPage] Failed to decrypt trashed item:', rawItem.id, err);
        }
      }
      
      console.log('[VaultPage] Decrypted', decryptedTrashedItems.length, 'trashed items');
      setTrashedItems(decryptedTrashedItems);
    }

    decryptTrashedItems();
  }, [rawTrashedItems, encryptionKey, setTrashedItems]);

  // Filter items - use trashedItems when viewing trash
  const filteredItems = isViewingTrash
    ? trashedItems.filter((item) => {
        const matchesSearch =
          !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      })
    : items.filter((item) => {
        const matchesSearch =
          !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFolder = !selectedFolderId || item.folderId === selectedFolderId;
        const matchesType =
          filterType === 'all' ||
          (filterType === 'favorites' && item.favorite) ||
          item.type === filterType;
        return matchesSearch && matchesFolder && matchesType;
      });

  // Find selected item - check trashedItems when viewing trash
  const selectedItem = isViewingTrash
    ? trashedItems.find((item) => item.id === selectedItemId)
    : items.find((item) => item.id === selectedItemId);
  
  const selectedTrashedItem = isViewingTrash
    ? (selectedItem as TrashedVaultItem | undefined)
    : undefined;

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
      await deleteItem(deleteConfirmation.itemId);
      setDeleteConfirmation({ isOpen: false, itemId: null, itemName: '' });
    } catch (err) {
      console.error('Error deleting item:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreItem = async (id: string) => {
    setIsRestoring(id);
    try {
      await restoreItemFromTrash(id);
      setSelectedItemId(null);
    } catch (err) {
      console.error('Error restoring item:', err);
    } finally {
      setIsRestoring(null);
    }
  };

  const handlePermanentDeleteClick = (item: TrashedVaultItem) => {
    setPermanentDeleteConfirmation({
      isOpen: true,
      itemId: item.id,
      itemName: item.name,
    });
  };

  const handleConfirmPermanentDelete = async () => {
    if (!permanentDeleteConfirmation.itemId) return;

    setIsDeleting(true);
    try {
      await permanentlyDelete(permanentDeleteConfirmation.itemId);
      setPermanentDeleteConfirmation({ isOpen: false, itemId: null, itemName: '' });
      setSelectedItemId(null);
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
    <div className="flex-1 flex">
      {/* Item List */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold">
              {isViewingTrash
                ? 'Trash'
                : filterType === 'all'
                ? 'All Items'
                : filterType === 'favorites'
                ? 'Favorites'
                : itemTypeLabels[filterType as VaultItemType]}
            </h2>
            {isViewingTrash && (
              <p className="text-xs text-muted-foreground">
                Items deleted after 30 days
              </p>
            )}
          </div>
          {!isViewingTrash && (
          <div className="relative">
            <button
              onClick={() => setShowNewItemMenu(!showNewItemMenu)}
              className={`p-2 hover:bg-accent rounded-lg transition-colors ${
                isAtLimit ? 'opacity-50' : ''
              }`}
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
                      You've reached the {maxItems} item limit.
                    </p>
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
                          setShowNewItemMenu(false);
                          navigate(`/vault/new?type=${type}`);
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
          )}
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
              {isViewingTrash ? (
                <>
                  <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Trash is empty</p>
                  <p className="text-sm mt-1">Deleted items will appear here</p>
                </>
              ) : (
                <>
                  <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No items found</p>
                  <p className="text-sm mt-1">
                    {searchQuery ? 'Try a different search' : 'Add your first item'}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredItems.map((item) => {
                const Icon = itemTypeIcons[item.type];
                const trashedItem = isViewingTrash ? (item as TrashedVaultItem) : null;
                const daysLeft = trashedItem ? getDaysUntilPermanentDelete(trashedItem.deletedAt) : null;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`w-full p-4 text-left hover:bg-accent/50 transition-colors ${
                      selectedItemId === item.id ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isViewingTrash ? 'bg-muted' : 'bg-primary/10'
                      }`}>
                        <Icon className={`w-4 h-4 ${isViewingTrash ? 'text-muted-foreground' : 'text-primary'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{item.name}</p>
                          {!isViewingTrash && item.favorite && (
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        {isViewingTrash && daysLeft !== null ? (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {daysLeft > 0
                              ? `${daysLeft} days until deletion`
                              : 'Will be deleted soon'}
                          </p>
                        ) : (
                          item.type === 'login' && item.login?.username && (
                            <p className="text-sm text-muted-foreground truncate">
                              {item.login.username}
                            </p>
                          )
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
        {isViewingTrash && selectedTrashedItem ? (
          <TrashedItemDetail
            item={selectedTrashedItem}
            onRestore={() => handleRestoreItem(selectedTrashedItem.id)}
            onPermanentDelete={() => handlePermanentDeleteClick(selectedTrashedItem)}
            isRestoring={isRestoring === selectedTrashedItem.id}
            daysLeft={getDaysUntilPermanentDelete(selectedTrashedItem.deletedAt)}
          />
        ) : selectedItem ? (
          <ItemDetail
            item={selectedItem}
            onDelete={() => handleDeleteClick(selectedItem)}
            onEdit={() => navigate(`/vault/edit/${selectedItem.id}`)}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        title="Move to Trash?"
        description={`"${deleteConfirmation.itemName}" will be moved to trash.`}
        confirmText="Move to Trash"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setDeleteConfirmation({ isOpen: false, itemId: null, itemName: '' })
        }
        isLoading={isDeleting}
      />

      {/* Permanent Delete Confirmation */}
      <ConfirmDialog
        isOpen={permanentDeleteConfirmation.isOpen}
        title="Delete Permanently?"
        description={`"${permanentDeleteConfirmation.itemName}" will be permanently deleted. This action cannot be undone.`}
        confirmText="Delete Forever"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleConfirmPermanentDelete}
        onCancel={() =>
          setPermanentDeleteConfirmation({ isOpen: false, itemId: null, itemName: '' })
        }
        isLoading={isDeleting}
      />
    </div>
  );
}

// Item Detail Component
function ItemDetail({
  item,
  onDelete,
  onEdit,
}: {
  item: VaultItem;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const Icon = itemTypeIcons[item.type];

  const handleCopy = async (text: string) => {
    await copyToClipboard(text, 30);
  };

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
                item.favorite
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
          <button
            onClick={onEdit}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            title="Edit item"
          >
            <Edit className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={onDelete}
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
                onCopy={() => handleCopy(item.login?.username || '')}
              />
            )}
            {item.login.password && (
              <DetailField
                label="Password"
                value={showPassword ? item.login.password : '••••••••••••'}
                onCopy={() => handleCopy(item.login?.password || '')}
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
                onCopy={() => handleCopy(item.card?.number || '')}
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
                onCopy={() => handleCopy(item.card?.code || '')}
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
              <Eye className="w-4 h-4 text-muted-foreground" />
            ) : (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            )}
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

// Trashed Item Detail Component
function TrashedItemDetail({
  item,
  onRestore,
  onPermanentDelete,
  isRestoring,
  daysLeft,
}: {
  item: TrashedVaultItem;
  onRestore: () => void;
  onPermanentDelete: () => void;
  isRestoring: boolean;
  daysLeft: number;
}) {
  const Icon = itemTypeIcons[item.type];
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
            <p className={`font-medium ${daysLeft <= 3 ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}>
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
            disabled={isRestoring}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isRestoring ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Restore Item
          </button>
          <button
            onClick={onPermanentDelete}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-destructive text-destructive rounded-lg font-medium hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Forever
          </button>
        </div>
      </div>

      {/* Content Preview - Limited info for security, no sensitive data shown */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              For security reasons, sensitive data is hidden for trashed items. 
              Restore this item to view or edit its full details.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Type</p>
            <p className="capitalize">{item.type === 'securenote' ? 'Secure Note' : item.type === 'apikey' ? 'API Key' : item.type}</p>
          </div>

          {item.type === 'login' && item.login?.uris && item.login.uris.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Website</p>
              <p className="text-muted-foreground">{item.login.uris[0].uri}</p>
            </div>
          )}

          {item.type === 'card' && item.card?.cardholderName && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Cardholder</p>
              <p>{item.card.cardholderName}</p>
            </div>
          )}

          {item.type === 'identity' && item.identity && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Name</p>
              <p>{[item.identity.firstName, item.identity.lastName].filter(Boolean).join(' ') || 'N/A'}</p>
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







