#!/usr/bin/env python3
"""Generate Instagram Reels from video segments with bilingual subtitles.

Downloads the source video via yt-dlp, extracts a clip based on segment
timestamps, crops to 9:16, and overlays bilingual ASS subtitles with
an outro CTA.

Usage:
    python3 pipeline/instagram/generate_reel.py --video-id LNHBMFCzznE --start-segment 1 --end-segment 4
    python3 pipeline/instagram/generate_reel.py --video-id LNHBMFCzznE --start-segment 1 --end-segment 4 --output-dir pipeline/instagram/output/test_reel
    python3 pipeline/instagram/generate_reel.py --from-candidates
"""

import argparse
import logging
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from pipeline.utils import load_json, save_json
from pipeline.instagram.templates import (
    OUTPUT_DIR, FONTS_DIR, FONT_BOLD, FONT_SEMIBOLD,
    REEL_SUB_EN_MARGIN_V, REEL_SUB_KO_MARGIN_V, REEL_HEADLINE_MARGIN_V,
    REEL_SUB_EN_FONTSIZE, REEL_SUB_KO_FONTSIZE, REEL_HEADLINE_FONTSIZE,
    REEL_COUNTDOWN_MARGIN_V, REEL_COUNTDOWN_FONTSIZE,
    REEL_SERIES_TITLE_MARGIN_V, REEL_SERIES_TITLE_FONTSIZE,
    REEL_BRAND_MARGIN_V, REEL_BRAND_FONTSIZE,
    BRAND_NAME, BRAND_TAGLINE, ACCENT_YELLOW,
)

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

DATA_DIR = PROJECT_ROOT / "apps" / "english" / "public" / "data"
TMP_DIR = PROJECT_ROOT / "pipeline" / ".tmp"
CANDIDATES_PATH = TMP_DIR / "instagram_candidates.json"

# Reel specs
REEL_WIDTH = 1080
REEL_HEIGHT = 1920


def probe_video(path: Path) -> tuple[int, int]:
    """Probe video dimensions. Returns (width, height)."""
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_streams", str(path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    import json
    data = json.loads(result.stdout)
    for s in data["streams"]:
        if s["codec_type"] == "video":
            return int(s["width"]), int(s["height"])
    raise RuntimeError(f"No video stream found in {path}")


def get_cached_video(video_id: str) -> Path:
    """Download video via yt-dlp if not cached. Returns path to mp4."""
    cache_dir = TMP_DIR / "video_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    cached = cache_dir / f"{video_id}.mp4"
    if cached.exists():
        logger.info("Using cached video: %s", cached)
        return cached

    url = f"https://www.youtube.com/watch?v={video_id}"
    logger.info("Downloading video: %s", url)
    cmd = [
        "yt-dlp",
        "-f", "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best",
        "--merge-output-format", "mp4",
        "-o", str(cached),
        url,
    ]
    subprocess.run(cmd, check=True, capture_output=True, text=True)
    logger.info("Downloaded: %s", cached)
    return cached


def load_segments(video_id: str) -> list[dict]:
    """Load segments for a video."""
    seg_path = DATA_DIR / video_id / "segments.json"
    data = load_json(seg_path)
    if not data:
        raise FileNotFoundError(f"No segments.json for {video_id}")
    if isinstance(data, dict) and "segments" in data:
        return data["segments"]
    if isinstance(data, list):
        return data
    raise ValueError(f"Unexpected segments.json format for {video_id}")


def get_video_meta(video_id: str) -> dict:
    """Load video metadata from videos.json index."""
    from pipeline.utils import load_videos_index
    videos = load_videos_index(DATA_DIR)
    for v in videos:
        if v["videoId"] == video_id:
            return v
    return {"title": "", "channel": ""}


def get_speaker_name(video: dict) -> str:
    title = video.get("title", "")
    parts = title.split("|")
    if len(parts) >= 2:
        return parts[-2].strip()
    parts = title.split(" - ")
    if len(parts) >= 2:
        return parts[-1].strip()
    return video.get("channel", "")


