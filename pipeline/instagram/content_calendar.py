#!/usr/bin/env python3
"""Content calendar: plan weekly posts, manage queue, track history.

Usage:
    python3 pipeline/instagram/content_calendar.py --plan-week
    python3 pipeline/instagram/content_calendar.py --plan-week --start-date 2026-03-03
    python3 pipeline/instagram/content_calendar.py --show-queue
    python3 pipeline/instagram/content_calendar.py --mark-posted --content-key "vocabulary:LNHBMFCzznE:0"
    python3 pipeline/instagram/content_calendar.py --stats
"""

import argparse
import logging
import sys
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from pipeline.shared.utils import load_json, save_json
from pipeline.instagram.templates import OUTPUT_DIR, WEEKLY_SCHEDULE, CONTENT_TYPES
from pipeline.instagram.content_selector import select_candidates

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

QUEUE_PATH = OUTPUT_DIR / "queue.json"
CONTENT_LOG_PATH = OUTPUT_DIR / "content_log.json"

MAX_SAME_VIDEO_PER_WEEK = 2
VOCAB_CAROUSEL_SIZE = 5  # Number of vocabulary items per carousel post


def load_queue() -> list[dict]:
    data = load_json(QUEUE_PATH)
    return data if isinstance(data, list) else []


def save_queue(queue: list[dict]):
    save_json(QUEUE_PATH, queue)


def load_log() -> list[dict]:
    data = load_json(CONTENT_LOG_PATH)
    return data if isinstance(data, list) else []


def save_log(log: list[dict]):
    save_json(CONTENT_LOG_PATH, log)


def plan_week(start_date: date | None = None) -> list[dict]:
    """Plan a week of content posts.

    Weekly schedule (from templates.py WEEKLY_SCHEDULE):
        Monday: vocabulary
        Wednesday: grammar
        Thursday: reel
        Friday: pronunciation

    Diversity rule: max 2 items from the same video per week.
    """
    if start_date is None:
        # Find next Monday
        today = date.today()
        days_until_monday = (7 - today.weekday()) % 7
        if days_until_monday == 0 and today.weekday() == 0:
            start_date = today
        else:
            start_date = today + timedelta(days=days_until_monday)

    queue = load_queue()
    existing_keys = {e["content_key"] for e in queue}

    # Get dates for this week's posting days
    week_plan = []
    for day_offset, content_type in sorted(WEEKLY_SCHEDULE.items()):
        post_date = start_date + timedelta(days=day_offset)
        week_plan.append((post_date, content_type))

    # Select candidates for each type needed
    new_entries = []
    video_counts: Counter = Counter()

    for post_date, content_type in week_plan:
        # Check if already queued for this date
        date_str = post_date.isoformat()
        already_queued = any(
            e.get("scheduled_date") == date_str and e.get("type") == content_type
            for e in queue
        )
        if already_queued:
            logger.info("  %s %s — already queued, skipping", date_str, content_type)
            continue

        # Get candidates for this type
        candidates = select_candidates(content_type=content_type, count=50)

        # Filter out already-queued and enforce diversity
        selected = None
        for c in candidates:
            if c["content_key"] in existing_keys:
                continue
            vid = c["video_id"]
            if video_counts[vid] >= MAX_SAME_VIDEO_PER_WEEK:
                continue
            selected = c
            break

        if not selected:
            logger.warning("  %s %s — no candidates available!", date_str, content_type)
            continue

        entry = {
            "content_key": selected["content_key"],
            "type": content_type,
            "video_id": selected["video_id"],
            "item_index": selected.get("item_index", selected.get("section_index", 0)),
            "score": selected["score"],
            "scheduled_date": date_str,
            "status": "pending",
            "output_folder": f"{date_str}_{content_type}",
            "label": (
                selected.get("word")
                or selected.get("pattern")
                or selected.get("originalText")
                or selected.get("section", "")
            ),
            "speaker": selected.get("speaker", ""),
        }

        # Vocabulary: carousel mode (top 5 items from same video)
        if content_type == "vocabulary":
            vid = selected["video_id"]
            vocab_candidates = [
                c for c in candidates
                if c["video_id"] == vid
                and c["content_key"] not in existing_keys
            ][:VOCAB_CAROUSEL_SIZE]
            entry["item_indices"] = [c["item_index"] for c in vocab_candidates]
            entry["label"] = ", ".join(c.get("word", "") for c in vocab_candidates[:3]) + "..."
            # Mark all carousel items as used
            for vc in vocab_candidates:
                existing_keys.add(vc["content_key"])

        # For reels, add segment info
        if content_type == "reel":
            entry["start_segment"] = selected.get("startSegment", 0)
            entry["end_segment"] = selected.get("endSegment", 0)

        new_entries.append(entry)
        existing_keys.add(selected["content_key"])
        video_counts[selected["video_id"]] += 1

    if new_entries:
        queue.extend(new_entries)
        save_queue(queue)

    logger.info("\n=== Week plan (%s ~ %s) ===", start_date, start_date + timedelta(days=6))
    for entry in new_entries:
        logger.info(
            "  %s [%s] %s — %s (%s)",
            entry["scheduled_date"],
            entry["type"],
            entry["label"][:40],
            entry["speaker"],
            entry["status"],
        )
    if not new_entries:
        logger.info("  (no new entries added)")

    return new_entries


