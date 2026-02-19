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
from datetime import datetime
from pathlib import Path
from typing import Any

import yt_dlp

# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from utils import StepTimer, load_json, save_json, load_videos_index

PROJECT_ROOT = SCRIPT_DIR.parent
LANGUAGE_APP_MAP = {"en": "english", "zh": "chinese", "ja": "japanese"}

def _get_data_dir(language: str = "en") -> Path:
    app_name = LANGUAGE_APP_MAP.get(language, "english")
    return Path(os.environ.get("STDYENG_DATA_DIR",
        str(PROJECT_ROOT / "apps" / app_name / "public" / "data")))

DATA_DIR = _get_data_dir("en")
TEMP_DIR = SCRIPT_DIR / ".tmp"
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
        "target_wpm": (90, 120),
        "duration_sec": (300, 480),
        "search_modifiers": ["easy", "simple", "for beginners"],
    },
    "elementary": {
        "target_wpm": (120, 140),
        "duration_sec": (360, 540),
        "search_modifiers": ["basic", "introductory"],
    },
    "intermediate": {
        "target_wpm": (140, 160),
        "duration_sec": (420, 720),
        "search_modifiers": [],
    },
    "upper-intermediate": {
        "target_wpm": (160, 185),
        "duration_sec": (480, 840),
        "search_modifiers": ["detailed", "comprehensive"],
    },
    "advanced": {
        "target_wpm": (185, 220),
        "duration_sec": (540, 900),
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
# Chinese (zh) curated sources
# ---------------------------------------------------------------------------

ZH_CATEGORY_CHANNELS: dict[str, list[str]] = {
    "daily": ["TED中文", "一席YiXi", "混知"],
    "business": ["财经冷眼", "李永乐老师", "半佛仙人"],
    "culture": ["李子柒", "国家地理", "CCTV纪录"],
    "news": ["CCTV中文国际", "凤凰卫视", "观察者网"],
    "tech": ["老石谈芯", "林亦LYi", "极客湾"],
    "science": ["妈咪说", "柴知道", "李永乐老师"],
}

ZH_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "daily": ["日常中文", "中文对话", "生活会话", "中文口语"],
    "business": ["商务中文", "职场中文", "经济分析"],
    "culture": ["中国文化", "中国历史", "传统文化"],
    "news": ["中文新闻", "时事分析", "新闻播报"],
    "tech": ["科技中文", "编程", "人工智能"],
    "science": ["科学中文", "科普", "知识分享"],
    "anime": ["动画", "国漫", "中文配音"],
    "travel": ["旅游中文", "中国旅行", "城市介绍"],
}

ZH_DIFFICULTY_PROFILES: dict[str, dict[str, Any]] = {
    "beginner": {
        "target_cpm": (100, 160),
        "duration_sec": (180, 420),
        "search_modifiers": ["简单", "入门", "初级"],
    },
    "intermediate": {
        "target_cpm": (160, 240),
        "duration_sec": (300, 600),
        "search_modifiers": [],
    },
    "advanced": {
        "target_cpm": (240, 350),
        "duration_sec": (360, 900),
        "search_modifiers": ["深度", "专业", "高级"],
    },
}

# ---------------------------------------------------------------------------
# Japanese (ja) curated sources
# ---------------------------------------------------------------------------

JA_CATEGORY_CHANNELS: dict[str, list[str]] = {
    "daily": ["日本語の森", "三本塾", "もしもしゆうすけ"],
    "business": ["テレ東BIZ", "NewsPicks", "中田敦彦のYouTube大学"],
    "culture": ["NHK", "Japan Inside", "テレビ東京"],
    "news": ["ANNnewsCH", "TBS NEWS DIG", "日テレNEWS"],
    "tech": ["キオクシア", "CNET Japan", "ITmedia"],
    "science": ["予備校のノリで学ぶ", "GENKI LABO", "科学はすべてを解決する"],
}

JA_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "daily": ["日常会話", "日本語会話", "日本語 話し方"],
    "business": ["ビジネス日本語", "敬語", "仕事 日本語"],
    "culture": ["日本文化", "日本の歴史", "伝統文化"],
    "news": ["ニュース 日本語", "時事問題", "ニュース解説"],
    "tech": ["テクノロジー", "プログラミング", "AI 日本語"],
    "science": ["科学", "サイエンス", "知識"],
    "anime": ["アニメ", "声優", "アニメ名シーン"],
    "travel": ["旅行 日本語", "日本旅行", "観光"],
}

JA_DIFFICULTY_PROFILES: dict[str, dict[str, Any]] = {
    "beginner": {
        "target_cpm": (80, 140),
        "duration_sec": (180, 420),
        "search_modifiers": ["やさしい", "入門", "初級"],
    },
    "intermediate": {
        "target_cpm": (140, 220),
        "duration_sec": (300, 720),
        "search_modifiers": [],
    },
    "advanced": {
        "target_cpm": (220, 320),
        "duration_sec": (420, 900),
        "search_modifiers": ["上級", "深掘り", "専門"],
    },
}

