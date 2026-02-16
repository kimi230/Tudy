#!/usr/bin/env python3
"""
Video search pipeline for stdyEng.

Two modes:
  --search (default): Steps 1-4 — generate queries, search YouTube, prefilter,
                      analyze subtitles → outputs .tmp/candidates.json
  --rank:             Steps 6-7 — deduplicate, compute composite scores
                      → outputs .tmp/recommendations.json

Claude Code acts as the orchestrator (Step 5: evaluate) between the two modes.
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

import yt_dlp

# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

PROJECT_ROOT = SCRIPT_DIR.parent
DATA_DIR = Path(os.environ.get("STDYENG_DATA_DIR",
    str(PROJECT_ROOT / "app" / "public" / "data")))
TMP_DIR = SCRIPT_DIR / ".tmp"
VIDEOS_INDEX_PATH = DATA_DIR / "videos.json"

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Curated sources (mirrors search_workflow.yaml)
# ---------------------------------------------------------------------------

HIGH_PRIORITY_CHANNELS = {"TED", "TEDx Talks", "TED-Ed"}

CATEGORY_CHANNELS: dict[str, list[str]] = {
    "science": ["CrashCourse", "Veritasium", "Kurzgesagt – In a Nutshell"],
    "business": ["Harvard Business Review", "Stanford Graduate School of Business", "Talks at Google"],
    "tech": ["Google", "MIT OpenCourseWare", "Computerphile"],
    "motivation": ["Goalcast", "Motivation2Study"],
    "academic": ["MIT OpenCourseWare", "Stanford", "Yale Courses"],
    "culture": ["TED-Ed", "National Geographic"],
}

LEGENDARY_SPEAKERS = {
    "Simon Sinek", "Brené Brown", "Tim Urban", "Dan Pink", "Amy Cuddy",
    "Hans Rosling", "Ken Robinson", "Yuval Noah Harari", "Malcolm Gladwell",
    "Angela Duckworth", "Adam Grant", "Susan Cain", "Chimamanda Ngozi Adichie",
    "Bill Gates", "Elon Musk", "Barack Obama",
}

DIFFICULTY_PROFILES: dict[str, dict[str, Any]] = {
    "beginner": {
        "target_wpm": (90, 130),
        "duration_sec": (300, 480),
        "search_modifiers": ["easy", "simple", "for beginners"],
    },
    "intermediate": {
        "target_wpm": (130, 170),
        "duration_sec": (420, 720),
        "search_modifiers": [],
    },
    "advanced": {
        "target_wpm": (160, 220),
        "duration_sec": (420, 900),
        "search_modifiers": ["in-depth", "advanced", "research"],
    },
}

# Category → search keyword mapping
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "pronunciation": ["pronunciation", "English speaking", "accent training"],
    "business": ["business English", "leadership", "management"],
    "daily": ["daily conversation", "everyday English", "life advice"],
    "academic": ["lecture", "university", "academic English"],
    "travel": ["travel", "culture", "adventure"],
    "tech": ["technology", "programming", "innovation"],
    "current": ["news", "current events", "world affairs"],
    "culture": ["culture", "society", "history"],
    "science": ["science", "research", "discovery"],
    "motivation": ["motivation", "inspiration", "personal growth", "success"],
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


class StepTimer:
    """Context manager for timing and logging pipeline steps."""

    def __init__(self, step_name: str, step_num: int, total_steps: int):
        self.step_name = step_name
        self.step_num = step_num
        self.total_steps = total_steps
        self.start_time = 0.0

    def __enter__(self):
        self.start_time = time.time()
        logger.info(
            "[%d/%d] %s ...", self.step_num, self.total_steps, self.step_name,
        )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        elapsed = time.time() - self.start_time
        if exc_type is None:
            logger.info(
                "[%d/%d] %s completed (%.1fs)",
                self.step_num, self.total_steps, self.step_name, elapsed,
            )
        else:
            logger.error(
                "[%d/%d] %s FAILED after %.1fs: %s",
                self.step_num, self.total_steps, self.step_name, elapsed, exc_val,
            )
        return False


def load_json(path: Path) -> Any:
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    logger.info("Saved: %s", path)


def load_videos_index() -> list[dict[str, Any]]:
    data = load_json(VIDEOS_INDEX_PATH)
    if data is None:
        return []
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "videos" in data:
        return data["videos"]
    return []


def _get_common_words() -> frozenset[str]:
    """Lazy-import common words set."""
    from common_words import COMMON_WORDS
    return COMMON_WORDS


# ---------------------------------------------------------------------------
# Step 1: Generate search queries
# ---------------------------------------------------------------------------


def generate_queries(
    level: str,
    category: str,
    topics: list[str] | None = None,
) -> list[str]:
    """Build a list of YouTube search query strings."""
    profile = DIFFICULTY_PROFILES.get(level, DIFFICULTY_PROFILES["intermediate"])
    modifiers = profile["search_modifiers"]
    cat_keywords = CATEGORY_KEYWORDS.get(category, [category])

    queries: list[str] = []

    # Base queries from category keywords
    for kw in cat_keywords:
        base = f"{kw} English speech"
        queries.append(base)
        for mod in modifiers:
            queries.append(f"{kw} {mod} English")

    # Topic-specific queries
    if topics:
        for topic in topics:
            queries.append(f"{topic} English speech")
            queries.append(f"{topic} TED talk")
            for mod in modifiers:
                queries.append(f"{topic} {mod}")

    # Curated channel queries
    cat_channels = CATEGORY_CHANNELS.get(category, [])
    for ch in cat_channels[:2]:
        queries.append(f"{cat_keywords[0] if cat_keywords else category} {ch}")

    # TED / TEDx queries for any category
    for kw in cat_keywords[:2]:
        queries.append(f"{kw} TED talk")

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for q in queries:
        q_lower = q.lower()
        if q_lower not in seen:
            seen.add(q_lower)
            unique.append(q)

    logger.info("Generated %d search queries", len(unique))
    return unique


# ---------------------------------------------------------------------------
# Step 2: Search YouTube via yt-dlp
# ---------------------------------------------------------------------------


def search_youtube(
    queries: list[str],
    max_results_per_query: int = 10,
) -> list[dict[str, Any]]:
    """Search YouTube and return raw metadata dicts (no download)."""
    all_results: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": False,
        "ignoreerrors": True,
    }

    for query in queries:
        search_url = f"ytsearch{max_results_per_query}:{query}"
        logger.debug("Searching: %s", search_url)

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                result = ydl.extract_info(search_url, download=False)
        except Exception as e:
            logger.warning("Search failed for '%s': %s", query, e)
            continue

        if not result or "entries" not in result:
            continue

        for entry in result["entries"]:
            if entry is None:
                continue
            vid = entry.get("id", "")
            if not vid or vid in seen_ids:
                continue
            seen_ids.add(vid)

            all_results.append({
                "video_id": vid,
                "url": f"https://www.youtube.com/watch?v={vid}",
                "title": entry.get("title", ""),
                "channel": entry.get("channel", "") or entry.get("uploader", ""),
                "duration": int(entry.get("duration") or 0),
                "view_count": int(entry.get("view_count") or 0),
                "upload_date": entry.get("upload_date", ""),
                "description": (entry.get("description") or "")[:500],
                "language": entry.get("language", ""),
            })

    logger.info("Found %d unique videos from %d queries", len(all_results), len(queries))
    return all_results


# ---------------------------------------------------------------------------
# Step 3: Pre-filter by metadata
# ---------------------------------------------------------------------------


def prefilter(
    results: list[dict[str, Any]],
    level: str,
) -> list[dict[str, Any]]:
    """Filter candidates by duration, view count, and basic quality signals."""
    profile = DIFFICULTY_PROFILES.get(level, DIFFICULTY_PROFILES["intermediate"])
    min_dur, max_dur = profile["duration_sec"]
    # Allow some slack
    min_dur_slack = int(min_dur * 0.7)
    max_dur_slack = int(max_dur * 1.3)

    filtered: list[dict[str, Any]] = []
    for r in results:
        dur = r.get("duration", 0)
        views = r.get("view_count", 0)

        # Duration filter
        if dur < min_dur_slack or dur > max_dur_slack:
            logger.debug("Filtered (duration %ds): %s", dur, r.get("title", "")[:50])
            continue

        # Minimum view count (quality signal)
        if views < 5000:
            logger.debug("Filtered (views %d): %s", views, r.get("title", "")[:50])
            continue

        # Skip music/shorts indicators in title
        title_lower = r.get("title", "").lower()
        skip_patterns = ["official music video", "lyrics", "karaoke", "#shorts"]
        if any(pat in title_lower for pat in skip_patterns):
            logger.debug("Filtered (skip pattern): %s", r.get("title", "")[:50])
            continue

        filtered.append(r)

    logger.info("Pre-filter: %d → %d candidates", len(results), len(filtered))
    return filtered


# ---------------------------------------------------------------------------
# Step 4: Quick analysis (subtitle download + heuristics)
# ---------------------------------------------------------------------------


def _download_subtitles(video_id: str) -> str | None:
    """Download English subtitles for a video, return text or None."""
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["en"],
        "subtitlesformat": "vtt",
        "outtmpl": str(TMP_DIR / f"sub_{video_id}"),
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(
                f"https://www.youtube.com/watch?v={video_id}",
                download=False,
            )
    except Exception as e:
        logger.debug("Subtitle extraction failed for %s: %s", video_id, e)
        return None

    if info is None:
        return None

    # Try manual subs first, then auto
    subs = info.get("subtitles", {})
    auto_subs = info.get("automatic_captions", {})

    sub_info = subs.get("en") or auto_subs.get("en")
    if not sub_info:
        # Try en-US or similar
        for key in list(subs.keys()) + list(auto_subs.keys()):
            if key.startswith("en"):
                sub_info = subs.get(key) or auto_subs.get(key)
                break

    if not sub_info:
        return None

    # Find a JSON3 or VTT URL
    sub_url = None
    for fmt in sub_info:
        if fmt.get("ext") == "json3":
            sub_url = fmt.get("url")
            break
    if not sub_url:
        for fmt in sub_info:
            if fmt.get("ext") == "vtt":
                sub_url = fmt.get("url")
                break
    if not sub_url and sub_info:
        sub_url = sub_info[0].get("url")

    if not sub_url:
        return None

    # Download the subtitle content
    try:
        import urllib.request
        req = urllib.request.Request(sub_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        logger.debug("Subtitle download failed for %s: %s", video_id, e)
        return None

    # Parse: extract plain text from JSON3 or VTT
    text = _parse_subtitle_text(raw)
    return text if text and len(text) > 100 else None


def _parse_subtitle_text(raw: str) -> str:
    """Extract plain text from JSON3 or VTT subtitle content."""
    # Try JSON3 format
    try:
        data = json.loads(raw)
        events = data.get("events", [])
        parts: list[str] = []
        for ev in events:
            segs = ev.get("segs", [])
            for seg in segs:
                txt = seg.get("utf8", "").strip()
                if txt and txt != "\n":
                    parts.append(txt)
        text = " ".join(parts)
        if text:
            # Clean up
            text = re.sub(r"\s+", " ", text).strip()
            return text
    except (json.JSONDecodeError, KeyError):
        pass

    # Try VTT format
    lines: list[str] = []
    for line in raw.splitlines():
        line = line.strip()
        # Skip timestamps, WEBVTT header, metadata
        if not line or line.startswith("WEBVTT") or "-->" in line:
            continue
        if re.match(r"^\d+$", line):
            continue
        # Strip VTT tags
        clean = re.sub(r"<[^>]+>", "", line)
        if clean:
            lines.append(clean)

    text = " ".join(lines)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def quick_analysis(
    candidates: list[dict[str, Any]],
    level: str,
    max_candidates: int = 15,
) -> list[dict[str, Any]]:
    """Download subtitles and compute heuristic scores for each candidate."""
    profile = DIFFICULTY_PROFILES.get(level, DIFFICULTY_PROFILES["intermediate"])
    target_wpm_low, target_wpm_high = profile["target_wpm"]
    common_words = _get_common_words()

    analyzed: list[dict[str, Any]] = []

    # Sort by view count descending to prioritize popular content
    sorted_candidates = sorted(candidates, key=lambda x: x.get("view_count", 0), reverse=True)

    for i, cand in enumerate(sorted_candidates):
        if len(analyzed) >= max_candidates:
            break

        vid = cand["video_id"]
        logger.info("  [%d/%d] Analyzing subtitles: %s", i + 1, len(sorted_candidates), cand.get("title", "")[:60])

        subtitle_text = _download_subtitles(vid)
        if not subtitle_text:
            logger.debug("  No subtitles for %s, skipping", vid)
            continue

        # Compute metrics
        duration = cand.get("duration", 1)
        words = subtitle_text.split()
        word_count = len(words)
        speech_rate_wpm = round(word_count / (duration / 60)) if duration > 0 else 0

        # Vocabulary accessibility: % of words in common words list
        words_lower = [w.lower().strip(".,!?;:\"'()[]{}") for w in words]
        common_count = sum(1 for w in words_lower if w in common_words)
        pct_common = round(common_count / max(len(words_lower), 1), 3)

        # Difficulty match score: how close is WPM to target range
        if target_wpm_low <= speech_rate_wpm <= target_wpm_high:
            difficulty_match = 1.0
        elif speech_rate_wpm < target_wpm_low:
            difficulty_match = max(0, 1.0 - (target_wpm_low - speech_rate_wpm) / 50)
        else:
            difficulty_match = max(0, 1.0 - (speech_rate_wpm - target_wpm_high) / 50)
        difficulty_match = round(difficulty_match, 3)

        # Vocab accessibility score (0-1): higher = more accessible
        # Beginner wants high pct_common, advanced wants lower
        if level == "beginner":
            vocab_score = pct_common  # higher is better
        elif level == "advanced":
            vocab_score = 1.0 - pct_common  # lower common % = harder = better match
        else:
            # Intermediate: sweet spot around 0.7-0.8
            vocab_score = 1.0 - abs(pct_common - 0.75) * 2
        vocab_score = round(max(0, min(1, vocab_score)), 3)

        # Channel score
        channel = cand.get("channel", "")
        channel_score = 0
        if channel in HIGH_PRIORITY_CHANNELS:
            channel_score = 5
        elif any(channel in channels for channels in CATEGORY_CHANNELS.values()):
            channel_score = 3
        # Check for legendary speakers in title or channel
        title = cand.get("title", "")
        for speaker in LEGENDARY_SPEAKERS:
            if speaker.lower() in title.lower() or speaker.lower() in channel.lower():
                channel_score = max(channel_score, 4)
                break

        # Truncate subtitle text for output
        subtitle_truncated = subtitle_text[:5000]

        analyzed.append({
            "video_id": vid,
            "url": cand["url"],
            "title": cand.get("title", ""),
            "channel": channel,
            "duration": duration,
            "view_count": cand.get("view_count", 0),
            "speech_rate_wpm": speech_rate_wpm,
            "pct_common_words": pct_common,
            "difficulty_match_score": difficulty_match,
            "vocab_accessibility_score": vocab_score,
            "subtitle_text": subtitle_truncated,
            "channel_score": channel_score,
        })

    # Sort by a rough combined score
    analyzed.sort(
        key=lambda x: (
            x["difficulty_match_score"] * 0.4
            + x["vocab_accessibility_score"] * 0.3
            + x["channel_score"] / 5 * 0.3
        ),
        reverse=True,
    )

    logger.info("Quick analysis: %d candidates with subtitles", len(analyzed))
    return analyzed


# ---------------------------------------------------------------------------
# Step 6-7: Rank (dedup + composite scoring)
# ---------------------------------------------------------------------------


def rank_candidates(
    evaluated_path: Path,
    candidates_path: Path,
    count: int = 5,
) -> list[dict[str, Any]]:
    """Merge evaluated.json with candidates.json, deduplicate, score, rank."""

    evaluated = load_json(evaluated_path)
    candidates = load_json(candidates_path)

    if not evaluated or not candidates:
        logger.error("Missing evaluated or candidates data")
        return []

    # Index candidates by video_id
    cand_map = {c["video_id"]: c for c in candidates}

    # Index evaluated by video_id
    eval_map = {e["video_id"]: e for e in evaluated}

    # Check for already-processed videos
    existing_videos = load_videos_index()
    existing_ids = {v.get("videoId") or v.get("video_id") for v in existing_videos}

    recommendations: list[dict[str, Any]] = []

    for vid, ev in eval_map.items():
        cand = cand_map.get(vid)
        if not cand:
            logger.warning("Evaluated video %s not found in candidates", vid)
            continue

        # Skip already processed
        if vid in existing_ids:
            logger.info("Skipping already processed: %s", vid)
            continue

        # Skip if structure or content score too low
        if ev.get("structure", 0) < 4 or ev.get("content", 0) < 4:
            logger.info("Skipping low score: %s (structure=%s, content=%s)",
                        vid, ev.get("structure"), ev.get("content"))
            continue

        # Composite scoring (100-point scale)
        # Weights: difficulty_match 35%, vocab 25%, structure 20%, content 15%, channel 5%
        difficulty_match_pts = cand.get("difficulty_match_score", 0) * 35
        vocab_pts = cand.get("vocab_accessibility_score", 0) * 25
        structure_pts = ev.get("structure", 5) / 10 * 20
        content_pts = ev.get("content", 5) / 10 * 15
        channel_pts = cand.get("channel_score", 0) / 5 * 5

        total_score = round(
            difficulty_match_pts + vocab_pts + structure_pts + content_pts + channel_pts,
            1,
        )

        # Build reasoning string
        reasons: list[str] = []
        struct_val = ev.get("structure", 0)
        content_val = ev.get("content", 0)
        reasons.append(f"구조 명확({struct_val}/10)")
        pct_common = cand.get("pct_common_words", 0)
        reasons.append(f"어휘 적정({int(pct_common*100)}% common)")
        channel = cand.get("channel", "")
        if channel in HIGH_PRIORITY_CHANNELS:
            reasons.append(f"{channel} 채널")
        for speaker in LEGENDARY_SPEAKERS:
            if speaker.lower() in cand.get("title", "").lower():
                reasons.append(f"레전드 스피커({speaker})")
                break

        # Estimate difficulty based on WPM
        wpm = cand.get("speech_rate_wpm", 150)
        if wpm < 120:
            est_diff = "beginner"
        elif wpm < 155:
            est_diff = "intermediate"
        else:
            est_diff = "advanced"

        recommendations.append({
            "videoId": vid,
            "url": cand["url"],
            "title": cand.get("title", ""),
            "channel": channel,
            "duration": cand.get("duration", 0),
            "score": total_score,
            "scores": {
                "difficulty_match": round(difficulty_match_pts, 1),
                "vocab_accessibility": round(vocab_pts, 1),
                "structure_quality": round(structure_pts, 1),
                "content_value": round(content_pts, 1),
                "speaker_quality": round(channel_pts, 1),
            },
            "reasoning": ", ".join(reasons),
            "suggested_category": ev.get("category", ""),
            "estimated_difficulty": est_diff,
            "summary": ev.get("summary", ""),
        })

    # Sort by score descending
    recommendations.sort(key=lambda x: x["score"], reverse=True)

    # Take top N
    recommendations = recommendations[:count]

    logger.info("Ranked %d recommendations", len(recommendations))
    return recommendations


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Video search pipeline for stdyEng.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Modes:
  Search (default):
    python video_search.py --level intermediate --category motivation
    python video_search.py --level beginner --category daily --topics "habits,morning routine"

  Rank:
    python video_search.py --rank --evaluated .tmp/evaluated.json --count 5
""",
    )

    # Mode
    parser.add_argument(
        "--rank",
        action="store_true",
        help="Run ranking mode (Steps 6-7) instead of search mode",
    )

    # Search mode options
    parser.add_argument(
        "--level",
        type=str,
        choices=["beginner", "intermediate", "advanced"],
        default="intermediate",
        help="Target difficulty level (default: intermediate)",
    )
    parser.add_argument(
        "--category",
        type=str,
        default="motivation",
        help="Content category",
    )
    parser.add_argument(
        "--topics",
        type=str,
        default="",
        help="Comma-separated list of specific topics",
    )
    parser.add_argument(
        "--max-results",
        type=int,
        default=10,
        help="Max results per search query (default: 10)",
    )
    parser.add_argument(
        "--max-candidates",
        type=int,
        default=15,
        help="Max candidates after subtitle analysis (default: 15)",
    )

    # Rank mode options
    parser.add_argument(
        "--evaluated",
        type=str,
        default=str(TMP_DIR / "evaluated.json"),
        help="Path to evaluated.json (rank mode)",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=5,
        help="Number of recommendations to output (default: 5)",
    )

    # Common options
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(TMP_DIR),
        help=f"Output directory (default: {TMP_DIR})",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose/debug logging",
    )

    return parser.parse_args()


