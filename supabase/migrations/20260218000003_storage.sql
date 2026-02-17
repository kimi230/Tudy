-- recordings 버킷 (비공개, 5MB 제한)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('recordings', 'recordings', FALSE, 5242880, ARRAY['audio/webm','audio/wav','audio/mp4']);

-- Storage RLS: 본인 폴더만 접근
CREATE POLICY "own_recordings" ON storage.objects FOR ALL
  USING (bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text);
