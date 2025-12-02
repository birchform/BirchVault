-- ============================================
-- Add missing foreign key indexes
-- Fixes unindexed_foreign_keys warnings
-- ============================================

-- org_invites.invited_by_user_id
CREATE INDEX IF NOT EXISTS idx_org_invites_invited_by 
    ON public.org_invites(invited_by_user_id);

-- parental_controls.organization_id
CREATE INDEX IF NOT EXISTS idx_parental_controls_organization 
    ON public.parental_controls(organization_id);

-- pending_approvals.child_user_id
CREATE INDEX IF NOT EXISTS idx_pending_approvals_child 
    ON public.pending_approvals(child_user_id);

-- subscriptions.plan_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id 
    ON public.subscriptions(plan_id);

-- vault_items.organization_id (may already exist, using IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_vault_items_organization_id 
    ON public.vault_items(organization_id);




