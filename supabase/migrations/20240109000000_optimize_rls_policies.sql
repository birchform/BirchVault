-- ============================================
-- BirchVault RLS Policy Performance Optimization
-- Fixes auth_rls_initplan and multiple_permissive_policies warnings
-- ============================================

-- ============================================
-- PROFILES TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK ((select auth.uid()) = id);

-- ============================================
-- FOLDERS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can insert own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can update own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can delete own folders" ON public.folders;

CREATE POLICY "Users can view own folders"
    ON public.folders FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own folders"
    ON public.folders FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own folders"
    ON public.folders FOR UPDATE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own folders"
    ON public.folders FOR DELETE
    USING ((select auth.uid()) = user_id);

-- ============================================
-- VAULT_ITEMS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view own vault items" ON public.vault_items;
DROP POLICY IF EXISTS "Users can insert own vault items" ON public.vault_items;
DROP POLICY IF EXISTS "Users can update own vault items" ON public.vault_items;
DROP POLICY IF EXISTS "Users can delete own vault items" ON public.vault_items;

CREATE POLICY "Users can view own vault items"
    ON public.vault_items FOR SELECT
    USING (
        (select auth.uid()) = user_id
        OR (
            organization_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.org_members
                WHERE org_members.organization_id = vault_items.organization_id
                AND org_members.user_id = (select auth.uid())
                AND org_members.status = 'accepted'
            )
        )
    );

CREATE POLICY "Users can insert own vault items"
    ON public.vault_items FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own vault items"
    ON public.vault_items FOR UPDATE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own vault items"
    ON public.vault_items FOR DELETE
    USING ((select auth.uid()) = user_id);

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Members can view organizations" ON public.organizations;

CREATE POLICY "Members can view organizations"
    ON public.organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.organization_id = organizations.id
            AND org_members.user_id = (select auth.uid())
        )
    );

-- ============================================
-- TOTP_CONFIG TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view own TOTP config" ON public.totp_config;
DROP POLICY IF EXISTS "Users can insert own TOTP config" ON public.totp_config;
DROP POLICY IF EXISTS "Users can update own TOTP config" ON public.totp_config;
DROP POLICY IF EXISTS "Users can delete own TOTP config" ON public.totp_config;
DROP POLICY IF EXISTS "Users can manage own TOTP config" ON public.totp_config;

CREATE POLICY "Users can manage own TOTP config"
    ON public.totp_config FOR ALL
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- TOTP_BACKUP_CODES TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view own backup codes" ON public.totp_backup_codes;
DROP POLICY IF EXISTS "Users can insert own backup codes" ON public.totp_backup_codes;
DROP POLICY IF EXISTS "Users can update own backup codes" ON public.totp_backup_codes;
DROP POLICY IF EXISTS "Users can delete own backup codes" ON public.totp_backup_codes;
DROP POLICY IF EXISTS "Users can manage own backup codes" ON public.totp_backup_codes;

CREATE POLICY "Users can manage own backup codes"
    ON public.totp_backup_codes FOR ALL
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- WEBAUTHN_CREDENTIALS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view own WebAuthn credentials" ON public.webauthn_credentials;
DROP POLICY IF EXISTS "Users can insert own WebAuthn credentials" ON public.webauthn_credentials;
DROP POLICY IF EXISTS "Users can update own WebAuthn credentials" ON public.webauthn_credentials;
DROP POLICY IF EXISTS "Users can delete own WebAuthn credentials" ON public.webauthn_credentials;
DROP POLICY IF EXISTS "Users can manage own WebAuthn credentials" ON public.webauthn_credentials;

CREATE POLICY "Users can manage own WebAuthn credentials"
    ON public.webauthn_credentials FOR ALL
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- SHARED_ITEMS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view items shared with them" ON public.shared_items;
DROP POLICY IF EXISTS "Users can share their items" ON public.shared_items;
DROP POLICY IF EXISTS "Owners can update shared items" ON public.shared_items;
DROP POLICY IF EXISTS "Owners can delete shared items" ON public.shared_items;

CREATE POLICY "Users can view items shared with them"
    ON public.shared_items FOR SELECT
    USING (
        (select auth.uid()) = shared_with_user_id
        OR (select auth.uid()) = shared_by_user_id
    );

CREATE POLICY "Users can share their items"
    ON public.shared_items FOR INSERT
    WITH CHECK ((select auth.uid()) = shared_by_user_id);

CREATE POLICY "Owners can update shared items"
    ON public.shared_items FOR UPDATE
    USING ((select auth.uid()) = shared_by_user_id);

CREATE POLICY "Owners can delete shared items"
    ON public.shared_items FOR DELETE
    USING ((select auth.uid()) = shared_by_user_id);

