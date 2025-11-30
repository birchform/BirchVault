'use client';

import Link from 'next/link';
import { Sparkles, Lock, X } from 'lucide-react';

interface UpgradePromptProps {
  feature: string;
  description?: string;
  planRequired?: string;
  onClose?: () => void;
}

export function UpgradePrompt({
  feature,
  description,
  planRequired = 'Premium',
  onClose,
}: UpgradePromptProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}

        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>

          <h2 className="text-xl font-semibold mb-2">Upgrade to Unlock {feature}</h2>
          <p className="text-muted-foreground mb-6">
            {description || `${feature} is available on ${planRequired} and higher plans.`}
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              View Plans
            </Link>
            {onClose && (
              <button
                onClick={onClose}
                className="w-full py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
              >
                Maybe Later
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function UpgradeBanner({
  feature,
  compact = false,
}: {
  feature: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg text-sm">
        <Lock className="w-4 h-4 text-primary" />
        <span className="text-primary">
          <Link href="/pricing" className="font-medium hover:underline">
            Upgrade
          </Link>{' '}
          to use {feature}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{feature} is a premium feature</p>
          <p className="text-sm text-muted-foreground">
            Upgrade your plan to unlock this feature
          </p>
        </div>
      </div>
      <Link
        href="/pricing"
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        Upgrade
      </Link>
    </div>
  );
}

export function UsageLimitBanner({
  current,
  max,
  itemType = 'vault items',
}: {
  current: number;
  max: number;
  itemType?: string;
}) {
  const percentage = Math.min(100, (current / max) * 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= max;

  return (
    <div
      className={`p-4 rounded-xl border ${
        isAtLimit
          ? 'bg-red-500/5 border-red-500/20'
          : isNearLimit
          ? 'bg-yellow-500/5 border-yellow-500/20'
          : 'bg-muted/50 border-border'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          {isAtLimit ? (
            <span className="text-red-500">Limit reached</span>
          ) : (
            `${current} of ${max} ${itemType}`
          )}
        </span>
        {(isNearLimit || isAtLimit) && (
          <Link
            href="/pricing"
            className="text-sm text-primary hover:underline font-medium"
          >
            Upgrade for unlimited
          </Link>
        )}
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isAtLimit
              ? 'bg-red-500'
              : isNearLimit
              ? 'bg-yellow-500'
              : 'bg-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isAtLimit && (
        <p className="text-sm text-red-500 mt-2">
          You've reached your {itemType} limit. Upgrade to add more.
        </p>
      )}
    </div>
  );
}


