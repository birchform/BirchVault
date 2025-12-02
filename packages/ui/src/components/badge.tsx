import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

// ============================================
// Badge Component
// ============================================

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive/10 text-destructive',
        success: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
        warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
        purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
        outline: 'border border-current bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// ============================================
// Environment Badge Component
// ============================================

type Environment = 'production' | 'staging' | 'development' | string;

interface EnvironmentBadgeProps {
  environment: Environment;
  className?: string;
}

export function EnvironmentBadge({ environment, className }: EnvironmentBadgeProps) {
  const variant = React.useMemo(() => {
    switch (environment.toLowerCase()) {
      case 'production':
        return 'success';
      case 'staging':
        return 'info';
      case 'development':
        return 'purple';
      default:
        return 'secondary';
    }
  }, [environment]);

  return (
    <Badge variant={variant} className={className}>
      {environment.charAt(0).toUpperCase() + environment.slice(1)}
    </Badge>
  );
}

// ============================================
// Plan Badge Component
// ============================================

type Plan = 'free' | 'premium' | 'family' | 'enterprise' | string;

interface PlanBadgeProps {
  plan: Plan;
  className?: string;
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const variant = React.useMemo(() => {
    switch (plan.toLowerCase()) {
      case 'free':
        return 'secondary';
      case 'premium':
        return 'default';
      case 'family':
        return 'info';
      case 'enterprise':
        return 'purple';
      default:
        return 'secondary';
    }
  }, [plan]);

  return (
    <Badge variant={variant} className={className}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </Badge>
  );
}

// ============================================
// Status Badge Component
// ============================================

type Status = 'active' | 'inactive' | 'pending' | 'expired' | string;

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = React.useMemo(() => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'secondary';
      case 'pending':
        return 'warning';
      case 'expired':
        return 'destructive';
      default:
        return 'secondary';
    }
  }, [status]);

  return (
    <Badge variant={variant} className={className}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}








