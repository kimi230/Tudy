#!/usr/bin/env python3
"""Generate Instagram feed and story images for vocabulary, grammar, and pronunciation cards.

Usage:
    python3 pipeline/instagram/generate_image.py --type vocabulary --video-id LNHBMFCzznE --item-index 0 --output-dir pipeline/instagram/output/test
    python3 pipeline/instagram/generate_image.py --from-queue
    python3 pipeline/instagram/generate_image.py --from-candidates  # reads pipeline/.tmp/instagram_candidates.json
"""

import argparse
import logging
import sys
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from pipeline.utils import load_json, save_json
from pipeline.instagram.templates import (
    FONTS_DIR, OUTPUT_DIR, FEED_SIZE, STORY_SIZE,
    BG_PRIMARY, BG_CARD, BG_GRADIENT_BOTTOM,
    ACCENT_YELLOW, ACCENT_BLUE, ACCENT_GREEN, ACCENT_ORANGE, ACCENT_PURPLE,
    TEXT_WHITE, TEXT_LIGHT, TEXT_MUTED, TEXT_DIM,
    TYPE_COLORS, FONT_BOLD, FONT_SEMIBOLD,
    FONT_SIZES_FEED, FONT_SIZES_STORY,
    PADDING, PADDING_STORY, SECTION_GAP,
    BRAND_NAME, BRAND_CTA, BRAND_TAGLINE,
)

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

DATA_DIR = PROJECT_ROOT / "apps" / "english" / "public" / "data"
QUEUE_PATH = OUTPUT_DIR / "queue.json"
CANDIDATES_PATH = PROJECT_ROOT / "pipeline" / ".tmp" / "instagram_candidates.json"


# ── Font helpers ─────────────────────────────────────────────────────

_font_cache: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}


def get_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    """Load a font with caching."""
    key = (name, size)
    if key not in _font_cache:
        path = FONTS_DIR / name
        if path.exists():
            _font_cache[key] = ImageFont.truetype(str(path), size)
        else:
            logger.warning("Font not found: %s, using default", path)
            _font_cache[key] = ImageFont.load_default()
    return _font_cache[key]


def bold(size: int) -> ImageFont.FreeTypeFont:
    return get_font(FONT_BOLD, size)


def semi(size: int) -> ImageFont.FreeTypeFont:
    return get_font(FONT_SEMIBOLD, size)


# ── Drawing helpers ──────────────────────────────────────────────────

def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def draw_rounded_rect(draw: ImageDraw.ImageDraw, xy, radius: int, fill):
    """Draw a rounded rectangle."""
    x0, y0, x1, y1 = xy
    fill_rgb = hex_to_rgb(fill) if isinstance(fill, str) else fill
    draw.rounded_rectangle(xy, radius=radius, fill=fill_rgb)


def draw_text_wrapped(
    draw: ImageDraw.ImageDraw,
    text: str,
    x: int, y: int,
    font: ImageFont.FreeTypeFont,
    fill: str,
    max_width: int,
    line_spacing: float = 1.3,
) -> int:
    """Draw text with pixel-accurate word wrapping. Returns y position after text."""
    fill_rgb = hex_to_rgb(fill)
    words = text.split()
    lines = []
    current_line = ""

    for word in words:
        test = f"{current_line} {word}".strip()
        if font.getlength(test) <= max_width:
            current_line = test
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)

    current_y = y
    for line in lines:
        draw.text((x, current_y), line, font=font, fill=fill_rgb)
        bbox = font.getbbox(line)
        line_height = bbox[3] - bbox[1]
        current_y += int(line_height * line_spacing)

    return current_y


