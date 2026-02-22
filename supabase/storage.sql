-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Creates the storage buckets needed by the app
-- Run this in Supabase SQL Editor

-- Images bucket (public) - used for thumbnails, profile photos, content files
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view files
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images');

-- Allow users to update their own uploads
CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'images');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'images');
