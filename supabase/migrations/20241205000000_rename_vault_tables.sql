-- ============================================
-- Rename All Birch Vault Tables with vault_ Prefix
-- This migration prefixes all tables to separate
-- Vault data from other Birch app data
-- ============================================

-- NOTE: vault_items already has the vault_ prefix, so it stays as-is

-- ============================================
-- Step 1: Drop all foreign key constraints
-- ============================================

-- Drop FK constraints from vault_items
ALTER TABLE public.vault_items DROP CONSTRAINT IF EXISTS vault_items_user_id_fkey;
ALTER TABLE public.vault_items DROP CONSTRAINT IF EXISTS vault_items_folder_id_fkey;
ALTER TABLE public.vault_items DROP CONSTRAINT IF EXISTS vault_items_organization_id_fkey;

-- Drop FK constraints from folders
ALTER TABLE public.folders DROP CONSTRAINT IF EXISTS folders_user_id_fkey;

-- Drop FK constraints from org_members
ALTER TABLE public.org_members DROP CONSTRAINT IF EXISTS org_members_organization_id_fkey;
ALTER TABLE public.org_members DROP CONSTRAINT IF EXISTS org_members_user_id_fkey;

-- Drop FK constraints from totp_config
ALTER TABLE public.totp_config DROP CONSTRAINT IF EXISTS totp_config_user_id_fkey;

-- Drop FK constraints from totp_backup_codes
ALTER TABLE public.totp_backup_codes DROP CONSTRAINT IF EXISTS totp_backup_codes_user_id_fkey;

-- Drop FK constraints from webauthn_credentials
ALTER TABLE public.webauthn_credentials DROP CONSTRAINT IF EXISTS webauthn_credentials_user_id_fkey;

-- Drop FK constraints from webauthn_challenges
ALTER TABLE public.webauthn_challenges DROP CONSTRAINT IF EXISTS webauthn_challenges_user_id_fkey;

-- Drop FK constraints from shared_items
ALTER TABLE public.shared_items DROP CONSTRAINT IF EXISTS shared_items_vault_item_id_fkey;
ALTER TABLE public.shared_items DROP CONSTRAINT IF EXISTS shared_items_shared_by_user_id_fkey;
ALTER TABLE public.shared_items DROP CONSTRAINT IF EXISTS shared_items_shared_with_user_id_fkey;

-- Drop FK constraints from user_public_keys
ALTER TABLE public.user_public_keys DROP CONSTRAINT IF EXISTS user_public_keys_user_id_fkey;

-- Drop FK constraints from org_invites
ALTER TABLE public.org_invites DROP CONSTRAINT IF EXISTS org_invites_organization_id_fkey;
ALTER TABLE public.org_invites DROP CONSTRAINT IF EXISTS org_invites_invited_by_user_id_fkey;

-- Drop FK constraints from org_collections
ALTER TABLE public.org_collections DROP CONSTRAINT IF EXISTS org_collections_organization_id_fkey;

-- Drop FK constraints from collection_items
ALTER TABLE public.collection_items DROP CONSTRAINT IF EXISTS collection_items_collection_id_fkey;
ALTER TABLE public.collection_items DROP CONSTRAINT IF EXISTS collection_items_vault_item_id_fkey;

-- Drop FK constraints from collection_access
ALTER TABLE public.collection_access DROP CONSTRAINT IF EXISTS collection_access_collection_id_fkey;
ALTER TABLE public.collection_access DROP CONSTRAINT IF EXISTS collection_access_user_id_fkey;

-- Drop FK constraints from subscriptions
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_id_fkey;

-- Drop FK constraints from device_sessions
ALTER TABLE public.device_sessions DROP CONSTRAINT IF EXISTS device_sessions_user_id_fkey;

-- Drop FK constraints from usage_tracking
ALTER TABLE public.usage_tracking DROP CONSTRAINT IF EXISTS usage_tracking_user_id_fkey;

-- Drop FK constraints from parental_controls
ALTER TABLE public.parental_controls DROP CONSTRAINT IF EXISTS parental_controls_parent_user_id_fkey;
ALTER TABLE public.parental_controls DROP CONSTRAINT IF EXISTS parental_controls_child_user_id_fkey;
ALTER TABLE public.parental_controls DROP CONSTRAINT IF EXISTS parental_controls_organization_id_fkey;

