-- ============================================
-- BirchVault Subscription System
-- Stripe integration with tiered plans
-- ============================================

-- ============================================
-- Subscription Plans Table
-- Defines available plans and their features
-- ============================================
CREATE TABLE public.subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_monthly INTEGER NOT NULL DEFAULT 0, -- Price in pence (GBP)
    price_yearly INTEGER, -- Price in pence for yearly billing
    max_users INTEGER NOT NULL DEFAULT 1,
    max_vault_items INTEGER, -- NULL = unlimited
    max_devices INTEGER, -- NULL = unlimited per type
    device_per_type BOOLEAN NOT NULL DEFAULT false, -- If true, 1 device per type allowed
    features JSONB NOT NULL DEFAULT '{}',
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default plans
INSERT INTO public.subscription_plans (id, name, description, price_monthly, price_yearly, max_users, max_vault_items, max_devices, device_per_type, features, sort_order) VALUES
('free', 'Free', 'Get started with basic password management', 0, 0, 1, 5, 1, false, 
    '{"totp": false, "webauthn": false, "attachments": false, "sharing": false, "organizations": false, "parental_controls": false, "audit_logs": false, "sso": false, "custom_branding": false}'::jsonb, 1),
('premium', 'Premium', 'For individuals who want more security', 300, 3000, 1, NULL, NULL, true,
    '{"totp": true, "webauthn": true, "attachments": true, "sharing": false, "organizations": false, "parental_controls": false, "audit_logs": false, "sso": false, "custom_branding": false}'::jsonb, 2),
('families', 'Families', 'Secure password sharing for your family', 1500, 15000, 6, NULL, NULL, true,
    '{"totp": true, "webauthn": true, "attachments": true, "sharing": true, "organizations": true, "parental_controls": true, "audit_logs": false, "sso": false, "custom_branding": false}'::jsonb, 3),
('teams', 'Teams', 'For small to medium businesses', 400, 4000, NULL, NULL, NULL, true,
    '{"totp": true, "webauthn": true, "attachments": true, "sharing": true, "organizations": true, "parental_controls": false, "audit_logs": true, "sso": false, "custom_branding": false}'::jsonb, 4),
('enterprise', 'Enterprise', 'Advanced security for large organizations', 600, 6000, NULL, NULL, NULL, true,
    '{"totp": true, "webauthn": true, "attachments": true, "sharing": true, "organizations": true, "parental_controls": false, "audit_logs": true, "sso": true, "custom_branding": true}'::jsonb, 5);

-- ============================================
-- Subscriptions Table
-- Tracks user subscriptions
-- ============================================
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id) DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'paused')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================
-- Device Sessions Table
-- Track active device sessions for device limits
-- ============================================
CREATE TABLE public.device_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_type TEXT NOT NULL CHECK (device_type IN ('mobile', 'tablet', 'computer', 'browser_extension')),
    device_name TEXT,
    device_id TEXT NOT NULL, -- Unique device identifier
    user_agent TEXT,
    ip_address TEXT,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

-- ============================================
-- Usage Tracking Table
-- Track usage for limits enforcement
-- ============================================
CREATE TABLE public.usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    vault_items_count INTEGER NOT NULL DEFAULT 0,
    attachments_count INTEGER NOT NULL DEFAULT 0,
    attachments_size_bytes BIGINT NOT NULL DEFAULT 0,
    shared_items_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Parental Controls Table (Families plan)
-- ============================================
CREATE TABLE public.parental_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    child_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    can_view_passwords BOOLEAN NOT NULL DEFAULT false,
    can_view_activity BOOLEAN NOT NULL DEFAULT true,
    require_approval_for_new_items BOOLEAN NOT NULL DEFAULT false,
    require_approval_for_sharing BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(parent_user_id, child_user_id)
);