def draw_badge(
    draw: ImageDraw.ImageDraw,
    text: str,
    x: int, y: int,
    font: ImageFont.FreeTypeFont,
    bg_color: str,
    text_color: str = TEXT_WHITE,
) -> tuple[int, int]:
    """Draw a pill-shaped badge. Returns (right_x, bottom_y)."""
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad_x, pad_y = 16, 8
    rx = x + tw + pad_x * 2
    ry = y + th + pad_y * 2
    draw_rounded_rect(draw, (x, y, rx, ry), radius=th // 2 + pad_y, fill=bg_color)
    draw.text((x + pad_x, y + pad_y), text, font=font, fill=hex_to_rgb(text_color))
    return rx, ry


def draw_brand_footer(draw: ImageDraw.ImageDraw, width: int, height: int, sizes: dict):
    """Draw brand footer at bottom of card."""
    f = semi(sizes["brand"])
    draw.text(
        (PADDING, height - PADDING - 20),
        f"@{BRAND_NAME}  ·  {BRAND_CTA}",
        font=f, fill=hex_to_rgb(TEXT_DIM),
    )


def draw_slide_number(
    draw: ImageDraw.ImageDraw,
    current: int,
    total: int,
    width: int,
    sizes: dict,
):
    """Draw slide number indicator (e.g. '1/6') at top-right."""
    text = f"{current}/{total}"
    f = semi(sizes["label"])
    bbox = f.getbbox(text)
    tw = bbox[2] - bbox[0]
    draw.text(
        (width - PADDING - tw, PADDING),
        text, font=f, fill=hex_to_rgb(TEXT_MUTED),
    )


def draw_speaker_attribution(
    draw: ImageDraw.ImageDraw,
    speaker: str,
    title: str,
    x: int, y: int,
    sizes: dict,
    max_width: int,
) -> int:
    """Draw speaker name and talk title. Returns y after."""
    f_speaker = semi(sizes["speaker"])
    draw.text((x, y), f"— {speaker}", font=f_speaker, fill=hex_to_rgb(TEXT_MUTED))
    y += int(sizes["speaker"] * 1.4)
    # Truncate title if needed
    short_title = title[:60] + "..." if len(title) > 60 else title
    y = draw_text_wrapped(draw, short_title, x, y, semi(sizes["brand"]), TEXT_MUTED, max_width)
    return y


# ── Card generators ──────────────────────────────────────────────────

def generate_vocabulary_card(
    item: dict, video: dict, speaker: str, canvas_size: tuple[int, int],
) -> Image.Image:
    """Generate a vocabulary card image."""
    w, h = canvas_size
    is_story = canvas_size == STORY_SIZE
    pad = PADDING_STORY if is_story else PADDING
    sizes = FONT_SIZES_STORY if is_story else FONT_SIZES_FEED
    max_w = w - pad * 2

    img = Image.new("RGB", (w, h), hex_to_rgb(BG_PRIMARY))
    draw = ImageDraw.Draw(img)

    y = pad

    # Title: 일일 Vocabulary (same size as grammar title for consistency)
    y = draw_text_wrapped(draw, "일일 Vocabulary", pad, y, bold(sizes["word_main"]), ACCENT_ORANGE, max_w)
    y += SECTION_GAP * 2

    # Main word
    word = item.get("word", "")
    draw.text((pad, y), word, font=bold(sizes["word_main"]), fill=hex_to_rgb(TEXT_WHITE))
    y += int(sizes["word_main"] * 1.2)

    # Phonetic
    phonetic = item.get("phonetic", "")
    if phonetic:
        draw.text((pad, y), phonetic, font=semi(sizes["phonetic"]), fill=hex_to_rgb(TEXT_MUTED))
        y += int(sizes["phonetic"] * 1.5)

    # Part of speech
    pos = item.get("partOfSpeech", "")
    if pos:
        draw.text((pad, y), pos, font=semi(sizes["label"]), fill=hex_to_rgb(TEXT_DIM))
        y += int(sizes["label"] * 1.8)

    # Korean meaning (yellow)
    meaning = item.get("meaningKo", "")
    if meaning:
        y = draw_text_wrapped(draw, meaning, pad, y, bold(sizes["meaning_ko"]), ACCENT_YELLOW, max_w)
        y += SECTION_GAP // 2

    # Divider line
    draw.line([(pad, y), (w - pad, y)], fill=hex_to_rgb(TEXT_DIM), width=1)
    y += SECTION_GAP

    # Etymology / root breakdown
    root = item.get("rootBreakdown")
    if root and isinstance(root, dict):
        parts = []
        for key in ("prefix", "root", "suffix"):
            val = root.get(key)
            if val:
                parts.append(f"{key}: {val}")
        if parts:
            draw_badge(draw, "ETYMOLOGY", pad, y, semi(sizes["label"]), ACCENT_ORANGE)
            y += int(sizes["label"] * 2.5)
            for part in parts:
                y = draw_text_wrapped(draw, part, pad + 10, y, semi(sizes["etymology"]), TEXT_LIGHT, max_w - 10)
            y += SECTION_GAP // 2

    # Context sentence + Korean translation
    ctx = item.get("contextSentence", "")
    if ctx:
        # Draw quote block with left accent bar
        ex_en_font = semi(int(sizes["context"] * 1.5))   # 26→39 (feed)
        ex_ko_font = semi(int(sizes["context"] * 1.3))   # 26→33 (feed)
        draw.rectangle([(pad, y), (pad + 4, y + 80)], fill=hex_to_rgb(ACCENT_YELLOW))
        y = draw_text_wrapped(
            draw, f'"{ctx}"', pad + 20, y,
            ex_en_font, TEXT_LIGHT, max_w - 20,
        )
        ctx_ko = item.get("contextSentenceKo", "")
        if ctx_ko:
            y += 4
            y = draw_text_wrapped(draw, ctx_ko, pad + 20, y, ex_ko_font, ACCENT_YELLOW, max_w - 20)
        y += SECTION_GAP

    # Speaker attribution
    draw_speaker_attribution(draw, speaker, video.get("title", ""), pad, y, sizes, max_w)

    # Brand footer
    draw_brand_footer(draw, w, h, sizes)

    return img


def generate_grammar_card(
    item: dict, video: dict, speaker: str, canvas_size: tuple[int, int],
) -> Image.Image:
    """Generate a grammar pattern card image."""
    w, h = canvas_size
    is_story = canvas_size == STORY_SIZE
    pad = PADDING_STORY if is_story else PADDING
    sizes = FONT_SIZES_STORY if is_story else FONT_SIZES_FEED
    max_w = w - pad * 2

    img = Image.new("RGB", (w, h), hex_to_rgb(BG_PRIMARY))
    draw = ImageDraw.Draw(img)

    y = pad

    # Title: 일일 Grammar
    y = draw_text_wrapped(draw, "일일 Grammar", pad, y, bold(sizes["word_main"]), ACCENT_BLUE, max_w)
    y += SECTION_GAP * 2

    # Pattern (white, same size as vocabulary word_main)
    pattern = item.get("pattern", "")
    y = draw_text_wrapped(draw, pattern, pad, y, bold(sizes["word_main"]), TEXT_WHITE, max_w)
    y += SECTION_GAP * 2

    # Korean explanation (yellow — same size as vocabulary meaningKo)
    explanation_ko = item.get("explanationKo", "")
    if explanation_ko:
        y = draw_text_wrapped(draw, explanation_ko, pad, y, semi(sizes["meaning_ko"]), ACCENT_YELLOW, max_w)
        y += SECTION_GAP * 2

    # Divider
    draw.line([(pad, y), (w - pad, y)], fill=hex_to_rgb(TEXT_DIM), width=1)
    y += SECTION_GAP * 2

    # Examples with Korean translations
    # examples can be list[str] or list[dict] with {text, textKo}
    examples_raw = item.get("examples", [])
    examples_ko = item.get("examplesKo", [])
    ex_en_font = semi(int(sizes["context"] * 1.5))
    ex_ko_font = semi(int(sizes["context"] * 1.3))
    for i, ex in enumerate(examples_raw[:3]):
        # Normalize: dict → extract text/textKo, str → use as-is
        if isinstance(ex, dict):
            en_text = ex.get("text", "")
            ko_text = ex.get("textKo", "")
        else:
            en_text = str(ex)
            ko_text = examples_ko[i] if i < len(examples_ko) else ""
        draw.rectangle([(pad, y), (pad + 4, y + 60)], fill=hex_to_rgb(ACCENT_BLUE))
        y = draw_text_wrapped(draw, f'"{en_text}"', pad + 20, y, ex_en_font, TEXT_LIGHT, max_w - 20)
        if ko_text:
            y += 4
            y = draw_text_wrapped(draw, ko_text, pad + 20, y, ex_ko_font, ACCENT_YELLOW, max_w - 20)
        y += SECTION_GAP

    y += SECTION_GAP

    # Speaker
    draw_speaker_attribution(draw, speaker, video.get("title", ""), pad, y, sizes, max_w)
    draw_brand_footer(draw, w, h, sizes)

    return img


def generate_pronunciation_card(
    item: dict, video: dict, speaker: str, canvas_size: tuple[int, int],
) -> Image.Image:
    """Generate a connected speech / pronunciation card image."""
    w, h = canvas_size
    is_story = canvas_size == STORY_SIZE
    pad = PADDING_STORY if is_story else PADDING
    sizes = FONT_SIZES_STORY if is_story else FONT_SIZES_FEED
    max_w = w - pad * 2

    img = Image.new("RGB", (w, h), hex_to_rgb(BG_PRIMARY))
    draw = ImageDraw.Draw(img)

    y = pad

    # Type badge
    cs_type = item.get("type", "reduction")
    badge_color = TYPE_COLORS.get(cs_type, ACCENT_GREEN)
    _, badge_bottom = draw_badge(
        draw, cs_type.upper(), pad, y, semi(sizes["type_badge"]), badge_color,
    )
    y = badge_bottom + SECTION_GAP

    # Original text
    original = item.get("originalText", "")
    y = draw_text_wrapped(draw, original, pad, y, bold(sizes["pattern"]), TEXT_WHITE, max_w)
    y += 10

    # Arrow → Korean phonetic (large, yellow)
    korean = item.get("koreanPhonetic", "")
    if korean:
        draw.text((pad, y), "→", font=bold(sizes["context"]), fill=hex_to_rgb(TEXT_MUTED))
        y += int(sizes["context"] * 1.3)
        draw.text((pad, y), korean, font=bold(sizes["korean_reading"]), fill=hex_to_rgb(ACCENT_YELLOW))
        y += int(sizes["korean_reading"] * 1.3)

    # IPA
    phonetic = item.get("phonetic", "")
    if phonetic:
        draw.text((pad, y), phonetic, font=semi(sizes["phonetic"]), fill=hex_to_rgb(TEXT_MUTED))
        y += int(sizes["phonetic"] * 1.8)

    # Divider
    draw.line([(pad, y), (w - pad, y)], fill=hex_to_rgb(TEXT_DIM), width=1)
    y += SECTION_GAP

    # Explanation (Korean)
    explanation_ko = item.get("explanationKo", "")
    if explanation_ko:
        y = draw_text_wrapped(draw, explanation_ko, pad, y, semi(sizes["explanation"]), TEXT_LIGHT, max_w)
        y += SECTION_GAP // 2

    # Practice guide (green accent)
    guide = item.get("practiceGuide", "")
    if guide:
        draw.rectangle([(pad, y), (pad + 4, y + 80)], fill=hex_to_rgb(ACCENT_GREEN))
        y = draw_text_wrapped(draw, guide, pad + 20, y, semi(sizes["etymology"]), ACCENT_GREEN, max_w - 20)
        y += SECTION_GAP

    # Speaker
    draw_speaker_attribution(draw, speaker, video.get("title", ""), pad, y, sizes, max_w)
    draw_brand_footer(draw, w, h, sizes)

    return img


# ── CTA slide ────────────────────────────────────────────────────────

def generate_cta_slide(
    speaker: str,
    video_title: str,
    canvas_size: tuple[int, int],
    slide_number: int | None = None,
    total_slides: int | None = None,
) -> Image.Image:
    """Generate a CTA slide promoting the Tudy learning platform."""
    w, h = canvas_size
    sizes = FONT_SIZES_FEED

    img = Image.new("RGB", (w, h), hex_to_rgb(BG_PRIMARY))
    draw = ImageDraw.Draw(img)

    # Slide number
    if slide_number and total_slides:
        draw_slide_number(draw, slide_number, total_slides, w, sizes)

    # Gradient-like effect: draw a subtle accent bar at top
    bar_h = 6
    draw.rectangle([(0, 0), (w, bar_h)], fill=hex_to_rgb(ACCENT_YELLOW))

    # Center content vertically
    center_y = h // 2 - 180

    # Platform name
    platform_font = bold(80)
    platform_text = "Tudy"
    bbox = platform_font.getbbox(platform_text)
    tw = bbox[2] - bbox[0]
    draw.text(
        ((w - tw) // 2, center_y),
        platform_text, font=platform_font, fill=hex_to_rgb(ACCENT_YELLOW),
    )
    center_y += 110

    # Tagline
    tagline_font = semi(sizes["meaning_ko"])
    tagline = BRAND_TAGLINE
    bbox = tagline_font.getbbox(tagline)
    tw = bbox[2] - bbox[0]
    draw.text(
        ((w - tw) // 2, center_y),
        tagline, font=tagline_font, fill=hex_to_rgb(TEXT_WHITE),
    )
    center_y += 80

    # Divider
    div_w = 200
    draw.line(
        [((w - div_w) // 2, center_y), ((w + div_w) // 2, center_y)],
        fill=hex_to_rgb(TEXT_DIM), width=2,
    )
    center_y += 40

    # Feature bullets
    features = [
        "무료 스터디 가이드 PDF",
        "핵심 어휘 · 문법 · 발음 정리",
        "TED · 동기부여 영상 영어 체화",
    ]
    for feat in features:
        f = semi(sizes["context"])
        bbox = f.getbbox(feat)
        tw = bbox[2] - bbox[0]
        # Bullet dot
        dot_x = (w - tw) // 2 - 24
        draw.text((dot_x, center_y), "·", font=f, fill=hex_to_rgb(ACCENT_YELLOW))
        draw.text(((w - tw) // 2, center_y), feat, font=f, fill=hex_to_rgb(TEXT_LIGHT))
        center_y += int(sizes["context"] * 1.8)

    center_y += 30

    # CTA button
    cta_text = "프로필 링크에서 시작하기 →"
    cta_font = bold(sizes["explanation"])
    bbox = cta_font.getbbox(cta_text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    btn_pad_x, btn_pad_y = 40, 18
    btn_w = tw + btn_pad_x * 2
    btn_h = th + btn_pad_y * 2
    btn_x = (w - btn_w) // 2
    draw_rounded_rect(
        draw,
        (btn_x, center_y, btn_x + btn_w, center_y + btn_h),
        radius=btn_h // 2,
        fill=ACCENT_YELLOW,
    )
    draw.text(
        (btn_x + btn_pad_x, center_y + btn_pad_y),
        cta_text, font=cta_font, fill=hex_to_rgb(BG_PRIMARY),
    )

    # Speaker attribution at bottom
    center_y = h - PADDING - 80
    attr_text = f"이 영상에서 배운 어휘입니다"
    f_attr = semi(sizes["brand"])
    bbox = f_attr.getbbox(attr_text)
    tw = bbox[2] - bbox[0]
    draw.text(((w - tw) // 2, center_y), attr_text, font=f_attr, fill=hex_to_rgb(TEXT_DIM))
    center_y += int(sizes["brand"] * 1.6)
    speaker_text = f"— {speaker}"
    f_speaker = semi(sizes["brand"])
    bbox = f_speaker.getbbox(speaker_text)
    tw = bbox[2] - bbox[0]
    draw.text(((w - tw) // 2, center_y), speaker_text, font=f_speaker, fill=hex_to_rgb(TEXT_MUTED))

    # Brand footer
    draw_brand_footer(draw, w, h, sizes)

    return img


# ── Carousel ─────────────────────────────────────────────────────────

def generate_carousel(
    content_type: str,
    video_id: str,
    item_indices: list[int],
    output_dir: Path,
) -> dict:
    """Generate a carousel of content cards + CTA slide.

    Supports vocabulary, grammar, pronunciation.
    Creates slide_1.png through slide_N.png + slide_{N+1}.png (CTA).
    """
    if content_type not in GENERATORS:
        raise ValueError(f"Unknown type: {content_type}")

    filename, gen_func = GENERATORS[content_type]
    video = load_video_meta(video_id)
    if not video:
        raise ValueError(f"Video not found: {video_id}")

    data_path = DATA_DIR / video_id / filename
    items = normalize_list(load_json(data_path))
    speaker = get_speaker_name(video)

    total_slides = len(item_indices) + 1  # content cards + CTA
    output_dir.mkdir(parents=True, exist_ok=True)

    slide_paths = []
    for slide_num, idx in enumerate(item_indices, 1):
        if idx >= len(items):
            logger.warning("Item index %d out of range for %s, skipping", idx, video_id)
            continue
        item = items[idx]
        img = gen_func(item, video, speaker, FEED_SIZE)
        draw = ImageDraw.Draw(img)
        draw_slide_number(draw, slide_num, total_slides, FEED_SIZE[0], FONT_SIZES_FEED)
        path = output_dir / f"slide_{slide_num}.png"
        img.save(str(path), "PNG")
        slide_paths.append(str(path))
        label = item.get("word") or item.get("pattern") or item.get("originalText") or ""
        logger.info("  Slide %d/%d: %s", slide_num, total_slides, label)

    # CTA slide
    cta_img = generate_cta_slide(
        speaker, video.get("title", ""), FEED_SIZE,
        slide_number=total_slides, total_slides=total_slides,
    )
    cta_path = output_dir / f"slide_{total_slides}.png"
    cta_img.save(str(cta_path), "PNG")
    slide_paths.append(str(cta_path))
    logger.info("  Slide %d/%d: CTA (Tudy)", total_slides, total_slides)

    logger.info("Carousel saved: %s (%d slides)", output_dir, len(slide_paths))

    return {
        "slide_paths": slide_paths,
        "content_type": content_type,
        "video_id": video_id,
        "item_indices": item_indices,
        "total_slides": len(slide_paths),
    }


# Backward-compatible alias
def generate_vocabulary_carousel(video_id, item_indices, output_dir):
    return generate_carousel("vocabulary", video_id, item_indices, output_dir)


# ── Orchestration ────────────────────────────────────────────────────

def normalize_list(data):
    """Handle both direct lists and wrapped dicts."""
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("vocabulary", "connectedSpeech", "grammar", "items"):
            if key in data and isinstance(data[key], list):
                return data[key]
    return []


def get_speaker_name(video: dict) -> str:
    title = video.get("title", "")
    parts = title.split("|")
    if len(parts) >= 2:
        return parts[-2].strip()
    parts = title.split(" - ")
    if len(parts) >= 2:
        return parts[-1].strip()
    return video.get("channel", "")


def load_video_meta(video_id: str) -> dict | None:
    from pipeline.utils import load_videos_index
    videos = load_videos_index(DATA_DIR)
    for v in videos:
        if v["videoId"] == video_id:
            return v
    return None


GENERATORS = {
    "vocabulary": ("vocabulary.json", generate_vocabulary_card),
    "grammar": ("grammar.json", generate_grammar_card),
    "pronunciation": ("connected_speech.json", generate_pronunciation_card),
}


def generate_card(
    content_type: str,
    video_id: str,
    item_index: int,
    output_dir: Path,
    headline: str | None = None,
) -> dict:
    """Generate feed + story images for a single content item.

    Returns dict with paths to generated files.
    """
    if content_type not in GENERATORS:
        raise ValueError(f"Unknown type: {content_type}. Use: {list(GENERATORS.keys())}")

    filename, gen_func = GENERATORS[content_type]
    video = load_video_meta(video_id)
    if not video:
        raise ValueError(f"Video not found: {video_id}")

    data_path = DATA_DIR / video_id / filename
    items = normalize_list(load_json(data_path))
    if item_index >= len(items):
        raise ValueError(f"Item index {item_index} out of range (max {len(items) - 1})")

    item = items[item_index]
    speaker = get_speaker_name(video)

    output_dir.mkdir(parents=True, exist_ok=True)

    # Feed image
    feed_img = gen_func(item, video, speaker, FEED_SIZE)
    feed_path = output_dir / "feed_post.png"
    feed_img.save(str(feed_path), "PNG")
    logger.info("Feed image saved: %s", feed_path)

    # Story image
    story_img = gen_func(item, video, speaker, STORY_SIZE)
    story_path = output_dir / "story.png"
    story_img.save(str(story_path), "PNG")
    logger.info("Story image saved: %s", story_path)

    return {
        "feed_path": str(feed_path),
        "story_path": str(story_path),
        "content_type": content_type,
        "video_id": video_id,
        "item_index": item_index,
    }


def generate_from_candidates(candidates_path: Path = CANDIDATES_PATH) -> list[dict]:
    """Generate images for all candidates in the candidates file."""
    candidates = load_json(candidates_path)
    if not candidates:
        logger.info("No candidates found at %s", candidates_path)
        return []

    results = []
    for c in candidates:
        ctype = c["type"]
        if ctype == "reel":
            continue  # reels use generate_reel.py
        vid = c["video_id"]
        idx = c.get("item_index", 0)
        out_dir = OUTPUT_DIR / f"{ctype}_{vid}_{idx}"
        try:
            result = generate_card(ctype, vid, idx, out_dir)
            results.append(result)
        except Exception as e:
            logger.error("Failed to generate %s for %s[%d]: %s", ctype, vid, idx, e)

    return results


def generate_from_queue() -> list[dict]:
    """Generate images for pending items in queue.json."""
    queue = load_json(QUEUE_PATH)
    if not queue or not isinstance(queue, list):
        logger.info("No queue items found")
        return []

    results = []
    for entry in queue:
        if entry.get("status") != "pending":
            continue
        ctype = entry.get("type")
        if ctype == "reel":
            continue
        vid = entry.get("video_id")
        out_dir = OUTPUT_DIR / entry.get("output_folder", f"{ctype}_{vid}")

        try:
            # Vocabulary uses carousel mode (5 cards + CTA)
            if ctype == "vocabulary":
                indices = entry.get("item_indices")
                if not indices:
                    indices = [entry.get("item_index", 0)]
                result = generate_vocabulary_carousel(vid, indices, out_dir)
            else:
                idx = entry.get("item_index", 0)
                result = generate_card(ctype, vid, idx, out_dir)
            entry["status"] = "generated"
            results.append(result)
        except Exception as e:
            logger.error("Failed: %s", e)

    save_json(QUEUE_PATH, queue)
    return results


def main():
    parser = argparse.ArgumentParser(description="Generate Instagram card images")
    parser.add_argument("--type", choices=["vocabulary", "grammar", "pronunciation"])
    parser.add_argument("--video-id")
    parser.add_argument("--item-index", type=int, default=0)
    parser.add_argument("--item-indices", help="Comma-separated indices for carousel (e.g. 0,1,2,3,4)")
    parser.add_argument("--carousel", action="store_true", help="Generate vocabulary carousel (5 cards + CTA)")
    parser.add_argument("--headline")
    parser.add_argument("--output-dir")
    parser.add_argument("--from-queue", action="store_true", help="Generate from queue.json")
    parser.add_argument("--from-candidates", action="store_true",
                        help="Generate from pipeline/.tmp/instagram_candidates.json")
    args = parser.parse_args()

    if args.from_queue:
        results = generate_from_queue()
        logger.info("Generated %d images from queue", len(results))
    elif args.from_candidates:
        results = generate_from_candidates()
        logger.info("Generated %d images from candidates", len(results))
    elif args.carousel and args.video_id:
        ctype = args.type or "vocabulary"
        out_dir = Path(args.output_dir) if args.output_dir else OUTPUT_DIR / f"test_carousel_{ctype}"
        if args.item_indices:
            indices = [int(x.strip()) for x in args.item_indices.split(",")]
        else:
            # Auto-select top 5 from content_selector
            from pipeline.instagram.content_selector import select_candidates
            candidates = select_candidates(content_type=ctype, video_id=args.video_id, count=5)
            indices = [c["item_index"] for c in candidates]
            logger.info("Auto-selected indices: %s", indices)
        result = generate_carousel(ctype, args.video_id, indices, out_dir)
        logger.info("Generated carousel: %s", result)
    elif args.type and args.video_id:
        out_dir = Path(args.output_dir) if args.output_dir else OUTPUT_DIR / "test"
        result = generate_card(args.type, args.video_id, args.item_index, out_dir, args.headline)
        logger.info("Generated: %s", result)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
