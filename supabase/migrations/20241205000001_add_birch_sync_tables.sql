-- ============================================
-- Birch Cross-App Sync Tables
-- Tables for Dev, Host, and Launcher sync
-- ============================================

-- ============================================
-- Core Birch Tables (birch_ prefix)
-- Shared across all apps
-- ============================================

-- User settings shared across all Birch apps
CREATE TABLE public.birch_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    global_pin_hash TEXT,           -- bcrypt hash of PIN for remote control
    master_key_salt TEXT,           -- for encryption key derivation
    is_admin BOOLEAN DEFAULT false, -- can access dev/host/launcher tables
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Machine registry (for all apps)
CREATE TABLE public.birch_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.birch_users(id) ON DELETE CASCADE,
    hostname TEXT NOT NULL,
    display_name TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_online BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, hostname)
);

-- Edit locks (one editor per app at a time)
CREATE TABLE public.birch_edit_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.birch_users(id) ON DELETE CASCADE,
    app_name TEXT NOT NULL CHECK (app_name IN ('dev', 'host', 'launcher')),
    machine_id UUID REFERENCES public.birch_machines(id) ON DELETE CASCADE,
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, app_name)
);

-- ============================================
-- Birch Dev Tables (dev_ prefix)
-- ============================================

-- Projects tracked by Birch Dev
CREATE TABLE public.dev_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.birch_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    github_owner TEXT,
    github_repo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User settings for Birch Dev
CREATE TABLE public.dev_settings (
    user_id UUID PRIMARY KEY REFERENCES public.birch_users(id) ON DELETE CASCADE,
    selected_project_id UUID REFERENCES public.dev_projects(id) ON DELETE SET NULL,
    ui_preferences JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Birch Host Tables (host_ prefix)
-- ============================================

-- Per-machine runner configuration
CREATE TABLE public.host_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES public.birch_machines(id) ON DELETE CASCADE UNIQUE,
    runner_path TEXT,                -- null until detected/configured
    runner_status TEXT DEFAULT 'unknown' CHECK (runner_status IN ('unknown', 'stopped', 'starting', 'idle', 'running', 'error')),
    current_job TEXT,
    service_installed BOOLEAN DEFAULT false,
    github_owner TEXT,
    github_repo TEXT,
    cpu_cores INT,
    memory_limit_gb INT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'belownormal', 'normal')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Synced default settings (apply to new machines)
