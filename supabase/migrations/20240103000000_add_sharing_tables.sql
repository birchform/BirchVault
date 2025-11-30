-- ============================================
-- BirchVault Sharing Schema
-- Adds organization and sharing support
-- ============================================

-- ============================================
-- Shared Items Table
-- For sharing individual items with users
-- ============================================
CREATE TABLE public.shared_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_item_id UUID NOT NULL REFERENCES public.vault_items(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    shared_with_email TEXT, -- For pending invites
    encrypted_key TEXT NOT NULL, -- Item key encrypted with recipient's public key
    permission TEXT NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'write')),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    CONSTRAINT unique_share UNIQUE (vault_item_id, shared_with_user_id)
);

-- ============================================
-- User Public Keys Table
-- For asymmetric encryption in sharing
-- ============================================
CREATE TABLE public.user_public_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    public_key TEXT NOT NULL,
    key_type TEXT NOT NULL DEFAULT 'RSA-OAEP',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Organization Invites Table
-- ============================================
CREATE TABLE public.org_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    invited_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_org_invite UNIQUE (organization_id, email)
);

-- ============================================
-- Organization Collections Table
-- Folders/collections within organizations
-- ============================================
CREATE TABLE public.org_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Collection Items Junction Table
-- ============================================
CREATE TABLE public.collection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES public.org_collections(id) ON DELETE CASCADE,
    vault_item_id UUID NOT NULL REFERENCES public.vault_items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_collection_item UNIQUE (collection_id, vault_item_id)
);

-- ============================================
-- Collection Access Table
-- Controls who can access collections
-- ============================================
CREATE TABLE public.collection_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES public.org_collections(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_name TEXT, -- For future group support
    permission TEXT NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'write', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_collection_access UNIQUE (collection_id, user_id)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_shared_items_shared_by ON public.shared_items(shared_by_user_id);
CREATE INDEX idx_shared_items_shared_with ON public.shared_items(shared_with_user_id);
CREATE INDEX idx_shared_items_vault_item ON public.shared_items(vault_item_id);
CREATE INDEX idx_org_invites_organization ON public.org_invites(organization_id);
CREATE INDEX idx_org_invites_email ON public.org_invites(email);
CREATE INDEX idx_org_collections_organization ON public.org_collections(organization_id);
CREATE INDEX idx_collection_items_collection ON public.collection_items(collection_id);
CREATE INDEX idx_collection_access_collection ON public.collection_access(collection_id);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_public_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_access ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies - Shared Items
-- ============================================
CREATE POLICY "Users can view items shared with them"
    ON public.shared_items FOR SELECT
    USING (
        auth.uid() = shared_with_user_id
        OR auth.uid() = shared_by_user_id
    );

CREATE POLICY "Users can share their items"
    ON public.shared_items FOR INSERT
    WITH CHECK (auth.uid() = shared_by_user_id);

CREATE POLICY "Owners can update shared items"
    ON public.shared_items FOR UPDATE
    USING (auth.uid() = shared_by_user_id);

CREATE POLICY "Owners can delete shared items"
    ON public.shared_items FOR DELETE
    USING (auth.uid() = shared_by_user_id);

-- ============================================
-- RLS Policies - User Public Keys
-- ============================================
CREATE POLICY "Anyone can view public keys"
    ON public.user_public_keys FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own public key"
    ON public.user_public_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own public key"
    ON public.user_public_keys FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - Org Invites
-- ============================================
CREATE POLICY "Org admins can view invites"
    ON public.org_invites FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.organization_id = org_invites.organization_id
            AND org_members.user_id = auth.uid()
            AND org_members.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Org admins can create invites"
    ON public.org_invites FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.organization_id = org_invites.organization_id
            AND org_members.user_id = auth.uid()
            AND org_members.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Org admins can delete invites"
    ON public.org_invites FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.organization_id = org_invites.organization_id
            AND org_members.user_id = auth.uid()
            AND org_members.role IN ('owner', 'admin')
        )
    );

-- ============================================
-- RLS Policies - Org Collections
-- ============================================
CREATE POLICY "Org members can view collections"
    ON public.org_collections FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.organization_id = org_collections.organization_id
            AND org_members.user_id = auth.uid()
            AND org_members.status = 'accepted'
        )
    );

CREATE POLICY "Org admins can manage collections"
    ON public.org_collections FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.organization_id = org_collections.organization_id
            AND org_members.user_id = auth.uid()
            AND org_members.role IN ('owner', 'admin')
        )
    );

-- ============================================
-- Functions
-- ============================================

-- Create organization with owner
CREATE OR REPLACE FUNCTION public.create_organization(org_name TEXT)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
BEGIN
    INSERT INTO public.organizations (name)
    VALUES (org_name)
    RETURNING id INTO new_org_id;
    
    INSERT INTO public.org_members (organization_id, user_id, role, status)
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
    FROM public.org_invites
    WHERE token = invite_token
    AND expires_at > NOW();
    
    IF invite_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    INSERT INTO public.org_members (organization_id, user_id, role, status)
    VALUES (invite_record.organization_id, auth.uid(), invite_record.role, 'accepted')
    ON CONFLICT (organization_id, user_id) DO UPDATE
    SET status = 'accepted', role = invite_record.role;
    
    DELETE FROM public.org_invites WHERE id = invite_record.id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



