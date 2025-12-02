-- Add storage bucket for encrypted vault documents
-- Files are encrypted client-side before upload (zero-knowledge architecture)

-- Create the storage bucket for vault documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vault-documents',
  'vault-documents',
  false,
  52428800, -- 50MB max file size
  NULL -- Allow all mime types since files are encrypted
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for vault-documents bucket

-- Policy: Users can upload their own documents
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vault-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own documents
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'vault-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vault-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vault-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add 'wifi' and 'document' to vault_items type check if needed
-- Note: The type column is TEXT so no enum update needed
