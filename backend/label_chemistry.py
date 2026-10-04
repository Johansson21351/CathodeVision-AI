# backend/label_chemistry.py — rule-based chemistry check on OCR'd label text.
#
# The vision model only transcribes what it sees (label_text); it does not get to
# decide the chemistry itself. Classification happens here, in plain Python regex,
# so the "is this really NMC" verdict is auditable and doesn't depend on an LLM's opinion.
import re

# Order matters: more specific chemistries are checked before generic "Li-ion".
CHEMISTRY_PATTERNS = [
    ("NMC", [r"\bNMC\b", r"nickel\s+manganese\s+cobalt", r"Li\s*NiMnCo"]),
    ("NCA", [r"\bNCA\b", r"nickel\s+cobalt\s+aluminu?m"]),
    ("LFP", [r"\bLFP\b", r"LiFePO4", r"lithium\s+iron\s+phosphate"]),
    ("LCO", [r"\bLCO\b", r"lithium\s+cobalt\s+oxide"]),
    ("LTO", [r"\bLTO\b", r"lithium\s+titanate"]),
    ("Li-ion", [r"li-?ion", r"lithium[\s-]?ion"]),
]

# Chemistries considered "high value" for the inspection workflow — NMC's energy
# density/cost profile is what the user specifically wants flagged and verified.
HIGH_VALUE_CHEMISTRIES = {"NMC"}


def identify_chemistry(label_text: str) -> dict:
    """Pure pattern match over OCR'd label text — no model judgement involved.

    Returns:
        detected_chemistry: one of CHEMISTRY_PATTERNS' names, or "unknown"
        is_high_value: True only when detected_chemistry is in HIGH_VALUE_CHEMISTRIES
        matched_text: the literal substring that triggered the match, or None
    """
    text = (label_text or "").strip()
    if not text:
        return {"detected_chemistry": "unknown", "is_high_value": False, "matched_text": None}

    for chemistry, patterns in CHEMISTRY_PATTERNS:
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return {
                    "detected_chemistry": chemistry,
                    "is_high_value": chemistry in HIGH_VALUE_CHEMISTRIES,
                    "matched_text": match.group(0),
                }

    return {"detected_chemistry": "unknown", "is_high_value": False, "matched_text": None}
