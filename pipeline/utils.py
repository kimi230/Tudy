"""Shared utility functions for the stdyEng pipeline."""

import json
import logging
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


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
            "[%d/%d] %s ...",
            self.step_num,
            self.total_steps,
            self.step_name,
        )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        elapsed = time.time() - self.start_time
        if exc_type is None:
            logger.info(
                "[%d/%d] %s completed (%.1fs)",
                self.step_num,
                self.total_steps,
                self.step_name,
                elapsed,
            )
        else:
            logger.error(
                "[%d/%d] %s FAILED after %.1fs: %s",
                self.step_num,
                self.total_steps,
                self.step_name,
                elapsed,
                exc_val,
            )
        return False  # Do not suppress exceptions


# --- File I/O helpers ---


def load_json(path: Path) -> Any:
    """Load a JSON file, returning None if it doesn't exist."""
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Any) -> None:
    """Save data to a JSON file, creating parent directories as needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    logger.info("Saved: %s", path)


def load_videos_index(data_dir: Path) -> list[dict[str, Any]]:
    """Load the videos.json index file."""
    data = load_json(data_dir / "videos.json")
    if data is None:
        return []
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "videos" in data:
        return data["videos"]
    return []
