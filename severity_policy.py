# backend/severity_policy.py — turns vision OBSERVATIONS into a severity and a
# disposition. Deliberately plain Python, like label_chemistry.py: the model
# reports what it saw, this file decides what that means. Change the policy
# here, not in the prompt, and it's a one-line diff + a unit test instead of
# an LLM output you have to re-verify by hand.

SEVERITY_ORDER = ["none", "minor", "major", "critical"]

# Same mapping that used to live inside the Thai prompt text (section 4),
# now enforced in code so it can't silently drift between prompt edits.
DEFECT_SEVERITY = {
    "บวม": "critical",
    "เปลือกแตก/ร้าว": "critical",
    "รั่วซึม": "critical",
    "รอยไหม้เกรียม": "critical",
    "ขั้วเสียหาย": "major",
    "สนิม/กัดกร่อน": "major",
    "สีเพี้ยน": "major",
    "รอยขีดข่วน": "minor",
    "รอยบุบ": "minor",
    "ฉลาก/บาร์โค้ดเสียหาย": "minor",
    "สิ่งปนเปื้อน": "minor",
    "ชิ้นส่วนขาด": "minor",
}

LOW_VISIBILITY_QUALITY = {"blurry", "too_dark", "too_bright", "obstructed", "wrong_framing"}

# Dispositions, worst to best — matches the Pass/Hold/Reject promise on the
# landing page, split into MONITOR vs HOLD so "minor wear" and "needs a human
# now" aren't the same bucket.
DISPOSITIONS = ["PASS", "MONITOR", "HOLD", "QUARANTINE"]


def defect_severity(defect_type: str) -> str:
    return DEFECT_SEVERITY.get(defect_type, "minor")


def worst_severity(defects: list[dict]) -> str:
    if not defects:
        return "none"
    return max((defect_severity(d["type"]) for d in defects), key=SEVERITY_ORDER.index)


def decide_disposition(
    defects: list[dict],
    image_quality: str,
    chemistry: dict,
    min_visible_confidence: float = 0.4,
) -> dict:
    """The one function everything else should call. Pure, synchronous, no I/O.

    Returns {"disposition", "severity", "reasons": [str, ...]} — reasons are
    plain strings so they can go straight into a UI or a CSV export.
    """
    reasons = []

    # Low-confidence observations don't get to drive a QUARANTINE call —
    # they get escalated to a human instead of being trusted or discarded.
    trusted = [d for d in defects if d.get("visible_confidence", 0) >= min_visible_confidence]
    untrusted = [d for d in defects if d not in trusted]

    low_quality_image = image_quality in LOW_VISIBILITY_QUALITY

    severity = worst_severity(trusted)

    if severity == "critical":
        disposition = "QUARANTINE"
        reasons.append(f"Critical defect detected ({_names(trusted, 'critical')}) — safety risk.")
    elif severity == "major":
        disposition = "HOLD"
        reasons.append(f"Major defect detected ({_names(trusted, 'major')}) — needs inspection before reuse.")
    elif severity == "minor":
        disposition = "MONITOR"
        reasons.append(f"Minor wear only ({_names(trusted, 'minor')}).")
    else:
        disposition = "PASS"
        reasons.append("No defects detected above the confidence threshold.")

    if low_quality_image and disposition in {"PASS", "MONITOR"}:
        disposition = "HOLD"
        reasons.append(f"Image quality was '{image_quality}' — escalated to HOLD for a clearer photo/human check.")

    if untrusted:
        reasons.append(
            f"{len(untrusted)} possible defect(s) seen at low confidence and excluded from the "
            f"automatic call — worth a human glance: {_names(untrusted)}."
        )

    if chemistry.get("is_high_value") and disposition == "PASS":
        reasons.append(f"Chemistry flagged as high-value ({chemistry.get('detected_chemistry')}) — logged for traceability.")

    return {"disposition": disposition, "severity": severity, "reasons": reasons}


def _names(defects: list[dict], severity: str | None = None) -> str:
    types = [d["type"] for d in defects if severity is None or defect_severity(d["type"]) == severity]
    # dedupe, keep order
    seen = []
    for t in types:
        if t not in seen:
            seen.append(t)
    return ", ".join(seen) if seen else "—"