-- Drop FK constraints from pending_approvals
ALTER TABLE public.pending_approvals DROP CONSTRAINT IF EXISTS pending_approvals_parent_user_id_fkey;
ALTER TABLE public.pending_approvals DROP CONSTRAINT IF EXISTS pending_approvals_child_user_id_fkey;

-- Drop FK constraints from audit_logs
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_organization_id_fkey;
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- ============================================
-- Step 2: Drop all triggers
-- ============================================
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_folders_updated_at ON public.folders;
DROP TRIGGER IF EXISTS update_vault_items_updated_at ON public.vault_items;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created_subscription ON public.profiles;
DROP TRIGGER IF EXISTS on_vault_item_change ON public.vault_items;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
DROP TRIGGER IF EXISTS update_parental_controls_updated_at ON public.parental_controls;

-- ============================================
-- Step 3: Drop all RLS policies
-- ============================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Folders policies
DROP POLICY IF EXISTS "Users can view own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can insert own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can update own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can delete own folders" ON public.folders;

-- Vault items policies
DROP POLICY IF EXISTS "Users can view own vault items" ON public.vault_items;
DROP POLICY IF EXISTS "Users can insert own vault items" ON public.vault_items;
DROP POLICY IF EXISTS "Users can update own vault items" ON public.vault_items;
DROP POLICY IF EXISTS "Users can delete own vault items" ON public.vault_items;

-- Organizations policies
DROP POLICY IF EXISTS "Members can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;

-- Org members policies
DROP POLICY IF EXISTS "Users can view org members" ON public.org_members;
DROP POLICY IF EXISTS "Admins can insert org members" ON public.org_members;

-- TOTP config policies
DROP POLICY IF EXISTS "Users can view own TOTP config" ON public.totp_config;
DROP POLICY IF EXISTS "Users can insert own TOTP config" ON public.totp_config;
DROP POLICY IF EXISTS "Users can update own TOTP config" ON public.totp_config;
DROP POLICY IF EXISTS "Users can delete own TOTP config" ON public.totp_config;

-- TOTP backup codes policies
DROP POLICY IF EXISTS "Users can view own backup codes" ON public.totp_backup_codes;
DROP POLICY IF EXISTS "Users can insert own backup codes" ON public.totp_backup_codes;
DROP POLICY IF EXISTS "Users can update own backup codes" ON public.totp_backup_codes;
DROP POLICY IF EXISTS "Users can delete own backup codes" ON public.totp_backup_codes;

-- WebAuthn credentials policies
DROP POLICY IF EXISTS "Users can view own WebAuthn credentials" ON public.webauthn_credentials;
DROP POLICY IF EXISTS "Users can insert own WebAuthn credentials" ON public.webauthn_credentials;
DROP POLICY IF EXISTS "Users can update own WebAuthn credentials" ON public.webauthn_credentials;
DROP POLICY IF EXISTS "Users can delete own WebAuthn credentials" ON public.webauthn_credentials;

-- WebAuthn challenges policies
DROP POLICY IF EXISTS "Users can view own challenges" ON public.webauthn_challenges;
DROP POLICY IF EXISTS "Anyone can insert challenges" ON public.webauthn_challenges;
DROP POLICY IF EXISTS "Users can delete own challenges" ON public.webauthn_challenges;

-- Shared items policies
DROP POLICY IF EXISTS "Users can view items shared with them" ON public.shared_items;
DROP POLICY IF EXISTS "Users can share their items" ON public.shared_items;
DROP POLICY IF EXISTS "Owners can update shared items" ON public.shared_items;
DROP POLICY IF EXISTS "Owners can delete shared items" ON public.shared_items;

-- User public keys policies
DROP POLICY IF EXISTS "Anyone can view public keys" ON public.user_public_keys;
DROP POLICY IF EXISTS "Users can insert own public key" ON public.user_public_keys;
DROP POLICY IF EXISTS "Users can update own public key" ON public.user_public_keys;

-- Org invites policies
DROP POLICY IF EXISTS "Org admins can view invites" ON public.org_invites;
DROP POLICY IF EXISTS "Org admins can create invites" ON public.org_invites;
DROP POLICY IF EXISTS "Org admins can delete invites" ON public.org_invites;

-- Org collections policies
DROP POLICY IF EXISTS "Org members can view collections" ON public.org_collections;
DROP POLICY IF EXISTS "Org admins can manage collections" ON public.org_collections;

-- Subscription plans policies
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

