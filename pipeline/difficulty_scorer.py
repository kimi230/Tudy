#!/usr/bin/env python3
"""
세그먼트별 듣기 난이도 계산기.

각 세그먼트에 1~5 점수 부여 (가중합 → 정규화):
  - WPM (40%): 세그먼트 단어수 ÷ 구간길이(분). 빠를수록 높은 점수
  - 연음 밀도 (30%): connected_speech 항목 수
  - 어휘 난이도 (20%): vocabulary 항목 수 (비필수 어휘는 2배 가중)
  - 문법 복잡도 (10%): grammar 항목 수

Usage:
    python3 pipeline/difficulty_scorer.py --video-id {videoId}
"""

import argparse
import os
import sys
from collections import Counter
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from utils import load_json, save_json

DATA_DIR = Path(os.environ.get("STDYENG_DATA_DIR",
    str(SCRIPT_DIR.parent / "app" / "public" / "data")))

WEIGHT_WPM = 0.4
WEIGHT_SPEECH = 0.3
WEIGHT_VOCAB = 0.2
WEIGHT_GRAMMAR = 0.1


def calc_wpm(segment: dict) -> float:
    """Calculate words-per-minute for a segment."""
    duration_sec = segment["end"] - segment["start"]
    if duration_sec <= 0:
        return 0.0
    word_count = len(segment.get("words", []))
    return word_count / (duration_sec / 60.0)


def count_by_segment(items: list, key: str = "segmentIndex") -> Counter:
    """Count items per segment index."""
    c = Counter()
    for item in items:
        if key in item:
            c[item[key]] += 1
    return c


def count_vocab_weighted(vocab_items: list) -> Counter:
    """Count vocabulary items per segment, weighting non-essential words x2."""
    c = Counter()
    for item in vocab_items:
        idx = item.get("segmentIndex")
        if idx is None:
            continue
        weight = 2 if not item.get("isEssential", True) else 1
        c[idx] += weight
    return c


def normalize_to_1_5(values: list[float]) -> list[int]:
    """Normalize a list of raw scores to 1-5 integer scale using percentile bins."""
    if not values:
        return []

    sorted_vals = sorted(values)
    n = len(sorted_vals)

    if n == 1:
        return [3]  # Single segment gets middle score

    def percentile_rank(val: float) -> float:
        """Return 0.0-1.0 percentile rank of val within sorted_vals."""
        # Count values strictly less than val
        count_below = sum(1 for v in sorted_vals if v < val)
        count_equal = sum(1 for v in sorted_vals if v == val)
        return (count_below + count_equal * 0.5) / n

    result = []
    for v in values:
        if v == 0.0:
            result.append(1)
        else:
            p = percentile_rank(v)
            # Map percentile to 1-5
            if p < 0.2:
                score = 1
            elif p < 0.4:
                score = 2
            elif p < 0.6:
                score = 3
            elif p < 0.8:
                score = 4
            else:
                score = 5
            result.append(score)
    return result


def score_segments(video_dir: Path) -> list[int]:
    """Calculate listenDifficulty for each segment. Returns list of scores (1-5)."""

    segments_path = video_dir / "segments.json"
    vocab_path = video_dir / "vocabulary.json"
    grammar_path = video_dir / "grammar.json"
    speech_path = video_dir / "connected_speech.json"

    segments_data = load_json(segments_path)
    segments = segments_data.get("segments", [])
    n = len(segments)

    # Load analysis files (may not all exist)
    vocab = load_json(vocab_path) if vocab_path.exists() else []
    grammar = load_json(grammar_path) if grammar_path.exists() else []
    speech = load_json(speech_path) if speech_path.exists() else []

    # Raw metrics per segment
    wpm_raw = [calc_wpm(seg) for seg in segments]
    speech_counts = count_by_segment(speech)
    vocab_counts = count_vocab_weighted(vocab)
    grammar_counts = count_by_segment(grammar)

    speech_raw = [float(speech_counts.get(i, 0)) for i in range(n)]
    vocab_raw = [float(vocab_counts.get(i, 0)) for i in range(n)]
    grammar_raw = [float(grammar_counts.get(i, 0)) for i in range(n)]

    # Normalize each dimension to 1-5
    wpm_scores = normalize_to_1_5(wpm_raw)
    speech_scores = normalize_to_1_5(speech_raw)
    vocab_scores = normalize_to_1_5(vocab_raw)
    grammar_scores = normalize_to_1_5(grammar_raw)

    # Weighted combination
    combined = []
    for i in range(n):
        weighted = (
            WEIGHT_WPM * wpm_scores[i]
            + WEIGHT_SPEECH * speech_scores[i]
            + WEIGHT_VOCAB * vocab_scores[i]
            + WEIGHT_GRAMMAR * grammar_scores[i]
        )
        # Round to nearest integer, clamp to 1-5
        score = max(1, min(5, round(weighted)))
        combined.append(score)

    return combined


def main():
    parser = argparse.ArgumentParser(description="세그먼트별 듣기 난이도 계산")
    parser.add_argument("--video-id", required=True, help="영상 ID")
    args = parser.parse_args()

    video_id = args.video_id
    video_dir = DATA_DIR / video_id

    if not video_dir.exists():
        print(f"Error: Video directory not found: {video_dir}", file=sys.stderr)
        sys.exit(1)

    segments_path = video_dir / "segments.json"
    if not segments_path.exists():
        print(f"Error: segments.json not found: {segments_path}", file=sys.stderr)
        sys.exit(1)

    # Calculate scores
    scores = score_segments(video_dir)

    # Update segments.json in-place
    segments_data = load_json(segments_path)
    for seg, score in zip(segments_data["segments"], scores):
        seg["listenDifficulty"] = score

    save_json(segments_path, segments_data)

    # Print summary
    dist = Counter(scores)
    print(f"Updated {len(scores)} segments in {segments_path}")
    print(f"Distribution: {dict(sorted(dist.items()))}")


if __name__ == "__main__":
    main()