EN_CATEGORY_INTENTS: dict[str, list[str]] = {
    "pronunciation": ["shadowing", "listening practice", "accent drill", "pronunciation lesson"],
    "business": ["case study", "leadership talk", "management lecture", "workplace communication"],
    "daily": ["conversation practice", "real life English", "communication tips", "storytelling"],
    "academic": ["university lecture", "research talk", "seminar", "critical thinking"],
    "travel": ["travel guide", "travel conversation", "culture guide", "trip tips"],
    "tech": ["explained", "deep dive", "engineering talk", "product analysis"],
    "current": ["news analysis", "current affairs", "policy explain", "global issues"],
    "culture": ["history explained", "culture documentary", "society talk", "art discussion"],
    "science": ["science explained", "documentary", "experiment", "scientific talk"],
    "motivation": ["motivational speech", "self improvement", "growth mindset", "life lessons"],
}

ZH_CATEGORY_INTENTS: dict[str, list[str]] = {
    "daily": ["情景对话", "口语练习", "听力训练"],
    "business": ["案例分析", "职场表达", "沟通技巧"],
    "culture": ["文化讲解", "历史故事", "纪录片"],
    "news": ["新闻解读", "时事评论", "深度观察"],
    "tech": ["技术讲解", "产品分析", "行业趋势"],
    "science": ["科普讲解", "科学实验", "知识拓展"],
    "anime": ["配音解析", "台词学习", "口语模仿"],
    "travel": ["旅行攻略", "城市文化", "实用会话"],
}

JA_CATEGORY_INTENTS: dict[str, list[str]] = {
    "daily": ["会話練習", "聞き取り", "表現解説"],
    "business": ["ケーススタディ", "敬語解説", "ビジネス会話"],
    "culture": ["文化解説", "歴史ドキュメンタリー", "社会考察"],
    "news": ["ニュース解説", "時事分析", "社会問題"],
    "tech": ["技術解説", "業界分析", "AI解説"],
    "science": ["科学解説", "実験", "教養講座"],
    "anime": ["セリフ解説", "声優インタビュー", "アニメ考察"],
    "travel": ["観光ガイド", "旅行会話", "地域紹介"],
}

QUALITY_POSITIVE_TERMS: dict[str, list[str]] = {
    "en": [
        "explained", "lecture", "tutorial", "how to", "analysis", "interview",
        "documentary", "education", "discussion", "case study", "TED", "TEDx",
    ],
    "zh": [
        "讲解", "教程", "课程", "访谈", "演讲", "公开课",
        "深度", "科普", "解析", "纪录片",
    ],
    "ja": [
        "解説", "講義", "講座", "インタビュー", "ドキュメンタリー",
        "授業", "対談", "入門", "わかりやすく",
    ],
}

QUALITY_NEGATIVE_TERMS: dict[str, list[str]] = {
    "en": [
        "prank", "reaction", "compilation", "meme", "asmr", "lofi",
        "gameplay", "teaser", "fan cam", "clickbait", "gossip",
    ],
    "zh": [
        "恶搞", "整活", "鬼畜", "剪辑", "搬运", "纯音乐",
        "直播回放", "八卦", "标题党",
    ],
    "ja": [
        "ドッキリ", "切り抜き", "まとめ", "ネタ", "雑談配信",
        "ゲーム実況", "作業用", "釣りタイトル", "ゴシップ",
    ],
}

LANGUAGE_SKIP_TITLE_PATTERNS: dict[str, list[str]] = {
    "en": ["official music video", "lyrics", "karaoke", "#shorts", "shorts", "live cam", "mv"],
    "zh": ["官方音乐", "歌词", "卡拉ok", "短视频", "纯音乐", "直播切片"],
    "ja": ["公式mv", "歌ってみた", "カラオケ", "ショート", "切り抜き", "作業用bgm"],
}

ZH_HIGH_PRIORITY_CHANNELS = {"TED中文", "一席YiXi"}
JA_HIGH_PRIORITY_CHANNELS = {"TED", "TEDx Talks", "日本語の森"}

CATEGORY_FILTER_DEFAULTS: dict[str, Any] = {
    "min_views": 5000,
    "min_views_curated": 2000,
    "min_quality_score": 0.25,
    "min_relevance_score": 0.10,
    "max_negative_hits": 1,
    "min_safety_score": 0.45,
}

