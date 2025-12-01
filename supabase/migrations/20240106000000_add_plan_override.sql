-- ============================================
-- Admin Plan Override System
-- Allows admins to override user plans temporarily or permanently
-- ============================================

-- Add override columns to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS plan_override TEXT REFERENCES public.subscription_plans(id),
ADD COLUMN IF NOT EXISTS plan_override_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS plan_override_reason TEXT,
ADD COLUMN IF NOT EXISTS plan_override_set_by TEXT;

-- Create index for finding expired overrides
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_override 
ON public.subscriptions(plan_override) 
WHERE plan_override IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_override_expires 
ON public.subscriptions(plan_override_expires_at) 
WHERE plan_override_expires_at IS NOT NULL;

-- Function to get effective plan (considers override)
CREATE OR REPLACE FUNCTION public.get_effective_plan(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_subscription RECORD;
BEGIN
    SELECT plan_id, plan_override, plan_override_expires_at
    INTO v_subscription
    FROM public.subscriptions
    WHERE user_id = p_user_id;
    
    -- If no subscription found, return free
    IF v_subscription IS NULL THEN
        RETURN 'free';
    END IF;
    
    -- Check for valid override
    IF v_subscription.plan_override IS NOT NULL THEN
        -- If no expiry or not yet expired, use override
        IF v_subscription.plan_override_expires_at IS NULL 
           OR v_subscription.plan_override_expires_at > NOW() THEN
            RETURN v_subscription.plan_override;
        END IF;
    END IF;
    
    -- Return regular plan
    RETURN v_subscription.plan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on columns for documentation
COMMENT ON COLUMN public.subscriptions.plan_override IS 'Admin-set plan override, takes precedence over plan_id';
COMMENT ON COLUMN public.subscriptions.plan_override_expires_at IS 'When the override expires (NULL = permanent)';
COMMENT ON COLUMN public.subscriptions.plan_override_reason IS 'Reason for the override (e.g., "Trial for collaboration event")';
COMMENT ON COLUMN public.subscriptions.plan_override_set_by IS 'Email of admin who set the override';