CREATE TABLE public.host_defaults (
    user_id UUID PRIMARY KEY REFERENCES public.birch_users(id) ON DELETE CASCADE,
    github_owner TEXT,
    github_repo TEXT,
    cpu_cores INT,
    memory_limit_gb INT,
    priority TEXT DEFAULT 'normal',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Remote command queue
CREATE TABLE public.host_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_machine_id UUID NOT NULL REFERENCES public.host_machines(id) ON DELETE CASCADE,
    command TEXT NOT NULL CHECK (command IN ('start', 'stop', 'detect_path')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed')),
    result TEXT,
    created_by_machine_id UUID REFERENCES public.birch_machines(id),
    pin_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMPTZ
);

-- Runner output logs (7-day retention)
CREATE TABLE public.host_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_machine_id UUID NOT NULL REFERENCES public.host_machines(id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Birch Launcher Tables (launcher_ prefix)
-- ============================================

-- Per-machine launcher configuration
CREATE TABLE public.launcher_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES public.birch_machines(id) ON DELETE CASCADE UNIQUE,
    folder_path TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

-- birch_users indexes
CREATE INDEX idx_birch_users_is_admin ON public.birch_users(is_admin);

-- birch_machines indexes
CREATE INDEX idx_birch_machines_user_id ON public.birch_machines(user_id);
CREATE INDEX idx_birch_machines_hostname ON public.birch_machines(user_id, hostname);
CREATE INDEX idx_birch_machines_online ON public.birch_machines(is_online);

-- birch_edit_locks indexes
CREATE INDEX idx_birch_edit_locks_user_id ON public.birch_edit_locks(user_id);
CREATE INDEX idx_birch_edit_locks_app ON public.birch_edit_locks(user_id, app_name);

-- dev_projects indexes
CREATE INDEX idx_dev_projects_user_id ON public.dev_projects(user_id);

-- host_machines indexes
CREATE INDEX idx_host_machines_machine_id ON public.host_machines(machine_id);
CREATE INDEX idx_host_machines_status ON public.host_machines(runner_status);

-- host_commands indexes
CREATE INDEX idx_host_commands_host_machine_id ON public.host_commands(host_machine_id);
CREATE INDEX idx_host_commands_status ON public.host_commands(status);
CREATE INDEX idx_host_commands_pending ON public.host_commands(host_machine_id, status) WHERE status = 'pending';

-- host_logs indexes
CREATE INDEX idx_host_logs_host_machine_id ON public.host_logs(host_machine_id);
CREATE INDEX idx_host_logs_created_at ON public.host_logs(created_at DESC);

-- launcher_config indexes
CREATE INDEX idx_launcher_config_machine_id ON public.launcher_config(machine_id);

-- ============================================
-- Enable RLS on all tables
-- ============================================

ALTER TABLE public.birch_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birch_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birch_edit_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launcher_config ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies - birch_users
-- ============================================

CREATE POLICY "Users can view own birch_users record"
    ON public.birch_users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own birch_users record"
    ON public.birch_users FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own birch_users record"
    ON public.birch_users FOR UPDATE
    USING (auth.uid() = id);

-- ============================================
-- RLS Policies - birch_machines
-- ============================================

CREATE POLICY "Users can view own machines"
    ON public.birch_machines FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own machines"
    ON public.birch_machines FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own machines"
    ON public.birch_machines FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own machines"
    ON public.birch_machines FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - birch_edit_locks
-- ============================================

CREATE POLICY "Users can view own edit locks"
    ON public.birch_edit_locks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own edit locks"
    ON public.birch_edit_locks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own edit locks"
    ON public.birch_edit_locks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own edit locks"
    ON public.birch_edit_locks FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - dev_projects (admin only)
-- ============================================

CREATE POLICY "Admins can view dev_projects"
    ON public.dev_projects FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.birch_users
            WHERE id = auth.uid() AND is_admin = true
        )
        AND auth.uid() = user_id
    );

CREATE POLICY "Admins can insert dev_projects"
    ON public.dev_projects FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.birch_users
            WHERE id = auth.uid() AND is_admin = true
        )
        AND auth.uid() = user_id
    );

CREATE POLICY "Admins can update dev_projects"
    ON public.dev_projects FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.birch_users
            WHERE id = auth.uid() AND is_admin = true
        )
        AND auth.uid() = user_id
    );

CREATE POLICY "Admins can delete dev_projects"
    ON public.dev_projects FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.birch_users
            WHERE id = auth.uid() AND is_admin = true
        )
        AND auth.uid() = user_id
    );

-- ============================================
-- RLS Policies - dev_settings (admin only)
-- ============================================

CREATE POLICY "Admins can view dev_settings"
    ON public.dev_settings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.birch_users
            WHERE id = auth.uid() AND is_admin = true
        )
        AND auth.uid() = user_id
    );

CREATE POLICY "Admins can insert dev_settings"
    ON public.dev_settings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.birch_users
            WHERE id = auth.uid() AND is_admin = true
        )
        AND auth.uid() = user_id
    );

CREATE POLICY "Admins can update dev_settings"
    ON public.dev_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.birch_users
            WHERE id = auth.uid() AND is_admin = true
        )
        AND auth.uid() = user_id
    );

-- ============================================
-- RLS Policies - host_machines (admin only)
-- ============================================

CREATE POLICY "Admins can view host_machines"
    ON public.host_machines FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.birch_users bu
            JOIN public.birch_machines bm ON bm.user_id = bu.id
            WHERE bu.id = auth.uid() 
            AND bu.is_admin = true
            AND bm.id = host_machines.machine_id
        )
    );

CREATE POLICY "Admins can insert host_machines"
    ON public.host_machines FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.birch_users bu
            JOIN public.birch_machines bm ON bm.user_id = bu.id
            WHERE bu.id = auth.uid() 
            AND bu.is_admin = true
            AND bm.id = host_machines.machine_id
        )
    );

CREATE POLICY "Admins can update host_machines"
    ON public.host_machines FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.birch_users bu
            JOIN public.birch_machines bm ON bm.user_id = bu.id
            WHERE bu.id = auth.uid() 
            AND bu.is_admin = true
            AND bm.id = host_machines.machine_id
        )
    );

