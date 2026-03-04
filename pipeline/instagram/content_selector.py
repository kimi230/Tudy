#!/usr/bin/env python3
"""Score and rank content items from processed videos for Instagram posts.

Usage:
    python3 pipeline/instagram/content_selector.py --all --count 5
    python3 pipeline/instagram/content_selector.py --type vocabulary --count 10
    python3 pipeline/instagram/content_selector.py --video-id LNHBMFCzznE --type grammar
"""

import argparse
import json
import logging
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from pipeline.utils import load_json, save_json, load_videos_index

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

DATA_DIR = PROJECT_ROOT / "apps" / "english" / "public" / "data"
OUTPUT_PATH = PROJECT_ROOT / "pipeline" / ".tmp" / "instagram_candidates.json"
CONTENT_LOG_PATH = Path(__file__).parent / "output" / "content_log.json"


def normalize_list(data):
    """Handle both direct lists and wrapped dicts."""
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("vocabulary", "connectedSpeech", "grammar", "items"):
            if key in data and isinstance(data[key], list):
                return data[key]
    return []


def load_content_log() -> set:
    """Return set of already-used content keys like 'vocabulary:LNH:0'."""
    log = load_json(CONTENT_LOG_PATH)
    if not log or not isinstance(log, list):
        return set()
    return {entry.get("content_key", "") for entry in log if "content_key" in entry}


def get_speaker_name(video: dict) -> str:
    """Extract speaker name from video title."""
    title = video.get("title", "")
    # "Topic | Speaker Name | TED" pattern
    parts = title.split("|")
    if len(parts) >= 2:
        return parts[-2].strip()
    # "Topic - Speaker Name" pattern
    parts = title.split(" - ")
    if len(parts) >= 2:
        return parts[-1].strip()
    return video.get("channel", "")


FAMOUS_SPEAKERS = {
    "simon sinek", "angela lee duckworth", "angela duckworth",
    "brené brown", "brene brown", "steve jobs", "denzel washington",
    "wendy suzuki", "lara boyd", "judson brewer", "amy morin",
    "luis von ahn", "stephen duneier", "rock thomas",
}


def speaker_fame_score(video: dict) -> float:
    """0-1 score for speaker recognition."""
    speaker = get_speaker_name(video).lower()
    channel = video.get("channel", "").lower()
    score = 0.0
    if any(name in speaker for name in FAMOUS_SPEAKERS):
        score += 0.7
    if channel in ("ted", "ted-ed"):
        score += 0.3
    elif "tedx" in channel.lower():
        score += 0.15
    elif channel in ("harvard business review", "vox"):
        score += 0.2
    return min(score, 1.0)


APPEALING_CATEGORIES = {
    "motivation": 0.9, "business": 0.8, "science": 0.7,
    "tech": 0.7, "psychology": 0.85, "history": 0.5,
    "language": 0.6, "education": 0.6,
}


# ── Vocabulary scoring ───────────────────────────────────────────────

def score_vocabulary_item(item: dict, video: dict) -> float:
    """Score a single vocabulary item (0-100).

    Weights:
        Etymology richness  30
        Educational value    25
        Visual appeal        20
        Speaker fame         15
        Topic appeal         10
    """
    score = 0.0

    # Etymology richness (30 pts)
    root = item.get("rootBreakdown")
    if root and isinstance(root, dict):
        parts = sum(1 for k in ("prefix", "root", "suffix") if root.get(k))
        score += (parts / 3) * 20
    etymology = item.get("etymology", "")
    if etymology:
        score += min(len(etymology) / 100, 1.0) * 10

    # Educational value (25 pts)
    if item.get("isEssential"):
        score += 10
    meaning = item.get("meaningKo", "")
    if len(meaning) > 20:
        score += 8
    related = item.get("relatedWords", [])
    if len(related) >= 3:
        score += 7

    # Visual appeal (20 pts) - words that look interesting on a card
    word = item.get("word", "")
    if len(word) >= 8:  # longer words look more impressive
        score += 10
    if item.get("phonetic"):
        score += 5
    if item.get("contextSentence"):
        score += 5

    # Speaker fame (15 pts)
    score += speaker_fame_score(video) * 15

    # Topic appeal (10 pts)
    cat = video.get("categoryId", "")
    score += APPEALING_CATEGORIES.get(cat, 0.4) * 10

    return round(score, 1)