-- Device sessions policies
DROP POLICY IF EXISTS "Users can view own device sessions" ON public.device_sessions;
DROP POLICY IF EXISTS "Users can manage own device sessions" ON public.device_sessions;

-- Usage tracking policies
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_tracking;

-- Parental controls policies
DROP POLICY IF EXISTS "Parents can view their controls" ON public.parental_controls;
DROP POLICY IF EXISTS "Children can view controls on them" ON public.parental_controls;
DROP POLICY IF EXISTS "Parents can manage their controls" ON public.parental_controls;

-- Pending approvals policies
DROP POLICY IF EXISTS "Parents can view pending approvals" ON public.pending_approvals;
DROP POLICY IF EXISTS "Children can view their pending approvals" ON public.pending_approvals;
DROP POLICY IF EXISTS "Children can create pending approvals" ON public.pending_approvals;
DROP POLICY IF EXISTS "Parents can update pending approvals" ON public.pending_approvals;

-- Audit logs policies
DROP POLICY IF EXISTS "Org admins can view audit logs" ON public.audit_logs;

-- ============================================
-- Step 4: Rename all tables
-- ============================================
ALTER TABLE public.profiles RENAME TO vault_profiles;
ALTER TABLE public.folders RENAME TO vault_folders;
ALTER TABLE public.organizations RENAME TO vault_organizations;
ALTER TABLE public.org_members RENAME TO vault_org_members;
-- vault_items stays as-is (already has prefix)
ALTER TABLE public.totp_config RENAME TO vault_totp_config;
ALTER TABLE public.totp_backup_codes RENAME TO vault_totp_backup_codes;
ALTER TABLE public.webauthn_credentials RENAME TO vault_webauthn_credentials;
ALTER TABLE public.webauthn_challenges RENAME TO vault_webauthn_challenges;
ALTER TABLE public.shared_items RENAME TO vault_shared_items;
ALTER TABLE public.user_public_keys RENAME TO vault_user_public_keys;
ALTER TABLE public.org_invites RENAME TO vault_org_invites;
ALTER TABLE public.org_collections RENAME TO vault_org_collections;
ALTER TABLE public.collection_items RENAME TO vault_collection_items;
ALTER TABLE public.collection_access RENAME TO vault_collection_access;
ALTER TABLE public.subscription_plans RENAME TO vault_subscription_plans;
ALTER TABLE public.subscriptions RENAME TO vault_subscriptions;
ALTER TABLE public.device_sessions RENAME TO vault_device_sessions;
ALTER TABLE public.usage_tracking RENAME TO vault_usage_tracking;
ALTER TABLE public.parental_controls RENAME TO vault_parental_controls;
ALTER TABLE public.pending_approvals RENAME TO vault_pending_approvals;
ALTER TABLE public.audit_logs RENAME TO vault_audit_logs;