CREATE POLICY "Admins can delete host_machines"
    ON public.host_machines FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.birch_users bu
            JOIN public.birch_machines bm ON bm.user_id = bu.id
            WHERE bu.id = auth.uid() 
            AND bu.is_admin = true
            AND bm.id = host_machines.machine_id
        )
    );

-- ============================================
-- RLS Policies - host_defaults (admin only)
-- ============================================

CREATE POLICY "Admins can view host_defaults"
    ON public.host_defaults FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.birch_users
            WHERE id = auth.uid() AND is_admin = true
        )
        AND auth.uid() = user_id
    );

CREATE POLICY "Admins can insert host_defaults"
    ON public.host_defaults FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.birch_users
            WHERE id = auth.uid() AND is_admin = true
        )
        AND auth.uid() = user_id
    );

CREATE POLICY "Admins can update host_defaults"
    ON public.host_defaults FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.birch_users
            WHERE id = auth.uid() AND is_admin = true
        )
        AND auth.uid() = user_id
    );

-- ============================================
-- RLS Policies - host_commands (admin only)
-- ============================================

CREATE POLICY "Admins can view host_commands"
    ON public.host_commands FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.birch_users bu
            JOIN public.birch_machines bm ON bm.user_id = bu.id
            JOIN public.host_machines hm ON hm.machine_id = bm.id
            WHERE bu.id = auth.uid() 
            AND bu.is_admin = true
            AND hm.id = host_commands.host_machine_id
        )
    );

CREATE POLICY "Admins can insert host_commands"
    ON public.host_commands FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.birch_users bu
            JOIN public.birch_machines bm ON bm.user_id = bu.id
            JOIN public.host_machines hm ON hm.machine_id = bm.id
            WHERE bu.id = auth.uid() 
            AND bu.is_admin = true
            AND hm.id = host_commands.host_machine_id
        )
    );

CREATE POLICY "Admins can update host_commands"
    ON public.host_commands FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.birch_users bu
            JOIN public.birch_machines bm ON bm.user_id = bu.id
            JOIN public.host_machines hm ON hm.machine_id = bm.id
            WHERE bu.id = auth.uid() 
            AND bu.is_admin = true
            AND hm.id = host_commands.host_machine_id
        )
    );

-- ============================================
-- RLS Policies - host_logs (admin only)
-- ============================================

CREATE POLICY "Admins can view host_logs"
    ON public.host_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.birch_users bu
            JOIN public.birch_machines bm ON bm.user_id = bu.id
            JOIN public.host_machines hm ON hm.machine_id = bm.id
            WHERE bu.id = auth.uid() 
            AND bu.is_admin = true
            AND hm.id = host_logs.host_machine_id
        )
    );

CREATE POLICY "Admins can insert host_logs"
    ON public.host_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.birch_users bu
            JOIN public.birch_machines bm ON bm.user_id = bu.id
            JOIN public.host_machines hm ON hm.machine_id = bm.id
            WHERE bu.id = auth.uid() 
            AND bu.is_admin = true
            AND hm.id = host_logs.host_machine_id
        )
    );

-- ============================================
-- RLS Policies - launcher_config (admin only)
-- ============================================

CREATE POLICY "Admins can view launcher_config"
    ON public.launcher_config FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.birch_users bu
            JOIN public.birch_machines bm ON bm.user_id = bu.id
            WHERE bu.id = auth.uid() 
            AND bu.is_admin = true
            AND bm.id = launcher_config.machine_id
        )
    );

CREATE POLICY "Admins can insert launcher_config"
    ON public.launcher_config FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.birch_users bu
            JOIN public.birch_machines bm ON bm.user_id = bu.id
            WHERE bu.id = auth.uid() 
            AND bu.is_admin = true
            AND bm.id = launcher_config.machine_id
        )
    );

CREATE POLICY "Admins can update launcher_config"
    ON public.launcher_config FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.birch_users bu
            JOIN public.birch_machines bm ON bm.user_id = bu.id
            WHERE bu.id = auth.uid() 
            AND bu.is_admin = true
            AND bm.id = launcher_config.machine_id
        )
    );

