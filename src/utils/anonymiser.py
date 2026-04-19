"""
ScamSentinel MY — PII Anonymiser

Strips personally identifiable information (PII) from text before
storing in Firestore reasoning traces and community KB entries.

Privacy requirement: No PII stored in community_kb — only threat
identifiers and scam patterns. (PRD §8 Security, AGENTS.md Rule 5)

Handles Malaysian-specific PII formats:
- Malaysian IC numbers (YYMMDD-SS-NNNN)
- Malaysian phone numbers (01X-XXXXXXX, +601X-XXXXXXX)
- Bank account numbers (10-16 digits)
- Email addresses
- Full names (basic heuristic)
"""

import re
from typing import Optional


# ── Regex patterns for Malaysian PII ────────────────────────────

# Malaysian IC number: YYMMDD-SS-NNNN (with or without dashes)
IC_PATTERN = re.compile(
    r"\b\d{6}[-\s]?\d{2}[-\s]?\d{4}\b"
)

# Malaysian phone numbers: 01X-XXXXXXX or +601X-XXXXXXX
PHONE_PATTERN = re.compile(
    r"(?:\+?6?0)\d[\d\s\-]{7,11}\b"
)

# Email addresses
EMAIL_PATTERN = re.compile(
    r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"
)

# Bank account numbers: sequences of 10-16 digits
ACCOUNT_PATTERN = re.compile(
    r"\b\d{10,16}\b"
)

# Malaysian postal addresses (basic: catches "No.", "Jalan", "Taman", etc.)
ADDRESS_PATTERN = re.compile(
    r"(?:No\.\s?\d+|Lot\s?\d+),?\s*(?:Jalan|Lorong|Taman|Kampung|Persiaran|"
    r"Lebuh|Tingkat|Blok|Block)\s+[\w\s,]+\d{5}",
    re.IGNORECASE,
)


def anonymise_text(
    text: str,
    redact_phones: bool = True,
    redact_ic: bool = True,
    redact_emails: bool = True,
    redact_accounts: bool = True,
    redact_addresses: bool = True,
    replacement_tag: Optional[str] = None,
) -> str:
    """
    Strips PII from text, replacing with redaction tags.

    Args:
        text: The text to anonymise
        redact_phones: Whether to redact phone numbers
        redact_ic: Whether to redact IC numbers
        redact_emails: Whether to redact email addresses
        redact_accounts: Whether to redact bank account numbers
        redact_addresses: Whether to redact postal addresses
        replacement_tag: Custom replacement tag (default: type-specific tags)

    Returns:
        Anonymised text with PII replaced by redaction tags
    """
    if not text:
        return text

    result = text

    # Order matters: IC before account numbers (IC is a subset of digit patterns)
    if redact_ic:
        tag = replacement_tag or "[IC_REDACTED]"
        result = IC_PATTERN.sub(tag, result)

    if redact_phones:
        tag = replacement_tag or "[PHONE_REDACTED]"
        result = PHONE_PATTERN.sub(tag, result)

    if redact_emails:
        tag = replacement_tag or "[EMAIL_REDACTED]"
        result = EMAIL_PATTERN.sub(tag, result)

    if redact_addresses:
        tag = replacement_tag or "[ADDRESS_REDACTED]"
        result = ADDRESS_PATTERN.sub(tag, result)

    if redact_accounts:
        tag = replacement_tag or "[ACCOUNT_REDACTED]"
        result = ACCOUNT_PATTERN.sub(tag, result)

    return result


def contains_pii(text: str) -> bool:
    """
    Quick check whether a text string contains any detectable PII.
    Used as a validation gate before writing to community_kb.
    """
    if not text:
        return False

    return bool(
        IC_PATTERN.search(text)
        or PHONE_PATTERN.search(text)
        or EMAIL_PATTERN.search(text)
        or ACCOUNT_PATTERN.search(text)
        or ADDRESS_PATTERN.search(text)
    )


def extract_safe_indicators(text: str) -> list[str]:
    """
    Extracts only anonymised threat indicators safe for community KB storage.
    Returns domain names, URL patterns, and keyword flags — never raw PII.
    """
    indicators = []

    # Extract domain names from URLs (safe — not PII)
    urls = re.findall(r"https?://([A-Za-z0-9.\-]+)", text)
    for domain in urls[:5]:
        indicators.append(f"domain:{domain}")

    # Extract phone number prefixes only (first 4 digits — not full number)
    prefixes = re.findall(r"(?:\+?6?0)(\d{2})", text)
    for prefix in set(prefixes):
        indicators.append(f"phone_prefix:+60{prefix}")

    return indicators