-- ============================================
-- Step 5: Rename all indexes
-- ============================================
ALTER INDEX IF EXISTS idx_vault_items_user_id RENAME TO idx_vault_items_user_id;
ALTER INDEX IF EXISTS idx_vault_items_folder_id RENAME TO idx_vault_items_folder_id;
ALTER INDEX IF EXISTS idx_vault_items_organization_id RENAME TO idx_vault_items_organization_id;
ALTER INDEX IF EXISTS idx_folders_user_id RENAME TO idx_vault_folders_user_id;
ALTER INDEX IF EXISTS idx_org_members_organization_id RENAME TO idx_vault_org_members_organization_id;
ALTER INDEX IF EXISTS idx_org_members_user_id RENAME TO idx_vault_org_members_user_id;
ALTER INDEX IF EXISTS idx_totp_config_user_id RENAME TO idx_vault_totp_config_user_id;
ALTER INDEX IF EXISTS idx_totp_backup_codes_user_id RENAME TO idx_vault_totp_backup_codes_user_id;
ALTER INDEX IF EXISTS idx_webauthn_credentials_user_id RENAME TO idx_vault_webauthn_credentials_user_id;
ALTER INDEX IF EXISTS idx_webauthn_credentials_credential_id RENAME TO idx_vault_webauthn_credentials_credential_id;
ALTER INDEX IF EXISTS idx_webauthn_challenges_user_id RENAME TO idx_vault_webauthn_challenges_user_id;
ALTER INDEX IF EXISTS idx_webauthn_challenges_expires_at RENAME TO idx_vault_webauthn_challenges_expires_at;
ALTER INDEX IF EXISTS idx_shared_items_shared_by RENAME TO idx_vault_shared_items_shared_by;
ALTER INDEX IF EXISTS idx_shared_items_shared_with RENAME TO idx_vault_shared_items_shared_with;
ALTER INDEX IF EXISTS idx_shared_items_vault_item RENAME TO idx_vault_shared_items_vault_item;
ALTER INDEX IF EXISTS idx_org_invites_organization RENAME TO idx_vault_org_invites_organization;
ALTER INDEX IF EXISTS idx_org_invites_email RENAME TO idx_vault_org_invites_email;
ALTER INDEX IF EXISTS idx_org_collections_organization RENAME TO idx_vault_org_collections_organization;
ALTER INDEX IF EXISTS idx_collection_items_collection RENAME TO idx_vault_collection_items_collection;
ALTER INDEX IF EXISTS idx_collection_access_collection RENAME TO idx_vault_collection_access_collection;
ALTER INDEX IF EXISTS idx_subscriptions_user_id RENAME TO idx_vault_subscriptions_user_id;
ALTER INDEX IF EXISTS idx_subscriptions_stripe_customer RENAME TO idx_vault_subscriptions_stripe_customer;
ALTER INDEX IF EXISTS idx_subscriptions_stripe_subscription RENAME TO idx_vault_subscriptions_stripe_subscription;
ALTER INDEX IF EXISTS idx_device_sessions_user_id RENAME TO idx_vault_device_sessions_user_id;
ALTER INDEX IF EXISTS idx_device_sessions_device_type RENAME TO idx_vault_device_sessions_device_type;
ALTER INDEX IF EXISTS idx_usage_tracking_user_id RENAME TO idx_vault_usage_tracking_user_id;
ALTER INDEX IF EXISTS idx_parental_controls_parent RENAME TO idx_vault_parental_controls_parent;
ALTER INDEX IF EXISTS idx_parental_controls_child RENAME TO idx_vault_parental_controls_child;
ALTER INDEX IF EXISTS idx_pending_approvals_parent RENAME TO idx_vault_pending_approvals_parent;
ALTER INDEX IF EXISTS idx_pending_approvals_status RENAME TO idx_vault_pending_approvals_status;
ALTER INDEX IF EXISTS idx_audit_logs_organization RENAME TO idx_vault_audit_logs_organization;
ALTER INDEX IF EXISTS idx_audit_logs_user RENAME TO idx_vault_audit_logs_user;
ALTER INDEX IF EXISTS idx_audit_logs_created RENAME TO idx_vault_audit_logs_created;
ALTER INDEX IF EXISTS idx_vault_items_deleted_at RENAME TO idx_vault_items_deleted_at;

-- ============================================
-- Step 6: Recreate all foreign key constraints
-- ============================================

-- vault_items FKs
ALTER TABLE public.vault_items 
    ADD CONSTRAINT vault_items_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.vault_items 
    ADD CONSTRAINT vault_items_folder_id_fkey 
    FOREIGN KEY (folder_id) REFERENCES public.vault_folders(id) ON DELETE SET NULL;

ALTER TABLE public.vault_items 
    ADD CONSTRAINT vault_items_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.vault_organizations(id) ON DELETE CASCADE;

-- vault_folders FKs
ALTER TABLE public.vault_folders 
    ADD CONSTRAINT vault_folders_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

-- vault_org_members FKs
ALTER TABLE public.vault_org_members 
    ADD CONSTRAINT vault_org_members_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.vault_organizations(id) ON DELETE CASCADE;

ALTER TABLE public.vault_org_members 
    ADD CONSTRAINT vault_org_members_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

-- vault_totp_config FKs
ALTER TABLE public.vault_totp_config 
    ADD CONSTRAINT vault_totp_config_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

-- vault_totp_backup_codes FKs
ALTER TABLE public.vault_totp_backup_codes 
    ADD CONSTRAINT vault_totp_backup_codes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

-- vault_webauthn_credentials FKs
ALTER TABLE public.vault_webauthn_credentials 
    ADD CONSTRAINT vault_webauthn_credentials_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

-- vault_webauthn_challenges FKs
ALTER TABLE public.vault_webauthn_challenges 
    ADD CONSTRAINT vault_webauthn_challenges_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