-- ============================================
-- Pending Approvals Table (Parental Controls)
-- ============================================
CREATE TABLE public.pending_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    child_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    approval_type TEXT NOT NULL CHECK (approval_type IN ('new_item', 'edit_item', 'share_item', 'delete_item')),
    item_data JSONB NOT NULL, -- Encrypted item data for review
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Audit Logs Table (Teams/Enterprise)
-- ============================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Update profiles table
-- ============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_device_sessions_user_id ON public.device_sessions(user_id);
CREATE INDEX idx_device_sessions_device_type ON public.device_sessions(user_id, device_type);
CREATE INDEX idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX idx_parental_controls_parent ON public.parental_controls(parent_user_id);
CREATE INDEX idx_parental_controls_child ON public.parental_controls(child_user_id);
CREATE INDEX idx_pending_approvals_parent ON public.pending_approvals(parent_user_id);
CREATE INDEX idx_pending_approvals_status ON public.pending_approvals(status);
CREATE INDEX idx_audit_logs_organization ON public.audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parental_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies - Subscription Plans (public read)
-- ============================================
CREATE POLICY "Anyone can view active plans"
    ON public.subscription_plans FOR SELECT
    USING (is_active = true);

-- ============================================
-- RLS Policies - Subscriptions
-- ============================================
CREATE POLICY "Users can view own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
    ON public.subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
    ON public.subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - Device Sessions
-- ============================================
CREATE POLICY "Users can view own device sessions"
    ON public.device_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own device sessions"
    ON public.device_sessions FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - Usage Tracking
-- ============================================
CREATE POLICY "Users can view own usage"
    ON public.usage_tracking FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - Parental Controls
-- ============================================
CREATE POLICY "Parents can view their controls"
    ON public.parental_controls FOR SELECT
    USING (auth.uid() = parent_user_id);

CREATE POLICY "Children can view controls on them"
    ON public.parental_controls FOR SELECT
    USING (auth.uid() = child_user_id);

CREATE POLICY "Parents can manage their controls"
    ON public.parental_controls FOR ALL
    USING (auth.uid() = parent_user_id);

-- ============================================
-- RLS Policies - Pending Approvals
-- ============================================
CREATE POLICY "Parents can view pending approvals"
    ON public.pending_approvals FOR SELECT
    USING (auth.uid() = parent_user_id);

CREATE POLICY "Children can view their pending approvals"
    ON public.pending_approvals FOR SELECT
    USING (auth.uid() = child_user_id);

CREATE POLICY "Children can create pending approvals"
    ON public.pending_approvals FOR INSERT
    WITH CHECK (auth.uid() = child_user_id);

CREATE POLICY "Parents can update pending approvals"
    ON public.pending_approvals FOR UPDATE
    USING (auth.uid() = parent_user_id);

-- ============================================
-- RLS Policies - Audit Logs
-- ============================================
CREATE POLICY "Org admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.organization_id = audit_logs.organization_id
            AND org_members.user_id = auth.uid()
            AND org_members.role IN ('owner', 'admin')
        )
    );

-- ============================================
-- Functions
-- ============================================