def generate_ass_subtitles(
    segments: list[dict],
    start_offset: float,
    clip_duration: float,
    headline: str | None = None,
) -> str:
    """Generate ASS for 2-pass reel: 1st pass (countdown, no subs) + 2nd pass (with subs).

    Total duration = clip_duration * 2.
    Pass 1 (0 → clip_duration): headline + countdown timer, no subtitles.
    Pass 2 (clip_duration → 2*clip_duration): headline + bilingual subtitles.
    """
    font_name = "Pretendard Bold"
    font_semibold = "Pretendard SemiBold"
    total_duration = clip_duration * 2

    styles = [
        f"Style: English,{font_name},{REEL_SUB_EN_FONTSIZE},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,8,60,60,{REEL_SUB_EN_MARGIN_V},1",
        f"Style: Korean,{font_semibold},{REEL_SUB_KO_FONTSIZE},&H0042C5F5,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,8,60,60,{REEL_SUB_KO_MARGIN_V},1",
        f"Style: Headline,{font_name},{REEL_HEADLINE_FONTSIZE},&H00FFFFFF,&H000000FF,&H00000000,&HC0000000,-1,0,0,0,100,100,0,0,1,4,2,8,80,80,{REEL_HEADLINE_MARGIN_V},1",
        f"Style: Countdown,{font_semibold},{REEL_COUNTDOWN_FONTSIZE},&H0042C5F5,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,8,60,60,{REEL_COUNTDOWN_MARGIN_V},1",
        f"Style: Brand,{font_semibold},{REEL_BRAND_FONTSIZE},&H00A0A0A0,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,8,60,60,{REEL_BRAND_MARGIN_V},1",
        f"Style: SeriesTitle,{font_name},{REEL_SERIES_TITLE_FONTSIZE},&H0014FF39,&H000000FF,&H00000000,&HC0000000,-1,0,0,0,100,100,0,0,1,4,2,8,80,80,{REEL_SERIES_TITLE_MARGIN_V},1",
    ]

    header = f"""[Script Info]
Title: Reel Subtitles
ScriptType: v4.00+
PlayResX: {REEL_WIDTH}
PlayResY: {REEL_HEIGHT}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
{chr(10).join(styles)}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    events = []

    # Series title: "일일 쉐도잉" shown for the entire duration
    end_ts = _format_ass_time(total_duration)
    events.append(
        f"Dialogue: 2,0:00:00.00,{end_ts},SeriesTitle,,0,0,0,,일일 쉐도잉"
    )

    # Headline: shown for the entire 2-pass duration
    if headline:
        events.append(
            f"Dialogue: 1,0:00:00.00,{end_ts},Headline,,0,0,0,,{headline}"
        )

    # Brand tagline + CTA: shown for the entire duration at bottom
    brand_text = f"{BRAND_NAME}  —  {BRAND_TAGLINE}\\N▼ 내용 하단 캡션 확인"
    end_ts = _format_ass_time(total_duration)
    events.append(
        f"Dialogue: 0,0:00:00.00,{end_ts},Brand,,0,0,0,,{brand_text}"
    )

    # Both passes: English subtitles throughout
    for seg in segments:
        seg_start = seg["start"] - start_offset
        seg_end = seg["end"] - start_offset
        if seg_start < 0:
            seg_start = 0
        en_text = seg.get("textEn", "")
        if en_text:
            # Pass 1
            events.append(
                f"Dialogue: 0,{_format_ass_time(seg_start)},{_format_ass_time(seg_end)},English,,0,0,0,,{en_text}"
            )
            # Pass 2
            events.append(
                f"Dialogue: 0,{_format_ass_time(seg_start + clip_duration)},{_format_ass_time(seg_end + clip_duration)},English,,0,0,0,,{en_text}"
            )

    # Pass 1: Countdown timer (1-second intervals)
    remaining = int(clip_duration)
    for sec in range(remaining):
        t_start = _format_ass_time(sec)
        t_end = _format_ass_time(sec + 1)
        left = remaining - sec
        events.append(
            f"Dialogue: 2,{t_start},{t_end},Countdown,,0,0,0,,{left}초 뒤 자막"
        )

    # Pass 2: Korean subtitles (only in 2nd pass)
    for seg in segments:
        seg_start = seg["start"] - start_offset + clip_duration
        seg_end = seg["end"] - start_offset + clip_duration
        if seg_start < clip_duration:
            seg_start = clip_duration
        ko_text = seg.get("textKo", "")
        if ko_text:
            events.append(
                f"Dialogue: 0,{_format_ass_time(seg_start)},{_format_ass_time(seg_end)},Korean,,0,0,0,,{ko_text}"
            )

    return header + "\n".join(events) + "\n"


def _format_ass_time(seconds: float) -> str:
    """Format seconds as ASS timestamp H:MM:SS.CC."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int((seconds % 1) * 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def generate_reel(
    video_id: str,
    start_segment: int,
    end_segment: int,
    output_dir: Path | None = None,
    headline: str | None = None,
) -> dict:
    """Generate a reel clip from video segments.

    Returns dict with path to generated clip.mp4.
    """
    segments = load_segments(video_id)
    video_meta = get_video_meta(video_id)
    speaker = get_speaker_name(video_meta)

    # Validate segment range
    if start_segment < 0 or end_segment >= len(segments):
        raise ValueError(
            f"Segment range {start_segment}-{end_segment} out of bounds "
            f"(max {len(segments) - 1})"
        )

    clip_segments = segments[start_segment:end_segment + 1]
    clip_start = clip_segments[0]["start"]
    clip_end = clip_segments[-1]["end"]
    clip_duration = clip_end - clip_start

    logger.info(
        "Generating reel: %s segments %d-%d (%.1fs - %.1fs = %.1fs)",
        video_id, start_segment, end_segment, clip_start, clip_end, clip_duration,
    )

    # Download source video
    source_video = get_cached_video(video_id)

    # Prepare output
    if output_dir is None:
        output_dir = OUTPUT_DIR / f"reel_{video_id}_{start_segment}_{end_segment}"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "clip.mp4"

    # Generate ASS subtitles for 2-pass structure
    ass_content = generate_ass_subtitles(
        clip_segments, clip_start, clip_duration, headline,
    )
    ass_path = output_dir / "subtitles.ass"
    ass_path.write_text(ass_content, encoding="utf-8")

    ass_escaped = str(ass_path).replace(":", "\\:").replace("'", "\\'")

    # Video filter: scale → pad to 9:16
    vf_scale_pad = (
        f"scale={REEL_WIDTH}:-2:force_original_aspect_ratio=decrease,"
        f"pad={REEL_WIDTH}:{REEL_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black"
    )

    # Step 1: Extract raw clip (no subtitles)
    raw_clip = output_dir / "_raw.mp4"
    trim_vf = f"trim=start={clip_start}:end={clip_end},setpts=PTS-STARTPTS,{vf_scale_pad}"
    trim_af = f"atrim=start={clip_start}:end={clip_end},asetpts=PTS-STARTPTS"
    cmd_raw = [
        "ffmpeg", "-y",
        "-i", str(source_video),
        "-vf", trim_vf,
        "-af", trim_af,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-r", "30",
        str(raw_clip),
    ]
    logger.info("Extracting raw clip (%.2fs → %.2fs)...", clip_start, clip_end)
    subprocess.run(cmd_raw, check=True, capture_output=True, text=True)

    # Step 2: Concat raw clip × 2 (pass 1 + pass 2)
    double_clip = output_dir / "_double.mp4"
    concat_file = output_dir / "_concat.txt"
    concat_file.write_text(
        f"file '{raw_clip.resolve()}'\nfile '{raw_clip.resolve()}'\n"
    )
    cmd_concat = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(concat_file),
        "-c", "copy",
        str(double_clip),
    ]
    logger.info("Concatenating 2 passes...")
    subprocess.run(cmd_concat, check=True, capture_output=True, text=True)

    # Step 3: Apply ASS overlay (headline + countdown + subtitles)
    cmd_overlay = [
        "ffmpeg", "-y",
        "-i", str(double_clip),
        "-vf", f"ass='{ass_escaped}'",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "copy",
        str(output_path),
    ]
    logger.info("Applying subtitles overlay...")
    subprocess.run(cmd_overlay, check=True, capture_output=True, text=True)

    # Cleanup
    for tmp in [raw_clip, double_clip, concat_file, ass_path]:
        if tmp.exists():
            tmp.unlink()

    total_duration = clip_duration * 2
    logger.info("Reel saved: %s (%.1fs = %.1fs × 2 passes)", output_path, total_duration, clip_duration)

    return {
        "clip_path": str(output_path),
        "video_id": video_id,
        "start_segment": start_segment,
        "end_segment": end_segment,
        "duration": total_duration,
        "speaker": speaker,
    }


