-- ============================================
-- Sync email_confirmed_at from auth.users to profiles
-- This enables Realtime subscriptions for email confirmation detection
-- ============================================

-- Add email_confirmed_at column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ;

-- Function to sync email confirmation status
CREATE OR REPLACE FUNCTION public.sync_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    -- When auth.users is updated, sync email_confirmed_at to profiles
    IF NEW.email_confirmed_at IS DISTINCT FROM OLD.email_confirmed_at THEN
        UPDATE public.profiles
        SET 
            email_confirmed_at = NEW.email_confirmed_at,
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync on auth.users update
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_email_confirmation();

-- Also sync on initial insert (in case email is pre-confirmed)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, email_confirmed_at)
    VALUES (NEW.id, NEW.email, NEW.email_confirmed_at);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Realtime for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;