-- ============================================
-- Functions
-- ============================================

-- Create birch_users record on signup (if not exists)
CREATE OR REPLACE FUNCTION public.handle_new_birch_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.birch_users (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create birch_users on auth signup
CREATE TRIGGER on_auth_user_created_birch
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_birch_user();

-- Function to acquire edit lock
CREATE OR REPLACE FUNCTION public.acquire_edit_lock(
    p_app_name TEXT,
    p_machine_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_existing_lock RECORD;
BEGIN
    -- Check for existing lock
    SELECT * INTO v_existing_lock
    FROM public.birch_edit_locks
    WHERE user_id = auth.uid() AND app_name = p_app_name;
    
    IF v_existing_lock IS NOT NULL THEN
        -- Lock exists - check if it's our machine
        IF v_existing_lock.machine_id = p_machine_id THEN
            -- Refresh lock timestamp
            UPDATE public.birch_edit_locks
            SET acquired_at = NOW()
            WHERE id = v_existing_lock.id;
            RETURN TRUE;
        ELSE
            -- Another machine has the lock
            RETURN FALSE;
        END IF;
    END IF;
    
    -- No lock exists, acquire it
    INSERT INTO public.birch_edit_locks (user_id, app_name, machine_id)
    VALUES (auth.uid(), p_app_name, p_machine_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to force release edit lock
CREATE OR REPLACE FUNCTION public.force_release_edit_lock(
    p_app_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.birch_edit_locks
    WHERE user_id = auth.uid() AND app_name = p_app_name;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release edit lock
CREATE OR REPLACE FUNCTION public.release_edit_lock(
    p_app_name TEXT,
    p_machine_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.birch_edit_locks
    WHERE user_id = auth.uid() 
    AND app_name = p_app_name 
    AND machine_id = p_machine_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to register/update machine
CREATE OR REPLACE FUNCTION public.register_machine(
    p_hostname TEXT,
    p_display_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_machine_id UUID;
BEGIN
    INSERT INTO public.birch_machines (user_id, hostname, display_name, last_seen, is_online)
    VALUES (auth.uid(), p_hostname, COALESCE(p_display_name, p_hostname), NOW(), true)
    ON CONFLICT (user_id, hostname) DO UPDATE
    SET display_name = COALESCE(EXCLUDED.display_name, birch_machines.display_name),
        last_seen = NOW(),
        is_online = true
    RETURNING id INTO v_machine_id;
    
    RETURN v_machine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update machine heartbeat
CREATE OR REPLACE FUNCTION public.machine_heartbeat(
    p_machine_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.birch_machines
    SET last_seen = NOW(), is_online = true
    WHERE id = p_machine_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark machine offline
CREATE OR REPLACE FUNCTION public.machine_offline(
    p_machine_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.birch_machines
    SET is_online = false
    WHERE id = p_machine_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify PIN
CREATE OR REPLACE FUNCTION public.verify_pin(
    p_pin TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_stored_hash TEXT;
BEGIN
    SELECT global_pin_hash INTO v_stored_hash
    FROM public.birch_users
    WHERE id = auth.uid();
    
    IF v_stored_hash IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Use pgcrypto to verify bcrypt hash
    RETURN v_stored_hash = crypt(p_pin, v_stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set PIN
CREATE OR REPLACE FUNCTION public.set_pin(
    p_pin TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.birch_users
    SET global_pin_hash = crypt(p_pin, gen_salt('bf'))
    WHERE id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old logs (7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_host_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM public.host_logs
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at
CREATE TRIGGER update_birch_users_updated_at
    BEFORE UPDATE ON public.birch_users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_dev_projects_updated_at
    BEFORE UPDATE ON public.dev_projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_dev_settings_updated_at
    BEFORE UPDATE ON public.dev_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_host_machines_updated_at
    BEFORE UPDATE ON public.host_machines
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_host_defaults_updated_at
    BEFORE UPDATE ON public.host_defaults
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_launcher_config_updated_at
    BEFORE UPDATE ON public.launcher_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- Enable Realtime for sync tables
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.birch_machines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.birch_edit_locks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dev_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dev_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.host_machines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.host_commands;
ALTER PUBLICATION supabase_realtime ADD TABLE public.host_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.launcher_config;

