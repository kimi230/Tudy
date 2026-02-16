"""
Content analysis module.

Uses Ollama with local LLMs (default: gemma2:9b) to analyze transcript
segments for vocabulary, grammar, connected speech, and structure.
"""

import json
import logging
import re
from typing import Any, Literal, TypedDict

import ollama

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "qwen3:8b"


# --- Type definitions ---

DifficultyLevel = Literal[
    "beginner", "elementary", "intermediate", "upper-intermediate", "advanced"
]


class RootBreakdown(TypedDict, total=False):
    prefix: str | None
    root: str
    suffix: str | None


class VocabularyItem(TypedDict, total=False):
    word: str
    definition: str
    meaningKo: str
    etymology: str
    rootBreakdown: RootBreakdown
    relatedWords: list[str]
    isEssential: bool
    partOfSpeech: str
    phonetic: str
    contextSentence: str
    segmentIndex: int


class GrammarPattern(TypedDict, total=False):
    pattern: str
    explanation: str
    explanationKo: str
    examples: list[str]
    segmentIndex: int


class ConnectedSpeechItem(TypedDict, total=False):
    type: str  # linking, reduction, elision, assimilation
    originalText: str
    phonetic: str
    koreanPhonetic: str  # approximate Korean phonetic (e.g., "워너")
    explanation: str
    explanationKo: str
    practiceGuide: str  # Korean practice tip
    segmentIndex: int


class SignalExpression(TypedDict, total=False):
    expression: str
    type: str  # transition_to_finding, summary, emphasis, enumeration, etc.
    segmentIndex: int
    role: str  # Korean description of the signal's role


class SpeechStructureSection(TypedDict, total=False):
    section: str  # intro, body, conclusion
    startSegment: int
    endSegment: int
    summary: str
    summaryKo: str
    keyPoints: list[str]


# --- Utility functions ---


def _call_ollama(
    prompt: str,
    system_prompt: str = "",
    model: str = DEFAULT_MODEL,
) -> str:
    """Call Ollama and return the response text.

    Args:
        prompt: The user prompt.
        system_prompt: Optional system prompt.
        model: Ollama model identifier.

    Returns:
        The model's response text.
    """
    messages: list[dict[str, str]] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    # For qwen3 models, append /no_think to disable thinking mode
    effective_prompt = prompt
    if "qwen3" in model.lower():
        effective_prompt = prompt + " /no_think"
    messages.append({"role": "user", "content": effective_prompt})

    logger.debug("Calling ollama model=%s, prompt length=%d", model, len(prompt))

    response = ollama.chat(model=model, messages=messages)
    return response["message"]["content"]


def _call_ollama_json(
    prompt: str,
    system_prompt: str = "",
    model: str = DEFAULT_MODEL,
    retries: int = 3,
) -> Any:
    """Call Ollama and parse the response as JSON with retries.

    Args:
        prompt: The user prompt.
        system_prompt: Optional system prompt.
        model: Ollama model identifier.
        retries: Number of attempts before giving up.

    Returns:
        Parsed JSON object.

    Raises:
        ValueError: If all retries fail.
    """
    last_error = None
    for attempt in range(1, retries + 1):
        response_text = _call_ollama(prompt, system_prompt, model)
        try:
            return _parse_json_response(response_text)
        except ValueError as e:
            last_error = e
            if attempt < retries:
                logger.warning(
                    "JSON parse failed (attempt %d/%d): %s — retrying",
                    attempt, retries, e,
                )
            else:
                logger.error(
                    "JSON parse failed after %d attempts. Last response (500 chars): %s",
                    retries, response_text[:500],
                )
    raise last_error  # type: ignore[misc]


def _fix_json_strings(text: str) -> str:
    """Fix unescaped control characters inside JSON string values."""
    # Replace literal newlines/tabs inside strings with escaped versions
    result = []
    in_string = False
    escape_next = False
    for ch in text:
        if escape_next:
            result.append(ch)
            escape_next = False
            continue
        if ch == '\\' and in_string:
            result.append(ch)
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            result.append(ch)
            continue
        if in_string:
            if ch == '\n':
                result.append('\\n')
            elif ch == '\r':
                result.append('\\r')
            elif ch == '\t':
                result.append('\\t')
            elif ord(ch) < 0x20:
                result.append(f'\\u{ord(ch):04x}')
            else:
                result.append(ch)
        else:
            result.append(ch)
    return ''.join(result)


