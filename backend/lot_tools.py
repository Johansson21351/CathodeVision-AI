# backend/lot_tools.py — read-only lookups the recommendation agent can call.
# These are deliberately dumb and DB-only: no LLM call inside a tool, so a
# tool call is always fast and always auditable (it's just SQL).
#
# Requires schema_additions.sql to be applied (adds `lots`, `lot_specs`,
# and `inspections.lot_id`). Until then these return a friendly "not set up"
# message instead of raising, so the agent can keep going without a lot_id.

from flask import g

from db import query

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_lot_history",
            "description": (
                "Look up recent inspection results for every item in the same lot "
                "(same supplier batch). Use this to check whether a defect is a "
                "one-off or a pattern worth flagging for the whole lot."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "lot_id": {"type": "string", "description": "The lot identifier for this item."}
                },
                "required": ["lot_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_spec",
            "description": (
                "Look up the expected chemistry/voltage/capacity for a battery model, "
                "to check whether what's on the label matches what the lot should be."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "model_name": {"type": "string", "description": "Model name as transcribed from the label."}
                },
                "required": ["model_name"],
            },
        },
    },
]


def get_lot_history(lot_id: str) -> dict:
    user_id = getattr(g, "user_id", None)
    if user_id is None:
        return {"lot_id": lot_id, "note": "authenticated user context unavailable", "items": []}

    rows = query(
        "SELECT defect_type, severity, detected_chemistry, created_at "
        "FROM inspections WHERE user_id = %s AND lot_id = %s "
        "AND analysis_status = 'COMPLETED' "
        "ORDER BY created_at DESC LIMIT 20",
        (user_id, lot_id),
    )
    if rows is None:
        return {"lot_id": lot_id, "note": "lot_id column not set up yet — see schema_additions.sql", "items": []}
    defect_counts: dict[str, int] = {}
    for row in rows:
        if row["defect_type"] and row["defect_type"] != "ไม่พบ":
            defect_counts[row["defect_type"]] = defect_counts.get(row["defect_type"], 0) + 1
    return {"lot_id": lot_id, "items_checked": len(rows), "recurring_defects": defect_counts}


def get_spec(model_name: str) -> dict:
    row = query(
        "SELECT model_name, expected_chemistry, expected_voltage, expected_capacity_mah "
        "FROM lot_specs WHERE model_name = %s LIMIT 1",
        (model_name,),
        one=True,
    )
    if row is None:
        return {"model_name": model_name, "found": False}
    return {"found": True, **row}


DISPATCH = {
    "get_lot_history": lambda args: get_lot_history(args["lot_id"]),
    "get_spec": lambda args: get_spec(args["model_name"]),
}
