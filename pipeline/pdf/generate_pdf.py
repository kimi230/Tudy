#!/usr/bin/env python3
"""
Generate consumer-friendly learning PDFs from video analysis data.

Usage:
  python3 pipeline/generate_pdf.py --video-id LNHBMFCzznE --language en
  python3 pipeline/generate_pdf.py --video-id 2K88pWCimZg --language zh
  python3 pipeline/generate_pdf.py --video-id qk__gCOQ7R0 --language ja
  python3 pipeline/generate_pdf.py --all                    # all languages
  python3 pipeline/generate_pdf.py --all --language en      # single language batch
  python3 pipeline/generate_pdf.py --list-missing           # show videos without PDFs
"""

import json
import argparse
import os
import html
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PIPELINE_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = PIPELINE_DIR.parent

LANG_APP_MAP = {"en": "english", "zh": "chinese", "ja": "japanese"}

# ---------------------------------------------------------------------------
# Language-specific configuration
# ---------------------------------------------------------------------------

LANGUAGE_CONFIG = {
    "en": {
        "badge": "English Study Guide",
        "study_url": "https://kimi230.github.io/Tudy/#/study/{video_id}",
        "speed_metric_key": "speechRateWpm",
        "speed_metric_label": "WPM",
        "section5_title": "Connected Speech &amp; Pronunciation",
        "section5_desc": "Natural pronunciation patterns found in the talk. Practice these to sound more natural!",
        "type_labels": {
            "linking": ("Linking (연음)", "#3b82f6"),
            "reduction": ("Reduction (축약)", "#8b5cf6"),
            "elision": ("Elision (탈락)", "#f59e0b"),
            "assimilation": ("Assimilation (동화)", "#10b981"),
        },
    },
    "zh": {
        "badge": "中文 Study Guide",
        "study_url": "https://kimi230.github.io/stdyZh/#/study/{video_id}",
        "speed_metric_key": "speechRateCpm",
        "speed_metric_label": "CPM",
        "section5_title": "Tones &amp; Pronunciation",
        "section5_desc": "Key tone patterns and pronunciation phenomena. Master these for natural-sounding Mandarin!",
        "type_labels": {
            "tone_sandhi": ("Tone Sandhi (변조)", "#3b82f6"),
            "neutral_tone": ("Neutral Tone (경성)", "#8b5cf6"),
            "erhua": ("Erhua (얼화)", "#f59e0b"),
            "tone_pair": ("Tone Pair (성조 조합)", "#10b981"),
        },
    },
    "ja": {
        "badge": "日本語 Study Guide",
        "study_url": "https://kimi230.github.io/stdyJa/#/study/{video_id}",
        "speed_metric_key": "speechRateCpm",
        "speed_metric_label": "CPM",
        "section5_title": "Keigo &amp; Speech Styles",
        "section5_desc": "Politeness levels and speech styles used in this video. Understanding these is essential for natural Japanese!",
        "type_labels": {
            "teineigo": ("Teineigo / 丁寧語 (정중어)", "#3b82f6"),
            "sonkeigo": ("Sonkeigo / 尊敬語 (존경어)", "#8b5cf6"),
            "kenjougo": ("Kenjougo / 謙譲語 (겸양어)", "#f59e0b"),
            "casual": ("Casual / タメ口 (반말)", "#10b981"),
        },
    },
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def fmt(s):
    """HTML-escape a string."""
    return html.escape(str(s)) if s else ""


def normalize_list_data(data):
    """Normalize vocabulary/connected_speech data that may be wrapped in a dict."""
    if isinstance(data, dict):
        # ZH wraps in {"videoId": ..., "vocabulary": [...]} or {"videoId": ..., "connectedSpeech": [...]}
        for key in ("vocabulary", "connectedSpeech", "grammar", "items"):
            if key in data:
                return data[key]
        # fallback: return first list-valued key
        for v in data.values():
            if isinstance(v, list):
                return v
        return []
    return data


def _get_data_dir(language: str) -> Path:
    app_name = LANG_APP_MAP.get(language, "english")
    return PROJECT_ROOT / "apps" / app_name / "public" / "data"


# ---------------------------------------------------------------------------
# Vocab card renderers (language-specific)
# ---------------------------------------------------------------------------

def render_vocab_card_en(v):
    root_html = ""
    rb = v.get("rootBreakdown", {})
    if rb and isinstance(rb, dict):
        if rb.get("prefix"):
            root_html += f'<span class="root-part prefix">{fmt(rb["prefix"])}</span>'
        if rb.get("root"):
            root_html += f'<span class="root-part">{fmt(rb["root"])}</span>'
        if rb.get("suffix"):
            root_html += f'<span class="root-part suffix">{fmt(rb["suffix"])}</span>'

    related = ", ".join(v.get("relatedWords", []))

    return f"""
<div class="vocab-card">
    <div class="word-line">
        <span class="word">{fmt(v.get('word', ''))}</span>
        <span class="phonetic">{fmt(v.get('phonetic', ''))}</span>
        <span class="pos">{fmt(v.get('partOfSpeech', ''))}</span>
    </div>
    <div class="definition">{fmt(v.get('definition', ''))}</div>
    <div class="meaning-ko">{fmt(v.get('meaningKo', ''))}</div>
    <div class="etymology">{fmt(v.get('etymology', ''))}</div>
    <div class="root-breakdown">{root_html}</div>
    <div class="context">"{fmt(v.get('contextSentence', ''))}"</div>
    {"<div class='related'>Related: " + fmt(related) + "</div>" if related else ""}
</div>"""


def render_vocab_card_zh(v):
    # Components breakdown
    comp_html = ""
    for comp in v.get("components", []):
        comp_html += f'<span class="root-part">{fmt(comp.get("character", ""))} ({fmt(comp.get("meaning", ""))})</span>'

    tones = v.get("tones", [])
    tone_str = " ".join(str(t) for t in tones) if tones else ""

    return f"""
<div class="vocab-card">
    <div class="word-line">
        <span class="word">{fmt(v.get('word', ''))}</span>
        <span class="phonetic">{fmt(v.get('pinyin', ''))}</span>
        <span class="pos">{fmt(v.get('partOfSpeech', ''))}</span>
        {f'<span class="pos" style="background:#fef3c7;color:#92400e;">HSK {v.get("hskLevel", "")}</span>' if v.get("hskLevel") else ""}
    </div>
    {f'<div style="font-size:8pt;color:#94a3b8;">Tones: {fmt(tone_str)}</div>' if tone_str else ""}
    <div class="definition">{fmt(v.get('definition', ''))}</div>
    <div class="meaning-ko">{fmt(v.get('koreanMeaning', ''))}</div>
    <div class="root-breakdown">{comp_html}</div>
    {f'<div style="font-size:8pt;color:#64748b;">Measure word: {fmt(v.get("measureWord", ""))}</div>' if v.get("measureWord") else ""}
    <div class="context">"{fmt(v.get('contextSentence', ''))}"</div>
</div>"""


def render_vocab_card_ja(v):
    return f"""
<div class="vocab-card">
    <div class="word-line">
        <span class="word">{fmt(v.get('word', ''))}</span>
        <span class="phonetic">{fmt(v.get('reading', ''))}</span>
        <span class="pos">{fmt(v.get('partOfSpeech', ''))}</span>
        {f'<span class="pos" style="background:#fef3c7;color:#92400e;">JLPT N{v.get("jlptLevel", "")}</span>' if v.get("jlptLevel") else ""}
    </div>
    <div class="definition">{fmt(v.get('definition', ''))}</div>
    <div class="meaning-ko">{fmt(v.get('koreanMeaning', ''))}</div>
    <div class="context">"{fmt(v.get('contextSentence', ''))}"</div>
</div>"""


VOCAB_RENDERERS = {"en": render_vocab_card_en, "zh": render_vocab_card_zh, "ja": render_vocab_card_ja}


# ---------------------------------------------------------------------------
# Connected speech card renderers (language-specific)
# ---------------------------------------------------------------------------

def render_cs_card_en(item):
    return f"""
<div class="cs-card">
    <span class="original">{fmt(item.get('originalText', ''))}</span>
    <span class="arrow">&rarr;</span>
    <span class="korean-phonetic">{fmt(item.get('koreanPhonetic', ''))}</span>
    <div class="details">
        <div class="phonetic-ipa">{fmt(item.get('phonetic', ''))}</div>
        <div class="explanation-text">{fmt(item.get('explanationKo', ''))}</div>
        <div class="practice">{fmt(item.get('practiceGuide', ''))}</div>
    </div>
</div>"""


def render_cs_card_zh(item):
    return f"""
<div class="cs-card">
    <span class="original">{fmt(item.get('originalText', ''))}</span>
    <span class="arrow">&rarr;</span>
    <span class="korean-phonetic">{fmt(item.get('pinyin', ''))}</span>
    <div class="details">
        <div class="phonetic-ipa">{fmt(item.get('toneChange', ''))}</div>
        <div class="explanation-text">{fmt(item.get('explanationKo', ''))}</div>
        <div class="practice">{fmt(item.get('practiceGuide', ''))}</div>
    </div>
</div>"""


def render_cs_card_ja(item):
    return f"""
<div class="cs-card">
    <span class="original">{fmt(item.get('originalText', ''))}</span>
    <span class="arrow">&rarr;</span>
    <span class="korean-phonetic">{fmt(item.get('reading', ''))}</span>
    <div class="details">
        <div class="phonetic-ipa">{fmt(item.get('politeLevel', ''))}</div>
        <div class="explanation-text">{fmt(item.get('explanationKo', ''))}</div>
        <div class="practice">{fmt(item.get('usageContext', ''))}</div>
    </div>
</div>"""


CS_RENDERERS = {"en": render_cs_card_en, "zh": render_cs_card_zh, "ja": render_cs_card_ja}


# ---------------------------------------------------------------------------
# CSS (shared across all languages)
# ---------------------------------------------------------------------------

def get_css(diff_color):
    return f"""
@page {{
    size: A4;
    margin: 20mm 18mm 20mm 18mm;
    @bottom-center {{
        content: counter(page);
        font-size: 9pt;
        color: #94a3b8;
    }}
}}

* {{ box-sizing: border-box; margin: 0; padding: 0; }}

body {{
    font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic",
                 "Noto Sans CJK SC", "Noto Sans CJK JP", "Noto Sans CJK KR", sans-serif;
    font-size: 10pt;
    line-height: 1.6;
    color: #1e293b;
}}

.cover-wrapper {{
    page-break-after: always;
    display: table;
    width: 100%;
    height: 700px;
}}
.cover {{
    display: table-cell;
    vertical-align: middle;
    text-align: center;
    padding: 0 20px;
}}
.cover-badge {{
    display: inline-block;
    background: #f1f5f9;
    color: #64748b;
    font-size: 9pt;
    padding: 4px 14px;
    border-radius: 20px;
    margin-bottom: 20px;
    letter-spacing: 1px;
    text-transform: uppercase;
}}
.cover h1 {{
    font-size: 22pt;
    font-weight: 700;
    line-height: 1.3;
    color: #0f172a;
    margin: 0 auto 12px auto;
    max-width: 480px;
}}
.cover .subtitle {{
    font-size: 12pt;
    color: #64748b;
    margin-bottom: 20px;
}}
.cover-thumbnail {{
    margin: 40px auto 20px auto;
    max-width: 400px;
}}
.cover-thumbnail img {{
    width: 100%;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}}
.cover .desc-ko {{
    font-size: 13pt;
    font-weight: 500;
    color: #475569;
    margin: 0 auto 30px auto;
}}
.cover-stats {{
    margin: 10px auto 0 auto;
}}
.cover-stat {{
    text-align: center;
    display: inline-block;
    margin: 0 12px;
}}
.cover-stat .value {{
    font-size: 16pt;
    font-weight: 700;
    color: #0f172a;
}}
.cover-stat .label {{
    font-size: 8pt;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}}
.diff-badge {{
    display: inline-block;
    background: {diff_color};
    color: white;
    font-size: 9pt;
    font-weight: 600;
    padding: 3px 12px;
    border-radius: 12px;
}}
.cover-study-link {{
    margin-top: 16px;
}}
.cover-study-link a {{
    font-size: 10pt;
    color: #3b82f6;
    text-decoration: none;
    border: 1px solid #bfdbfe;
    padding: 6px 18px;
    border-radius: 20px;
}}
.cover-footer {{
    margin-top: 30px;
    font-size: 8pt;
    color: #cbd5e1;
}}

h2 {{
    font-size: 16pt;
    font-weight: 700;
    color: #0f172a;
    margin-top: 0;
    margin-bottom: 6px;
    padding-bottom: 6px;
    border-bottom: 2px solid #3b82f6;
}}
h3 {{
    font-size: 12pt;
    font-weight: 600;
    color: #1e40af;
    margin-top: 16px;
    margin-bottom: 8px;
}}
.section {{
    page-break-inside: avoid;
    margin-bottom: 20px;
}}
.page-break {{ page-break-before: always; }}

.toc {{
    page-break-after: always;
    padding-top: 40px;
}}
.toc h2 {{ margin-bottom: 20px; }}
.toc-item {{
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px dotted #e2e8f0;
    font-size: 10.5pt;
}}
.toc-item .num {{
    color: #3b82f6;
    font-weight: 700;
    margin-right: 10px;
    min-width: 24px;
}}

.structure-card {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 10px;
    page-break-inside: avoid;
}}
.structure-card .sec-header {{
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
}}
.structure-card .sec-num {{
    background: #3b82f6;
    color: white;
    font-size: 8pt;
    font-weight: 700;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}}
.structure-card .sec-title {{
    font-weight: 600;
    font-size: 10.5pt;
    color: #1e293b;
}}
.structure-card .sec-time {{
    font-size: 8pt;
    color: #94a3b8;
    margin-left: auto;
}}
.structure-card .sec-summary {{
    font-size: 9.5pt;
    color: #475569;
    margin-top: 4px;
}}
.key-points {{
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
}}
.key-point {{
    background: #eff6ff;
    color: #1e40af;
    font-size: 8pt;
    padding: 2px 8px;
    border-radius: 10px;
}}

.vocab-card {{
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 10px;
    page-break-inside: avoid;
}}
.vocab-card .word-line {{
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 4px;
    flex-wrap: wrap;
}}
.vocab-card .word {{
    font-size: 13pt;
    font-weight: 700;
    color: #0f172a;
}}
.vocab-card .phonetic {{
    font-size: 9pt;
    color: #64748b;
    font-style: italic;
}}
.vocab-card .pos {{
    font-size: 8pt;
    background: #e0e7ff;
    color: #4338ca;
    padding: 1px 8px;
    border-radius: 8px;
}}
.vocab-card .definition {{
    font-size: 9.5pt;
    color: #334155;
    margin-bottom: 3px;
}}
.vocab-card .meaning-ko {{
    font-size: 9.5pt;
    color: #1e40af;
    font-weight: 500;
    margin-bottom: 6px;
}}
.vocab-card .etymology {{
    font-size: 8.5pt;
    color: #64748b;
    background: #f8fafc;
    padding: 6px 10px;
    border-radius: 6px;
    margin-bottom: 6px;
}}
.vocab-card .root-breakdown {{
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 6px;
}}
.root-part {{
    font-size: 8pt;
    padding: 2px 8px;
    border-radius: 6px;
    background: #fef3c7;
    color: #92400e;
}}
.root-part.prefix {{ background: #dbeafe; color: #1e40af; }}
.root-part.suffix {{ background: #fce7f3; color: #9d174d; }}
.vocab-card .context {{
    font-size: 8.5pt;
    color: #475569;
    font-style: italic;
    padding-left: 10px;
    border-left: 2px solid #e2e8f0;
}}
.vocab-card .related {{
    font-size: 8pt;
    color: #64748b;
    margin-top: 4px;
}}

.grammar-card {{
    background: #fefce8;
    border: 1px solid #fde68a;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 10px;
    page-break-inside: avoid;
}}
.grammar-card .pattern {{
    font-size: 12pt;
    font-weight: 700;
    color: #92400e;
    margin-bottom: 4px;
}}
.grammar-card .explanation {{
    font-size: 9.5pt;
    color: #451a03;
    margin-bottom: 4px;
}}
.grammar-card .explanation-ko {{
    font-size: 9.5pt;
    color: #78350f;
    margin-bottom: 8px;
}}
.grammar-card .example {{
    font-size: 9pt;
    color: #1e293b;
    background: white;
    padding: 6px 10px;
    border-radius: 6px;
    margin-bottom: 4px;
    border-left: 3px solid #f59e0b;
}}

.cs-type-header {{
    font-size: 11pt;
    font-weight: 600;
    margin-top: 14px;
    margin-bottom: 8px;
    padding: 4px 12px;
    border-radius: 6px;
    color: white;
}}
.cs-card {{
    display: flex;
    align-items: flex-start;
    gap: 14px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 8px;
    page-break-inside: avoid;
}}
.cs-card .original {{
    font-size: 14pt;
    font-weight: 700;
    color: #0f172a;
    min-width: 100px;
}}
.cs-card .arrow {{
    font-size: 14pt;
    color: #94a3b8;
}}
.cs-card .korean-phonetic {{
    font-size: 14pt;
    font-weight: 700;
    color: #3b82f6;
    min-width: 80px;
}}
.cs-card .details {{
    flex: 1;
}}
.cs-card .phonetic-ipa {{
    font-size: 8.5pt;
    color: #64748b;
    font-style: italic;
}}
.cs-card .explanation-text {{
    font-size: 8.5pt;
    color: #475569;
    margin-top: 2px;
}}
.cs-card .practice {{
    font-size: 8.5pt;
    color: #059669;
    margin-top: 2px;
    font-weight: 500;
}}

.signal-card {{
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid #f1f5f9;
    page-break-inside: avoid;
}}
.signal-type {{
    font-size: 7.5pt;
    font-weight: 600;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 8px;
    min-width: 70px;
    text-align: center;
    color: white;
}}
.signal-type.hook {{ background: #ef4444; }}
.signal-type.introduction {{ background: #8b5cf6; }}
.signal-type.example {{ background: #f59e0b; }}
.signal-type.emphasis {{ background: #ec4899; }}
.signal-type.transition {{ background: #3b82f6; }}
.signal-type.enumeration {{ background: #10b981; }}
.signal-type.summary {{ background: #6366f1; }}
.signal-type.conclusion {{ background: #0ea5e9; }}
.signal-type.call-to-action {{ background: #ef4444; }}
.signal-expr {{
    font-size: 10pt;
    font-weight: 600;
    color: #1e293b;
    font-style: italic;
}}
.signal-role {{
    font-size: 8.5pt;
    color: #64748b;
    margin-top: 2px;
}}
"""


# ---------------------------------------------------------------------------
# HTML generation
# ---------------------------------------------------------------------------

def generate_html(video_id, language="en"):
    lang_app = LANG_APP_MAP[language]
    data_dir = os.path.join("apps", lang_app, "public", "data", video_id)
    cfg = LANGUAGE_CONFIG[language]

    meta = load_json(os.path.join(data_dir, "meta.json"))
    vocab_raw = load_json(os.path.join(data_dir, "vocabulary.json"))
    grammar_raw = load_json(os.path.join(data_dir, "grammar.json"))
    connected_raw = load_json(os.path.join(data_dir, "connected_speech.json"))
    structure = load_json(os.path.join(data_dir, "structure.json"))
    segments_data = load_json(os.path.join(data_dir, "segments.json"))
    segments = segments_data.get("segments", segments_data) if isinstance(segments_data, dict) else segments_data

    vocab = normalize_list_data(vocab_raw)
    grammar = normalize_list_data(grammar_raw)
    connected = normalize_list_data(connected_raw)

    # Duration formatting
    dur = meta.get("duration", 0)
    dur_min = dur // 60
    dur_sec = dur % 60

    # Difficulty label + color
    diff = meta.get("difficulty", "intermediate")
    diff_colors = {
        "beginner": ("#22c55e", "Beginner"),
        "elementary": ("#84cc16", "Elementary"),
        "intermediate": ("#eab308", "Intermediate"),
        "upper-intermediate": ("#f97316", "Upper-Intermediate"),
        "advanced": ("#ef4444", "Advanced"),
    }
    diff_color, diff_label = diff_colors.get(diff, ("#eab308", diff.title()))

    # Essential / extra vocab split
    essential_vocab = [v for v in vocab if v.get("isEssential", False)]
    extra_vocab = [v for v in vocab if not v.get("isEssential", False)]

    # Connected speech grouped by type
    cs_types = {}
    for item in connected:
        t = item.get("type", "other")
        cs_types.setdefault(t, []).append(item)

    type_labels = cfg["type_labels"]
    speed_val = meta.get(cfg["speed_metric_key"], 0)
    study_url = cfg["study_url"].format(video_id=video_id)
    render_vocab = VOCAB_RENDERERS[language]
    render_cs = CS_RENDERERS[language]

    # Build HTML
    h = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
{get_css(diff_color)}
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover-wrapper">
<div class="cover">
    <div class="cover-badge">{fmt(cfg['badge'])}</div>
    <h1>{fmt(meta.get('title', ''))}</h1>
    <div class="subtitle">{fmt(meta.get('channel', ''))}</div>
    <div class="desc-ko">{fmt(meta.get('descriptionKo', ''))}</div>
    <div><span class="diff-badge">{fmt(diff_label)}</span></div>
    <div class="cover-stats">
        <div class="cover-stat">
            <div class="value">{dur_min}:{dur_sec:02d}</div>
            <div class="label">Duration</div>
        </div>
        <div class="cover-stat">
            <div class="value">{speed_val}</div>
            <div class="label">{fmt(cfg['speed_metric_label'])}</div>
        </div>
        <div class="cover-stat">
            <div class="value">{meta.get('segmentCount', 0)}</div>
            <div class="label">Segments</div>
        </div>
        <div class="cover-stat">
            <div class="value">{meta.get('vocabularyCount', len(vocab))}</div>
            <div class="label">Vocabulary</div>
        </div>
        <div class="cover-stat">
            <div class="value">{meta.get('grammarPatternCount', len(grammar))}</div>
            <div class="label">Grammar</div>
        </div>
    </div>
    <div class="cover-thumbnail">
        <img src="{fmt(meta.get('thumbnail', ''))}" alt="thumbnail">
    </div>
    <div class="cover-study-link">
        <a href="{fmt(study_url)}">10-Step Study &rarr;</a>
    </div>
    <div class="cover-footer">stdyLang &mdash; AI-Powered Language Learning</div>
</div>
</div>

<!-- TABLE OF CONTENTS -->
<div class="toc">
    <h2>Contents</h2>
    <div class="toc-item"><span><span class="num">01</span>Video Structure Overview</span></div>
    <div class="toc-item"><span><span class="num">02</span>Essential Vocabulary ({len(essential_vocab)} words)</span></div>
    <div class="toc-item"><span><span class="num">03</span>Additional Vocabulary ({len(extra_vocab)} words)</span></div>
    <div class="toc-item"><span><span class="num">04</span>Grammar Patterns ({len(grammar)} patterns)</span></div>
    <div class="toc-item"><span><span class="num">05</span>{cfg['section5_title']} ({len(connected)} items)</span></div>
    <div class="toc-item"><span><span class="num">06</span>Signal Expressions ({len(structure.get('signalExpressions', []))} expressions)</span></div>
</div>

<!-- 1. STRUCTURE OVERVIEW -->
<h2>01 &nbsp; Video Structure Overview</h2>
<p style="font-size:9.5pt; color:#64748b; margin-bottom:14px;">
    This {dur_min}-minute video by {fmt(meta.get('channel', ''))} is structured into {len(structure.get('sections', []))} key sections.
</p>
"""
    for i, sec in enumerate(structure.get("sections", []), 1):
        start_seg = sec.get("startSegment", 0)
        end_seg = sec.get("endSegment", 0)
        start_time = ""
        end_time = ""
        if start_seg < len(segments):
            st = segments[start_seg].get("start", 0)
            start_time = f"{int(st)//60}:{int(st)%60:02d}"
        if end_seg < len(segments):
            et = segments[end_seg].get("end", 0)
            end_time = f"{int(et)//60}:{int(et)%60:02d}"

        kp_html = ""
        for kp in sec.get("keyPoints", []):
            kp_html += f'<span class="key-point">{fmt(kp)}</span>'

        h += f"""
<div class="structure-card">
    <div class="sec-header">
        <span class="sec-num">{i}</span>
        <span class="sec-title">{fmt(sec.get('section', sec.get('title', '')))}</span>
        <span class="sec-time">{start_time} ~ {end_time}</span>
    </div>
    <div class="sec-summary">{fmt(sec.get('summaryKo', sec.get('summary', '')))}</div>
    <div class="key-points">{kp_html}</div>
</div>"""

    # 2. Essential Vocabulary
    h += """
<div class="page-break"></div>
<h2>02 &nbsp; Essential Vocabulary</h2>
<p style="font-size:9.5pt; color:#64748b; margin-bottom:14px;">
    Core words from the video that are high-value for learners.
</p>
"""
    for v in essential_vocab:
        h += render_vocab(v)

    # 3. Additional Vocabulary
    if extra_vocab:
        h += """
<div class="page-break"></div>
<h2>03 &nbsp; Additional Vocabulary</h2>
<p style="font-size:9.5pt; color:#64748b; margin-bottom:14px;">
    Supplementary words that appear in the video and are useful for expanding your vocabulary.
</p>
"""
        for v in extra_vocab:
            h += render_vocab(v)

    # 4. Grammar Patterns
    h += """
<div class="page-break"></div>
<h2>04 &nbsp; Grammar Patterns</h2>
<p style="font-size:9.5pt; color:#64748b; margin-bottom:14px;">
    Key grammar structures used in the video. Each pattern includes real examples.
</p>
"""
    for g in grammar:
        examples_html = ""
        for ex in g.get("examples", []):
            examples_html += f'<div class="example">{fmt(ex)}</div>'

        h += f"""
<div class="grammar-card">
    <div class="pattern">{fmt(g.get('pattern', ''))}</div>
    <div class="explanation">{fmt(g.get('explanation', ''))}</div>
    <div class="explanation-ko">{fmt(g.get('explanationKo', ''))}</div>
    {examples_html}
</div>"""

    # 5. Connected Speech / Tones / Keigo
    h += f"""
<div class="page-break"></div>
<h2>05 &nbsp; {cfg['section5_title']}</h2>
<p style="font-size:9.5pt; color:#64748b; margin-bottom:14px;">
    {cfg['section5_desc']}
</p>
"""
    for cs_type, items in cs_types.items():
        label, color = type_labels.get(cs_type, (cs_type.replace("_", " ").title(), "#64748b"))
        h += f'<div class="cs-type-header" style="background:{color};">{label}</div>'
        for item in items:
            h += render_cs(item)

    # 6. Signal Expressions
    h += f"""
<div class="page-break"></div>
<h2>06 &nbsp; Signal Expressions</h2>
<p style="font-size:9.5pt; color:#64748b; margin-bottom:14px;">
    Key phrases used to structure the content. Learning these helps you follow presentations.
</p>
"""
    for sig in structure.get("signalExpressions", []):
        sig_type = sig.get("type", "other")
        h += f"""
<div class="signal-card">
    <span class="signal-type {sig_type}">{fmt(sig_type)}</span>
    <div>
        <div class="signal-expr">"{fmt(sig.get('expression', ''))}"</div>
        <div class="signal-role">{fmt(sig.get('role', ''))}</div>
    </div>
</div>"""

    # Footer
    h += f"""
<div class="page-break"></div>
<div style="text-align:center; padding-top:200px;">
    <div style="font-size:14pt; font-weight:700; color:#0f172a; margin-bottom:10px;">Keep Learning!</div>
    <div style="font-size:9pt; color:#94a3b8; margin-top:40px;">
        Generated by stdyLang &mdash; AI-Powered Language Learning<br>
        youtube.com/watch?v={video_id}
    </div>
</div>

</body>
</html>"""

    return h


# ---------------------------------------------------------------------------
# PDF generation
# ---------------------------------------------------------------------------

def generate_pdf_for_video(video_id, language="en", output=None):
    """Generate HTML + PDF for a single video. Returns (html_path, pdf_path | None)."""
    html_content = generate_html(video_id, language)

    lang_app = LANG_APP_MAP[language]
    data_dir = os.path.join("apps", lang_app, "public", "data", video_id)
    html_path = os.path.join(data_dir, "study_guide.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    output_path = output or os.path.join(data_dir, "study_guide.pdf")
    pdf_ok = False
    try:
        from weasyprint import HTML as WeasyprintHTML
        WeasyprintHTML(string=html_content, base_url=".").write_pdf(output_path)
        pdf_ok = True
    except ImportError:
        pass
    except Exception as e:
        print(f"  [WARN] PDF generation failed for {video_id}: {e}", file=sys.stderr)

    return html_path, output_path if pdf_ok else None


# ---------------------------------------------------------------------------
# Batch helpers
# ---------------------------------------------------------------------------

def enumerate_targets(language=None):
    """List (video_id, lang) tuples for all videos, optionally filtered."""
    langs = [language] if language else ["en", "zh", "ja"]
    targets = []
    for lang in langs:
        data_dir = _get_data_dir(lang)
        index_path = data_dir / "videos.json"
        if not index_path.exists():
            continue
        videos = load_json(str(index_path))
        for v in videos:
            vid = v.get("videoId", "")
            meta_path = data_dir / vid / "meta.json"
            if vid and meta_path.exists():
                targets.append((vid, lang))
    return targets


def list_missing(language=None):
    """Show videos that don't have a study_guide.pdf yet."""
    targets = enumerate_targets(language)
    missing = []
    for vid, lang in targets:
        data_dir = _get_data_dir(lang)
        pdf_path = data_dir / vid / "study_guide.pdf"
        if not pdf_path.exists():
            missing.append((vid, lang))
    return missing


def generate_all(language=None):
    """Generate PDFs for all videos (or one language). Returns (ok, fail) counts."""
    targets = enumerate_targets(language)
    ok_count = 0
    fail_count = 0
    for vid, lang in targets:
        try:
            html_path, pdf_path = generate_pdf_for_video(vid, lang)
            status = "PDF" if pdf_path else "HTML only"
            print(f"  [{lang.upper()}] {vid}: {status}")
            ok_count += 1
        except Exception as e:
            print(f"  [{lang.upper()}] {vid}: FAILED — {e}", file=sys.stderr)
            fail_count += 1
    return ok_count, fail_count


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generate learning PDFs for stdyLang")
    parser.add_argument("--video-id", default=None, help="Single video ID")
    parser.add_argument("--language", default=None, choices=["en", "zh", "ja"],
                        help="Target language (default: all for batch, en for single)")
    parser.add_argument("--output", default=None, help="Output PDF path (single mode)")
    parser.add_argument("--all", action="store_true", help="Generate for all videos")
    parser.add_argument("--list-missing", action="store_true", help="List videos without PDFs")
    args = parser.parse_args()

    if args.list_missing:
        missing = list_missing(args.language)
        if not missing:
            print("All videos have PDFs!")
        else:
            print(f"Missing PDFs ({len(missing)}):")
            for vid, lang in missing:
                print(f"  [{lang.upper()}] {vid}")
        return

    if args.all:
        print("Generating PDFs for all videos...")
        ok, fail = generate_all(args.language)
        print(f"\nDone: {ok} succeeded, {fail} failed")
        return

    if not args.video_id:
        parser.error("--video-id is required (or use --all / --list-missing)")

    lang = args.language or "en"
    html_path, pdf_path = generate_pdf_for_video(args.video_id, lang, args.output)
    print(f"HTML written to {html_path}")
    if pdf_path:
        print(f"PDF written to {pdf_path}")
    else:
        print("weasyprint not available or failed — HTML only generated.")


if __name__ == "__main__":
    main()
