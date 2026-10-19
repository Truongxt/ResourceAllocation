"""Read-only structural checks for the delivered editable UML project."""

import re
import sqlite3
import sys
from pathlib import Path


path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"D:\ResourceAllocation\docs\ResourceAllocation_UML_ChiTiet.vpp")
conn = sqlite3.connect(path)
conn.row_factory = sqlite3.Row
errors = []
if conn.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
    errors.append("SQLite integrity failed")
diagrams = conn.execute("SELECT * FROM DIAGRAM").fetchall()
for diagram in diagrams:
    did = diagram["ID"]
    rows = conn.execute("SELECT * FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=?", (did,)).fetchall()
    ids = {r["ID"] for r in rows}
    definition = diagram["DEFINITION"].decode()
    match = re.search(r"(?s)\bChild=\((.*?)\);", definition)
    children = {ref.rsplit(":", 1)[-1] for ref in re.findall(r"<([^>]+)>", match.group(1))} if match else set()
    if ids != children:
        errors.append(f"Diagram child mismatch: {diagram['NAME']} ({len(ids)} rows, {len(children)} refs)")
    for row in rows:
        text = row["DEFINITION"].decode()
        if row["MODEL_ELEMENT_ID"] and not conn.execute("SELECT 1 FROM MODEL_ELEMENT WHERE ID=?", (row["MODEL_ELEMENT_ID"],)).fetchone():
            errors.append(f"Missing model: {row['ID']}")
        if row["SHAPE_TYPE"] in {"Association", "Include", "Extend", "ControlFlow", "Message"}:
            for key in ("_fromShape", "_toShape"):
                endpoint = re.search(rf"{key}=<([^>]+)>", text)
                if not endpoint or endpoint.group(1).rsplit(":", 1)[-1] not in ids:
                    errors.append(f"Missing {key}: {row['ID']}")
        if diagram["DIAGRAM_TYPE"] == "ClassDiagram" and row["SHAPE_TYPE"] == "Association":
            model = conn.execute("SELECT DEFINITION FROM MODEL_ELEMENT WHERE ID=?", (row["MODEL_ELEMENT_ID"],)).fetchone()
            endpoints = re.findall(r"EndModelElement=<([^>]+)>", model[0].decode()) if model else []
            for endpoint in endpoints[:2]:
                if not conn.execute("SELECT 1 FROM MODEL_ELEMENT WHERE ID=?", (endpoint.rsplit(":", 1)[-1],)).fetchone():
                    errors.append(f"Invalid class association model endpoint: {row['ID']}")

print(f"Checked {len(diagrams)} diagrams and {conn.execute('SELECT COUNT(*) FROM DIAGRAM_ELEMENT').fetchone()[0]} native elements")
if errors:
    print("\n".join(errors[:30]))
    sys.exit(1)
print("All structural checks passed")