CATEGORY_FILTER_PROFILES: dict[str, dict[str, dict[str, Any]]] = {
    "en": {
        "pronunciation": {"min_views": 2500, "min_quality_score": 0.20, "min_relevance_score": 0.12},
        "daily": {"min_views": 3000, "min_quality_score": 0.20, "min_relevance_score": 0.10},
        "travel": {"min_views": 3000, "min_quality_score": 0.20, "min_relevance_score": 0.10},
        "business": {"min_views": 6000, "min_quality_score": 0.30, "min_relevance_score": 0.15},
        "academic": {"min_views": 5500, "min_quality_score": 0.30, "min_relevance_score": 0.15},
        "science": {"min_views": 5500, "min_quality_score": 0.30, "min_relevance_score": 0.15},
        "tech": {"min_views": 6500, "min_quality_score": 0.30, "min_relevance_score": 0.15},
        "culture": {"min_views": 4500, "min_quality_score": 0.25, "min_relevance_score": 0.12},
        "motivation": {"min_views": 7000, "min_quality_score": 0.28, "min_relevance_score": 0.12},
        "current": {"min_views": 9000, "min_quality_score": 0.35, "min_relevance_score": 0.20},
        "news": {"min_views": 9000, "min_quality_score": 0.35, "min_relevance_score": 0.20},
    },
    "zh": {
        "daily": {"min_views": 3000, "min_quality_score": 0.20, "min_relevance_score": 0.10},
        "travel": {"min_views": 3000, "min_quality_score": 0.20, "min_relevance_score": 0.10},
        "business": {"min_views": 5000, "min_quality_score": 0.28, "min_relevance_score": 0.15},
        "culture": {"min_views": 4500, "min_quality_score": 0.25, "min_relevance_score": 0.12},
        "tech": {"min_views": 5500, "min_quality_score": 0.28, "min_relevance_score": 0.15},
        "science": {"min_views": 5000, "min_quality_score": 0.28, "min_relevance_score": 0.15},
        "news": {"min_views": 8000, "min_quality_score": 0.33, "min_relevance_score": 0.20},
        "anime": {"min_views": 4500, "min_quality_score": 0.22, "min_relevance_score": 0.10},
    },
    "ja": {
        "daily": {"min_views": 3000, "min_quality_score": 0.20, "min_relevance_score": 0.10},
        "travel": {"min_views": 3000, "min_quality_score": 0.20, "min_relevance_score": 0.10},
        "business": {"min_views": 5000, "min_quality_score": 0.28, "min_relevance_score": 0.15},
        "culture": {"min_views": 4500, "min_quality_score": 0.25, "min_relevance_score": 0.12},
        "tech": {"min_views": 5500, "min_quality_score": 0.28, "min_relevance_score": 0.15},
        "science": {"min_views": 5000, "min_quality_score": 0.28, "min_relevance_score": 0.15},
        "news": {"min_views": 8000, "min_quality_score": 0.33, "min_relevance_score": 0.20},
        "anime": {"min_views": 4500, "min_quality_score": 0.22, "min_relevance_score": 0.10},
    },
}

CATEGORY_RECENCY_IMPORTANCE_DEFAULT = 0.45
CATEGORY_RECENCY_IMPORTANCE: dict[str, dict[str, float]] = {
    "en": {
        "current": 1.0,
        "news": 1.0,
        "tech": 0.65,
        "business": 0.60,
        "science": 0.55,
        "academic": 0.50,
        "culture": 0.45,
        "daily": 0.35,
        "travel": 0.35,
        "pronunciation": 0.30,
        "motivation": 0.30,
    },
    "zh": {
        "news": 1.0,
        "tech": 0.65,
        "business": 0.60,
        "science": 0.55,
        "culture": 0.45,
        "daily": 0.35,
        "travel": 0.35,
        "anime": 0.30,
    },
    "ja": {
        "news": 1.0,
        "tech": 0.65,
        "business": 0.60,
        "science": 0.55,
        "culture": 0.45,
        "daily": 0.35,
        "travel": 0.35,
        "anime": 0.30,
    },
}

SAFETY_RISK_TERMS: dict[str, dict[str, list[str]]] = {
    "en": {
        "sexual": ["porn", "xxx", "onlyfans", "explicit sex", "nude"],
        "hate": ["hate speech", "racist rant", "neo nazi", "supremacist"],
        "self_harm": ["suicide method", "self harm", "kill myself"],
        "extremism": ["terror propaganda", "isis", "extremist manifesto"],
        "violence": ["gore", "beheading", "mass shooting", "graphic violence"],
    },
    "zh": {
        "sexual": ["成人视频", "色情", "露骨内容"],
        "hate": ["仇恨言论", "种族歧视", "极端排外"],
        "self_harm": ["自杀方法", "自残"],
        "extremism": ["恐怖宣传", "极端主义宣言"],
        "violence": ["血腥", "斩首", "大规模枪击"],
    },
    "ja": {
        "sexual": ["アダルト動画", "ポルノ", "露骨な性描写"],
        "hate": ["ヘイトスピーチ", "差別扇動", "人種差別発言"],
        "self_harm": ["自殺方法", "自傷行為"],
        "extremism": ["テロ宣伝", "過激派声明", "過激思想"],
        "violence": ["ゴア", "斬首", "無差別殺傷"],
    },
}