-- vault_shared_items FKs
ALTER TABLE public.vault_shared_items 
    ADD CONSTRAINT vault_shared_items_vault_item_id_fkey 
    FOREIGN KEY (vault_item_id) REFERENCES public.vault_items(id) ON DELETE CASCADE;

ALTER TABLE public.vault_shared_items 
    ADD CONSTRAINT vault_shared_items_shared_by_user_id_fkey 
    FOREIGN KEY (shared_by_user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.vault_shared_items 
    ADD CONSTRAINT vault_shared_items_shared_with_user_id_fkey 
    FOREIGN KEY (shared_with_user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

-- vault_user_public_keys FKs
ALTER TABLE public.vault_user_public_keys 
    ADD CONSTRAINT vault_user_public_keys_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

-- vault_org_invites FKs
ALTER TABLE public.vault_org_invites 
    ADD CONSTRAINT vault_org_invites_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.vault_organizations(id) ON DELETE CASCADE;

ALTER TABLE public.vault_org_invites 
    ADD CONSTRAINT vault_org_invites_invited_by_user_id_fkey 
    FOREIGN KEY (invited_by_user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

-- vault_org_collections FKs
ALTER TABLE public.vault_org_collections 
    ADD CONSTRAINT vault_org_collections_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.vault_organizations(id) ON DELETE CASCADE;

-- vault_collection_items FKs
ALTER TABLE public.vault_collection_items 
    ADD CONSTRAINT vault_collection_items_collection_id_fkey 
    FOREIGN KEY (collection_id) REFERENCES public.vault_org_collections(id) ON DELETE CASCADE;

ALTER TABLE public.vault_collection_items 
    ADD CONSTRAINT vault_collection_items_vault_item_id_fkey 
    FOREIGN KEY (vault_item_id) REFERENCES public.vault_items(id) ON DELETE CASCADE;

-- vault_collection_access FKs
ALTER TABLE public.vault_collection_access 
    ADD CONSTRAINT vault_collection_access_collection_id_fkey 
    FOREIGN KEY (collection_id) REFERENCES public.vault_org_collections(id) ON DELETE CASCADE;

ALTER TABLE public.vault_collection_access 
    ADD CONSTRAINT vault_collection_access_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

-- vault_subscriptions FKs
ALTER TABLE public.vault_subscriptions 
    ADD CONSTRAINT vault_subscriptions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.vault_subscriptions 
    ADD CONSTRAINT vault_subscriptions_plan_id_fkey 
    FOREIGN KEY (plan_id) REFERENCES public.vault_subscription_plans(id);

-- vault_device_sessions FKs
ALTER TABLE public.vault_device_sessions 
    ADD CONSTRAINT vault_device_sessions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

-- vault_usage_tracking FKs
ALTER TABLE public.vault_usage_tracking 
    ADD CONSTRAINT vault_usage_tracking_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

-- vault_parental_controls FKs
ALTER TABLE public.vault_parental_controls 
    ADD CONSTRAINT vault_parental_controls_parent_user_id_fkey 
    FOREIGN KEY (parent_user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.vault_parental_controls 
    ADD CONSTRAINT vault_parental_controls_child_user_id_fkey 
    FOREIGN KEY (child_user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.vault_parental_controls 
    ADD CONSTRAINT vault_parental_controls_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.vault_organizations(id) ON DELETE CASCADE;

-- vault_pending_approvals FKs
ALTER TABLE public.vault_pending_approvals 
    ADD CONSTRAINT vault_pending_approvals_parent_user_id_fkey 
    FOREIGN KEY (parent_user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.vault_pending_approvals 
    ADD CONSTRAINT vault_pending_approvals_child_user_id_fkey 
    FOREIGN KEY (child_user_id) REFERENCES public.vault_profiles(id) ON DELETE CASCADE;

-- vault_audit_logs FKs
ALTER TABLE public.vault_audit_logs 
    ADD CONSTRAINT vault_audit_logs_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.vault_organizations(id) ON DELETE CASCADE;

ALTER TABLE public.vault_audit_logs 
    ADD CONSTRAINT vault_audit_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.vault_profiles(id) ON DELETE SET NULL;

-- ============================================
-- Step 7: Recreate all RLS policies
-- ============================================

-- vault_profiles policies
CREATE POLICY "Users can view own profile"
    ON public.vault_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.vault_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.vault_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- vault_folders policies
CREATE POLICY "Users can view own folders"
    ON public.vault_folders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders"
    ON public.vault_folders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
    ON public.vault_folders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
    ON public.vault_folders FOR DELETE
    USING (auth.uid() = user_id);

-- vault_items policies
CREATE POLICY "Users can view own vault items"
    ON public.vault_items FOR SELECT
    USING (
        auth.uid() = user_id
        OR (
            organization_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.vault_org_members
                WHERE vault_org_members.organization_id = vault_items.organization_id
                AND vault_org_members.user_id = auth.uid()
                AND vault_org_members.status = 'accepted'
            )
        )
    );

CREATE POLICY "Users can insert own vault items"
    ON public.vault_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault items"
    ON public.vault_items FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault items"
    ON public.vault_items FOR DELETE
    USING (auth.uid() = user_id);

-- vault_organizations policies
CREATE POLICY "Members can view organizations"
    ON public.vault_organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.vault_org_members
            WHERE vault_org_members.organization_id = vault_organizations.id
            AND vault_org_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can update organizations"
    ON public.vault_organizations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.vault_org_members
            WHERE vault_org_members.organization_id = vault_organizations.id
            AND vault_org_members.user_id = auth.uid()
            AND vault_org_members.role = 'owner'
        )
    );

CREATE POLICY "Users can create organizations"
    ON public.vault_organizations FOR INSERT
    WITH CHECK (true);

-- vault_org_members policies
CREATE POLICY "Users can view org members"
    ON public.vault_org_members FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.vault_org_members om
            WHERE om.organization_id = vault_org_members.organization_id
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can insert org members"
    ON public.vault_org_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.vault_org_members om
            WHERE om.organization_id = vault_org_members.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
        )
    );

-- vault_totp_config policies
CREATE POLICY "Users can view own TOTP config"
    ON public.vault_totp_config FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own TOTP config"
    ON public.vault_totp_config FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own TOTP config"
    ON public.vault_totp_config FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own TOTP config"
    ON public.vault_totp_config FOR DELETE
    USING (auth.uid() = user_id);

-- vault_totp_backup_codes policies
CREATE POLICY "Users can view own backup codes"
    ON public.vault_totp_backup_codes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backup codes"
    ON public.vault_totp_backup_codes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own backup codes"
    ON public.vault_totp_backup_codes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own backup codes"
    ON public.vault_totp_backup_codes FOR DELETE
    USING (auth.uid() = user_id);

-- vault_webauthn_credentials policies
CREATE POLICY "Users can view own WebAuthn credentials"
    ON public.vault_webauthn_credentials FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own WebAuthn credentials"
    ON public.vault_webauthn_credentials FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own WebAuthn credentials"
    ON public.vault_webauthn_credentials FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own WebAuthn credentials"
    ON public.vault_webauthn_credentials FOR DELETE
    USING (auth.uid() = user_id);

-- vault_webauthn_challenges policies
CREATE POLICY "Users can view own challenges"
    ON public.vault_webauthn_challenges FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can insert challenges"
    ON public.vault_webauthn_challenges FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can delete own challenges"
    ON public.vault_webauthn_challenges FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- vault_shared_items policies
CREATE POLICY "Users can view items shared with them"
    ON public.vault_shared_items FOR SELECT
    USING (
        auth.uid() = shared_with_user_id
        OR auth.uid() = shared_by_user_id
    );

CREATE POLICY "Users can share their items"
    ON public.vault_shared_items FOR INSERT
    WITH CHECK (auth.uid() = shared_by_user_id);

CREATE POLICY "Owners can update shared items"
    ON public.vault_shared_items FOR UPDATE
    USING (auth.uid() = shared_by_user_id);

CREATE POLICY "Owners can delete shared items"
    ON public.vault_shared_items FOR DELETE
    USING (auth.uid() = shared_by_user_id);

-- vault_user_public_keys policies
CREATE POLICY "Anyone can view public keys"
    ON public.vault_user_public_keys FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own public key"
    ON public.vault_user_public_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own public key"
    ON public.vault_user_public_keys FOR UPDATE
    USING (auth.uid() = user_id);

-- vault_org_invites policies
CREATE POLICY "Org admins can view invites"
    ON public.vault_org_invites FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.vault_org_members
            WHERE vault_org_members.organization_id = vault_org_invites.organization_id
            AND vault_org_members.user_id = auth.uid()
            AND vault_org_members.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Org admins can create invites"
    ON public.vault_org_invites FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.vault_org_members
            WHERE vault_org_members.organization_id = vault_org_invites.organization_id
            AND vault_org_members.user_id = auth.uid()
            AND vault_org_members.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Org admins can delete invites"
    ON public.vault_org_invites FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.vault_org_members
            WHERE vault_org_members.organization_id = vault_org_invites.organization_id
            AND vault_org_members.user_id = auth.uid()
            AND vault_org_members.role IN ('owner', 'admin')
        )
    );

