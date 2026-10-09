"""Convert UC-00 into a single-system-frame Visual Paradigm use-case diagram.

This writes a new .vpp.  Every original detailed diagram and the previous
combined-diagram deliverable remain unchanged.
"""

from __future__ import annotations

import re
import shutil
import sqlite3
from pathlib import Path

from improve_vpp_sequence import bval, field, name, replace_block, val


ROOT = Path(r"D:\ResourceAllocation\docs")
SOURCE = ROOT / "ResourceAllocation_UML_TongHop.vpp"
OUTPUT = ROOT / "ResourceAllocation_UML_MotKhung.vpp"
DIAGRAM_TITLE = "UC-00 Tổng hợp toàn bộ hệ thống ResourceAllocation"
FRAME_TITLE = "HỆ THỐNG RESOURCE ALLOCATION"
FRAME = (200, 35, 2990, 3570)  # x, y, width, height
ACTOR_POSITIONS = {
    "Khách": (55, 350),
    "Người dùng": (55, 900),
    "Thành viên": (55, 1800),
    "Thành viên được cấp quyền": (55, 2650),
    "Quản lý dự án": (3270, 1300),
    "Quản trị viên": (3270, 2750),
}


def number(definition: str, key: str) -> int:
    match = re.search(rf"(?m)^\s*{re.escape(key)}=(-?\d+);", definition)
    if not match:
        raise ValueError(f"Missing {key}")
    return int(match.group(1))


def replace_actor_model_end(definition: str, old_model: str, new_model: str) -> str:
    # The association's from end identifies its actor in the native UML model.
    pattern = rf"(?s)(\bfrom=\{{.*?\bEndModelElement=<){re.escape(old_model)}(>)"
    result, count = re.subn(pattern, rf"\g<1>{new_model}\g<2>", definition, count=1)
    if count != 1:
        raise ValueError(f"Actor model end not found: {old_model}")
    return result