def _escape_ffmpeg_text(text: str) -> str:
    """Escape special chars for ffmpeg drawtext filter."""
    return (
        text
        .replace("\\", "\\\\")
        .replace("'", "'\\''")
        .replace(":", "\\:")
        .replace("%", "%%")
    )


def generate_from_candidates(candidates_path: Path = CANDIDATES_PATH) -> list[dict]:
    """Generate reels for reel-type candidates."""
    candidates = load_json(candidates_path)
    if not candidates:
        logger.info("No candidates found")
        return []

    results = []
    for c in candidates:
        if c.get("type") != "reel":
            continue
        vid = c["video_id"]
        start = c.get("startSegment", 0)
        end = c.get("endSegment", start + 5)
        out_dir = OUTPUT_DIR / f"reel_{vid}_{start}_{end}"
        try:
            result = generate_reel(vid, start, end, out_dir)
            results.append(result)
        except Exception as e:
            logger.error("Failed reel for %s: %s", vid, e)

    return results


def main():
    parser = argparse.ArgumentParser(description="Generate Instagram Reels")
    parser.add_argument("--video-id", help="YouTube video ID")
    parser.add_argument("--start-segment", type=int, help="Start segment index")
    parser.add_argument("--end-segment", type=int, help="End segment index")
    parser.add_argument("--headline", help="Korean headline text for top overlay")
    parser.add_argument("--output-dir", help="Output directory")
    parser.add_argument("--from-candidates", action="store_true",
                        help="Generate from instagram_candidates.json")
    args = parser.parse_args()

    if args.from_candidates:
        results = generate_from_candidates()
        logger.info("Generated %d reels", len(results))
    elif args.video_id and args.start_segment is not None and args.end_segment is not None:
        out_dir = Path(args.output_dir) if args.output_dir else None
        result = generate_reel(
            args.video_id, args.start_segment, args.end_segment,
            out_dir, args.headline,
        )
        logger.info("Generated: %s", result)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
