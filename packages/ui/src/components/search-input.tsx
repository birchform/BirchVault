import * as React from 'react';
import { cn } from '../utils/cn';
import { Search, X } from 'lucide-react';

// ============================================
// Search Input Component
// ============================================

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
  containerClassName?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, containerClassName, value, onClear, ...props }, ref) => {
    const hasValue = value && String(value).length > 0;

    return (
      <div className={cn('relative', containerClassName)}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          className={cn(
            'w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-input bg-background',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'placeholder:text-muted-foreground',
            className
          )}
          ref={ref}
          value={value}
          {...props}
        />
        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';




