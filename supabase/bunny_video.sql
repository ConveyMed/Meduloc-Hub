-- Add Bunny.net video fields to content_items
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS bunny_video_id VARCHAR(255);
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS bunny_video_status VARCHAR(50) DEFAULT NULL;