def main() -> None:
    args = parse_args()

    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if args.rank:
        # ============================================================
        # RANK MODE (Steps 6-7)
        # ============================================================
        logger.info("=" * 50)
        logger.info("Video Search Pipeline — RANK MODE")
        logger.info("=" * 50)

        evaluated_path = Path(args.evaluated)
        candidates_path = output_dir / "candidates.json"

        with StepTimer("Rank candidates", 1, 1):
            recommendations = rank_candidates(
                evaluated_path=evaluated_path,
                candidates_path=candidates_path,
                count=args.count,
            )

        out_path = output_dir / "recommendations.json"
        save_json(out_path, recommendations)
        logger.info("Recommendations saved to: %s", out_path)

    else:
        # ============================================================
        # SEARCH MODE (Steps 1-4)
        # ============================================================
        logger.info("=" * 50)
        logger.info("Video Search Pipeline — SEARCH MODE")
        logger.info("  Level: %s", args.level)
        logger.info("  Category: %s", args.category)
        if args.topics:
            logger.info("  Topics: %s", args.topics)
        logger.info("=" * 50)

        topics = [t.strip() for t in args.topics.split(",") if t.strip()] if args.topics else None
        total_steps = 4

        # Step 1: Generate queries
        with StepTimer("Generate search queries", 1, total_steps):
            queries = generate_queries(args.level, args.category, topics)
            logger.info("  Queries: %s", queries[:5])

        # Step 2: Search YouTube
        with StepTimer("Search YouTube", 2, total_steps):
            results = search_youtube(queries, max_results_per_query=args.max_results)

        # Step 3: Pre-filter
        with StepTimer("Pre-filter candidates", 3, total_steps):
            filtered = prefilter(results, args.level)

        # Step 4: Quick analysis (subtitle download + heuristics)
        with StepTimer("Quick analysis (subtitles + heuristics)", 4, total_steps):
            candidates = quick_analysis(filtered, args.level, max_candidates=args.max_candidates)

        if not candidates:
            logger.warning("No candidates found! Try different search parameters.")
            sys.exit(1)

        out_path = output_dir / "candidates.json"
        save_json(out_path, candidates)

        logger.info("=" * 50)
        logger.info("Found %d candidates", len(candidates))
        logger.info("Candidates saved to: %s", out_path)
        logger.info("Next: Claude Code evaluates candidates → evaluated.json")


if __name__ == "__main__":
    main()
