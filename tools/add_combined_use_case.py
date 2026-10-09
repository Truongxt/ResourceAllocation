"""Add one fully editable, combined use-case diagram without removing older ones.

The Visual Paradigm 10 project is a SQLite database.  This script clones the
native model elements and diagram elements from UC-01..UC-06 into a new diagram,
then arranges those six groups on a single large canvas.  All source diagrams
and their model elements remain untouched in the output project.
"""

from __future__ import annotations

import re
import shutil
import sqlite3
from pathlib import Path

from improve_vpp_sequence import bval, field, insert_row, name, replace_block, uid, val


ROOT = Path(r"D:\ResourceAllocation\docs")
SOURCE = ROOT / "ResourceAllocation_UML_ChiTiet.vpp"
OUTPUT = ROOT / "ResourceAllocation_UML_TongHop.vpp"
TITLE = "UC-00 Tổng hợp toàn bộ hệ thống ResourceAllocation"
GROUP_TITLES = (
    "01. Tổng quan hệ thống",
    "02. Xác thực, tài khoản và phân quyền",
    "03. Dự án, nhóm và công việc",
    "04. Nhân sự, phòng ban và lịch nghỉ",
    "05. Tối ưu hóa và benchmark",
    "06. Lịch, báo cáo, thông báo và cấu hình",
)


def replace_ids(definition: str, ids: dict[str, str]) -> str:
    # IDs are opaque strings; a single regex pass avoids cascading replacement.
    pattern = re.compile("|".join(re.escape(key) for key in sorted(ids, key=len, reverse=True)))
    return pattern.sub(lambda match: ids[match.group()], definition)


def nested_ids(model_definition: str) -> set[str]:
    """Return IDs of inline model/view objects referenced by model elements."""
    return set(re.findall(r"\{([\w.\-]+):\"", model_definition))


