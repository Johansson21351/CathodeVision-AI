# CathodeVision AI — finish the observation/policy/agent integration

## Context
This is a Flask + MySQL backend / React + Vite frontend app that does EV battery
defect inspection from photos via Groq. Target workflow: **second-life / refurbishment
/ recycling triage** — items arrive in supplier lots, get photographed, and need a
disposition (PASS / MONITOR / HOLD / QUARANTINE) plus an operator recommendation.

The architecture was just split into three layers, and the split must stay intact:

1. **Vision model (`ai.py: analyze_image`)** — observes only. Returns
   `{is_battery, image_quality, defects: [{type, location, visible_confidence}], label_text}`.
   It never decides severity or a verdict.
2. **Policy engine (`severity_policy.py: decide_disposition`)** — pure Python,
   no LLM call. Takes the observations + chemistry dict, returns
   `{disposition, severity, reasons: [str]}`. This is the only place severity
   logic should live — don't let it creep back into a prompt.
3. **Recommendation agent (`ai.py: recommend_action`)** — a Groq tool-calling
   loop (`lot_tools.py` has `get_lot_history` and `get_spec`). It is told the
   disposition is final and must not contradict it; it only writes operator-facing
   text and optionally flags a lot-level pattern (`lot_flag`).

Files already written and syntax-checked: `prompt.py`, `severity_policy.py`,
`lot_tools.py`, `ai.py`, `routes/inspect.py`, `schema_additions.sql`. I'll drop
these into the repo myself — don't recreate them from scratch, build on them.

## What's broken right now (fix these first)

1. **`routes/inspections.py` — `hold_recommendation()`** still calls
   `recommend_action(defect_type, description, confidence)` — the old
   single-defect signature. Update it to:
   - Pull the inspection's `severity`, `disposition`, `label_text`, and `lot_id`
     from the DB (add `disposition`/`lot_id` to the SELECT — both columns now
     exist per `schema_additions.sql`).
   - Rebuild a `reasons` list from what's stored, or store `reasons` as JSON on
     the inspection row at insert time in `routes/inspect.py` and read it back
     here — pick whichever is less invasive and tell me which you chose.
   - Call `recommend_action(disposition, severity, reasons, lot_id, label_text)`
     matching the new signature in `ai.py`.
   - The existing confidence-band filter (`confidence >= 0.30 AND confidence <= 0.55`)
     should probably become a disposition filter (`disposition = 'HOLD'`) instead —
     use your judgment and flag the change in your summary.

2. **`routes/safety_check.py`** still expects `analyze_image()` to return
   `has_defect`/`severity` directly — it no longer does. Update `_to_verdict()`
   to call `decide_disposition()` on the observations first (pass an empty/neutral
   chemistry dict since this public endpoint has no lot context), then map
   `disposition` → the existing verdict buckets (`STOP_USING`/`GET_IT_CHECKED`/
   `MONITOR`/`LOOKS_FINE`/`NOT_A_BATTERY`). Keep this endpoint's public, no-DB,
   no-lot-tools nature — it should never call the agent or lot_tools.

3. **`routes/inspect.py` doesn't currently accept or store a `lot_id`** on
   upload. Add an optional `lot_id` form field to `POST /inspect`, validate it
   exists in the `lots` table if provided (404/400 if not — don't silently
   accept an unknown lot), and store it on the inspection row.

## Schema / data setup

- Run `schema_additions.sql` against the existing `cathodevision-ai` database
  (adds `lots`, `lot_specs`, `inspections.lot_id`, `inspections.disposition`).
- Seed `lot_specs` with 3–5 realistic rows (e.g. common 18650/21700 NMC and LFP
  cell models you'd expect in a refurb stream) so `lot_tools.get_spec()` has
  something to return in a demo instead of always hitting the "not found" branch.
- Seed one or two rows in `lots` referencing those models so `get_lot_history`
  has something to query against.

## Then, in priority order, build these (stop and ask me before starting #3 if time is short):

### 1. Feedback loop — corrections feed back into the vision prompt
In `ai.py: analyze_image`, before calling Groq, query the last 2–3 rows from
`inspection_reviews` (joined to `inspections`) where `corrected_type` differs
from the original `defect_type` — i.e. real corrections, not confirmations —
and inject them into the vision call as short few-shot context (e.g. "Past
correction: an image described as 'รอยขีดข่วน' was actually 'สนิม/กัดกร่อน' —
keep this distinction in mind"). Keep this to a handful of examples, capped by
token budget, and don't let it leak PII (no usernames, no raw filenames).

### 2. Dashboard: AI vs. reviewer agreement
Add a query to `routes/inspections.py: dashboard()` that computes, over
reviewed inspections, the percentage where `corrected_type == defect_type`
(agreement rate), broken down by `defect_type` if cheap to do. Surface it as
a new field in the dashboard JSON response — don't touch the frontend unless
you also confirm the `Status.jsx`/`HomePage.jsx` component that would render it.

### 3. Guided 3-shot capture (frontend, `HomePage.jsx` / `AIControls.jsx`)
Change the upload flow to request three photos per inspection session (top,
terminal/side, label close-up) instead of one. Each inspection becomes one
record referencing 3 images (you'll need to decide: 3 `image_path` columns,
or a child table — prefer a child table `inspection_images(inspection_id,
role, image_path)` for extensibility) with one combined `analyze_image` call
per photo, merged `defects` across all three before calling
`decide_disposition()`. This is the largest change — confirm the DB approach
with me before writing frontend code against it.

## Constraints — don't break these
- Keep all user-facing Thai text in `prompt.py` in Thai; don't translate it.
- Don't change the JWT auth flow, `auth.py`, or the user-scoping (`WHERE user_id = %s`)
  pattern on any query — every inspection/task query must stay scoped to the
  logged-in user except where explicitly public (`safety_check.py`).
- Keep `label_chemistry.py`'s rule-based (non-LLM) chemistry detection as-is —
  don't let an LLM start deciding chemistry.
- `severity_policy.py` must stay pure (no DB calls, no Groq calls) — it should
  be unit-testable with plain dicts as input.

## When you're done
Give me a short summary of what changed per file, any schema assumptions you
made, and a `curl` example for the updated `POST /inspect` (with `lot_id`) and
`POST /inspections/hold-recommendation` so I can sanity-check the new
response shapes before I touch the frontend.
