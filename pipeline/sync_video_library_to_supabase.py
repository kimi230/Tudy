#!/usr/bin/env python3
"""
Sync local video JSON assets into Supabase video library tables.

Required env vars:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY

Usage:
  python3 pipeline/sync_video_library_to_supabase.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from urllib import error, parse, request


ROOT = Path(__file__).resolve().parent.parent
APPS = [
    ("en", ROOT / "apps/english/public/data"),
    ("zh", ROOT / "apps/chinese/public/data"),
    ("ja", ROOT / "apps/japanese/public/data"),
]


def _require_env(name: str, fallback: str | None = None) -> str:
    value = os.environ.get(name, "").strip()
    if not value and fallback:
        value = os.environ.get(fallback, "").strip()
    if not value:
        hint = f" (or {fallback})" if fallback else ""
        print(f"Missing required env var: {name}{hint}", file=sys.stderr)
        sys.exit(1)
    return value


def _read_json(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _postgrest_upsert(
    base_url: str,
    service_role_key: str,
    table: str,
    row: dict,
    on_conflict: str,
) -> None:
    query = parse.urlencode({"on_conflict": on_conflict})
    url = f"{base_url}/rest/v1/{table}?{query}"
    data = json.dumps([row], ensure_ascii=False).encode("utf-8")

    req = request.Request(url=url, method="POST", data=data)
    req.add_header("apikey", service_role_key)
    req.add_header("Authorization", f"Bearer {service_role_key}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "resolution=merge-duplicates")

    try:
        with request.urlopen(req, timeout=60) as resp:
            if resp.status not in (200, 201, 204):
                body = resp.read().decode("utf-8", errors="ignore")
                raise RuntimeError(f"Upsert failed: {table} {resp.status} {body}")
    except error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"HTTPError upserting {table}: {e.code} {body}") from e


def _catalog_row(lang: str, video_entry: dict, meta: dict, segments: dict, vocabulary, grammar) -> dict:
    return {
        "language": lang,
        "video_id": video_entry["videoId"],
        "youtube_id": meta.get("youtubeId") or video_entry.get("youtubeId") or video_entry["videoId"],
        "title": meta.get("title") or video_entry.get("title", ""),
        "channel": meta.get("channel") or video_entry.get("channel", ""),
        "category_id": meta.get("categoryId") or video_entry.get("categoryId", ""),
        "difficulty": meta.get("difficulty") or video_entry.get("difficulty", "intermediate"),
        "duration": int(meta.get("duration") or video_entry.get("duration") or 0),
        "thumbnail": meta.get("thumbnail") or video_entry.get("thumbnail", ""),
        "speech_rate_wpm": int(meta.get("speechRateWpm") or 0),
        "speech_rate_cpm": int(meta.get("speechRateCpm") or 0),
        "speech_rate_mpm": int(meta.get("speechRateMpm") or 0),
        "added_at": meta.get("addedAt") or video_entry.get("addedAt"),
        "segment_count": int(meta.get("segmentCount") or len(segments.get("segments", []))),
        "vocabulary_count": int(meta.get("vocabularyCount") or (len(vocabulary) if isinstance(vocabulary, list) else 0)),
        "grammar_pattern_count": int(meta.get("grammarPatternCount") or (len(grammar) if isinstance(grammar, list) else 0)),
        "description_ko": meta.get("descriptionKo") or video_entry.get("descriptionKo"),
    }


def main() -> None:
    supabase_url = _require_env("SUPABASE_URL", fallback="VITE_SUPABASE_URL").rstrip("/")
    service_role_key = _require_env("SUPABASE_SERVICE_ROLE_KEY")

    total = 0
    for lang, data_dir in APPS:
        videos = _read_json(data_dir / "videos.json")
        print(f"[{lang}] videos={len(videos)}")

        for entry in videos:
            video_id = entry["videoId"]
            vdir = data_dir / video_id

            meta = _read_json(vdir / "meta.json")
            segments = _read_json(vdir / "segments.json")
            vocabulary = _read_json(vdir / "vocabulary.json")
            grammar = _read_json(vdir / "grammar.json")
            connected = _read_json(vdir / "connected_speech.json")
            structure = _read_json(vdir / "structure.json")

            catalog = _catalog_row(lang, entry, meta, segments, vocabulary, grammar)
            artifacts = {
                "language": lang,
                "video_id": video_id,
                "meta": meta,
                "segments": segments,
                "vocabulary": vocabulary,
                "grammar": grammar,
                "connected_speech": connected,
                "structure": structure,
            }

            _postgrest_upsert(
                base_url=supabase_url,
                service_role_key=service_role_key,
                table="video_catalog",
                row=catalog,
                on_conflict="language,video_id",
            )
            _postgrest_upsert(
                base_url=supabase_url,
                service_role_key=service_role_key,
                table="video_artifacts",
                row=artifacts,
                on_conflict="language,video_id",
            )
            total += 1
            print(f"  upserted: {lang}/{video_id}")

    print(f"Done. Upserted {total} videos into video_catalog/video_artifacts.")


if __name__ == "__main__":
    main()