def _parse_json_response(response_text: str) -> Any:
    """Parse JSON from an LLM response, handling code fences and stray text."""
    text = response_text.strip()

    # Strip <think>...</think> blocks (qwen3 thinking mode)
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

    # Try to extract from markdown code fences
    json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if json_match:
        text = json_match.group(1).strip()

    # Try to find JSON array or object
    for pattern in [r"\[.*\]", r"\{.*\}"]:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            candidate = match.group(0)
            # Clean control characters that sometimes appear in LLM output
            candidate = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", candidate)
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                # Try fixing unescaped newlines/tabs inside JSON string values
                fixed = _fix_json_strings(candidate)
                try:
                    return json.loads(fixed)
                except json.JSONDecodeError:
                    continue

    # Last resort: try parsing the whole text
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        fixed = _fix_json_strings(text)
        try:
            return json.loads(fixed)
        except json.JSONDecodeError as e:
            logger.error("Failed to parse JSON from LLM response: %s", e)
            logger.debug("Response text (first 500 chars): %s", response_text[:500])
            raise ValueError(f"Could not parse LLM response as JSON: {e}")


def _segments_to_text_block(segments: list[dict[str, Any]]) -> str:
    """Convert segments to a numbered text block for LLM input."""
    lines = []
    for seg in segments:
        lines.append(f"[{seg['index']}] {seg['textEn']}")
    return "\n".join(lines)


# --- Analysis functions ---