-- Function to create default subscription on user signup
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscriptions (user_id, plan_id, status)
    VALUES (NEW.id, 'free', 'active');
    
    INSERT INTO public.usage_tracking (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create subscription on profile creation
CREATE TRIGGER on_profile_created_subscription
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.create_default_subscription();

-- Function to update usage tracking
CREATE OR REPLACE FUNCTION public.update_vault_items_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.usage_tracking (user_id, vault_items_count)
        VALUES (NEW.user_id, 1)
        ON CONFLICT (user_id) DO UPDATE
        SET vault_items_count = usage_tracking.vault_items_count + 1,
            updated_at = NOW();
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.usage_tracking
        SET vault_items_count = GREATEST(0, vault_items_count - 1),
            updated_at = NOW()
        WHERE user_id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update vault items count
CREATE TRIGGER on_vault_item_change
    AFTER INSERT OR DELETE ON public.vault_items
    FOR EACH ROW EXECUTE FUNCTION public.update_vault_items_count();

-- Function to check if user can create vault item
CREATE OR REPLACE FUNCTION public.can_create_vault_item(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_items INTEGER;
    v_current_count INTEGER;
BEGIN
    -- Get max items from user's plan
    SELECT sp.max_vault_items INTO v_max_items
    FROM public.subscriptions s
    JOIN public.subscription_plans sp ON s.plan_id = sp.id
    WHERE s.user_id = p_user_id AND s.status = 'active';
    
    -- If unlimited (NULL), return true
    IF v_max_items IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Get current count
    SELECT vault_items_count INTO v_current_count
    FROM public.usage_tracking
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_current_count, 0) < v_max_items;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manage device sessions (auto-logout for free tier)
CREATE OR REPLACE FUNCTION public.manage_device_session(
    p_user_id UUID,
    p_device_type TEXT,
    p_device_id TEXT,
    p_device_name TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS TABLE(session_id UUID, logged_out_devices TEXT[]) AS $$
DECLARE
    v_plan_id TEXT;
    v_max_devices INTEGER;
    v_device_per_type BOOLEAN;
    v_session_id UUID;
    v_logged_out TEXT[] := '{}';
BEGIN
    -- Get user's plan limits
    SELECT sp.max_devices, sp.device_per_type, s.plan_id
    INTO v_max_devices, v_device_per_type, v_plan_id
    FROM public.subscriptions s
    JOIN public.subscription_plans sp ON s.plan_id = sp.id
    WHERE s.user_id = p_user_id AND s.status = 'active';
    
    -- Free tier: only 1 device total, logout others
    IF v_plan_id = 'free' THEN
        -- Get devices to logout
        SELECT ARRAY_AGG(device_id) INTO v_logged_out
        FROM public.device_sessions
        WHERE user_id = p_user_id AND device_id != p_device_id;
        
        -- Delete other sessions
        DELETE FROM public.device_sessions
        WHERE user_id = p_user_id AND device_id != p_device_id;
    -- Premium/Families: 1 device per type
    ELSIF v_device_per_type THEN
        -- Get devices of same type to logout
        SELECT ARRAY_AGG(device_id) INTO v_logged_out
        FROM public.device_sessions
        WHERE user_id = p_user_id 
        AND device_type = p_device_type 
        AND device_id != p_device_id;
        
        -- Delete other sessions of same type
        DELETE FROM public.device_sessions
        WHERE user_id = p_user_id 
        AND device_type = p_device_type 
        AND device_id != p_device_id;
    END IF;
    
    -- Upsert current session
    INSERT INTO public.device_sessions (user_id, device_type, device_id, device_name, user_agent, ip_address, last_active_at)
    VALUES (p_user_id, p_device_type, p_device_id, p_device_name, p_user_agent, p_ip_address, NOW())
    ON CONFLICT (user_id, device_id) DO UPDATE
    SET device_type = EXCLUDED.device_type,
        device_name = EXCLUDED.device_name,
        user_agent = EXCLUDED.user_agent,
        ip_address = EXCLUDED.ip_address,
        last_active_at = NOW()
    RETURNING id INTO v_session_id;
    
    RETURN QUERY SELECT v_session_id, COALESCE(v_logged_out, '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit event
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_organization_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_has_audit_logs BOOLEAN;
BEGIN
    -- Check if org has audit logs feature
    SELECT (sp.features->>'audit_logs')::boolean INTO v_has_audit_logs
    FROM public.org_members om
    JOIN public.subscriptions s ON s.user_id = om.user_id
    JOIN public.subscription_plans sp ON s.plan_id = sp.id
    WHERE om.organization_id = p_organization_id
    AND om.role = 'owner'
    LIMIT 1;
    
    IF v_has_audit_logs THEN
        INSERT INTO public.audit_logs (
            organization_id, user_id, action, resource_type, 
            resource_id, details, ip_address, user_agent
        )
        VALUES (
            p_organization_id, auth.uid(), p_action, p_resource_type,
            p_resource_id, p_details, p_ip_address, p_user_agent
        )
        RETURNING id INTO v_log_id;
    END IF;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for subscription updated_at
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger for parental_controls updated_at
CREATE TRIGGER update_parental_controls_updated_at
    BEFORE UPDATE ON public.parental_controls
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();