-- vault_org_collections policies
CREATE POLICY "Org members can view collections"
    ON public.vault_org_collections FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.vault_org_members
            WHERE vault_org_members.organization_id = vault_org_collections.organization_id
            AND vault_org_members.user_id = auth.uid()
            AND vault_org_members.status = 'accepted'
        )
    );

CREATE POLICY "Org admins can manage collections"
    ON public.vault_org_collections FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.vault_org_members
            WHERE vault_org_members.organization_id = vault_org_collections.organization_id
            AND vault_org_members.user_id = auth.uid()
            AND vault_org_members.role IN ('owner', 'admin')
        )
    );

-- vault_subscription_plans policies
CREATE POLICY "Anyone can view active plans"
    ON public.vault_subscription_plans FOR SELECT
    USING (is_active = true);

-- vault_subscriptions policies
CREATE POLICY "Users can view own subscription"
    ON public.vault_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
    ON public.vault_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
    ON public.vault_subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- vault_device_sessions policies
CREATE POLICY "Users can view own device sessions"
    ON public.vault_device_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own device sessions"
    ON public.vault_device_sessions FOR ALL
    USING (auth.uid() = user_id);

-- vault_usage_tracking policies
CREATE POLICY "Users can view own usage"
    ON public.vault_usage_tracking FOR SELECT
    USING (auth.uid() = user_id);