def clone_group(
    conn: sqlite3.Connection,
    old_diagram: sqlite3.Row,
    new_diagram_id: str,
    group_title: str,
    dx: int,
    dy: int,
) -> tuple[list[str], int, int]:
    elements = conn.execute(
        "SELECT * FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=? ORDER BY rowid",
        (old_diagram["ID"],),
    ).fetchall()
    old_models = {
        element["MODEL_ELEMENT_ID"]: conn.execute(
            "SELECT * FROM MODEL_ELEMENT WHERE ID=?", (element["MODEL_ELEMENT_ID"],)
        ).fetchone()
        for element in elements
        if element["MODEL_ELEMENT_ID"]
    }
    if any(model is None for model in old_models.values()):
        raise ValueError(f"Missing model element in {old_diagram['NAME']}")

    ids = {old_diagram["ID"]: new_diagram_id}
    ids.update({element["ID"]: uid() for element in elements})
    ids.update({model_id: uid() for model_id in old_models})
    for model in old_models.values():
        for old_id in nested_ids(val(model["DEFINITION"])):
            ids.setdefault(old_id, uid())

    system_element = next(element for element in elements if element["SHAPE_TYPE"] == "System")
    for model in old_models.values():
        model_definition = replace_ids(val(model["DEFINITION"]), ids)
        model_name = model["NAME"]
        if model["ID"] == system_element["MODEL_ELEMENT_ID"]:
            model_name = group_title
            model_definition = name(model_definition, ids[model["ID"]], model_name)
            # The stock source project contains two unrelated template children
            # (Withdraw and Transfer Funds).  Do not copy these into the new group.
            model_definition = replace_block(model_definition, "Child", "NULL")
        insert_row(
            conn,
            "MODEL_ELEMENT",
            model,
            ID=ids[model["ID"]],
            PARENT_ID=ids.get(model["PARENT_ID"], model["PARENT_ID"]),
            NAME=model_name,
            DEFINITION=bval(model_definition),
        )

    refs: list[str] = []
    case_count = 0
    for element in elements:
        element_definition = replace_ids(val(element["DEFINITION"]), ids)
        if element["SHAPE_TYPE"] in ("System", "Actor"):
            x = int(re.search(r"(?m)^\s*x=(-?\d+);", element_definition).group(1))
            y = int(re.search(r"(?m)^\s*y=(-?\d+);", element_definition).group(1))
            element_definition = field(element_definition, "x", str(x + dx))
            element_definition = field(element_definition, "y", str(y + dy))
        if element["SHAPE_TYPE"] == "System":
            element_definition = name(element_definition, ids[element["ID"]], group_title)
        if element["SHAPE_TYPE"] == "UseCase":
            case_count += 1
        insert_row(
            conn,
            "DIAGRAM_ELEMENT",
            element,
            ID=ids[element["ID"]],
            DIAGRAM_ID=new_diagram_id,
            MODEL_ELEMENT_ID=ids.get(element["MODEL_ELEMENT_ID"], element["MODEL_ELEMENT_ID"]),
            COMPOSITE_MODEL_ELEMENT_ADDRESS=replace_ids(element["COMPOSITE_MODEL_ELEMENT_ADDRESS"], ids)
            if element["COMPOSITE_MODEL_ELEMENT_ADDRESS"] else None,
            REF_MODEL_ELEMENT_ADDRESS=replace_ids(element["REF_MODEL_ELEMENT_ADDRESS"], ids)
            if element["REF_MODEL_ELEMENT_ADDRESS"] else None,
            PARENT_ID=ids.get(element["PARENT_ID"], element["PARENT_ID"]),
            DEFINITION=bval(element_definition),
        )
        refs.append(f"<{new_diagram_id}:{ids[element['ID']]}> ")
    return refs, case_count, len(elements)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)
    if OUTPUT.exists():
        raise FileExistsError(f"Output already exists; refusing to overwrite {OUTPUT}")
    shutil.copy2(SOURCE, OUTPUT)
    conn = sqlite3.connect(OUTPUT)
    conn.row_factory = sqlite3.Row
    try:
        diagrams = conn.execute(
            "SELECT * FROM DIAGRAM WHERE NAME LIKE 'UC-%' ORDER BY NAME"
        ).fetchall()
        if len(diagrams) != 6 or [d["NAME"][:5] for d in diagrams] != [f"UC-0{i}" for i in range(1, 7)]:
            raise ValueError("Expected exactly UC-01 through UC-06")
        combined_id = uid()
        all_refs: list[str] = []
        case_total = 0
        shape_total = 0
        for index, diagram in enumerate(diagrams):
            dx = (index % 3) * 1080
            dy = (index // 3) * 1980
            refs, cases, shapes = clone_group(
                conn, diagram, combined_id, GROUP_TITLES[index], dx, dy
            )
            all_refs.extend(refs)
            case_total += cases
            shape_total += shapes
        diagram_definition = val(diagrams[0]["DEFINITION"])
        diagram_definition = name(diagram_definition, combined_id, TITLE)
        diagram_definition = replace_block(
            diagram_definition,
            "Child",
            "(\n\t\t" + ",\n\t\t".join(ref.strip() for ref in all_refs) + "\n\t)",
        )
        insert_row(
            conn,
            "DIAGRAM",
            diagrams[0],
            ID=combined_id,
            NAME=TITLE,
            DEFINITION=bval(diagram_definition),
        )
        integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise ValueError(f"SQLite integrity check: {integrity}")
        conn.commit()
        print(f"Created {OUTPUT}")
        print(f"Combined diagram: {case_total} use cases, {shape_total} native elements")
        print(f"Total diagrams retained: {conn.execute('SELECT COUNT(*) FROM DIAGRAM').fetchone()[0]}")
    except Exception:
        conn.rollback()
        conn.close()
        OUTPUT.unlink(missing_ok=True)
        raise
    conn.close()


if __name__ == "__main__":
    main()