# ── Grammar scoring ──────────────────────────────────────────────────

def score_grammar_item(item: dict, video: dict) -> float:
    """Score a grammar pattern (0-100).

    Weights:
        Transformation clarity  35
        Example count            25
        Korean learner value     25
        Speaker fame             15
    """
    score = 0.0

    # Transformation clarity (35 pts) - clear pattern + explanation
    pattern = item.get("pattern", "")
    if len(pattern) >= 10:
        score += 15
    explanation_ko = item.get("explanationKo", "")
    if len(explanation_ko) > 30:
        score += 20

    # Example count (25 pts)
    examples = item.get("examples", [])
    score += min(len(examples) / 3, 1.0) * 25

    # Korean learner value (25 pts)
    explanation = item.get("explanation", "")
    if explanation:
        score += 15
    if item.get("segmentIndex") is not None:
        score += 10  # has real context

    # Speaker fame (15 pts)
    score += speaker_fame_score(video) * 15

    return round(score, 1)


# ── Pronunciation (connected speech) scoring ─────────────────────────

TYPE_WEIGHTS = {"reduction": 1.0, "linking": 0.85, "elision": 0.7, "assimilation": 0.6}


def score_pronunciation_item(item: dict, video: dict) -> float:
    """Score a connected speech item (0-100).

    Weights:
        Korean phonetic presence   30
        Practice guide quality     25
        Type weight                20
        Explanation quality        15
        Speaker fame               10
    """
    score = 0.0

    # Korean phonetic (30 pts)
    if item.get("koreanPhonetic"):
        score += 30

    # Practice guide (25 pts)
    guide = item.get("practiceGuide", "")
    if len(guide) > 20:
        score += 25
    elif guide:
        score += 12

    # Type weight (20 pts)
    typ = item.get("type", "")
    score += TYPE_WEIGHTS.get(typ, 0.5) * 20

    # Explanation quality (15 pts)
    if item.get("explanationKo") and len(item["explanationKo"]) > 20:
        score += 15
    elif item.get("explanation"):
        score += 8

    # Speaker fame (10 pts)
    score += speaker_fame_score(video) * 10

    return round(score, 1)


# ── Reel scoring ─────────────────────────────────────────────────────
# DEPRECATED: 릴스 세그먼트 선정은 reel_workflow.yaml Step 1에서
# Claude Code가 segments.json 전체 스크립트를 읽고 직접 수행.
# 이 함수는 structure.json 메타데이터만 보고 스코어링하여
# Hook/Intro 편향 문제가 있었음. 참조용으로만 유지.

def score_reel_section(section: dict, video: dict) -> float:
    """[DEPRECATED] Score a structure section for reel potential (0-100).

    이 함수는 더 이상 릴스 선정에 사용되지 않습니다.
    릴스 구간 선정은 reel_workflow.yaml Step 1에서 Claude Code가
    segments.json 전체 스크립트를 읽고 직접 수행합니다.

    Weights:
        Impact (key points count)    30
        Optimal length               25
        Speaker fame                 20
        Topic appeal                 15
        Section position             10
    """
    score = 0.0

    # Impact (30 pts)
    key_points = section.get("keyPoints", [])
    score += min(len(key_points) / 3, 1.0) * 30

    # Optimal length (25 pts) - 30-90 seconds ideal
    start = section.get("startSegment", 0)
    end = section.get("endSegment", 0)
    segment_count = end - start
    if 5 <= segment_count <= 15:  # roughly 30-90 sec
        score += 25
    elif segment_count < 5:
        score += 10
    else:
        score += max(0, 25 - (segment_count - 15) * 2)

    # Speaker fame (20 pts)
    score += speaker_fame_score(video) * 20

    # Topic appeal (15 pts)
    cat = video.get("categoryId", "")
    score += APPEALING_CATEGORIES.get(cat, 0.4) * 15

    # Section position (10 pts) - intro/hook sections score higher
    section_name = section.get("section", "").lower()
    if any(w in section_name for w in ("hook", "intro", "conclusion", "key")):
        score += 10
    elif any(w in section_name for w in ("main", "core", "argument")):
        score += 6

    return round(score, 1)


# ── Main selector ────────────────────────────────────────────────────