def main() -> None:
    if OUTPUT.exists():
        raise FileExistsError(f"Refusing to overwrite {OUTPUT}")
    shutil.copy2(SOURCE, OUTPUT)
    conn = sqlite3.connect(OUTPUT)
    conn.row_factory = sqlite3.Row
    try:
        diagram = conn.execute("SELECT * FROM DIAGRAM WHERE NAME=?", (DIAGRAM_TITLE,)).fetchone()
        if not diagram:
            raise ValueError("UC-00 not found")
        did = diagram["ID"]
        elements = conn.execute(
            "SELECT * FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=? ORDER BY rowid", (did,)
        ).fetchall()
        by_id = {element["ID"]: element for element in elements}
        systems = [element for element in elements if element["SHAPE_TYPE"] == "System"]
        cases = [element for element in elements if element["SHAPE_TYPE"] == "UseCase"]
        actors = [element for element in elements if element["SHAPE_TYPE"] == "Actor"]
        associations = [element for element in elements if element["SHAPE_TYPE"] == "Association"]
        if (len(systems), len(cases), len(actors), len(associations)) != (6, 72, 19, 72):
            raise ValueError("Unexpected UC-00 source contents")

        frame_shape = systems[0]
        frame_id = frame_shape["ID"]
        system_xy = {
            element["ID"]: (number(val(element["DEFINITION"]), "x"),
                            number(val(element["DEFINITION"]), "y"))
            for element in systems
        }

        canonical: dict[str, sqlite3.Row] = {}
        old_actor_name: dict[str, str] = {}
        for actor in actors:
            role = conn.execute(
                "SELECT NAME FROM MODEL_ELEMENT WHERE ID=?", (actor["MODEL_ELEMENT_ID"],)
            ).fetchone()[0]
            old_actor_name[actor["ID"]] = role
            canonical.setdefault(role, actor)
        if set(canonical) != set(ACTOR_POSITIONS):
            raise ValueError(f"Unexpected actors: {set(canonical)}")

        # One large white system boundary, not six separate system boundaries.
        frame_definition = val(frame_shape["DEFINITION"])
        frame_definition = name(frame_definition, frame_id, FRAME_TITLE)
        for key, value in zip(("x", "y", "width", "height"), FRAME):
            frame_definition = field(frame_definition, key, str(value))
        frame_definition = re.sub(
            r"(?s)(_captionUIModel=\(.*?)@x=-?\d+;",
            r"\g<1>@x=950;", frame_definition, count=1,
        )
        frame_definition = re.sub(
            r"(?s)(_captionUIModel=\(.*?)@width=-?\d+;",
            r"\g<1>@width=1090;", frame_definition, count=1,
        )
        frame_definition = replace_block(
            frame_definition, "ContainedDiagramElements",
            "(\n\t\t" + ",\n\t\t".join(f"<{did}:{case['ID']}>" for case in cases) + "\n\t)",
        )
        conn.execute(
            "UPDATE DIAGRAM_ELEMENT SET DEFINITION=? WHERE ID=?",
            (bval(frame_definition), frame_id),
        )
        frame_model = conn.execute(
            "SELECT * FROM MODEL_ELEMENT WHERE ID=?", (frame_shape["MODEL_ELEMENT_ID"],)
        ).fetchone()
        conn.execute(
            "UPDATE MODEL_ELEMENT SET NAME=?, DEFINITION=? WHERE ID=?",
            (FRAME_TITLE,
             bval(name(val(frame_model["DEFINITION"]), frame_model["ID"], FRAME_TITLE)),
             frame_model["ID"]),
        )

        case_abs: dict[str, tuple[int, int, int, int]] = {}
        for case in cases:
            old_system_id = case["PARENT_ID"]
            sx, sy = system_xy[old_system_id]
            definition = val(case["DEFINITION"])
            ax = sx + number(definition, "x")
            ay = sy + number(definition, "y")
            width, height = number(definition, "width"), number(definition, "height")
            case_abs[case["ID"]] = (ax, ay, width, height)
            definition = field(definition, "x", str(ax - FRAME[0]))
            definition = field(definition, "y", str(ay - FRAME[1]))
            definition = field(definition, "_parent", f"<{did}:{frame_id}>")
            conn.execute(
                "UPDATE DIAGRAM_ELEMENT SET PARENT_ID=?, DEFINITION=? WHERE ID=?",
                (frame_id, bval(definition), case["ID"]),
            )

        for role, actor in canonical.items():
            x, y = ACTOR_POSITIONS[role]
            definition = val(actor["DEFINITION"])
            definition = field(definition, "x", str(x))
            definition = field(definition, "y", str(y))
            conn.execute(
                "UPDATE DIAGRAM_ELEMENT SET DEFINITION=? WHERE ID=?",
                (bval(definition), actor["ID"]),
            )

        for association in associations:
            definition = val(association["DEFINITION"])
            old_actor_id = re.search(r"_fromShape=<[^:>]+:([^>]+)>", definition).group(1)
            case_id = re.search(r"_toShape=<[^:>]+:([^>]+)>", definition).group(1)
            role = old_actor_name[old_actor_id]
            chosen = canonical[role]
            ax, ay = ACTOR_POSITIONS[role]
            aw = number(val(chosen["DEFINITION"]), "width")
            ah = number(val(chosen["DEFINITION"]), "height")
            cx, cy, cw, ch = case_abs[case_id]
            left = ax < FRAME[0]
            p1 = (aw if left else 0, ah // 2)
            p2 = (0 if left else cw, ch // 2)
            start = (ax + p1[0], ay + p1[1])
            end = (cx + p2[0], cy + p2[1])
            definition = field(definition, "_fromShape", f"<{did}:{chosen['ID']}>")
            definition = field(definition, "_points", f'"{p1[0]},{p1[1]};{p2[0]},{p2[1]};"')
            definition = field(definition, "x", str(min(start[0], end[0]) - ax - 30))
            definition = field(definition, "y", str(min(start[1], end[1]) - ay - 30))
            definition = field(definition, "width", str(abs(end[0] - start[0]) + 60))
            definition = field(definition, "height", str(abs(end[1] - start[1]) + 60))
            conn.execute(
                "UPDATE DIAGRAM_ELEMENT SET DEFINITION=? WHERE ID=?",
                (bval(definition), association["ID"]),
            )
            if old_actor_id != chosen["ID"]:
                old_actor = by_id[old_actor_id]
                model = conn.execute(
                    "SELECT * FROM MODEL_ELEMENT WHERE ID=?", (association["MODEL_ELEMENT_ID"],)
                ).fetchone()
                model_definition = replace_actor_model_end(
                    val(model["DEFINITION"]),
                    old_actor["MODEL_ELEMENT_ID"],
                    chosen["MODEL_ELEMENT_ID"],
                )
                conn.execute(
                    "UPDATE MODEL_ELEMENT SET DEFINITION=? WHERE ID=?",
                    (bval(model_definition), model["ID"]),
                )

        kept_actor_ids = {actor["ID"] for actor in canonical.values()}
        removed = [element for element in systems[1:] + actors if
                   element["SHAPE_TYPE"] == "System" or element["ID"] not in kept_actor_ids]
        for element in removed:
            conn.execute("DELETE FROM DIAGRAM_ELEMENT WHERE ID=?", (element["ID"],))
            conn.execute("DELETE FROM MODEL_ELEMENT WHERE ID=?", (element["MODEL_ELEMENT_ID"],))

        removed_ids = {element["ID"] for element in removed}
        refs = [f"<{did}:{element['ID']}>" for element in elements if element["ID"] not in removed_ids]
        diagram_definition = replace_block(
            val(diagram["DEFINITION"]), "Child",
            "(\n\t\t" + ",\n\t\t".join(refs) + "\n\t)",
        )
        conn.execute(
            "UPDATE DIAGRAM SET DEFINITION=? WHERE ID=?", (bval(diagram_definition), did)
        )
        if conn.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("SQLite integrity check failed")
        conn.commit()
        print(f"Created {OUTPUT}")
        print("UC-00: one system frame, 6 unique actors, 72 use cases")
    except Exception:
        conn.rollback()
        conn.close()
        OUTPUT.unlink(missing_ok=True)
        raise
    conn.close()


if __name__ == "__main__":
    main()
