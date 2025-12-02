-- ============================================
-- Add Trash/Soft Delete Support
-- Items with deleted_at set are in trash
-- ============================================

-- Add deleted_at column for soft delete
ALTER TABLE public.vault_items 
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient trash queries
CREATE INDEX idx_vault_items_deleted_at ON public.vault_items(deleted_at);

-- Comment explaining the column purpose
COMMENT ON COLUMN public.vault_items.deleted_at IS 'Soft delete timestamp. NULL = active, timestamp = in trash. Items auto-purge after 30 days.';
