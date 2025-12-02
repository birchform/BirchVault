import * as React from 'react';
import { cn } from '../utils/cn';

// ============================================
// Spinner Component
// ============================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'rounded-full border-primary border-t-transparent animate-spin',
        sizeClasses[size],
        className
      )}
    />
  );
}

// ============================================
// Loading Overlay Component
// ============================================

interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export function LoadingOverlay({ message, className }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50',
        className
      )}
    >
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}

// ============================================
// Button with Loading State
// ============================================

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
}

export function LoadingButton({
  isLoading = false,
  loadingText,
  children,
  disabled,
  className,
  variant = 'default',
  ...props
}: LoadingButtonProps) {
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };

  return (
    <button
      disabled={isLoading || disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {isLoading && <Spinner size="sm" />}
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
}








