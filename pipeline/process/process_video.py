#!/usr/bin/env python3
"""
Main CLI pipeline for processing YouTube videos into learning content.

Orchestrates: download -> transcribe -> translate -> analyze -> generate JSON.

Usage:
    python process_video.py --url "https://youtube.com/watch?v=..." --category speaking
    python process_video.py --url "..." --category grammar --difficulty intermediate
    python process_video.py --video-id abc123 --step translate  # re-run single step
    python process_video.py --url "..." --category listening --validate
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

# Add the shared directory to path so imports work when invoked from anywhere
SCRIPT_DIR = Path(__file__).resolve().parent
PIPELINE_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(PIPELINE_DIR / "shared"))

from downloader import download_audio, extract_metadata, extract_video_id_from_url
from transcriber import clean_and_merge_segments, transcribe_audio
from utils import StepTimer, load_json, save_json, load_videos_index

# --- Constants ---

PROJECT_ROOT = PIPELINE_DIR.parent
TEMP_DIR = PIPELINE_DIR / ".tmp"

# Language-to-app directory mapping
LANGUAGE_APP_MAP = {
    "en": "english",
    "zh": "chinese",
    "ja": "japanese",
}

def get_data_dir(language: str = "en") -> Path:
    """Get data directory for a given language."""
    app_name = LANGUAGE_APP_MAP.get(language, "english")
    return Path(os.environ.get("STDYENG_DATA_DIR",
        str(PROJECT_ROOT / "apps" / app_name / "public" / "data")))

# Default to English for backward compatibility
DATA_DIR = get_data_dir("en")
VIDEOS_INDEX_PATH = DATA_DIR / "videos.json"

PIPELINE_STEPS = [
    "extract_metadata",
    "download_audio",
    "transcribe",
    "clean_segments",
    "translate",
    "estimate_difficulty",
    "extract_vocabulary",
    "analyze_grammar",
    "analyze_connected_speech",
    "analyze_structure",
    "generate_json",
    "update_index",
]

logger = logging.getLogger(__name__)


def save_videos_index(videos: list[dict[str, Any]]) -> None:
    """Save the videos.json index file."""
    save_json(VIDEOS_INDEX_PATH, videos)


def _compact_text(value: Any) -> str:
    """Normalize arbitrary values into a single-line string."""
    return " ".join(str(value or "").split()).strip()


def _trim_description(value: Any, max_len: int = 80) -> str:
    """Create a concise one-line subtitle."""
    text = _compact_text(value).strip(" .")
    if not text:
        return ""

    for delimiter in (". ", "! ", "? "):
        if delimiter in text:
            text = text.split(delimiter, 1)[0].strip(" .")
            break

    if len(text) > max_len:
        text = text[: max_len - 1].rstrip() + "…"
    return text


def _contains_hangul(text: str) -> bool:
    return any("가" <= ch <= "힣" for ch in text)


def _extract_description_ko_from_structure(structure_data: Any) -> str:
    """Extract agent-generated Korean short description from structure data."""
    if not isinstance(structure_data, dict):
        return ""

    candidates: list[Any] = [
        structure_data.get("descriptionKo"),
        structure_data.get("titleKo"),
        structure_data.get("summary"),
    ]

    sections = structure_data.get("sections")
    if isinstance(sections, list) and sections:
        first = sections[0]
        if isinstance(first, dict):
            candidates.extend([
                first.get("titleKo"),
                first.get("summaryKo"),
                first.get("summary"),
            ])

    normalized = [_trim_description(candidate) for candidate in candidates]

    for text in normalized:
        if len(text) >= 6 and _contains_hangul(text):
            return text
    for text in normalized:
        if len(text) >= 6:
            return text
    return ""


def _ensure_structure_description_ko(structure_data: Any, description_ko: str) -> tuple[Any, bool]:
    """Ensure structure root contains descriptionKo for downstream sync/consumers."""
    if not isinstance(structure_data, dict):
        return structure_data, False

    current = _trim_description(structure_data.get("descriptionKo", ""))
    if current:
        return structure_data, False
    if not description_ko:
        return structure_data, False

    structure_data["descriptionKo"] = description_ko
    return structure_data, True


# --- Intermediate state management ---


def get_video_dir(video_id: str) -> Path:
    """Get the output directory for a video."""
    return DATA_DIR / video_id


def load_intermediate(video_id: str, filename: str) -> Any:
    """Load intermediate pipeline data from the video directory."""
    path = get_video_dir(video_id) / filename
    return load_json(path)


def save_intermediate(video_id: str, filename: str, data: Any) -> None:
    """Save intermediate pipeline data to the video directory."""
    path = get_video_dir(video_id) / filename
    save_json(path, data)


# --- Pipeline steps ---


def step_extract_metadata(url: str) -> dict[str, Any]:
    """Step 1: Extract metadata from YouTube URL."""
    return dict(extract_metadata(url))


def step_download_audio(url: str, video_id: str) -> str:
    """Step 2: Download audio from YouTube."""
    return download_audio(url, video_id, temp_dir=str(TEMP_DIR))


def step_transcribe(audio_path: str, language: str = "en") -> list[dict[str, Any]]:
    """Step 3: Transcribe audio to raw segments."""
    return transcribe_audio(audio_path, language=language)


def step_clean_segments(raw_segments: list[dict[str, Any]], language: str = "en") -> list[dict[str, Any]]:
    """Step 4: Clean and merge raw segments."""
    return clean_and_merge_segments(raw_segments, language=language)


def step_translate(
    segments: list[dict[str, Any]],
    method: str = "claude",
    model: str | None = None,
    batch_size: int = 10,
) -> list[dict[str, Any]]:
    """Step 5: Translate segments to Korean."""
    return translate_segments(
        segments, method=method, model=model, batch_size=batch_size
    )


def step_estimate_difficulty(
    segments: list[dict[str, Any]],
    duration: int,
    override: str | None = None,
) -> str:
    """Step 6: Estimate difficulty level."""
    if override:
        logger.info("Using provided difficulty level: %s", override)
        return override
    total_words = sum(len(seg["textEn"].split()) for seg in segments)
    return estimate_difficulty(segments, duration, total_words)


def step_extract_vocabulary(
    segments: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Step 7: Extract vocabulary."""
    return extract_vocabulary(segments)


