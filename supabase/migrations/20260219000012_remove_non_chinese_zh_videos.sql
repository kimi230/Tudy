-- Remove videos incorrectly ingested into Chinese catalog with non-Chinese transcripts.

DELETE FROM public.video_artifacts
WHERE language = 'zh'
  AND video_id IN ('KQ_sO9V0tyw', 'Z3HJCQJ2Lmo');

DELETE FROM public.video_catalog
WHERE language = 'zh'
  AND video_id IN ('KQ_sO9V0tyw', 'Z3HJCQJ2Lmo');

-- Cleanup noisy non-Chinese tail segments in an otherwise Chinese video.
UPDATE public.video_artifacts
SET segments = jsonb_set(
  jsonb_set(
    segments,
    '{segments,237}',
    '{
      "index": 237,
      "start": 760.26,
      "end": 782.34,
      "textZh": "拜拜 拜拜",
      "pinyin": "Bàibài, bàibài.",
      "textKo": "바이바이, 바이바이.",
      "words": [
        { "word": "拜拜", "start": 760.26, "end": 760.92 },
        { "word": "拜拜", "start": 760.92, "end": 761.56 }
      ]
    }'::jsonb,
    false
  ),
  '{segments,238}',
  '{
    "index": 238,
    "start": 782.34,
    "end": 783.42,
    "textZh": "优优独播剧场",
    "pinyin": "Yōuyōu dúbō jùchǎng",
    "textKo": "유유 독점 방영 극장",
    "words": [
      { "word": "优优", "start": 782.34, "end": 782.48 },
      { "word": "独播", "start": 782.48, "end": 782.86 },
      { "word": "剧场", "start": 782.86, "end": 783.42 }
    ]
  }'::jsonb,
  false
)
WHERE language = 'zh'
  AND video_id = '3K0D2hHYi04';