def select_candidates(
    content_type: str | None = None,
    video_id: str | None = None,
    count: int = 5,
) -> list[dict]:
    """Select top-scoring content candidates across all videos."""
    videos = load_videos_index(DATA_DIR)
    used_keys = load_content_log()
    candidates = []

    types_to_process = (
        [content_type] if content_type else ["vocabulary", "grammar", "pronunciation", "reel"]
    )

    for video in videos:
        vid = video["videoId"]
        if video_id and vid != video_id:
            continue
        video_dir = DATA_DIR / vid
        speaker = get_speaker_name(video)

        if "vocabulary" in types_to_process:
            vocab = normalize_list(load_json(video_dir / "vocabulary.json"))
            for i, item in enumerate(vocab):
                key = f"vocabulary:{vid}:{i}"
                if key in used_keys:
                    continue
                score = score_vocabulary_item(item, video)
                candidates.append({
                    "type": "vocabulary",
                    "content_key": key,
                    "video_id": vid,
                    "item_index": i,
                    "score": score,
                    "word": item.get("word", ""),
                    "meaningKo": item.get("meaningKo", ""),
                    "speaker": speaker,
                    "title": video.get("title", ""),
                    "channel": video.get("channel", ""),
                })

        if "grammar" in types_to_process:
            grammar = normalize_list(load_json(video_dir / "grammar.json"))
            for i, item in enumerate(grammar):
                key = f"grammar:{vid}:{i}"
                if key in used_keys:
                    continue
                score = score_grammar_item(item, video)
                candidates.append({
                    "type": "grammar",
                    "content_key": key,
                    "video_id": vid,
                    "item_index": i,
                    "score": score,
                    "pattern": item.get("pattern", ""),
                    "explanationKo": item.get("explanationKo", ""),
                    "speaker": speaker,
                    "title": video.get("title", ""),
                    "channel": video.get("channel", ""),
                })

        if "pronunciation" in types_to_process:
            cs = normalize_list(load_json(video_dir / "connected_speech.json"))
            for i, item in enumerate(cs):
                key = f"pronunciation:{vid}:{i}"
                if key in used_keys:
                    continue
                score = score_pronunciation_item(item, video)
                candidates.append({
                    "type": "pronunciation",
                    "content_key": key,
                    "video_id": vid,
                    "item_index": i,
                    "score": score,
                    "originalText": item.get("originalText", ""),
                    "koreanPhonetic": item.get("koreanPhonetic", ""),
                    "csType": item.get("type", ""),
                    "speaker": speaker,
                    "title": video.get("title", ""),
                    "channel": video.get("channel", ""),
                })

        if "reel" in types_to_process:
            # DEPRECATED: 릴스 선정은 reel_workflow.yaml Step 1에서
            # Claude Code가 segments.json을 읽고 직접 수행합니다.
            # content_selector의 메타데이터 기반 스코어링은 사용하지 않습니다.
            logger.info("  ⓘ reel: 스킵 — 릴스 선정은 reel_workflow.yaml에서 Claude가 직접 수행")

    # Sort by score descending, then by type for stable ordering
    candidates.sort(key=lambda c: (-c["score"], c["type"], c["content_key"]))

    if content_type:
        candidates = [c for c in candidates if c["type"] == content_type]

    return candidates[:count]


def main():
    parser = argparse.ArgumentParser(description="Select Instagram content candidates")
    parser.add_argument("--type", choices=["vocabulary", "grammar", "pronunciation", "reel"],
                        help="Filter by content type")
    parser.add_argument("--video-id", help="Filter by video ID")
    parser.add_argument("--count", type=int, default=5, help="Number of candidates to return")
    parser.add_argument("--all", action="store_true", help="Select across all content types")
    parser.add_argument("--output", type=str, help="Override output path")
    args = parser.parse_args()

    content_type = None if args.all else args.type
    if not args.all and not args.type:
        content_type = None  # default: all types

    candidates = select_candidates(
        content_type=content_type,
        video_id=args.video_id,
        count=args.count,
    )

    output_path = Path(args.output) if args.output else OUTPUT_PATH
    save_json(output_path, candidates)

    logger.info("\n=== Top %d candidates ===", len(candidates))
    for i, c in enumerate(candidates, 1):
        label = c.get("word") or c.get("pattern") or c.get("originalText") or c.get("section", "")
        logger.info(
            "  %d. [%s] %.1f pts — %s (%s)",
            i, c["type"], c["score"], label[:50], c["speaker"][:30],
        )


if __name__ == "__main__":
    main()