def step_analyze_grammar(
    segments: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Step 8: Analyze grammar patterns."""
    return analyze_grammar_patterns(segments)


def step_analyze_connected_speech(
    segments: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Step 9: Analyze connected speech."""
    return analyze_connected_speech(segments)


def step_analyze_structure(
    segments: list[dict[str, Any]],
) -> dict[str, Any]:
    """Step 10: Analyze speech structure (returns dict with sections + signalExpressions)."""
    return analyze_speech_structure(segments)


def step_generate_json(
    video_id: str,
    metadata: dict[str, Any],
    segments: list[dict[str, Any]],
    difficulty: str,
    vocabulary: list[dict[str, Any]],
    grammar: list[dict[str, Any]],
    connected_speech: list[dict[str, Any]],
    structure: dict[str, Any] | list[dict[str, Any]],
    category: str,
) -> dict[str, Any]:
    """Step 11: Generate final JSON output files.

    Creates files matching the frontend's expected structure:
      - {videoId}/meta.json
      - {videoId}/segments.json
      - {videoId}/vocabulary.json
      - {videoId}/grammar.json
      - {videoId}/connected_speech.json
      - {videoId}/structure.json
    """
    video_dir = get_video_dir(video_id)
    video_dir.mkdir(parents=True, exist_ok=True)

    # Calculate stats
    total_words = sum(len(seg["textEn"].split()) for seg in segments)
    speech_rate_wpm = 0
    duration = metadata.get("duration", 0)
    if duration > 0:
        speech_rate_wpm = round(total_words / (duration / 60))

    today = datetime.now().strftime("%Y-%m-%d")

    # structure.json - SpeechStructure object
    structure_data = {"sections": structure} if isinstance(structure, list) else structure
    description_ko = _extract_description_ko_from_structure(structure_data)
    structure_data, _ = _ensure_structure_description_ko(structure_data, description_ko)

    # meta.json - matches frontend VideoMeta type
    meta = {
        "videoId": video_id,
        "youtubeId": video_id,
        "title": metadata.get("title", ""),
        "channel": metadata.get("channel", ""),
        "categoryId": category,
        "difficulty": difficulty,
        "duration": duration,
        "thumbnail": metadata.get("thumbnail", ""),
        "speechRateWpm": speech_rate_wpm,
        "addedAt": today,
        "segmentCount": len(segments),
        "vocabularyCount": len(vocabulary),
        "grammarPatternCount": len(grammar),
    }
    if description_ko:
        meta["descriptionKo"] = description_ko
    save_json(video_dir / "meta.json", meta)

    # segments.json - matches frontend SegmentsData type
    segments_data = {
        "videoId": video_id,
        "segments": segments,
    }
    save_json(video_dir / "segments.json", segments_data)

    # vocabulary.json - array of VocabularyItem
    save_json(video_dir / "vocabulary.json", vocabulary)

    # grammar.json - array of GrammarPattern
    save_json(video_dir / "grammar.json", grammar)

    # connected_speech.json - array of ConnectedSpeech
    save_json(video_dir / "connected_speech.json", connected_speech)

    save_json(video_dir / "structure.json", structure_data)

    logger.info("Generated JSON files in %s", video_dir)
    return meta


def step_update_index(meta: dict[str, Any]) -> None:
    """Step 12: Update the videos.json index file.

    Adds or updates the video entry in the master index.
    """
    videos = load_videos_index(DATA_DIR)

    # Check if this video already exists in the index
    existing_idx = None
    for i, v in enumerate(videos):
        if v.get("videoId") == meta["videoId"]:
            existing_idx = i
            break

    # Build index entry matching frontend VideoEntry type
    index_entry = {
        "videoId": meta["videoId"],
        "youtubeId": meta.get("youtubeId", meta["videoId"]),
        "title": meta["title"],
        "channel": meta["channel"],
        "categoryId": meta.get("categoryId", meta.get("category", "")),
        "difficulty": meta["difficulty"],
        "duration": meta["duration"],
        "thumbnail": meta["thumbnail"],
        "speechRateWpm": meta.get("speechRateWpm", 0),
        "addedAt": meta.get("addedAt", datetime.now().strftime("%Y-%m-%d")),
    }
    if meta.get("descriptionKo"):
        index_entry["descriptionKo"] = meta["descriptionKo"]

    if existing_idx is not None:
        videos[existing_idx] = index_entry
        logger.info("Updated existing entry in videos.json")
    else:
        videos.append(index_entry)
        logger.info("Added new entry to videos.json")

    save_videos_index(videos)


# --- Validation ---


def validate_output(video_id: str) -> bool:
    """Validate that all required output files exist and are valid JSON.

    Args:
        video_id: The video ID to validate.

    Returns:
        True if all files are valid, False otherwise.
    """
    video_dir = get_video_dir(video_id)
    required_files = [
        "meta.json", "segments.json", "vocabulary.json",
        "grammar.json", "connected_speech.json", "structure.json",
    ]
    all_valid = True

    for filename in required_files:
        filepath = video_dir / filename
        if not filepath.exists():
            logger.error("MISSING: %s", filepath)
            all_valid = False
            continue

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            logger.error("INVALID JSON: %s - %s", filepath, e)
            all_valid = False
            continue

        # Basic content validation
        if filename == "meta.json":
            required_keys = ["videoId", "youtubeId", "title", "categoryId", "difficulty"]
            missing = [k for k in required_keys if k not in data]
            if missing:
                logger.error("meta.json missing keys: %s", missing)
                all_valid = False
            else:
                logger.info("OK: %s (videoId=%s)", filename, data.get("videoId"))

        elif filename == "segments.json":
            segments = data.get("segments", [])
            if not segments:
                logger.warning("segments.json has no segments")
            else:
                logger.info("OK: %s (%d segments)", filename, len(segments))
                first = segments[0]
                seg_keys = ["index", "start", "end", "textEn"]
                missing = [k for k in seg_keys if k not in first]
                if missing:
                    logger.error("First segment missing keys: %s", missing)
                    all_valid = False

        elif filename == "vocabulary.json":
            if isinstance(data, list):
                logger.info("OK: %s (%d items)", filename, len(data))
            else:
                logger.error("%s should be an array", filename)
                all_valid = False

        elif filename in ("grammar.json", "connected_speech.json"):
            if isinstance(data, list):
                logger.info("OK: %s (%d items)", filename, len(data))
            else:
                logger.error("%s should be an array", filename)
                all_valid = False

        elif filename == "structure.json":
            sections = data.get("sections", [])
            logger.info("OK: %s (%d sections)", filename, len(sections))

    # Check videos.json index
    videos = load_videos_index(DATA_DIR)
    found = any(v.get("videoId") == video_id for v in videos)
    if found:
        logger.info("OK: videos.json contains entry for %s", video_id)
    else:
        logger.warning("videos.json does NOT contain entry for %s", video_id)

    return all_valid


# --- Finalize (post-Claude Code) ---


def _run_finalize(
    video_id: str,
    category: str,
    difficulty_override: str | None = None,
) -> None:
    """Finalize after Claude Code has written analysis JSON files.

    Reads the already-written segments.json, vocabulary.json, etc.,
    generates meta.json, updates videos.json index, and cleans up
    intermediate files.
    """
    video_dir = get_video_dir(video_id)
    logger.info("Finalizing video: %s", video_id)

    # Load metadata from _raw_metadata.json (written by mechanical step)
    raw_meta = load_json(video_dir / "_raw_metadata.json")
    if raw_meta is None:
        logger.error("Missing _raw_metadata.json in %s", video_dir)
        sys.exit(1)

    # Load segments.json (written by Claude Code)
    segments_data = load_json(video_dir / "segments.json")
    if segments_data is None:
        logger.error("Missing segments.json in %s — Claude Code should have written this", video_dir)
        sys.exit(1)
    segments = segments_data.get("segments", [])

    # Load analysis files (written by Claude Code)
    vocabulary = load_json(video_dir / "vocabulary.json") or []
    grammar = load_json(video_dir / "grammar.json") or []
    structure_data = load_json(video_dir / "structure.json") or {}
    existing_meta = load_json(video_dir / "meta.json") or {}

    # Determine difficulty
    difficulty = difficulty_override or "intermediate"
    if not difficulty_override:
        # Try to read from segments_data if Claude Code set it
        difficulty = segments_data.get("difficulty", difficulty)

    # Calculate stats based on language
    duration = raw_meta.get("duration", 0)
    today = datetime.now().strftime("%Y-%m-%d")
    description_ko = _trim_description(segments_data.get("descriptionKo", ""))
    if not description_ko:
        description_ko = _trim_description(existing_meta.get("descriptionKo", ""))
    if not description_ko:
        description_ko = _extract_description_ko_from_structure(structure_data)
    structure_data, structure_updated = _ensure_structure_description_ko(structure_data, description_ko)
    if structure_updated:
        save_json(video_dir / "structure.json", structure_data)

    # Language-specific speed metric
    lang = DATA_DIR.parent.parent.name  # infer from path: apps/{lang}/public/data
    lang_code = {"english": "en", "chinese": "zh", "japanese": "ja"}.get(lang, "en")

    if lang_code == "zh":
        # Chinese: characters per minute (CPM)
        total_chars = sum(len(seg.get("textZh", "").replace(" ", "")) for seg in segments)
        speech_rate = round(total_chars / (duration / 60)) if duration > 0 else 0
        speech_rate_key = "speechRateCpm"
    elif lang_code == "ja":
        # Japanese: morae per minute (MPM) - approximate by character count
        total_chars = sum(len(seg.get("textJa", "").replace(" ", "")) for seg in segments)
        speech_rate = round(total_chars / (duration / 60)) if duration > 0 else 0
        speech_rate_key = "speechRateMpm"
    else:
        # English: words per minute (WPM)
        total_words = sum(len(seg.get("textEn", "").split()) for seg in segments)
        speech_rate = round(total_words / (duration / 60)) if duration > 0 else 0
        speech_rate_key = "speechRateWpm"

    # Generate meta.json
    meta = {
        "videoId": video_id,
        "youtubeId": video_id,
        "title": raw_meta.get("title", ""),
        "channel": raw_meta.get("channel", ""),
        "categoryId": category,
        "difficulty": difficulty,
        "duration": duration,
        "thumbnail": raw_meta.get("thumbnail", ""),
        speech_rate_key: speech_rate,
        "speechRateWpm": speech_rate if lang_code == "en" else 0,
        "addedAt": today,
        "segmentCount": len(segments),
        "vocabularyCount": len(vocabulary) if isinstance(vocabulary, list) else 0,
        "grammarPatternCount": len(grammar) if isinstance(grammar, list) else 0,
    }
    if description_ko:
        meta["descriptionKo"] = description_ko
    save_json(video_dir / "meta.json", meta)

    # Update videos.json index
    step_update_index(meta)

    # Clean up intermediate files
    for temp_file in ["_raw_metadata.json", "_raw_segments.json",
                      "_clean_segments.json", "_translated_segments.json"]:
        temp_path = video_dir / temp_file
        if temp_path.exists():
            temp_path.unlink()
            logger.debug("Cleaned up intermediate: %s", temp_path)

    # Clean up temp audio
    audio_file = TEMP_DIR / f"{video_id}.mp3"
    if audio_file.exists():
        audio_file.unlink()
        logger.info("Cleaned up temp audio: %s", audio_file)

    logger.info("Generated meta.json and updated videos.json for %s", video_id)
    logger.info("Output directory: %s", video_dir)


# --- Pipeline helpers ---


def _load_existing_state(
    video_id: str, category: str, difficulty: str
) -> dict[str, Any]:
    """Load existing data for single-step re-processing."""
    state: dict[str, Any] = {
        "metadata": {},
        "segments": [],
        "category": category,
        "difficulty": difficulty,
        "vocabulary": [],
        "grammar": [],
        "connected_speech": [],
        "structure": {"sections": [], "signalExpressions": []},
    }

    existing_meta = load_intermediate(video_id, "meta.json")
    if existing_meta:
        state["metadata"] = {
            "video_id": existing_meta.get("videoId", video_id),
            "title": existing_meta.get("title", ""),
            "channel": existing_meta.get("channel", ""),
            "duration": existing_meta.get("duration", 0),
            "thumbnail": existing_meta.get("thumbnail", ""),
            "upload_date": existing_meta.get("uploadDate", ""),
        }
        state["category"] = existing_meta.get(
            "categoryId", existing_meta.get("category", category)
        )
        state["difficulty"] = existing_meta.get("difficulty", difficulty)

    existing_transcript = load_intermediate(video_id, "segments.json")
    if existing_transcript:
        state["segments"] = existing_transcript.get("segments", [])

    existing_vocab = load_intermediate(video_id, "vocabulary.json")
    if existing_vocab and isinstance(existing_vocab, list):
        state["vocabulary"] = existing_vocab
    existing_grammar = load_intermediate(video_id, "grammar.json")
    if existing_grammar and isinstance(existing_grammar, list):
        state["grammar"] = existing_grammar
    existing_cs = load_intermediate(video_id, "connected_speech.json")
    if existing_cs and isinstance(existing_cs, list):
        state["connected_speech"] = existing_cs
    existing_struct = load_intermediate(video_id, "structure.json")
    if existing_struct:
        state["structure"] = (
            existing_struct.get("sections", [])
            if isinstance(existing_struct, dict)
            else existing_struct
        )

    return state


def _cleanup_intermediate(video_id: str) -> None:
    """Clean up intermediate and temp files after pipeline run."""
    audio_file = TEMP_DIR / f"{video_id}.mp3"
    if audio_file.exists():
        audio_file.unlink()
        logger.info("Cleaned up temp audio: %s", audio_file)

    for temp_file in [
        "_raw_metadata.json",
        "_raw_segments.json",
        "_clean_segments.json",
        "_translated_segments.json",
    ]:
        temp_path = get_video_dir(video_id) / temp_file
        if temp_path.exists():
            temp_path.unlink()
            logger.debug("Cleaned up intermediate: %s", temp_path)


# --- Main pipeline ---


def run_pipeline(
    url: str | None = None,
    category: str = "general",
    difficulty_override: str | None = None,
    title_override: str | None = None,
    video_id: str | None = None,
    single_step: str | None = None,
    translation_method: str = "claude",
    translation_model: str | None = None,
    batch_size: int = 10,
    do_validate: bool = False,
    mechanical_only: bool = False,
    finalize: bool = False,
    language: str = "en",
) -> None:
    """Run the full content processing pipeline.

    Args:
        url: YouTube video URL (required for new processing).
        category: Content category (e.g., speaking, grammar, listening).
        difficulty_override: Manual difficulty level override.
        title_override: Manual title override.
        video_id: Video ID for re-processing (loads existing data).
        single_step: Run only this specific step.
        translation_method: "claude" or "ollama".
        translation_model: Model override for translation.
        batch_size: Translation batch size.
        do_validate: Run validation after pipeline.
        mechanical_only: Run only mechanical steps 1-4 (no LLM calls).
        finalize: Generate meta.json and update index from existing analysis files.
    """
    pipeline_start = time.time()

    # Set DATA_DIR based on language
    global DATA_DIR, VIDEOS_INDEX_PATH
    DATA_DIR = get_data_dir(language)
    VIDEOS_INDEX_PATH = DATA_DIR / "videos.json"
    logger.info("Language: %s, Data dir: %s", language, DATA_DIR)

    # --- Finalize mode: generate meta.json + update index from existing files ---
    if finalize:
        if video_id is None:
            logger.error("--video-id is required for --finalize")
            sys.exit(1)
        _run_finalize(video_id, category, difficulty_override)
        total_time = time.time() - pipeline_start
        logger.info("Finalize complete for %s in %.1fs", video_id, total_time)
        return

    # Resolve video_id
    if video_id is None and url is not None:
        video_id = extract_video_id_from_url(url)
    if video_id is None and url is not None:
        # Will be resolved after metadata extraction
        pass
    if video_id is None and url is None:
        logger.error("Either --url or --video-id must be provided")
        sys.exit(1)

    # Determine which steps to run
    if mechanical_only:
        mechanical_steps = [
            "extract_metadata", "download_audio", "transcribe", "clean_segments",
        ]
        steps_to_run = set(mechanical_steps)
        logger.info("Mechanical-only mode: running steps 1-4")
    elif single_step:
        if single_step not in PIPELINE_STEPS:
            logger.error(
                "Unknown step: '%s'. Valid steps: %s",
                single_step,
                ", ".join(PIPELINE_STEPS),
            )
            sys.exit(1)
        steps_to_run = {single_step}
        logger.info("Running single step: %s", single_step)
    else:
        steps_to_run = set(PIPELINE_STEPS)

    total_steps = len(steps_to_run)
    current_step = 0

    # --- State variables ---
    metadata: dict[str, Any] = {}
    audio_path: str = ""
    raw_segments: list[dict[str, Any]] = []
    segments: list[dict[str, Any]] = []
    difficulty: str = difficulty_override or "intermediate"
    vocabulary: list[dict[str, Any]] = []
    grammar: list[dict[str, Any]] = []
    connected_speech: list[dict[str, Any]] = []
    structure: dict[str, Any] | list[dict[str, Any]] = {"sections": [], "signalExpressions": []}
    meta_output: dict[str, Any] = {}

    # --- Load existing state for single-step re-processing ---
    if single_step and video_id:
        logger.info("Loading existing data for video: %s", video_id)
        state = _load_existing_state(video_id, category, difficulty)
        metadata = state["metadata"]
        segments = state["segments"]
        category = state["category"]
        difficulty = state["difficulty"]
        vocabulary = state["vocabulary"]
        grammar = state["grammar"]
        connected_speech = state["connected_speech"]
        structure = state["structure"]

    # === STEP 1: Extract metadata ===
    if "extract_metadata" in steps_to_run:
        current_step += 1
        with StepTimer("Extract metadata", current_step, total_steps):
            if url is None:
                logger.error("URL required for metadata extraction")
                sys.exit(1)
            metadata = step_extract_metadata(url)
            if video_id is None:
                video_id = metadata["video_id"]
            if title_override:
                metadata["title"] = title_override
            # Save metadata early
            save_intermediate(video_id, "_raw_metadata.json", metadata)
    elif not metadata and video_id:
        # Try to load from disk
        existing = load_intermediate(video_id, "meta.json")
        if existing:
            metadata = {
                "video_id": existing.get("videoId", video_id),
                "title": existing.get("title", ""),
                "channel": existing.get("channel", ""),
                "duration": existing.get("duration", 0),
                "thumbnail": existing.get("thumbnail", ""),
                "upload_date": existing.get("uploadDate", ""),
            }

    if video_id is None:
        logger.error("Could not determine video ID")
        sys.exit(1)

    logger.info("Processing video: %s (%s)", video_id, metadata.get("title", ""))

    # === STEP 2: Download audio ===
    if "download_audio" in steps_to_run:
        current_step += 1
        with StepTimer("Download audio", current_step, total_steps):
            if url is None:
                logger.error("URL required for audio download")
                sys.exit(1)
            audio_path = step_download_audio(url, video_id)

    # === STEP 3: Transcribe ===
    if "transcribe" in steps_to_run:
        current_step += 1
        with StepTimer("Transcribe audio", current_step, total_steps):
            if not audio_path:
                # Try to find the audio file
                candidate = TEMP_DIR / f"{video_id}.mp3"
                if candidate.exists():
                    audio_path = str(candidate)
                else:
                    logger.error(
                        "Audio file not found. Run download_audio step first."
                    )
                    sys.exit(1)
            raw_segments = step_transcribe(audio_path, language=language)
            save_intermediate(video_id, "_raw_segments.json", raw_segments)

    # === STEP 4: Clean segments ===
    if "clean_segments" in steps_to_run:
        current_step += 1
        with StepTimer("Clean and merge segments", current_step, total_steps):
            if not raw_segments:
                raw_segments = load_intermediate(video_id, "_raw_segments.json") or []
            if not raw_segments:
                logger.error("No raw segments found. Run transcribe step first.")
                sys.exit(1)
            segments = step_clean_segments(raw_segments, language=language)
            save_intermediate(video_id, "_clean_segments.json", segments)

    # Load segments if needed for subsequent steps
    if not segments and video_id:
        segments = load_intermediate(video_id, "_clean_segments.json") or []
        if not segments:
            existing_transcript = load_intermediate(video_id, "segments.json")
            if existing_transcript:
                segments = existing_transcript.get("segments", [])

    if not segments and any(
        s in steps_to_run
        for s in [
            "translate",
            "estimate_difficulty",
            "extract_vocabulary",
            "analyze_grammar",
            "analyze_connected_speech",
            "analyze_structure",
            "generate_json",
        ]
    ):
        logger.error("No segments available. Run transcribe/clean_segments first.")
        sys.exit(1)

    # === STEP 5: Translate ===
    if "translate" in steps_to_run:
        current_step += 1
        with StepTimer("Translate segments", current_step, total_steps):
            segments = step_translate(
                segments,
                method=translation_method,
                model=translation_model,
                batch_size=batch_size,
            )
            save_intermediate(video_id, "_translated_segments.json", segments)

    # === STEP 6: Estimate difficulty ===
    if "estimate_difficulty" in steps_to_run:
        current_step += 1
        with StepTimer("Estimate difficulty", current_step, total_steps):
            duration = metadata.get("duration", 0)
            difficulty = step_estimate_difficulty(
                segments, duration, override=difficulty_override
            )

    # === STEP 7: Extract vocabulary ===
    if "extract_vocabulary" in steps_to_run:
        current_step += 1
        with StepTimer("Extract vocabulary", current_step, total_steps):
            vocabulary = step_extract_vocabulary(segments)

    # === STEP 8: Analyze grammar ===
    if "analyze_grammar" in steps_to_run:
        current_step += 1
        with StepTimer("Analyze grammar patterns", current_step, total_steps):
            grammar = step_analyze_grammar(segments)

    # === STEP 9: Analyze connected speech ===
    if "analyze_connected_speech" in steps_to_run:
        current_step += 1
        with StepTimer("Analyze connected speech", current_step, total_steps):
            connected_speech = step_analyze_connected_speech(segments)

    # === STEP 10: Analyze structure ===
    if "analyze_structure" in steps_to_run:
        current_step += 1
        with StepTimer("Analyze speech structure", current_step, total_steps):
            structure = step_analyze_structure(segments)

    # === STEP 11: Generate JSON ===
    if "generate_json" in steps_to_run:
        current_step += 1
        with StepTimer("Generate JSON files", current_step, total_steps):
            meta_output = step_generate_json(
                video_id=video_id,
                metadata=metadata,
                segments=segments,
                difficulty=difficulty,
                vocabulary=vocabulary,
                grammar=grammar,
                connected_speech=connected_speech,
                structure=structure,
                category=category,
            )

    # === STEP 12: Update index ===
    if "update_index" in steps_to_run:
        current_step += 1
        with StepTimer("Update videos.json index", current_step, total_steps):
            if not meta_output:
                # Load from generated file
                meta_output = load_intermediate(video_id, "meta.json") or {}
            if meta_output:
                step_update_index(meta_output)
            else:
                logger.error(
                    "No meta output available. Run generate_json step first."
                )

    # === Cleanup temp files ===
    # Skip cleanup in mechanical_only mode (Claude Code needs intermediate files)
    if not single_step and not mechanical_only:
        _cleanup_intermediate(video_id)

    # === Validation ===
    if do_validate:
        logger.info("=" * 50)
        logger.info("Validating output...")
        is_valid = validate_output(video_id)
        if is_valid:
            logger.info("Validation PASSED")
        else:
            logger.error("Validation FAILED")

    # === Summary ===
    total_time = time.time() - pipeline_start
    logger.info("=" * 50)
    logger.info(
        "Pipeline complete for %s in %.1fs",
        video_id,
        total_time,
    )
    logger.info("Output directory: %s", get_video_dir(video_id))

    if mechanical_only:
        video_dir = get_video_dir(video_id)
        logger.info("--- Mechanical-only output ---")
        logger.info("video_id: %s", video_id)
        logger.info("metadata: %s", video_dir / "_raw_metadata.json")
        logger.info("clean_segments: %s", video_dir / "_clean_segments.json")


# --- CLI ---


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Process YouTube videos into English learning content.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process a new video
  python process_video.py --url "https://youtube.com/watch?v=abc123" --category speaking

  # Process with manual difficulty
  python process_video.py --url "..." --category grammar --difficulty intermediate

  # Re-run only the translation step
  python process_video.py --video-id abc123 --step translate

  # Process and validate output
  python process_video.py --url "..." --category listening --validate

  # Use ollama for translation instead of Claude
  python process_video.py --url "..." --category speaking --translation-method ollama

  # Agentic workflow: mechanical steps only (for Claude Code orchestration)
  python process_video.py --url "..." --category motivation --mechanical-only

  # Agentic workflow: finalize after Claude Code writes analysis files
  python process_video.py --video-id abc123 --finalize --category motivation --difficulty intermediate

Available steps:
  extract_metadata, download_audio, transcribe, clean_segments,
  translate, estimate_difficulty, extract_vocabulary, analyze_grammar,
  analyze_connected_speech, analyze_structure, generate_json, update_index
""",
    )

    parser.add_argument(
        "--url",
        type=str,
        help="YouTube video URL",
    )
    parser.add_argument(
        "--category",
        type=str,
        default="general",
        help="Content category (e.g., speaking, grammar, listening, vocabulary)",
    )
    parser.add_argument(
        "--difficulty",
        type=str,
        choices=[
            "beginner",
            "elementary",
            "intermediate",
            "upper-intermediate",
            "advanced",
        ],
        help="Manual difficulty level override (skips auto-detection)",
    )
    parser.add_argument(
        "--title",
        type=str,
        help="Manual title override",
    )
    parser.add_argument(
        "--video-id",
        type=str,
        help="Video ID for re-processing existing content",
    )
    parser.add_argument(
        "--step",
        type=str,
        choices=PIPELINE_STEPS,
        help="Run only a specific pipeline step",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate output files after processing",
    )
    parser.add_argument(
        "--translation-method",
        type=str,
        choices=["claude", "ollama"],
        default="claude",
        help="Translation backend (default: claude)",
    )
    parser.add_argument(
        "--translation-model",
        type=str,
        help="Model override for translation",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=10,
        help="Number of segments per translation batch (default: 10)",
    )
    parser.add_argument(
        "--mechanical-only",
        action="store_true",
        help="Run only mechanical steps (1-4: metadata, download, transcribe, clean). "
             "Stops before LLM-dependent steps. For Claude Code agentic workflow.",
    )
    parser.add_argument(
        "--finalize",
        action="store_true",
        help="Finalize after Claude Code has written analysis files. "
             "Generates meta.json and updates videos.json index.",
    )
    parser.add_argument(
        "--language",
        type=str,
        choices=["en", "zh", "ja"],
        default="en",
        help="Target language (en=English, zh=Chinese, ja=Japanese, default: en)",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose/debug logging",
    )

    args = parser.parse_args()

    # Validation
    if args.mechanical_only and args.finalize:
        parser.error("--mechanical-only and --finalize are mutually exclusive")

    if args.finalize and not args.video_id:
        parser.error("--video-id is required when using --finalize")

    if args.finalize and args.step:
        parser.error("--finalize and --step are mutually exclusive")

    if args.mechanical_only and args.step:
        parser.error("--mechanical-only and --step are mutually exclusive")

    if not args.url and not args.video_id:
        parser.error("Either --url or --video-id is required")

    if args.step and not args.video_id and not args.url:
        parser.error("--video-id or --url is required when using --step")

    return args


def main() -> None:
    """Entry point for the CLI."""
    args = parse_args()

    # Configure logging
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    logger.info("stdyEng Content Pipeline")
    logger.info("=" * 50)

    # --validate + --video-id (no --url, no other flags) → validate only
    if (args.validate and args.video_id and not args.url
            and not args.step and not args.mechanical_only and not args.finalize):
        is_valid = validate_output(args.video_id)
        if is_valid:
            logger.info("Validation PASSED")
        else:
            logger.error("Validation FAILED")
            sys.exit(1)
        return

    run_pipeline(
        url=args.url,
        category=args.category,
        difficulty_override=args.difficulty,
        title_override=args.title,
        video_id=args.video_id,
        single_step=args.step,
        translation_method=args.translation_method,
        translation_model=args.translation_model,
        batch_size=args.batch_size,
        do_validate=args.validate,
        mechanical_only=args.mechanical_only,
        finalize=args.finalize,
        language=args.language,
    )


if __name__ == "__main__":
    main()
