"""Brand constants, color palette, font sizes, and layout specs for Instagram content."""

from pathlib import Path

# ── Directories ──────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
FONTS_DIR = BASE_DIR / "fonts"
OUTPUT_DIR = BASE_DIR / "output"

# ── Canvas Sizes ─────────────────────────────────────────────────────
FEED_SIZE = (1080, 1350)   # 4:5 ratio
STORY_SIZE = (1080, 1920)  # 9:16 ratio

# ── Color Palette ────────────────────────────────────────────────────
# Dark premium aesthetic
BG_PRIMARY = "#0D0D0D"        # near-black background
BG_CARD = "#1A1A2E"           # slightly lighter card bg
BG_GRADIENT_TOP = "#0D0D0D"
BG_GRADIENT_BOTTOM = "#16213E"

# Accent colors
ACCENT_YELLOW = "#F5C542"     # Korean meaning, highlight
ACCENT_BLUE = "#4A90D9"       # grammar pattern, type badge
ACCENT_GREEN = "#4CAF50"      # pronunciation, practice
ACCENT_ORANGE = "#FF8C42"     # etymology, root breakdown
ACCENT_PURPLE = "#9B59B6"     # reel CTA

# Text colors
TEXT_WHITE = "#FFFFFF"
TEXT_LIGHT = "#E0E0E0"
TEXT_MUTED = "#808080"
TEXT_DIM = "#555555"

# Type badge colors (connected speech)
TYPE_COLORS = {
    "reduction": "#FF6B6B",
    "linking": "#4ECDC4",
    "elision": "#FFE66D",
    "assimilation": "#A8E6CF",
}

# ── Typography ───────────────────────────────────────────────────────
FONT_BOLD = "Pretendard-Bold.otf"
FONT_SEMIBOLD = "Pretendard-SemiBold.otf"

# Feed card (1080x1350)
FONT_SIZES_FEED = {
    "word_main": 72,        # 단어 (대)
    "phonetic": 28,         # 발음기호
    "meaning_ko": 42,       # 한국어 뜻
    "etymology": 24,        # 어원 분해
    "context": 26,          # 문맥 예문
    "speaker": 22,          # 화자 귀속
    "label": 20,            # 카테고리 라벨
    "pattern": 42,          # 문법 패턴
    "explanation": 26,      # 설명
    "korean_reading": 56,   # 한국어 음독 (대)
    "type_badge": 22,       # 타입 뱃지
    "brand": 18,            # 브랜드 워터마크
}

# Story card (1080x1920)
FONT_SIZES_STORY = {k: int(v * 1.1) for k, v in FONT_SIZES_FEED.items()}

# ── Layout ───────────────────────────────────────────────────────────
PADDING = 80               # outer padding
PADDING_STORY = 100        # story outer padding
LINE_SPACING = 1.4         # line height multiplier
SECTION_GAP = 40           # gap between sections
CORNER_RADIUS = 24         # rounded corner radius

# ── Brand ────────────────────────────────────────────────────────────
BRAND_NAME = "Tudy"
BRAND_TAGLINE = "세계적 연사의 인사이트로 영어 체화"
BRAND_CTA = "프로필 링크에서 무료 스터디 가이드 받기"
BRAND_HASHTAGS_BASE = [
    "#영어공부", "#영어회화", "#영어학습", "#영어표현",
    "#TED영어", "#영어듣기", "#영어어휘", "#영어문법",
]

# ── Reel Layout (1080x1920, 16:9 source → 1080x608 scaled) ──────────
# Alignment=8 (top-center): MarginV = distance from top of canvas
# 영상 영역: 656-1264px (608px), 하단 검정: 1264-1920px (656px)
# 자막은 하단 검정 영역 중앙에 배치
REEL_SUB_EN_MARGIN_V = 1380     # English subtitle — 하단 영역 중앙 상부
REEL_SUB_KO_MARGIN_V = 1460     # Korean subtitle — EN 아래
REEL_HEADLINE_MARGIN_V = 536    # Headline position in top bar
REEL_SUB_EN_FONTSIZE = 56
REEL_SUB_KO_FONTSIZE = 48
REEL_HEADLINE_FONTSIZE = 72
REEL_SERIES_TITLE_MARGIN_V = 320  # 시리즈 타이틀 — 카운트다운(420) 바로 위
REEL_SERIES_TITLE_FONTSIZE = 102  # 카드 72pt × (1920/1350) 비율 보정
REEL_COUNTDOWN_MARGIN_V = 420     # 상단 제목 영역 (Alignment=8: top-center)
REEL_COUNTDOWN_FONTSIZE = 60      # 카운트다운 크기 (40 × 1.5)
REEL_BRAND_MARGIN_V = 1700      # 하단 브랜딩 위치
REEL_BRAND_FONTSIZE = 30

# ── Content Types ────────────────────────────────────────────────────
CONTENT_TYPES = ["vocabulary", "grammar", "pronunciation", "reel"]

WEEKLY_SCHEDULE = {
    0: "vocabulary",    # Monday
    2: "grammar",       # Wednesday
    3: "reel",          # Thursday
    4: "pronunciation", # Friday
}
