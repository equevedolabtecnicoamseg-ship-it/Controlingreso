-- Add photo fields to visitors table for storing DNI and webcam photos
ALTER TABLE public.visitors 
ADD COLUMN IF NOT EXISTS dni_photo_url text,
ADD COLUMN IF NOT EXISTS webcam_photo_url text;