-- ============================================
-- Add API Key vault item type
-- ============================================

-- Drop existing constraint and add new one with 'apikey' type
ALTER TABLE public.vault_items 
DROP CONSTRAINT IF EXISTS vault_items_type_check;

ALTER TABLE public.vault_items 
ADD CONSTRAINT vault_items_type_check 
CHECK (type IN ('login', 'card', 'identity', 'securenote', 'apikey'));
