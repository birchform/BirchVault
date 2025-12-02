import * as React from 'react';
import { cn } from '../utils/cn';
import {
  Key,
  CreditCard,
  StickyNote,
  User,
  Code,
  Wifi,
  FileText,
  ChevronRight,
  Star,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type VaultItemType =
  | 'login'
  | 'card'
  | 'securenote'
  | 'identity'
  | 'apikey'
  | 'wifi'
  | 'document';

export interface VaultItemData {
  id: string;
  name: string;
  type: VaultItemType;
  favorite?: boolean;
  subtitle?: string;
  expiryStatus?: 'expired' | 'critical' | 'warning' | null;
}

// ============================================
// Item Type Icons and Labels
// ============================================

export const itemTypeIcons: Record<VaultItemType, React.ElementType> = {
  login: Key,
  card: CreditCard,
  securenote: StickyNote,
  identity: User,
  apikey: Code,
  wifi: Wifi,
  document: FileText,
};

export const itemTypeLabels: Record<VaultItemType, string> = {
  login: 'Logins',
  card: 'Cards',
  securenote: 'Secure Notes',
  identity: 'Identities',
  apikey: 'API Keys',
  wifi: 'WiFi Networks',
  document: 'Documents',
};

// ============================================
// Empty State Component
// ============================================

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Key,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('p-8 text-center text-muted-foreground', className)}>
      <Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ============================================
// Loading State Component
// ============================================

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div className={cn('p-8 text-center text-muted-foreground', className)}>
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p>{message}</p>
    </div>
  );
}

// ============================================
// Vault Item Row Component
// ============================================

interface VaultItemRowProps {
  item: VaultItemData;
  selected?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  showCheckbox?: boolean;
  isChecked?: boolean;
  onCheckChange?: () => void;
  className?: string;
}

export function VaultItemRow({
  item,
  selected = false,
  onClick,
  draggable = false,
  onDragStart,
  onDragEnd,
  showCheckbox = false,
  isChecked = false,
  onCheckChange,
  className,
}: VaultItemRowProps) {
  const Icon = itemTypeIcons[item.type];

  const expiryIndicator = React.useMemo(() => {
    if (!item.expiryStatus) return null;
    const colors = {
      expired: 'bg-destructive',
      critical: 'bg-orange-500',
      warning: 'bg-amber-500',
    };
    return <span className={cn('w-2 h-2 rounded-full', colors[item.expiryStatus])} />;
  }, [item.expiryStatus]);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={cn(
        'w-full p-4 text-left hover:bg-accent/50 transition-colors cursor-pointer group',
        selected && 'bg-accent',
        isChecked && 'bg-primary/10 ring-1 ring-primary/30',
        draggable && 'cursor-grab active:cursor-grabbing',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {showCheckbox && (
          <div
            role="checkbox"
            aria-checked={isChecked}
            onClick={(e) => {
              e.stopPropagation();
              onCheckChange?.();
            }}
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
              isChecked
                ? 'bg-primary border-primary'
                : 'border-muted-foreground/30 opacity-0 group-hover:opacity-100'
            )}
          >
            {isChecked && (
              <svg
                className="w-3 h-3 text-primary-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        )}
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{item.name}</p>
            {item.favorite && (
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}
            {expiryIndicator}
          </div>
          {item.subtitle && (
            <p className="text-sm text-muted-foreground truncate">{item.subtitle}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );
}

// ============================================
// Vault Item List Component
// ============================================

interface VaultItemListProps {
  items: VaultItemData[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  showCheckboxes?: boolean;
  selectedIds?: Set<string>;
  onCheckChange?: (id: string) => void;
}

export function VaultItemList({
  items,
  selectedId,
  onSelect,
  isLoading = false,
  emptyTitle = 'No items found',
  emptyDescription,
  className,
  showCheckboxes = false,
  selectedIds = new Set(),
  onCheckChange,
}: VaultItemListProps) {
  if (isLoading) {
    return <LoadingState message="Loading vault items..." className={className} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    );
  }

  return (
    <div className={cn('divide-y divide-border', className)}>
      {items.map((item) => (
        <VaultItemRow
          key={item.id}
          item={item}
          selected={selectedId === item.id}
          onClick={() => onSelect?.(item.id)}
          showCheckbox={showCheckboxes}
          isChecked={selectedIds.has(item.id)}
          onCheckChange={() => onCheckChange?.(item.id)}
        />
      ))}
    </div>
  );
}








