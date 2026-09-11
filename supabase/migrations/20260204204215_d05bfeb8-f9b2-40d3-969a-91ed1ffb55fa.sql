-- Create storage bucket for visitor photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('visitor-photos', 'visitor-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to visitor photos
CREATE POLICY "Public read access for visitor photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'visitor-photos');

-- Allow authenticated and anon users to upload
CREATE POLICY "Allow uploads to visitor photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'visitor-photos');

-- Allow updates
CREATE POLICY "Allow updates to visitor photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'visitor-photos');