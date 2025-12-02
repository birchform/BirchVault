import * as React from 'react';
import { cn } from '../utils/cn';

// ============================================
// Sidebar Components
// ============================================

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function Sidebar({ children, className }: SidebarProps) {
  return (
    <aside className={cn('w-64 border-r border-border bg-card flex flex-col', className)}>
      {children}
    </aside>
  );
}

interface SidebarHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarHeader({ children, className }: SidebarHeaderProps) {
  return (
    <div className={cn('p-4 border-b border-border', className)}>
      {children}
    </div>
  );
}

interface SidebarContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarContent({ children, className }: SidebarContentProps) {
  return (
    <nav className={cn('flex-1 p-4 space-y-1 overflow-y-auto', className)}>
      {children}
    </nav>
  );
}

interface SidebarFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarFooter({ children, className }: SidebarFooterProps) {
  return (
    <div className={cn('p-4 border-t border-border', className)}>
      {children}
    </div>
  );
}

interface SidebarSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function SidebarSection({ title, children, className, action }: SidebarSectionProps) {
  return (
    <div className={cn('pt-4', className)}>
      {title && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
  count?: number;
  className?: string;
  disabled?: boolean;
}

export function SidebarItem({
  icon: Icon,
  label,
  active = false,
  onClick,
  count,
  className,
  disabled = false,
}: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-accent text-muted-foreground hover:text-foreground',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && (
        <span className="text-xs opacity-60">{count}</span>
      )}
    </button>
  );
}

interface SidebarUserProps {
  email?: string;
  avatar?: React.ReactNode;
  onLogout?: () => void;
  logoutIcon?: React.ElementType;
}

export function SidebarUser({ email, avatar, onLogout, logoutIcon: LogoutIcon }: SidebarUserProps) {
  return (
    <div className="flex items-center gap-3">
      {avatar || (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary text-sm font-medium">
            {email?.charAt(0).toUpperCase() || '?'}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{email}</p>
      </div>
      {onLogout && LogoutIcon && (
        <button
          onClick={onLogout}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
          title="Log out"
        >
          <LogoutIcon className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}