-- vault_parental_controls policies
CREATE POLICY "Parents can view their controls"
    ON public.vault_parental_controls FOR SELECT
    USING (auth.uid() = parent_user_id);

CREATE POLICY "Children can view controls on them"
    ON public.vault_parental_controls FOR SELECT
    USING (auth.uid() = child_user_id);

CREATE POLICY "Parents can manage their controls"
    ON public.vault_parental_controls FOR ALL
    USING (auth.uid() = parent_user_id);

-- vault_pending_approvals policies
CREATE POLICY "Parents can view pending approvals"
    ON public.vault_pending_approvals FOR SELECT
    USING (auth.uid() = parent_user_id);

CREATE POLICY "Children can view their pending approvals"
    ON public.vault_pending_approvals FOR SELECT
    USING (auth.uid() = child_user_id);

CREATE POLICY "Children can create pending approvals"
    ON public.vault_pending_approvals FOR INSERT
    WITH CHECK (auth.uid() = child_user_id);

CREATE POLICY "Parents can update pending approvals"
    ON public.vault_pending_approvals FOR UPDATE
    USING (auth.uid() = parent_user_id);

-- vault_audit_logs policies
CREATE POLICY "Org admins can view audit logs"
    ON public.vault_audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.vault_org_members
            WHERE vault_org_members.organization_id = vault_audit_logs.organization_id
            AND vault_org_members.user_id = auth.uid()
            AND vault_org_members.role IN ('owner', 'admin')
        )
    );

-- ============================================
-- Step 8: Recreate all functions with updated table names
-- ============================================

