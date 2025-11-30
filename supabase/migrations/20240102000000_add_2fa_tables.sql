-- ============================================
-- BirchVault 2FA Schema
-- Adds TOTP and WebAuthn support
-- ============================================

-- ============================================
-- TOTP Configuration Table
-- ============================================
CREATE TABLE public.totp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    encrypted_secret TEXT NOT NULL, -- Encrypted with user's encryption key
    enabled BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TOTP Backup Codes Table
-- ============================================
CREATE TABLE public.totp_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL, -- Hashed backup code
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- WebAuthn Credentials Table
-- ============================================
CREATE TABLE public.webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    device_type TEXT NOT NULL DEFAULT 'platform',
    transports TEXT[],
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- WebAuthn Challenges Table (for verification)
-- ============================================
CREATE TABLE public.webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    challenge TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Update profiles table to track 2FA status
-- ============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS two_factor_method TEXT CHECK (two_factor_method IN ('totp', 'webauthn', 'both'));

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_totp_config_user_id ON public.totp_config(user_id);
CREATE INDEX idx_totp_backup_codes_user_id ON public.totp_backup_codes(user_id);
CREATE INDEX idx_webauthn_credentials_user_id ON public.webauthn_credentials(user_id);
CREATE INDEX idx_webauthn_credentials_credential_id ON public.webauthn_credentials(credential_id);
CREATE INDEX idx_webauthn_challenges_user_id ON public.webauthn_challenges(user_id);
CREATE INDEX idx_webauthn_challenges_expires_at ON public.webauthn_challenges(expires_at);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE public.totp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.totp_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies - TOTP Config
-- ============================================
CREATE POLICY "Users can view own TOTP config"
    ON public.totp_config FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own TOTP config"
    ON public.totp_config FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own TOTP config"
    ON public.totp_config FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own TOTP config"
    ON public.totp_config FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - TOTP Backup Codes
-- ============================================
CREATE POLICY "Users can view own backup codes"
    ON public.totp_backup_codes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backup codes"
    ON public.totp_backup_codes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own backup codes"
    ON public.totp_backup_codes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own backup codes"
    ON public.totp_backup_codes FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - WebAuthn Credentials
-- ============================================
CREATE POLICY "Users can view own WebAuthn credentials"
    ON public.webauthn_credentials FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own WebAuthn credentials"
    ON public.webauthn_credentials FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own WebAuthn credentials"
    ON public.webauthn_credentials FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own WebAuthn credentials"
    ON public.webauthn_credentials FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - WebAuthn Challenges
-- ============================================
CREATE POLICY "Users can view own challenges"
    ON public.webauthn_challenges FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can insert challenges"
    ON public.webauthn_challenges FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can delete own challenges"
    ON public.webauthn_challenges FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================
-- Cleanup function for expired challenges
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_challenges()
RETURNS void AS $$
BEGIN
    DELETE FROM public.webauthn_challenges
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



