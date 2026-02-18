#!/usr/bin/env python3
"""
Backfill missing titleKo fields in structure.json files.

Usage:
  python3 pipeline/backfill_structure_titleko.py --language en
  python3 pipeline/backfill_structure_titleko.py --language zh --dry-run
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
LANG_TO_APP = {
    "en": "english",
    "zh": "chinese",
    "ja": "japanese",
}

FALLBACK_TITLE_MAP = [
    ("q&a", "질의응답"),
    ("conclusion", "결론 및 행동 촉구"),
    ("closing", "결론 및 행동 촉구"),
    ("call to action", "결론 및 행동 촉구"),
    ("introduction", "도입: 주제 제시"),
    ("opening", "도입: 주제 제시"),
    ("hook", "도입: 관심 끌기"),
    ("background", "배경 설명"),
    ("example", "사례 설명"),
    ("case", "사례 설명"),
    ("story", "개인 경험"),
    ("personal", "개인 경험"),
    ("research", "연구 결과"),
    ("evidence", "근거 제시"),
    ("problem", "문제 제기"),
    ("challenge", "문제 제기"),
    ("solution", "해결 방법"),
    ("recommendation", "실행 제안"),
    ("summary", "핵심 요약"),
]


def _compact_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _trim_korean_sentence(text: str) -> str:
    if not text:
        return ""
    # Split only on sentence-ending punctuation followed by whitespace.
    # This avoids cutting at ellipsis inside quotes (e.g., "'만약에...'라는 ...").
    sentence = re.split(r"(?<=[.!?])\s+", _compact_ws(text), maxsplit=1)[0].strip(" \"'`[]()")
    sentence = re.sub(
        r"^(연사는|화자는|강연자는|발표자는|그는|그녀는|이 섹션에서는|이 부분에서는)\s+",
        "",
        sentence,
    )
    # Light normalization from spoken sentence to subtitle style.
    replacements = {
        "소개합니다": "소개",
        "설명합니다": "설명",
        "공유합니다": "공유",
        "제시합니다": "제시",
        "강조합니다": "강조",
        "촉구합니다": "촉구",
        "밝힙니다": "밝힘",
        "논의합니다": "논의",
        "말합니다": "설명",
        "다룹니다": "다룸",
    }
    for src, dst in replacements.items():
        if sentence.endswith(src):
            sentence = sentence[: -len(src)] + dst
            break
    for suffix in ("합니다", "해요", "입니다", "됩니다"):
        if sentence.endswith(suffix):
            sentence = sentence[: -len(suffix)].strip()
            break
    sentence = sentence.strip(" .,!?")
    if sentence.count("'") % 2 == 1:
        sentence = sentence.replace("'", "")
    if len(sentence) > 26:
        sentence = sentence[:26].rstrip() + "…"
    return sentence


def _fallback_title(section: dict[str, Any]) -> str:
    source = f"{section.get('title', '')} {section.get('section', '')}".lower()
    for key, value in FALLBACK_TITLE_MAP:
        if key in source:
            return value
    return "핵심 내용"


def _generate_title_ko(section: dict[str, Any]) -> str:
    summary_ko = _trim_korean_sentence(str(section.get("summaryKo", "")))
    if len(summary_ko) >= 4:
        return summary_ko
    return _fallback_title(section)


def backfill_language(language: str, dry_run: bool = False) -> tuple[int, int]:
    app_name = LANG_TO_APP[language]
    data_dir = ROOT / "apps" / app_name / "public" / "data"
    structure_files = sorted(data_dir.glob("*/structure.json"))

    changed_files = 0
    changed_sections = 0

    for path in structure_files:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        sections = data.get("sections", [])
        if not isinstance(sections, list):
            continue

        file_changed = False
        for section in sections:
            if not isinstance(section, dict):
                continue
            if str(section.get("titleKo", "")).strip():
                continue
            section["titleKo"] = _generate_title_ko(section)
            changed_sections += 1
            file_changed = True

        if file_changed:
            changed_files += 1
            if not dry_run:
                path.write_text(
                    json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )

    return changed_files, changed_sections


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill titleKo in structure.json files.")
    parser.add_argument("--language", choices=["en", "zh", "ja"], default="en")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    files, sections = backfill_language(args.language, dry_run=args.dry_run)
    mode = "DRY RUN" if args.dry_run else "UPDATED"
    print(f"[{mode}] language={args.language} files={files} sections={sections}")


if __name__ == "__main__":
    main()