-- Function to update updated_at timestamp (unchanged)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.vault_profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired challenges
CREATE OR REPLACE FUNCTION public.cleanup_expired_challenges()
RETURNS void AS $$
BEGIN
    DELETE FROM public.vault_webauthn_challenges
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default subscription on user signup
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.vault_subscriptions (user_id, plan_id, status)
    VALUES (NEW.id, 'free', 'active');
    
    INSERT INTO public.vault_usage_tracking (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update usage tracking
CREATE OR REPLACE FUNCTION public.update_vault_items_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.vault_usage_tracking (user_id, vault_items_count)
        VALUES (NEW.user_id, 1)
        ON CONFLICT (user_id) DO UPDATE
        SET vault_items_count = vault_usage_tracking.vault_items_count + 1,
            updated_at = NOW();
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.vault_usage_tracking
        SET vault_items_count = GREATEST(0, vault_items_count - 1),
            updated_at = NOW()
        WHERE user_id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create vault item
CREATE OR REPLACE FUNCTION public.can_create_vault_item(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_items INTEGER;
    v_current_count INTEGER;
BEGIN
    SELECT sp.max_vault_items INTO v_max_items
    FROM public.vault_subscriptions s
    JOIN public.vault_subscription_plans sp ON s.plan_id = sp.id
    WHERE s.user_id = p_user_id AND s.status = 'active';
    
    IF v_max_items IS NULL THEN
        RETURN TRUE;
    END IF;
    
    SELECT vault_items_count INTO v_current_count
    FROM public.vault_usage_tracking
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_current_count, 0) < v_max_items;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manage device sessions
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
    SELECT sp.max_devices, sp.device_per_type, s.plan_id
    INTO v_max_devices, v_device_per_type, v_plan_id
    FROM public.vault_subscriptions s
    JOIN public.vault_subscription_plans sp ON s.plan_id = sp.id
    WHERE s.user_id = p_user_id AND s.status = 'active';
    
    IF v_plan_id = 'free' THEN
        SELECT ARRAY_AGG(device_id) INTO v_logged_out
        FROM public.vault_device_sessions
        WHERE user_id = p_user_id AND device_id != p_device_id;
        
        DELETE FROM public.vault_device_sessions
        WHERE user_id = p_user_id AND device_id != p_device_id;
    ELSIF v_device_per_type THEN
        SELECT ARRAY_AGG(device_id) INTO v_logged_out
        FROM public.vault_device_sessions
        WHERE user_id = p_user_id 
        AND device_type = p_device_type 
        AND device_id != p_device_id;
        
        DELETE FROM public.vault_device_sessions
        WHERE user_id = p_user_id 
        AND device_type = p_device_type 
        AND device_id != p_device_id;
    END IF;
    
    INSERT INTO public.vault_device_sessions (user_id, device_type, device_id, device_name, user_agent, ip_address, last_active_at)
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
    SELECT (sp.features->>'audit_logs')::boolean INTO v_has_audit_logs
    FROM public.vault_org_members om
    JOIN public.vault_subscriptions s ON s.user_id = om.user_id
    JOIN public.vault_subscription_plans sp ON s.plan_id = sp.id
    WHERE om.organization_id = p_organization_id
    AND om.role = 'owner'
    LIMIT 1;
    
    IF v_has_audit_logs THEN
        INSERT INTO public.vault_audit_logs (
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

-- Create organization with owner
CREATE OR REPLACE FUNCTION public.create_organization(org_name TEXT)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
BEGIN
    INSERT INTO public.vault_organizations (name)
    VALUES (org_name)
    RETURNING id INTO new_org_id;
    
    INSERT INTO public.vault_org_members (organization_id, user_id, role, status)
    VALUES (new_org_id, auth.uid(), 'owner', 'accepted');
    
    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accept organization invite
CREATE OR REPLACE FUNCTION public.accept_org_invite(invite_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    invite_record RECORD;
BEGIN
    SELECT * INTO invite_record
    FROM public.vault_org_invites
    WHERE token = invite_token
    AND expires_at > NOW();
    
    IF invite_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    INSERT INTO public.vault_org_members (organization_id, user_id, role, status)
    VALUES (invite_record.organization_id, auth.uid(), invite_record.role, 'accepted')
    ON CONFLICT (organization_id, user_id) DO UPDATE
    SET status = 'accepted', role = invite_record.role;
    
    DELETE FROM public.vault_org_invites WHERE id = invite_record.id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 9: Recreate all triggers
-- ============================================

CREATE TRIGGER update_vault_profiles_updated_at
    BEFORE UPDATE ON public.vault_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_vault_folders_updated_at
    BEFORE UPDATE ON public.vault_folders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_vault_items_updated_at
    BEFORE UPDATE ON public.vault_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_vault_profile_created_subscription
    AFTER INSERT ON public.vault_profiles
    FOR EACH ROW EXECUTE FUNCTION public.create_default_subscription();

CREATE TRIGGER on_vault_item_change
    AFTER INSERT OR DELETE ON public.vault_items
    FOR EACH ROW EXECUTE FUNCTION public.update_vault_items_count();

CREATE TRIGGER update_vault_subscriptions_updated_at
    BEFORE UPDATE ON public.vault_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_vault_parental_controls_updated_at
    BEFORE UPDATE ON public.vault_parental_controls
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();




