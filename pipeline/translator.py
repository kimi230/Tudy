"""
Translation module.

Translates English transcript segments to Korean using Claude (Anthropic API)
or Ollama (local LLM).
"""

import json
import logging
import re
from typing import Any, Literal

logger = logging.getLogger(__name__)

# Default models
CLAUDE_MODEL = "claude-sonnet-4-5-20250929"
OLLAMA_MODEL = "qwen3:8b"

TRANSLATION_SYSTEM_PROMPT = """You are an expert English-to-Korean translator specializing in natural, \
conversational translations. Your translations should:

1. Be natural Korean, not word-for-word translations
2. Preserve the speaker's tone and register
3. Use appropriate Korean speech levels (mainly 해요체 for educational content)
4. Keep technical terms in English where Korean speakers commonly do so
5. Maintain meaning faithfully while sounding natural in Korean

IMPORTANT: Return ONLY a valid JSON array of objects. Each object must have:
- "index": the segment index number (integer)
- "textKo": the Korean translation (string)

Do NOT include any explanation, markdown formatting, or extra text.
"""


def _build_translation_prompt(segments: list[dict[str, Any]]) -> str:
    """Build a translation prompt for a batch of segments."""
    segment_texts = []
    for seg in segments:
        segment_texts.append(
            {"index": seg["index"], "textEn": seg["textEn"]}
        )

    return (
        f"Translate the following English segments to Korean.\n\n"
        f"Input segments:\n{json.dumps(segment_texts, indent=2, ensure_ascii=False)}\n\n"
        f"Return a JSON array with objects containing 'index' and 'textKo' fields."
    )


def _parse_translation_response(response_text: str) -> list[dict[str, Any]]:
    """Parse the JSON array from the LLM response.

    Handles cases where the response may contain markdown code fences,
    <think> blocks (qwen3), or surrounding text.
    """
    text = response_text.strip()

    # Strip <think>...</think> blocks (qwen3 thinking mode)
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

    # Try to extract JSON from markdown code fences
    json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if json_match:
        text = json_match.group(1).strip()

    # Try to find JSON array in the text
    array_match = re.search(r"\[.*\]", text, re.DOTALL)
    if array_match:
        text = array_match.group(0)

    # Clean control characters
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as e:
        logger.error("Failed to parse translation response: %s", e)
        logger.debug("Response text: %s", response_text[:500])
        raise ValueError(f"Could not parse translation response as JSON: {e}")

    if not isinstance(parsed, list):
        raise ValueError("Translation response is not a JSON array")

    return parsed


def _translate_batch_claude(
    segments: list[dict[str, Any]],
    model: str = CLAUDE_MODEL,
) -> list[dict[str, Any]]:
    """Translate a batch of segments using the Anthropic Claude API.

    Args:
        segments: List of segments to translate.
        model: Claude model identifier.

    Returns:
        List of dicts with 'index' and 'textKo' fields.
    """
    import anthropic

    client = anthropic.Anthropic()  # Uses ANTHROPIC_API_KEY env var

    prompt = _build_translation_prompt(segments)

    message = client.messages.create(
        model=model,
        max_tokens=4096,
        system=TRANSLATION_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = message.content[0].text
    return _parse_translation_response(response_text)


def _translate_batch_ollama(
    segments: list[dict[str, Any]],
    model: str = OLLAMA_MODEL,
) -> list[dict[str, Any]]:
    """Translate a batch of segments using Ollama (local LLM).

    Args:
        segments: List of segments to translate.
        model: Ollama model identifier.

    Returns:
        List of dicts with 'index' and 'textKo' fields.
    """
    import ollama

    prompt = _build_translation_prompt(segments)

    # For qwen3 models, append /no_think to disable thinking mode
    effective_prompt = prompt
    if "qwen3" in model.lower():
        effective_prompt = prompt + " /no_think"

    response = ollama.chat(
        model=model,
        messages=[
            {"role": "system", "content": TRANSLATION_SYSTEM_PROMPT},
            {"role": "user", "content": effective_prompt},
        ],
    )

    response_text = response["message"]["content"]
    return _parse_translation_response(response_text)


def translate_segments(
    segments: list[dict[str, Any]],
    method: Literal["claude", "ollama"] = "claude",
    model: str | None = None,
    batch_size: int = 10,
) -> list[dict[str, Any]]:
    """Translate English transcript segments to Korean.

    Processes segments in batches to stay within LLM context/token limits.

    Args:
        segments: List of transcript segments. Each must have at least
            'index' and 'textEn' fields.
        method: Translation backend - "claude" for Anthropic API,
            "ollama" for local LLM.
        model: Model identifier. Defaults to the appropriate model for
            the chosen method.
        batch_size: Number of segments to translate per API call.

    Returns:
        The input segments list with an added 'textKo' field on each segment.

    Raises:
        ValueError: If an unknown method is specified or translation
            responses cannot be parsed.
    """
    if model is None:
        model = CLAUDE_MODEL if method == "claude" else OLLAMA_MODEL

    logger.info(
        "Translating %d segments using %s (model=%s, batch_size=%d)",
        len(segments),
        method,
        model,
        batch_size,
    )

    # Build index map for fast lookup
    seg_by_index: dict[int, dict[str, Any]] = {}
    for seg in segments:
        seg_by_index[seg["index"]] = seg

    # Process in batches
    total_batches = (len(segments) + batch_size - 1) // batch_size
    for batch_num in range(total_batches):
        start = batch_num * batch_size
        end = min(start + batch_size, len(segments))
        batch = segments[start:end]

        logger.info(
            "Translating batch %d/%d (segments %d-%d)",
            batch_num + 1,
            total_batches,
            batch[0]["index"],
            batch[-1]["index"],
        )

        try:
            if method == "claude":
                translations = _translate_batch_claude(batch, model=model)
            elif method == "ollama":
                translations = _translate_batch_ollama(batch, model=model)
            else:
                raise ValueError(f"Unknown translation method: {method}")
        except Exception as e:
            logger.error("Translation failed for batch %d: %s", batch_num + 1, e)
            # Fill with empty translations on failure so pipeline can continue
            for seg in batch:
                if "textKo" not in seg:
                    seg["textKo"] = ""
            continue

        # Apply translations to segments
        for trans in translations:
            idx = trans.get("index")
            text_ko = trans.get("textKo", "")
            if idx is not None and idx in seg_by_index:
                seg_by_index[idx]["textKo"] = text_ko
            else:
                logger.warning(
                    "Translation returned unknown index: %s", idx
                )

    # Check for any segments that were not translated
    missing = [seg["index"] for seg in segments if "textKo" not in seg]
    if missing:
        logger.warning(
            "%d segments were not translated: %s",
            len(missing),
            missing[:10],
        )
        for seg in segments:
            if "textKo" not in seg:
                seg["textKo"] = ""

    logger.info("Translation complete for %d segments", len(segments))
    return segments


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)

    # Simple test with sample segments
    test_segments = [
        {"index": 0, "textEn": "Hello everyone, welcome to today's lesson."},
        {"index": 1, "textEn": "Today we're going to talk about pronunciation."},
    ]

    method = sys.argv[1] if len(sys.argv) > 1 else "claude"
    result = translate_segments(test_segments, method=method, batch_size=10)
    print(json.dumps(result, indent=2, ensure_ascii=False))
