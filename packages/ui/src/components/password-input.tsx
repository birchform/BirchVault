import * as React from 'react';
import { cn } from '../utils/cn';
import { Eye, EyeOff, RefreshCw, Copy } from 'lucide-react';

// ============================================
// Password Input Component
// ============================================

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showToggle?: boolean;
  showGenerate?: boolean;
  showCopy?: boolean;
  onGenerate?: () => void;
  onCopy?: () => void;
  containerClassName?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      containerClassName,
      showToggle = true,
      showGenerate = false,
      showCopy = false,
      onGenerate,
      onCopy,
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className={cn('flex gap-2', containerClassName)}>
        <div className="relative flex-1">
          <input
            type={showPassword ? 'text' : 'password'}
            className={cn(
              'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'font-mono',
              showToggle && 'pr-10',
              className
            )}
            ref={ref}
            value={value}
            {...props}
          />
          {showToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        {showGenerate && onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            className="p-2 border border-border rounded-lg hover:bg-accent transition-colors"
            title="Generate password"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
        {showCopy && onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="p-2 border border-border rounded-lg hover:bg-accent transition-colors"
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

// ============================================
// Detail Field Component (for displaying passwords/sensitive data)
// ============================================

interface DetailFieldProps {
  label: string;
  value: string;
  isPassword?: boolean;
  onCopy?: () => void;
  className?: string;
}

export function DetailField({
  label,
  value,
  isPassword = false,
  onCopy,
  className,
}: DetailFieldProps) {
  const [showValue, setShowValue] = React.useState(!isPassword);

  return (
    <div className={className}>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className={cn('flex-1', isPassword && 'font-mono')}>
          {isPassword && !showValue ? '••••••••••••' : value}
        </p>
        {isPassword && (
          <button
            onClick={() => setShowValue(!showValue)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            title={showValue ? 'Hide' : 'Show'}
          >
            {showValue ? (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Eye className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
        {onCopy && (
          <button
            onClick={onCopy}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            title="Copy"
          >
            <Copy className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