def show_queue():
    """Display current queue."""
    queue = load_queue()
    if not queue:
        logger.info("Queue is empty")
        return

    logger.info("=== Content Queue (%d items) ===", len(queue))
    for e in sorted(queue, key=lambda x: x.get("scheduled_date", "")):
        logger.info(
            "  %s [%s] %s — %s [%s]",
            e.get("scheduled_date", "?"),
            e.get("type", "?"),
            e.get("label", "?")[:40],
            e.get("speaker", "?")[:25],
            e.get("status", "?"),
        )


def mark_posted(content_key: str):
    """Mark a queue item as posted and move to content log."""
    queue = load_queue()
    log = load_log()

    found = False
    for entry in queue:
        if entry["content_key"] == content_key:
            entry["status"] = "posted"
            entry["posted_at"] = datetime.now().isoformat()
            log.append(entry)
            found = True
            break

    if not found:
        logger.error("Content key not found in queue: %s", content_key)
        return

    # Remove posted items from queue
    queue = [e for e in queue if e.get("status") != "posted"]

    save_queue(queue)
    save_log(log)
    logger.info("Marked as posted: %s", content_key)


def show_stats():
    """Show content statistics."""
    log = load_log()
    queue = load_queue()

    logger.info("=== Content Stats ===")
    logger.info("  Posted: %d", len(log))
    logger.info("  In queue: %d", len(queue))

    # By type
    type_counts = Counter(e.get("type") for e in log)
    logger.info("\n  By type (posted):")
    for t, c in type_counts.most_common():
        logger.info("    %s: %d", t, c)

    # By video
    video_counts = Counter(e.get("video_id") for e in log)
    logger.info("\n  By video (posted, top 5):")
    for vid, c in video_counts.most_common(5):
        logger.info("    %s: %d", vid, c)

    # Queue status
    status_counts = Counter(e.get("status") for e in queue)
    logger.info("\n  Queue status:")
    for s, c in status_counts.most_common():
        logger.info("    %s: %d", s, c)


def main():
    parser = argparse.ArgumentParser(description="Instagram content calendar")
    parser.add_argument("--plan-week", action="store_true", help="Plan next week's content")
    parser.add_argument("--start-date", help="Start date (YYYY-MM-DD) for --plan-week")
    parser.add_argument("--show-queue", action="store_true", help="Show current queue")
    parser.add_argument("--mark-posted", action="store_true", help="Mark item as posted")
    parser.add_argument("--content-key", help="Content key for --mark-posted")
    parser.add_argument("--stats", action="store_true", help="Show content stats")
    args = parser.parse_args()

    if args.plan_week:
        start = None
        if args.start_date:
            start = date.fromisoformat(args.start_date)
        plan_week(start)
    elif args.show_queue:
        show_queue()
    elif args.mark_posted:
        if not args.content_key:
            logger.error("--content-key required with --mark-posted")
            sys.exit(1)
        mark_posted(args.content_key)
    elif args.stats:
        show_stats()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