-- ============================================
-- USER_PUBLIC_KEYS TABLE
-- Fix multiple permissive policies by keeping only one SELECT policy
-- ============================================
DROP POLICY IF EXISTS "Anyone can view public keys" ON public.user_public_keys;
DROP POLICY IF EXISTS "Users can insert own public key" ON public.user_public_keys;
DROP POLICY IF EXISTS "Users can update own public key" ON public.user_public_keys;
DROP POLICY IF EXISTS "Users can manage own public key" ON public.user_public_keys;

-- Keep single SELECT policy (anyone can view for sharing)
CREATE POLICY "Anyone can view public keys"
    ON public.user_public_keys FOR SELECT
    USING (true);

CREATE POLICY "Users can manage own public key"
    ON public.user_public_keys FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own public key"
    ON public.user_public_keys FOR UPDATE
    USING ((select auth.uid()) = user_id);

-- ============================================
-- ORG_COLLECTIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Org members can view collections" ON public.org_collections;

CREATE POLICY "Org members can view collections"
    ON public.org_collections FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.organization_id = org_collections.organization_id
            AND org_members.user_id = (select auth.uid())
            AND org_members.status = 'accepted'
        )
    );

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

CREATE POLICY "Users can view own subscription"
    ON public.subscriptions FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own subscription"
    ON public.subscriptions FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own subscription"
    ON public.subscriptions FOR UPDATE
    USING ((select auth.uid()) = user_id);

-- ============================================
-- DEVICE_SESSIONS TABLE
-- Fix multiple permissive policies by splitting FOR ALL into specific actions
-- ============================================
DROP POLICY IF EXISTS "Users can view own device sessions" ON public.device_sessions;
DROP POLICY IF EXISTS "Users can manage own device sessions" ON public.device_sessions;

CREATE POLICY "Users can view own device sessions"
    ON public.device_sessions FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own device sessions"
    ON public.device_sessions FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own device sessions"
    ON public.device_sessions FOR UPDATE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own device sessions"
    ON public.device_sessions FOR DELETE
    USING ((select auth.uid()) = user_id);

-- ============================================
-- USAGE_TRACKING TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_tracking;

CREATE POLICY "Users can view own usage"
    ON public.usage_tracking FOR SELECT
    USING ((select auth.uid()) = user_id);

-- ============================================
-- PARENTAL_CONTROLS TABLE
-- Fix multiple permissive policies by splitting FOR ALL into specific actions
-- ============================================
DROP POLICY IF EXISTS "Parents can view their controls" ON public.parental_controls;
DROP POLICY IF EXISTS "Children can view controls on them" ON public.parental_controls;
DROP POLICY IF EXISTS "Parents can manage their controls" ON public.parental_controls;

-- Consolidated SELECT policy with OR conditions
CREATE POLICY "Users can view parental controls"
    ON public.parental_controls FOR SELECT
    USING (
        (select auth.uid()) = parent_user_id
        OR (select auth.uid()) = child_user_id
    );

-- Separate policies for write operations (parents only)
CREATE POLICY "Parents can insert parental controls"
    ON public.parental_controls FOR INSERT
    WITH CHECK ((select auth.uid()) = parent_user_id);

CREATE POLICY "Parents can update parental controls"
    ON public.parental_controls FOR UPDATE
    USING ((select auth.uid()) = parent_user_id);

CREATE POLICY "Parents can delete parental controls"
    ON public.parental_controls FOR DELETE
    USING ((select auth.uid()) = parent_user_id);

-- ============================================
-- PENDING_APPROVALS TABLE
-- Fix multiple permissive policies by consolidating SELECT
-- ============================================
DROP POLICY IF EXISTS "Parents can view pending approvals" ON public.pending_approvals;
DROP POLICY IF EXISTS "Children can view their pending approvals" ON public.pending_approvals;
DROP POLICY IF EXISTS "Children can create pending approvals" ON public.pending_approvals;
DROP POLICY IF EXISTS "Parents can update pending approvals" ON public.pending_approvals;

-- Consolidated SELECT policy
CREATE POLICY "Users can view pending approvals"
    ON public.pending_approvals FOR SELECT
    USING (
        (select auth.uid()) = parent_user_id
        OR (select auth.uid()) = child_user_id
    );

CREATE POLICY "Children can create pending approvals"
    ON public.pending_approvals FOR INSERT
    WITH CHECK ((select auth.uid()) = child_user_id);

CREATE POLICY "Parents can update pending approvals"
    ON public.pending_approvals FOR UPDATE
    USING ((select auth.uid()) = parent_user_id);

-- ============================================
-- AUDIT_LOGS TABLE
-- ============================================
DROP POLICY IF EXISTS "Org admins can view audit logs" ON public.audit_logs;

CREATE POLICY "Org admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.organization_id = audit_logs.organization_id
            AND org_members.user_id = (select auth.uid())
            AND org_members.role IN ('owner', 'admin')
        )
    );







