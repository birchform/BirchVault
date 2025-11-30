-- ============================================
-- BirchVault Initial Database Schema
-- ============================================

-- No extension needed - using built-in gen_random_uuid()

-- ============================================
-- Profiles Table
-- Stores user profile and encryption metadata
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    kdf_iterations INTEGER NOT NULL DEFAULT 100000,
    encrypted_symmetric_key TEXT, -- Encrypted with master key
    auth_hash TEXT, -- Hash for server-side auth verification
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Folders Table
-- Organizational folders for vault items
-- ============================================
CREATE TABLE public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Organizations Table
-- For secure sharing between users
-- ============================================
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Organization Members Table
-- ============================================
CREATE TABLE public.org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- ============================================
-- Vault Items Table
-- Stores encrypted vault items
-- ============================================
CREATE TABLE public.vault_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    encrypted_data TEXT NOT NULL, -- JSON encrypted client-side
    type TEXT NOT NULL CHECK (type IN ('login', 'card', 'identity', 'securenote')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX idx_vault_items_user_id ON public.vault_items(user_id);
CREATE INDEX idx_vault_items_folder_id ON public.vault_items(folder_id);
CREATE INDEX idx_vault_items_organization_id ON public.vault_items(organization_id);
CREATE INDEX idx_folders_user_id ON public.folders(user_id);
CREATE INDEX idx_org_members_organization_id ON public.org_members(organization_id);
CREATE INDEX idx_org_members_user_id ON public.org_members(user_id);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Folders: Users can only access their own folders
CREATE POLICY "Users can view own folders"
    ON public.folders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders"
    ON public.folders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
    ON public.folders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
    ON public.folders FOR DELETE
    USING (auth.uid() = user_id);

-- Vault Items: Users can access their own items or org items they belong to
CREATE POLICY "Users can view own vault items"
    ON public.vault_items FOR SELECT
    USING (
        auth.uid() = user_id
        OR (
            organization_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.org_members
                WHERE org_members.organization_id = vault_items.organization_id
                AND org_members.user_id = auth.uid()
                AND org_members.status = 'accepted'
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

-- Organizations: Members can view their organizations
CREATE POLICY "Members can view organizations"
    ON public.organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.organization_id = organizations.id
            AND org_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can update organizations"
    ON public.organizations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_members.organization_id = organizations.id
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'owner'
        )
    );

CREATE POLICY "Users can create organizations"
    ON public.organizations FOR INSERT
    WITH CHECK (true);

-- Org Members: Users can view members of their organizations
CREATE POLICY "Users can view org members"
    ON public.org_members FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.org_members om
            WHERE om.organization_id = org_members.organization_id
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can insert org members"
    ON public.org_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.org_members om
            WHERE om.organization_id = org_members.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
        )
    );

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON public.folders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_vault_items_updated_at
    BEFORE UPDATE ON public.vault_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