BLOCKED_RISK_TAGS = {"sexual", "hate", "self_harm", "extremism"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_common_words() -> frozenset[str]:
    """Lazy-import common words set."""
    from common_words import COMMON_WORDS
    return COMMON_WORDS


def _flatten_channels(channel_map: dict[str, list[str]]) -> set[str]:
    merged: set[str] = set()
    for channels in channel_map.values():
        merged.update(channels)
    return merged


EN_CURATED_CHANNELS = _flatten_channels(CATEGORY_CHANNELS)
ZH_CURATED_CHANNELS = _flatten_channels(ZH_CATEGORY_CHANNELS)
JA_CURATED_CHANNELS = _flatten_channels(JA_CATEGORY_CHANNELS)


def _get_difficulty_profile(language: str, level: str) -> dict[str, Any]:
    if language == "zh":
        return ZH_DIFFICULTY_PROFILES.get(level, ZH_DIFFICULTY_PROFILES["intermediate"])
    if language == "ja":
        return JA_DIFFICULTY_PROFILES.get(level, JA_DIFFICULTY_PROFILES["intermediate"])
    return DIFFICULTY_PROFILES.get(level, DIFFICULTY_PROFILES["intermediate"])


def _get_category_keywords(language: str, category: str) -> list[str]:
    if language == "zh":
        return ZH_CATEGORY_KEYWORDS.get(category, [category])
    if language == "ja":
        return JA_CATEGORY_KEYWORDS.get(category, [category])
    return CATEGORY_KEYWORDS.get(category, [category])


def _get_category_channels(language: str, category: str) -> list[str]:
    if language == "zh":
        return ZH_CATEGORY_CHANNELS.get(category, [])
    if language == "ja":
        return JA_CATEGORY_CHANNELS.get(category, [])
    return CATEGORY_CHANNELS.get(category, [])


def _get_category_intents(language: str, category: str) -> list[str]:
    if language == "zh":
        return ZH_CATEGORY_INTENTS.get(category, [])
    if language == "ja":
        return JA_CATEGORY_INTENTS.get(category, [])
    return EN_CATEGORY_INTENTS.get(category, [])


def _channel_match(channel_name: str, candidate: str) -> bool:
    if not channel_name or not candidate:
        return False
    a = channel_name.lower()
    b = candidate.lower()
    return a == b or a in b or b in a


def _get_curated_channels(language: str) -> set[str]:
    if language == "zh":
        return ZH_CURATED_CHANNELS
    if language == "ja":
        return JA_CURATED_CHANNELS
    return EN_CURATED_CHANNELS


def _is_high_priority_channel(channel_name: str, language: str) -> bool:
    high_priority = set(HIGH_PRIORITY_CHANNELS)
    if language == "zh":
        high_priority.update(ZH_HIGH_PRIORITY_CHANNELS)
    elif language == "ja":
        high_priority.update(JA_HIGH_PRIORITY_CHANNELS)

    return any(_channel_match(channel_name, hp) for hp in high_priority)


def _is_curated_channel(channel_name: str, language: str) -> bool:
    curated = _get_curated_channels(language)
    return any(_channel_match(channel_name, c) for c in curated)


def _collect_relevance_terms(
    language: str,
    category: str,
    topics: list[str] | None = None,
) -> list[str]:
    terms = _get_category_keywords(language, category)[:4] + _get_category_intents(language, category)[:4]
    if topics:
        terms.extend(t for t in topics if t)

    seen: set[str] = set()
    unique_terms: list[str] = []
    for term in terms:
        t = term.strip()
        if not t:
            continue
        key = t.lower()
        if key in seen:
            continue
        seen.add(key)
        unique_terms.append(t)
    return unique_terms


def _get_filter_profile(language: str, category: str) -> dict[str, Any]:
    profile = dict(CATEGORY_FILTER_DEFAULTS)
    lang_profiles = CATEGORY_FILTER_PROFILES.get(language, {})
    profile.update(lang_profiles.get(category, {}))
    return profile


def _get_recency_importance(language: str, category: str) -> float:
    return CATEGORY_RECENCY_IMPORTANCE.get(language, {}).get(
        category,
        CATEGORY_RECENCY_IMPORTANCE_DEFAULT,
    )


def _parse_upload_date(upload_date: str) -> datetime | None:
    if not upload_date:
        return None
    # yt-dlp commonly returns YYYYMMDD
    for fmt in ("%Y%m%d", "%Y-%m-%d"):
        try:
            return datetime.strptime(upload_date, fmt)
        except ValueError:
            continue
    return None


def _compute_recency_score(upload_date: str, category: str, language: str) -> float:
    dt = _parse_upload_date(upload_date)
    if dt is None:
        return 0.5

    age_days = max((datetime.utcnow() - dt).days, 0)
    is_fast_moving = category in ("current", "news")

    if is_fast_moving:
        if age_days <= 7:
            return 1.0
        if age_days <= 30:
            return 0.95
        if age_days <= 90:
            return 0.80
        if age_days <= 180:
            return 0.60
        if age_days <= 365:
            return 0.40
        return 0.20

    if age_days <= 30:
        return 1.0
    if age_days <= 180:
        return 0.85
    if age_days <= 365:
        return 0.70
    if age_days <= 365 * 3:
        return 0.50
    if age_days <= 365 * 5:
        return 0.35
    return 0.25


def _detect_risk_tags(text: str, language: str) -> set[str]:
    risk_dict = SAFETY_RISK_TERMS.get(language, SAFETY_RISK_TERMS["en"])
    text_lower = text.lower()
    detected: set[str] = set()
    for tag, terms in risk_dict.items():
        for term in terms:
            if term.lower() in text_lower:
                detected.add(tag)
                break
    return detected


def _compute_safety_score(risk_tags: set[str]) -> float:
    if not risk_tags:
        return 1.0
    score = 1.0
    for tag in risk_tags:
        if tag in BLOCKED_RISK_TAGS:
            score -= 0.35
        else:
            score -= 0.18
    return round(max(0.0, min(1.0, score)), 3)


# ---------------------------------------------------------------------------
# Step 1: Generate search queries
# ---------------------------------------------------------------------------


def generate_queries(
    level: str,
    category: str,
    topics: list[str] | None = None,
    language: str = "en",
) -> list[str]:
    """Build a list of YouTube search query strings."""
    queries: list[str] = []
    profile = _get_difficulty_profile(language, level)
    modifiers = profile.get("search_modifiers", [])
    cat_keywords = _get_category_keywords(language, category)
    cat_channels = _get_category_channels(language, category)
    cat_intents = _get_category_intents(language, category)

    # 1) Core keyword queries
    for kw in cat_keywords:
        queries.append(kw)
        for mod in modifiers:
            queries.append(f"{kw} {mod}")
        for intent in cat_intents[:3]:
            if kw.lower() in intent.lower():
                intent_query = intent
            else:
                intent_query = f"{kw} {intent}"
            queries.append(intent_query)
            for mod in modifiers[:2]:
                queries.append(f"{intent_query} {mod}")

    # 2) Topic-specific expansion
    if topics:
        for topic in topics:
            if language == "zh":
                queries.append(f"{topic} 中文")
            elif language == "ja":
                queries.append(f"{topic} 日本語")
            else:
                queries.append(f"{topic} English")

            for intent in cat_intents[:2]:
                queries.append(f"{topic} {intent}")
            for mod in modifiers[:2]:
                queries.append(f"{topic} {mod}")

            if language == "en":
                queries.append(f"{topic} TED talk")

    # 3) Curated-channel anchored queries
    seed_keyword = cat_keywords[0] if cat_keywords else category
    for ch in cat_channels[:3]:
        queries.append(f"{seed_keyword} {ch}")
        queries.append(f"{ch} {seed_keyword}")

    # 4) Language-specific trusted-source anchors
    if language == "zh":
        for kw in cat_keywords[:2]:
            queries.append(f"{kw} TED中文")
            queries.append(f"{kw} 一席")
    elif language == "ja":
        for kw in cat_keywords[:2]:
            queries.append(f"{kw} TEDxTalks")
            queries.append(f"{kw} NHK")
    else:
        for kw in cat_keywords[:2]:
            queries.append(f"{kw} TED talk")
            queries.append(f"{kw} explained")

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for q in queries:
        q_lower = q.lower()
        if q_lower not in seen:
            seen.add(q_lower)
            unique.append(q)

    logger.info("Generated %d search queries for language=%s", len(unique), language)
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
    language: str = "en",
    category: str = "",
    topics: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Filter candidates by duration, view count, and basic quality signals."""
    profile = _get_difficulty_profile(language, level)
    min_dur, max_dur = profile["duration_sec"]
    filter_profile = _get_filter_profile(language, category)
    # Allow some slack
    min_dur_slack = int(min_dur * 0.7)
    max_dur_slack = int(max_dur * 1.3)

    relevance_terms = _collect_relevance_terms(language, category, topics)
    positive_terms = QUALITY_POSITIVE_TERMS.get(language, QUALITY_POSITIVE_TERMS["en"])
    negative_terms = QUALITY_NEGATIVE_TERMS.get(language, QUALITY_NEGATIVE_TERMS["en"])
    skip_patterns = LANGUAGE_SKIP_TITLE_PATTERNS.get(language, []) + LANGUAGE_SKIP_TITLE_PATTERNS["en"]

    filtered: list[dict[str, Any]] = []
    for r in results:
        dur = r.get("duration", 0)
        views = r.get("view_count", 0)
        title = r.get("title", "")
        description = r.get("description", "")
        channel = r.get("channel", "")

        # Duration filter
        if dur < min_dur_slack or dur > max_dur_slack:
            logger.debug("Filtered (duration %ds): %s", dur, r.get("title", "")[:50])
            continue

        # Curated channels can pass with lower minimum views.
        is_curated = _is_curated_channel(channel, language) or _is_high_priority_channel(channel, language)
        min_views = filter_profile["min_views_curated"] if is_curated else filter_profile["min_views"]
        if views < min_views:
            logger.debug("Filtered (views %d): %s", views, r.get("title", "")[:50])
            continue

        # Skip music/shorts indicators in title
        title_lower = title.lower()
        if any(pat in title_lower for pat in skip_patterns):
            logger.debug("Filtered (skip pattern): %s", r.get("title", "")[:50])
            continue

        # Quality / relevance checks from title + description
        text_blob = f"{title} {description}".lower()
        good_hits = sum(1 for term in positive_terms if term.lower() in text_blob)
        bad_hits = sum(1 for term in negative_terms if term.lower() in text_blob)
        relevance_hits = sum(1 for term in relevance_terms if term.lower() in text_blob)
        metadata_risk_tags = _detect_risk_tags(text_blob, language)
        safety_score_metadata = _compute_safety_score(metadata_risk_tags)

        # Hard reject: too many low-value signals
        if bad_hits > filter_profile["max_negative_hits"]:
            logger.debug("Filtered (low quality signals): %s", title[:60])
            continue
        if metadata_risk_tags & BLOCKED_RISK_TAGS:
            logger.debug("Filtered (blocked risk tags): %s", title[:60])
            continue

        # Relevance score by category/topic term coverage (0-1)
        if relevance_terms:
            denom = max(2, min(len(relevance_terms), 6))
            relevance_score = min(1.0, relevance_hits / denom)
        else:
            relevance_score = 0.5

        # Content quality score from lexical signals + source credibility (0-1)
        quality_score = 0.5 + (good_hits * 0.12) - (bad_hits * 0.22)
        if is_curated:
            quality_score += 0.12
        quality_score = max(0.0, min(1.0, quality_score))

        # Keep curated channels even on low lexical relevance, but otherwise enforce floor.
        if relevance_score < filter_profile["min_relevance_score"] and not is_curated:
            logger.debug("Filtered (low category relevance): %s", title[:60])
            continue
        if quality_score < filter_profile["min_quality_score"]:
            logger.debug("Filtered (quality score %.2f): %s", quality_score, title[:60])
            continue
        if safety_score_metadata < filter_profile["min_safety_score"]:
            logger.debug("Filtered (safety score %.2f): %s", safety_score_metadata, title[:60])
            continue

        recency_score = _compute_recency_score(r.get("upload_date", ""), category, language)
        recency_importance = _get_recency_importance(language, category)
        enriched = dict(r)
        enriched["category_relevance_score"] = round(relevance_score, 3)
        enriched["content_quality_score"] = round(quality_score, 3)
        enriched["recency_score"] = round(recency_score, 3)
        enriched["recency_importance"] = round(recency_importance, 3)
        enriched["safety_score"] = safety_score_metadata
        enriched["risk_flags"] = sorted(metadata_risk_tags)
        enriched["quality_signals"] = {
            "good_hits": good_hits,
            "bad_hits": bad_hits,
            "relevance_hits": relevance_hits,
            "is_curated_channel": is_curated,
            "risk_tags": sorted(metadata_risk_tags),
        }
        filtered.append(enriched)

    logger.info("Pre-filter: %d → %d candidates", len(results), len(filtered))
    return filtered


# ---------------------------------------------------------------------------
# Step 4: Quick analysis (subtitle download + heuristics)
# ---------------------------------------------------------------------------


def _download_subtitles(video_id: str, language: str = "en") -> str | None:
    """Download subtitles for a video in the given language, return text or None."""
    sub_lang = language if language in ("en", "zh", "ja") else "en"
    # Also try variant codes
    lang_variants = {
        "en": ["en", "en-US", "en-GB"],
        "zh": ["zh", "zh-CN", "zh-Hans", "zh-TW", "zh-Hant"],
        "ja": ["ja", "ja-JP"],
    }
    variants = lang_variants.get(sub_lang, [sub_lang])

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": variants,
        "subtitlesformat": "vtt",
        "outtmpl": str(TEMP_DIR / f"sub_{video_id}"),
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

    sub_info = None
    for variant in variants:
        sub_info = subs.get(variant) or auto_subs.get(variant)
        if sub_info:
            break
    if not sub_info:
        # Fallback: try any key starting with the language code
        for key in list(subs.keys()) + list(auto_subs.keys()):
            if key.startswith(sub_lang):
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
    language: str = "en",
    category: str = "",
    topics: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Download subtitles and compute heuristic scores for each candidate."""
    profile = _get_difficulty_profile(language, level)
    filter_profile = _get_filter_profile(language, category)
    relevance_terms = _collect_relevance_terms(language, category, topics)
    if language in ("zh", "ja"):
        target_rate_low, target_rate_high = profile["target_cpm"]
    else:
        target_rate_low, target_rate_high = profile["target_wpm"]

    common_words = _get_common_words() if language == "en" else frozenset()

    analyzed: list[dict[str, Any]] = []

    # Sort by view count descending to prioritize popular content
    sorted_candidates = sorted(candidates, key=lambda x: x.get("view_count", 0), reverse=True)

    for i, cand in enumerate(sorted_candidates):
        if len(analyzed) >= max_candidates:
            break

        vid = cand["video_id"]
        logger.info("  [%d/%d] Analyzing subtitles: %s", i + 1, len(sorted_candidates), cand.get("title", "")[:60])

        subtitle_text = _download_subtitles(vid, language=language)
        if not subtitle_text:
            logger.debug("  No subtitles for %s, skipping", vid)
            continue

        subtitle_risk_tags = _detect_risk_tags(subtitle_text.lower(), language)
        merged_risk_tags = set(cand.get("risk_flags", [])) | subtitle_risk_tags
        safety_score_subtitle = _compute_safety_score(subtitle_risk_tags)
        safety_score = round(min(cand.get("safety_score", 1.0), safety_score_subtitle), 3)
        if merged_risk_tags & BLOCKED_RISK_TAGS:
            logger.info("  Skipping %s due to blocked risk tags: %s", vid, sorted(merged_risk_tags & BLOCKED_RISK_TAGS))
            continue
        if safety_score < filter_profile["min_safety_score"]:
            logger.info("  Skipping %s due to low safety score: %.2f", vid, safety_score)
            continue

        # Compute metrics (language-specific speed)
        duration = cand.get("duration", 1)
        if language in ("zh", "ja"):
            # Character-based speed (CPM / MPM)
            char_count = len(subtitle_text.replace(" ", ""))
            speech_rate_wpm = round(char_count / (duration / 60)) if duration > 0 else 0
        else:
            words = subtitle_text.split()
            word_count = len(words)
            speech_rate_wpm = round(word_count / (duration / 60)) if duration > 0 else 0

        # Vocabulary accessibility
        if language == "en":
            words = subtitle_text.split()
            words_lower = [w.lower().strip(".,!?;:\"'()[]{}") for w in words]
            common_count = sum(1 for w in words_lower if w in common_words)
            pct_common = round(common_count / max(len(words_lower), 1), 3)
        else:
            # For zh/ja, skip common words analysis (no word list available)
            pct_common = 0.5  # neutral default

        # Difficulty match score: how close is rate to target range
        if target_rate_low <= speech_rate_wpm <= target_rate_high:
            difficulty_match = 1.0
        elif speech_rate_wpm < target_rate_low:
            difficulty_match = max(0, 1.0 - (target_rate_low - speech_rate_wpm) / 50)
        else:
            difficulty_match = max(0, 1.0 - (speech_rate_wpm - target_rate_high) / 50)
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

        # Channel/source score
        channel = cand.get("channel", "")
        channel_score = 0
        if _is_high_priority_channel(channel, language):
            channel_score = 5
        elif _is_curated_channel(channel, language):
            channel_score = 3

        # Check for legendary speakers in title or channel
        title = cand.get("title", "")
        for speaker in LEGENDARY_SPEAKERS:
            if speaker.lower() in title.lower() or speaker.lower() in channel.lower():
                channel_score = max(channel_score, 4)
                break

        # Truncate subtitle text for output
        subtitle_truncated = subtitle_text[:5000]
        relevance_score = cand.get("category_relevance_score", 0.5)
        if relevance_terms:
            subtitle_lower = subtitle_text.lower()
            subtitle_hits = sum(1 for term in relevance_terms if term.lower() in subtitle_lower)
            subtitle_relevance = min(1.0, subtitle_hits / max(2, min(len(relevance_terms), 6)))
            relevance_score = round(max(relevance_score, subtitle_relevance), 3)
        content_quality_score = cand.get("content_quality_score", 0.5)
        recency_score = cand.get("recency_score", _compute_recency_score(cand.get("upload_date", ""), category, language))
        recency_importance = cand.get("recency_importance", _get_recency_importance(language, category))
        speed_unit = "cpm" if language in ("zh", "ja") else "wpm"

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
            "category_relevance_score": relevance_score,
            "content_quality_score": content_quality_score,
            "recency_score": round(recency_score, 3),
            "recency_importance": round(recency_importance, 3),
            "safety_score": safety_score,
            "risk_flags": sorted(merged_risk_tags),
            "subtitle_text": subtitle_truncated,
            "channel_score": channel_score,
            "speech_rate_unit": speed_unit,
            "target_language": language,
            "quality_signals": cand.get("quality_signals", {}),
        })

    # Sort by a rough combined score
    analyzed.sort(
        key=lambda x: (
            x["difficulty_match_score"] * 0.28
            + x["vocab_accessibility_score"] * 0.18
            + x["channel_score"] / 5 * 0.16
            + x["content_quality_score"] * 0.14
            + x["category_relevance_score"] * 0.14
            + x["recency_score"] * x["recency_importance"] * 0.06
            + x["safety_score"] * 0.04
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
    existing_videos = load_videos_index(DATA_DIR)
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

        # Metadata quality gate (from prefilter/quick_analysis)
        quality_score = cand.get("content_quality_score", 0.5)
        relevance_score = cand.get("category_relevance_score", 0.5)
        safety_score = cand.get("safety_score", 1.0)
        recency_score = cand.get("recency_score", 0.5)
        recency_importance = cand.get("recency_importance", CATEGORY_RECENCY_IMPORTANCE_DEFAULT)
        eval_safety = float(ev.get("safety", 7))
        eval_flags_raw = ev.get("risk_flags", [])
        cand_flags_raw = cand.get("risk_flags", [])
        eval_risk_flags = set(eval_flags_raw if isinstance(eval_flags_raw, list) else [])
        cand_risk_flags = set(cand_flags_raw if isinstance(cand_flags_raw, list) else [])
        merged_risk_flags = eval_risk_flags | cand_risk_flags

        if quality_score < 0.25:
            logger.info("Skipping low metadata quality: %s (quality=%.2f)", vid, quality_score)
            continue
        if relevance_score < 0.1:
            logger.info("Skipping low category relevance: %s (relevance=%.2f)", vid, relevance_score)
            continue
        if safety_score < 0.35:
            logger.info("Skipping low safety score: %s (safety=%.2f)", vid, safety_score)
            continue
        if eval_safety < 5:
            logger.info("Skipping low evaluated safety: %s (safety=%.1f/10)", vid, eval_safety)
            continue
        if merged_risk_flags & BLOCKED_RISK_TAGS:
            logger.info("Skipping blocked risk flags: %s (%s)", vid, sorted(merged_risk_flags & BLOCKED_RISK_TAGS))
            continue

        # Composite scoring (100-point scale)
        # Weights:
        # difficulty 27%, vocab 17%, structure 18%, content 14%, channel 5%,
        # category relevance 5%, metadata quality 5%, recency 5%, safety 4%
        difficulty_match_pts = cand.get("difficulty_match_score", 0) * 27
        vocab_pts = cand.get("vocab_accessibility_score", 0) * 17
        structure_pts = ev.get("structure", 5) / 10 * 18
        content_pts = ev.get("content", 5) / 10 * 14
        channel_pts = cand.get("channel_score", 0) / 5 * 5
        relevance_pts = relevance_score * 5
        quality_pts = quality_score * 5
        recency_pts = recency_score * recency_importance * 5
        safety_pts = ((safety_score * 0.4) + ((eval_safety / 10) * 0.6)) * 4

        total_score = round(
            difficulty_match_pts + vocab_pts + structure_pts + content_pts + channel_pts
            + relevance_pts + quality_pts + recency_pts + safety_pts,
            1,
        )

        # Build reasoning string
        reasons: list[str] = []
        struct_val = ev.get("structure", 0)
        content_val = ev.get("content", 0)
        reasons.append(f"구조 명확({struct_val}/10)")
        pct_common = cand.get("pct_common_words", 0)
        reasons.append(f"어휘 적정({int(pct_common*100)}% common)")
        reasons.append(f"카테고리 적합({int(relevance_score*100)}%)")
        reasons.append(f"콘텐츠 품질({int(quality_score*100)}%)")
        reasons.append(f"최신성({int(recency_score*100)}%)")
        reasons.append(f"안전성({int((eval_safety/10)*100)}%)")
        channel = cand.get("channel", "")
        cand_language = cand.get("target_language", "en")
        if _is_high_priority_channel(channel, cand_language):
            reasons.append(f"{channel} 채널")
        for speaker in LEGENDARY_SPEAKERS:
            if speaker.lower() in cand.get("title", "").lower():
                reasons.append(f"레전드 스피커({speaker})")
                break

        # Estimate difficulty based on speech rate unit
        wpm = cand.get("speech_rate_wpm", 150)
        speed_unit = cand.get("speech_rate_unit", "wpm")
        if speed_unit == "cpm":
            if wpm < 140:
                est_diff = "beginner"
            elif wpm < 220:
                est_diff = "intermediate"
            else:
                est_diff = "advanced"
        else:
            if wpm < 120:
                est_diff = "beginner"
            elif wpm < 140:
                est_diff = "elementary"
            elif wpm < 160:
                est_diff = "intermediate"
            elif wpm < 185:
                est_diff = "upper-intermediate"
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
                "category_relevance": round(relevance_pts, 1),
                "metadata_quality": round(quality_pts, 1),
                "recency": round(recency_pts, 1),
                "safety": round(safety_pts, 1),
            },
            "reasoning": ", ".join(reasons),
            "suggested_category": ev.get("category", ""),
            "estimated_difficulty": est_diff,
            "summary": ev.get("summary", ""),
            "riskFlags": sorted(merged_risk_flags),
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
        default=str(TEMP_DIR / "evaluated.json"),
        help="Path to evaluated.json (rank mode)",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=5,
        help="Number of recommendations to output (default: 5)",
    )

    # Language
    parser.add_argument(
        "--language",
        type=str,
        choices=["en", "zh", "ja"],
        default="en",
        help="Target language (en=English, zh=Chinese, ja=Japanese, default: en)",
    )

    # Common options
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(TEMP_DIR),
        help=f"Output directory (default: {TEMP_DIR})",
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

    # Set DATA_DIR based on language
    global DATA_DIR, VIDEOS_INDEX_PATH
    DATA_DIR = _get_data_dir(args.language)
    VIDEOS_INDEX_PATH = DATA_DIR / "videos.json"

    if args.rank:
        # ============================================================
        # RANK MODE (Steps 6-7)
        # ============================================================
        logger.info("=" * 50)
        logger.info("Video Search Pipeline — RANK MODE (language=%s)", args.language)
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
        logger.info("Video Search Pipeline — SEARCH MODE (language=%s)", args.language)
        logger.info("  Level: %s", args.level)
        logger.info("  Category: %s", args.category)
        if args.topics:
            logger.info("  Topics: %s", args.topics)
        logger.info("=" * 50)

        topics = [t.strip() for t in args.topics.split(",") if t.strip()] if args.topics else None
        total_steps = 4

        # Step 1: Generate queries
        with StepTimer("Generate search queries", 1, total_steps):
            queries = generate_queries(args.level, args.category, topics, language=args.language)
            logger.info("  Queries: %s", queries[:5])

        # Step 2: Search YouTube
        with StepTimer("Search YouTube", 2, total_steps):
            results = search_youtube(queries, max_results_per_query=args.max_results)

        # Step 3: Pre-filter
        with StepTimer("Pre-filter candidates", 3, total_steps):
            filtered = prefilter(
                results,
                args.level,
                language=args.language,
                category=args.category,
                topics=topics,
            )

        # Step 4: Quick analysis (subtitle download + heuristics)
        with StepTimer("Quick analysis (subtitles + heuristics)", 4, total_steps):
            candidates = quick_analysis(
                filtered,
                args.level,
                max_candidates=args.max_candidates,
                language=args.language,
                category=args.category,
                topics=topics,
            )

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
