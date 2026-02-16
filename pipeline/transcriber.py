"""
Speech-to-text transcription module.

Uses mlx-whisper for fast on-device transcription with word-level timestamps.
"""

import logging
import re
from typing import Any, TypedDict

import mlx_whisper

logger = logging.getLogger(__name__)

MODEL_NAME = "mlx-community/whisper-large-v3-turbo"


class WordTimestamp(TypedDict):
    word: str
    start: float
    end: float


class TranscriptSegment(TypedDict):
    index: int
    start: float
    end: float
    textEn: str
    words: list[WordTimestamp]


def transcribe_audio(audio_path: str) -> list[dict[str, Any]]:
    """Transcribe an audio file using mlx-whisper.

    Args:
        audio_path: Path to the audio file (MP3, WAV, etc.).

    Returns:
        List of raw segment dictionaries from whisper, each containing
        'start', 'end', 'text', and 'words' with word-level timestamps.

    Raises:
        FileNotFoundError: If the audio file does not exist.
        RuntimeError: If transcription fails.
    """
    logger.info("Transcribing audio: %s", audio_path)
    logger.info("Using model: %s", MODEL_NAME)

    try:
        result = mlx_whisper.transcribe(
            audio_path,
            path_or_hf_repo=MODEL_NAME,
            language="en",
            word_timestamps=True,
        )
    except Exception as e:
        logger.error("Transcription failed: %s", e)
        raise RuntimeError(f"Transcription failed: {e}") from e

    segments = result.get("segments", [])
    logger.info("Transcription complete: %d raw segments", len(segments))

    return segments


def _normalize_text(text: str) -> str:
    """Normalize transcription text.

    Fixes common punctuation and whitespace issues from whisper output.
    """
    # Strip leading/trailing whitespace
    text = text.strip()

    # Collapse multiple spaces
    text = re.sub(r"\s{2,}", " ", text)

    # Fix space before punctuation
    text = re.sub(r"\s+([.,!?;:])", r"\1", text)

    # Ensure space after punctuation (but not for abbreviations like U.S.)
    text = re.sub(r"([.,!?;:])([A-Za-z])", r"\1 \2", text)

    # Capitalize first letter
    if text:
        text = text[0].upper() + text[1:]

    return text


def _is_sentence_boundary(text: str) -> bool:
    """Check if text ends at a sentence boundary."""
    text = text.rstrip()
    return bool(text) and text[-1] in ".!?"


def _extract_words(segment: dict[str, Any]) -> list[WordTimestamp]:
    """Extract word timestamps from a raw whisper segment."""
    words: list[WordTimestamp] = []
    raw_words = segment.get("words", [])

    for w in raw_words:
        word_text = w.get("word", "").strip()
        if not word_text:
            continue
        words.append(
            WordTimestamp(
                word=word_text,
                start=round(w.get("start", 0.0), 3),
                end=round(w.get("end", 0.0), 3),
            )
        )

    return words


def clean_and_merge_segments(
    raw_segments: list[dict[str, Any]],
    min_duration: float = 2.0,
    max_duration: float = 30.0,
) -> list[TranscriptSegment]:
    """Clean and merge raw whisper segments into well-formed transcript segments.

    Merges short segments (< min_duration seconds) with adjacent segments,
    splits at sentence boundaries where possible, and normalizes text.

    Args:
        raw_segments: Raw segments from whisper transcription.
        min_duration: Minimum segment duration in seconds. Segments shorter
            than this will be merged with the next segment.
        max_duration: Maximum segment duration in seconds.

    Returns:
        List of cleaned TranscriptSegment dicts with index, start, end,
        textEn, and words fields.
    """
    if not raw_segments:
        return []

    logger.info(
        "Cleaning and merging %d raw segments (min_dur=%.1fs, max_dur=%.1fs)",
        len(raw_segments),
        min_duration,
        max_duration,
    )

    # Phase 1: Collect all segments with their words
    collected: list[dict[str, Any]] = []
    for seg in raw_segments:
        text = (seg.get("text", "") or "").strip()
        if not text:
            continue
        words = _extract_words(seg)
        collected.append(
            {
                "start": seg.get("start", 0.0),
                "end": seg.get("end", 0.0),
                "text": text,
                "words": words,
            }
        )

    if not collected:
        return []

    # Phase 2: Merge short segments with the following segment
    merged: list[dict[str, Any]] = []
    i = 0
    while i < len(collected):
        current = {
            "start": collected[i]["start"],
            "end": collected[i]["end"],
            "text": collected[i]["text"],
            "words": list(collected[i]["words"]),
        }

        # Keep merging while the current segment is too short
        while (
            current["end"] - current["start"] < min_duration
            and i + 1 < len(collected)
        ):
            i += 1
            next_seg = collected[i]
            current["end"] = next_seg["end"]
            current["text"] = current["text"] + " " + next_seg["text"]
            current["words"].extend(next_seg["words"])

        merged.append(current)
        i += 1

    # Phase 3: Split overly long segments at sentence boundaries
    split_segments: list[dict[str, Any]] = []
    for seg in merged:
        duration = seg["end"] - seg["start"]
        if duration <= max_duration:
            split_segments.append(seg)
            continue

        # Try to split at sentence boundaries using words
        words = seg["words"]
        if not words:
            split_segments.append(seg)
            continue

        current_words: list[WordTimestamp] = []
        current_text_parts: list[str] = []
        current_start = seg["start"]

        for w in words:
            current_words.append(w)
            current_text_parts.append(w["word"])
            accumulated_text = " ".join(current_text_parts)
            current_duration = w["end"] - current_start

            if (
                current_duration >= min_duration
                and _is_sentence_boundary(accumulated_text)
            ):
                split_segments.append(
                    {
                        "start": current_start,
                        "end": w["end"],
                        "text": accumulated_text,
                        "words": list(current_words),
                    }
                )
                current_words = []
                current_text_parts = []
                current_start = w["end"]

        # Remaining words
        if current_words:
            remaining_text = " ".join(current_text_parts)
            remaining_end = current_words[-1]["end"]
            # If too short, merge with previous segment
            if (
                split_segments
                and remaining_end - current_start < min_duration
            ):
                prev = split_segments[-1]
                prev["end"] = remaining_end
                prev["text"] = prev["text"] + " " + remaining_text
                prev["words"].extend(current_words)
            else:
                split_segments.append(
                    {
                        "start": current_start,
                        "end": remaining_end,
                        "text": remaining_text,
                        "words": list(current_words),
                    }
                )

    # Phase 4: Normalize and build final output
    result: list[TranscriptSegment] = []
    for idx, seg in enumerate(split_segments):
        normalized_text = _normalize_text(seg["text"])
        if not normalized_text:
            continue

        result.append(
            TranscriptSegment(
                index=idx,
                start=round(seg["start"], 3),
                end=round(seg["end"], 3),
                textEn=normalized_text,
                words=seg["words"],
            )
        )

    # Re-index after possible filtering
    for i, seg in enumerate(result):
        seg["index"] = i

    logger.info(
        "Segment processing complete: %d raw -> %d cleaned segments",
        len(raw_segments),
        len(result),
    )

    return result


if __name__ == "__main__":
    import json
    import sys

    logging.basicConfig(level=logging.INFO)

    if len(sys.argv) < 2:
        print("Usage: python transcriber.py <audio_file>")
        sys.exit(1)

    audio_file = sys.argv[1]
    raw = transcribe_audio(audio_file)
    segments = clean_and_merge_segments(raw)

    print(json.dumps(segments, indent=2, ensure_ascii=False))
