-- ============================================
-- Add Account Soft Delete Support
-- Allows users to restore their account within 60 days
-- ============================================

-- Add soft delete columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN deletion_scheduled_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN restore_token TEXT DEFAULT NULL,
ADD COLUMN restore_token_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Index for finding accounts pending deletion
CREATE INDEX idx_profiles_deletion_scheduled ON public.profiles(deletion_scheduled_at) 
WHERE deletion_scheduled_at IS NOT NULL;

-- Index for restore token lookup
CREATE INDEX idx_profiles_restore_token ON public.profiles(restore_token) 
WHERE restore_token IS NOT NULL;

-- Comments explaining columns
COMMENT ON COLUMN public.profiles.deleted_at IS 'When user requested account deletion. NULL = active account.';
COMMENT ON COLUMN public.profiles.deletion_scheduled_at IS 'When permanent deletion will occur (60 days after deleted_at).';
COMMENT ON COLUMN public.profiles.restore_token IS 'Token sent via email to restore deleted account.';
COMMENT ON COLUMN public.profiles.restore_token_expires_at IS 'When the restore token expires (same as deletion_scheduled_at).';