def estimate_difficulty(
    segments: list[dict[str, Any]],
    duration: int,
    total_words: int | None = None,
    model: str = DEFAULT_MODEL,
) -> DifficultyLevel:
    """Estimate the difficulty level of a video based on its transcript.

    Uses speech rate, average word length, and vocabulary complexity
    as heuristics, then validates with the LLM.

    Args:
        segments: Cleaned transcript segments.
        duration: Video duration in seconds.
        total_words: Optional pre-computed total word count.
        model: Ollama model identifier.

    Returns:
        Difficulty level string.
    """
    logger.info("Estimating difficulty level")

    # Calculate speech rate
    if total_words is None:
        total_words = sum(
            len(seg["textEn"].split()) for seg in segments
        )

    speech_rate = (total_words / duration * 60) if duration > 0 else 0
    avg_word_length = 0
    all_words = []
    for seg in segments:
        all_words.extend(seg["textEn"].split())
    if all_words:
        avg_word_length = sum(len(w.strip(".,!?;:")) for w in all_words) / len(
            all_words
        )

    # Build a sample of the transcript for LLM analysis
    sample_segments = segments[:10] + segments[len(segments) // 2 : len(segments) // 2 + 5]
    sample_text = _segments_to_text_block(sample_segments)

    prompt = f"""Analyze the difficulty level of this English transcript.

Statistics:
- Total words: {total_words}
- Duration: {duration} seconds
- Speech rate: {speech_rate:.1f} words per minute
- Average word length: {avg_word_length:.1f} characters

Transcript sample:
{sample_text}

Based on the speech rate, vocabulary complexity, sentence structure, and topic difficulty, \
classify this into EXACTLY ONE of these levels:
- "beginner" (very slow, simple words, basic sentences)
- "elementary" (slow, common vocabulary, short sentences)
- "intermediate" (moderate pace, some complex vocabulary)
- "upper-intermediate" (natural pace, varied vocabulary, complex sentences)
- "advanced" (fast pace, specialized vocabulary, complex ideas)

Return ONLY a JSON object with a single key "difficulty" and the level as value.
Example: {{"difficulty": "intermediate"}}"""

    try:
        result = _call_ollama_json(prompt, model=model, retries=2)
        difficulty = result.get("difficulty", "intermediate")

        valid_levels = [
            "beginner",
            "elementary",
            "intermediate",
            "upper-intermediate",
            "advanced",
        ]
        if difficulty not in valid_levels:
            logger.warning(
                "LLM returned invalid difficulty '%s', falling back to heuristic",
                difficulty,
            )
            # Heuristic fallback based on speech rate
            if speech_rate < 100:
                difficulty = "beginner"
            elif speech_rate < 130:
                difficulty = "elementary"
            elif speech_rate < 160:
                difficulty = "intermediate"
            elif speech_rate < 190:
                difficulty = "upper-intermediate"
            else:
                difficulty = "advanced"

    except (ValueError, KeyError) as e:
        logger.warning("LLM difficulty estimation failed: %s, using heuristic", e)
        if speech_rate < 100:
            difficulty = "beginner"
        elif speech_rate < 130:
            difficulty = "elementary"
        elif speech_rate < 160:
            difficulty = "intermediate"
        elif speech_rate < 190:
            difficulty = "upper-intermediate"
        else:
            difficulty = "advanced"

    logger.info(
        "Difficulty: %s (speech rate: %.1f wpm, avg word len: %.1f)",
        difficulty,
        speech_rate,
        avg_word_length,
    )
    return difficulty


def extract_vocabulary(
    segments: list[dict[str, Any]],
    max_words: int = 30,
    model: str = DEFAULT_MODEL,
) -> list[VocabularyItem]:
    """Extract key vocabulary items from the transcript.

    Args:
        segments: Cleaned transcript segments.
        max_words: Maximum number of vocabulary items to extract.
        model: Ollama model identifier.

    Returns:
        List of vocabulary items with definitions and context.
    """
    logger.info("Extracting vocabulary (max %d words)", max_words)

    transcript_text = _segments_to_text_block(segments)

    prompt = f"""Extract the {max_words} most important English vocabulary words from this transcript.

IMPORTANT CRITERIA for word selection:
- Focus on words ESSENTIAL for understanding the main content (key nouns, verbs that carry meaning)
- Mark truly essential words (needed to understand the core message) with "isEssential": true
- Skip filler words, common words (the, is, have), and words not central to comprehension
- Include words that have interesting etymology for learning efficiency

Transcript:
{transcript_text}

For each word, provide ALL of these fields:
- "word": the vocabulary word or phrase
- "definition": clear English definition
- "meaningKo": Korean translation/meaning
- "etymology": word origin story (Latin, Greek, Old English, etc.) - be specific about the root language and original meaning
- "rootBreakdown": object with prefix/root/suffix decomposition for etymology learning:
  - "prefix": prefix with meaning in Korean, e.g. "re- (다시)" or null if none
  - "root": root/stem with meaning, e.g. "vulner- (상처, wound)"
  - "suffix": suffix with meaning, e.g. "-able (할 수 있는)" or null if none
- "relatedWords": array of 2-5 words sharing the same root (helps learn multiple words from one root)
- "isEssential": true if this word is critical for understanding the speech's main message, false otherwise
- "partOfSpeech": noun, verb, adjective, adverb, phrase, etc.
- "phonetic": IPA phonetic transcription
- "contextSentence": the sentence from the transcript where it appears
- "segmentIndex": the segment number [N] where it appears

Return ONLY a JSON array of objects. No extra text or explanation."""

    try:
        vocabulary = _call_ollama_json(prompt, model=model, retries=3)
    except (ValueError, json.JSONDecodeError) as e:
        logger.error("Vocabulary extraction failed: %s", e)
        return []

    if not isinstance(vocabulary, list):
        logger.error("Vocabulary response is not a list")
        return []

    # Validate and clean items
    cleaned: list[VocabularyItem] = []
    for item in vocabulary[:max_words]:
        if not isinstance(item, dict) or "word" not in item:
            continue

        # Parse rootBreakdown
        raw_breakdown = item.get("rootBreakdown", {})
        root_breakdown: RootBreakdown | None = None
        if isinstance(raw_breakdown, dict) and raw_breakdown.get("root"):
            root_breakdown = RootBreakdown(
                prefix=raw_breakdown.get("prefix"),
                root=str(raw_breakdown.get("root", "")),
                suffix=raw_breakdown.get("suffix"),
            )

        # Parse relatedWords
        raw_related = item.get("relatedWords", [])
        related_words = [str(w) for w in raw_related] if isinstance(raw_related, list) else []

        entry = VocabularyItem(
            word=str(item.get("word", "")),
            definition=str(item.get("definition", "")),
            meaningKo=str(item.get("meaningKo", "")),
            etymology=str(item.get("etymology", "")),
            isEssential=bool(item.get("isEssential", False)),
            partOfSpeech=str(item.get("partOfSpeech", "")),
            phonetic=str(item.get("phonetic", "")),
            contextSentence=str(item.get("contextSentence", "")),
            segmentIndex=int(item.get("segmentIndex", 0)),
        )
        if root_breakdown:
            entry["rootBreakdown"] = root_breakdown
        if related_words:
            entry["relatedWords"] = related_words

        cleaned.append(entry)

    logger.info("Extracted %d vocabulary items", len(cleaned))
    return cleaned


def analyze_grammar_patterns(
    segments: list[dict[str, Any]],
    max_patterns: int = 15,
    model: str = DEFAULT_MODEL,
) -> list[GrammarPattern]:
    """Analyze grammar patterns found in the transcript.

    Args:
        segments: Cleaned transcript segments.
        max_patterns: Maximum number of patterns to extract.
        model: Ollama model identifier.

    Returns:
        List of grammar pattern objects.
    """
    logger.info("Analyzing grammar patterns (max %d)", max_patterns)

    transcript_text = _segments_to_text_block(segments)

    prompt = f"""Analyze the English grammar patterns in this transcript. \
Identify the {max_patterns} most notable or educational grammar patterns.

Transcript:
{transcript_text}

For each pattern, provide:
- "pattern": the grammar pattern name (e.g., "Present Perfect Continuous", "Relative Clause", "Conditional Type 2")
- "explanation": clear explanation of the pattern in English
- "explanationKo": explanation in Korean
- "examples": array of 1-3 example sentences from the transcript that use this pattern
- "segmentIndex": the segment number [N] of the first example

Return ONLY a JSON array of objects. No extra text."""

    try:
        patterns = _call_ollama_json(prompt, model=model, retries=3)
    except (ValueError, json.JSONDecodeError) as e:
        logger.error("Grammar analysis failed: %s", e)
        return []

    if not isinstance(patterns, list):
        logger.error("Grammar response is not a list")
        return []

    cleaned: list[GrammarPattern] = []
    for item in patterns[:max_patterns]:
        if not isinstance(item, dict) or "pattern" not in item:
            continue
        examples = item.get("examples", [])
        if not isinstance(examples, list):
            examples = [str(examples)]
        cleaned.append(
            GrammarPattern(
                pattern=str(item.get("pattern", "")),
                explanation=str(item.get("explanation", "")),
                explanationKo=str(item.get("explanationKo", "")),
                examples=[str(e) for e in examples[:3]],
                segmentIndex=int(item.get("segmentIndex", 0)),
            )
        )

    logger.info("Found %d grammar patterns", len(cleaned))
    return cleaned


def analyze_connected_speech(
    segments: list[dict[str, Any]],
    model: str = DEFAULT_MODEL,
) -> list[ConnectedSpeechItem]:
    """Analyze connected speech phenomena in the transcript.

    Identifies linking, reduction, elision, and assimilation patterns
    that affect pronunciation in natural speech.

    Args:
        segments: Cleaned transcript segments.
        model: Ollama model identifier.

    Returns:
        List of connected speech phenomenon objects.
    """
    logger.info("Analyzing connected speech phenomena")

    transcript_text = _segments_to_text_block(segments)

    prompt = f"""Analyze the connected speech phenomena in this English transcript. \
Identify instances of linking, reduction, elision, and assimilation that \
would occur in natural spoken English.

Transcript:
{transcript_text}

For each phenomenon, provide:
- "type": one of "linking", "reduction", "elision", "assimilation"
- "originalText": the phrase as written in the transcript
- "phonetic": how it actually sounds in connected speech (IPA or simplified)
- "koreanPhonetic": approximate Korean phonetic representation (e.g., "want to" → "워너", "don't you" → "돈츄")
- "explanation": what happens phonetically, in English
- "explanationKo": explanation in Korean
- "practiceGuide": a short Korean tip for practicing this sound (e.g., "워너 라고 빠르게 말해보세요")
- "segmentIndex": the segment number [N] where it occurs

Types explained:
- linking: sounds connecting between words (e.g., "an apple" -> "a napple")
- reduction: weakened/shortened sounds (e.g., "want to" -> "wanna")
- elision: dropped sounds (e.g., "next day" -> the /t/ is dropped)
- assimilation: sounds changing to match neighbors (e.g., "don't you" -> "donchu")

Return ONLY a JSON array of objects. Aim for 10-20 examples covering all types."""

    try:
        items = _call_ollama_json(prompt, model=model, retries=3)
    except (ValueError, json.JSONDecodeError) as e:
        logger.error("Connected speech analysis failed: %s", e)
        return []

    if not isinstance(items, list):
        logger.error("Connected speech response is not a list")
        return []

    valid_types = {"linking", "reduction", "elision", "assimilation"}
    cleaned: list[ConnectedSpeechItem] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        speech_type = str(item.get("type", "")).lower()
        if speech_type not in valid_types:
            continue
        cleaned.append(
            ConnectedSpeechItem(
                type=speech_type,
                originalText=str(item.get("originalText", "")),
                phonetic=str(item.get("phonetic", "")),
                koreanPhonetic=str(item.get("koreanPhonetic", "")),
                explanation=str(item.get("explanation", "")),
                explanationKo=str(item.get("explanationKo", "")),
                practiceGuide=str(item.get("practiceGuide", "")),
                segmentIndex=int(item.get("segmentIndex", 0)),
            )
        )

    logger.info("Found %d connected speech phenomena", len(cleaned))
    return cleaned


def analyze_speech_structure(
    segments: list[dict[str, Any]],
    model: str = DEFAULT_MODEL,
) -> dict[str, Any]:
    """Analyze the overall structure of the speech/presentation.

    Identifies introduction, body sections, and conclusion with
    summaries and key points for each section. Also extracts
    signal expressions that mark structural transitions.

    Args:
        segments: Cleaned transcript segments.
        model: Ollama model identifier.

    Returns:
        Dict with "sections" (list of section objects) and
        "signalExpressions" (list of signal expression objects).
    """
    logger.info("Analyzing speech structure")

    transcript_text = _segments_to_text_block(segments)
    total_segments = len(segments)

    prompt = f"""Analyze the structure of this speech/presentation transcript. \
The transcript has {total_segments} segments (indexed 0 to {total_segments - 1}).

Transcript:
{transcript_text}

Return a JSON object with TWO keys: "sections" and "signalExpressions".

1. "sections": Divide the speech into logical sections:
   - Introduction (opening, topic introduction)
   - Body sections (main content, possibly multiple sections)
   - Conclusion (summary, closing remarks)

   For each section:
   - "section": descriptive section name (e.g., "Introduction", "Main Argument", "Examples", "Conclusion")
   - "startSegment": first segment index
   - "endSegment": last segment index
   - "summary": brief summary in English
   - "summaryKo": summary in Korean
   - "keyPoints": array of 2-4 key points

   Sections must be contiguous and cover segments 0 to {total_segments - 1}.

2. "signalExpressions": Extract phrases that signal structural transitions or emphasis. \
These are phrases speakers use to guide the audience through their speech.

   For each signal expression:
   - "expression": the exact phrase (e.g., "So here's what I found", "The key takeaway is", "What I realized was")
   - "type": one of "hook", "transition", "emphasis", "enumeration", "summary", "conclusion"
   - "segmentIndex": the segment number [N] where it appears
   - "role": Korean description of what this signal means for listeners \
     (e.g., "핵심 발견으로 전환 — 이 뒤에 중요한 내용이 나옴", "핵심 메시지 요약 — 결론의 시작")

   Types explained:
   - hook: opening attention grabber
   - transition: moving to a new topic/point
   - emphasis: highlighting importance ("The key is", "What's important")
   - enumeration: listing items ("First", "There are three things")
   - summary: summarizing a point
   - conclusion: wrapping up

Return ONLY a JSON object with "sections" and "signalExpressions" keys."""

    fallback_sections = [
        SpeechStructureSection(
            section="Full Content",
            startSegment=0,
            endSegment=total_segments - 1,
            summary="Complete transcript content.",
            summaryKo="전체 스크립트 내용.",
            keyPoints=["Full transcript content"],
        )
    ]

    try:
        result = _call_ollama_json(prompt, model=model, retries=3)
    except (ValueError, json.JSONDecodeError) as e:
        logger.error("Structure analysis failed: %s", e)
        return {"sections": fallback_sections, "signalExpressions": []}

    # Handle both formats: array (legacy) or object with sections/signalExpressions
    if isinstance(result, list):
        raw_sections = result
        raw_signals: list[Any] = []
    elif isinstance(result, dict):
        raw_sections = result.get("sections", [])
        raw_signals = result.get("signalExpressions", [])
        if not isinstance(raw_sections, list):
            raw_sections = []
        if not isinstance(raw_signals, list):
            raw_signals = []
    else:
        logger.error("Structure response is neither list nor dict")
        return {"sections": fallback_sections, "signalExpressions": []}

    # Clean sections
    cleaned_sections: list[SpeechStructureSection] = []
    for item in raw_sections:
        if not isinstance(item, dict):
            continue
        key_points = item.get("keyPoints", [])
        if not isinstance(key_points, list):
            key_points = [str(key_points)]
        cleaned_sections.append(
            SpeechStructureSection(
                section=str(item.get("section", "Section")),
                startSegment=int(item.get("startSegment", 0)),
                endSegment=int(item.get("endSegment", total_segments - 1)),
                summary=str(item.get("summary", "")),
                summaryKo=str(item.get("summaryKo", "")),
                keyPoints=[str(kp) for kp in key_points[:4]],
            )
        )

    if not cleaned_sections:
        cleaned_sections = fallback_sections

    # Clean signal expressions
    valid_signal_types = {"hook", "transition", "emphasis", "enumeration", "summary", "conclusion"}
    cleaned_signals: list[SignalExpression] = []
    for item in raw_signals:
        if not isinstance(item, dict) or "expression" not in item:
            continue
        sig_type = str(item.get("type", "transition")).lower()
        if sig_type not in valid_signal_types:
            sig_type = "transition"
        cleaned_signals.append(
            SignalExpression(
                expression=str(item.get("expression", "")),
                type=sig_type,
                segmentIndex=int(item.get("segmentIndex", 0)),
                role=str(item.get("role", "")),
            )
        )

    logger.info("Identified %d structural sections, %d signal expressions", len(cleaned_sections), len(cleaned_signals))
    return {"sections": cleaned_sections, "signalExpressions": cleaned_signals}


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)

    # Simple test with sample segments
    test_segments = [
        {"index": 0, "textEn": "Hello everyone, welcome to today's lesson on English pronunciation."},
        {"index": 1, "textEn": "Today we're going to look at how sounds connect in natural speech."},
        {"index": 2, "textEn": "This is called connected speech, and it's really important for listening comprehension."},
        {"index": 3, "textEn": "For example, when we say 'want to', it often sounds like 'wanna'."},
        {"index": 4, "textEn": "That's what we call a reduction. Let me give you more examples."},
    ]

    model = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_MODEL

    print("=== Difficulty ===")
    diff = estimate_difficulty(test_segments, duration=120, model=model)
    print(f"Difficulty: {diff}")

    print("\n=== Vocabulary ===")
    vocab = extract_vocabulary(test_segments, max_words=5, model=model)
    print(json.dumps(vocab, indent=2, ensure_ascii=False))

    print("\n=== Grammar ===")
    grammar = analyze_grammar_patterns(test_segments, max_patterns=3, model=model)
    print(json.dumps(grammar, indent=2, ensure_ascii=False))

    print("\n=== Connected Speech ===")
    speech = analyze_connected_speech(test_segments, model=model)
    print(json.dumps(speech, indent=2, ensure_ascii=False))

    print("\n=== Structure ===")
    structure = analyze_speech_structure(test_segments, model=model)
    print(json.dumps(structure, indent=2, ensure_ascii=False))
