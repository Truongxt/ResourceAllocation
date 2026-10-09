"""Improve the native UML activity/use-case/class presentation in a .vpp file."""

from __future__ import annotations

import re
import sqlite3
from pathlib import Path

from improve_vpp_sequence import bval, field, insert_row, name, replace_block, uid, val


PROJECT = Path(r"D:\ResourceAllocation\docs\ResourceAllocation_UML_revised.vpp")


def color(shape: str, rgb: tuple[int, int, int]) -> str:
    numbers = f"{rgb[0]}, \n\t\t{rgb[1]}, \n\t\t{rgb[2]}, \n\t\t255"
    shape = re.sub(r"(background=\()\s*\d+,\s*\d+,\s*\d+,\s*\d+", lambda m: m.group(1) + "\n\t\t" + numbers, shape, count=1)
    for component in ("@color1", "@color2"):
        shape = re.sub(rf"({re.escape(component)}=\()\s*\d+,\s*\d+,\s*\d+,\s*\d+",
                       lambda m: m.group(1) + "\n\t\t\t" + numbers, shape, count=1)
    return shape


def geom(shape: str) -> dict[str, int]:
    return {key: int(re.search(rf"(?m)^\s*{key}=(-?\d+);", shape).group(1))
            for key in ("x", "y", "width", "height")}


def caption_size(shape: str, width: int, height: int) -> str:
    block = re.search(r"(?s)(_captionUIModel=\()(.*?)(\);)", shape)
    if not block:
        return shape
    c = block.group(2)
    c = re.sub(r"@width=-?\d+;", f"@width={width};", c, count=1)
    c = re.sub(r"@height=-?\d+;", f"@height={height};", c, count=1)
    return shape[:block.start(2)] + c + shape[block.end(2):]


def transparent_fill(shape: str) -> str:
    shape = re.sub(r"(@transparency=)\d+;", r"\g<1>100;", shape, count=1)
    shape = re.sub(r"(?s)(background=\(\s*\d+,\s*\d+,\s*\d+,\s*)255", r"\g<1>0", shape, count=1)
    for component in ("@color1", "@color2"):
        shape = re.sub(rf"(?s)({re.escape(component)}=\(\s*\d+,\s*\d+,\s*\d+,\s*)255", r"\g<1>0", shape, count=1)
    return shape


USER_STEPS = {
    "ACT-01": {0},
    "ACT-02": {0, 4, 5, 6},
    "ACT-03": {0, 1, 3, 5, 6, 7},
    "ACT-04": {0, 1, 2, 3},
    "ACT-05": {0},
    "ACT-06": {0},
    "ACT-07": {0, 1, 2},
    "ACT-08": {0, 8},
    "ACT-09": {0, 1, 6},
    "ACT-10": {0, 5},
}


USE_CASE_ROLES = {
    "UC-01": [0, 2, 1, 3, 1, 2, 1, 1, 3],
    "UC-02": [0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2],
    "UC-03": [0, 2, 1, 2, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0],
    "UC-04": [0, 0, 2, 2, 0, 2, 1, 2, 2, 1, 2],
    "UC-05": [1, 1, 1, 1, 0, 0, 1, 2, 1, 1, 0],
    "UC-06": [0, 1, 0, 1, 1, 1, 0, 0, 2, 2, 2, 2, 0],
}


CLASS_ORDER = {
    "CLS-01": ["User", "Project", "Task", "TaskGroup", "Resource", "Department", "RecurringTask", "OptimizationResult", "RefreshToken", "Notification", "ActivityLog", "CompanySetting"],
    "CLS-02": ["ExpressApp", "AuthMiddleware", "ProjectController", "TaskController", "ResourceController", "OptimizationController", "AnalyticsController", "TaskAccess", "GeneticAlgorithm", "CSPSolver", "ExcelTaskImportService", "MongooseModels", "SocketService", "ActivityLogService"],
    "CLS-03": ["App", "ProtectedRoute", "AuthContext", "SocketContext", "ThemeContext", "DashboardPage", "ProjectsPage", "TasksPage", "ResourcesPage", "OptimizationPage", "CalendarGantt", "ReportsPage", "ApiClient", "DomainServices", "I18n"],
}


USE_CASE_RELATIONS = {
    "UC-01": [("Tối ưu phân bổ", "Quản lý dự án", "Extend"),
              ("Quản lý cấu hình và nhật ký", "Quản lý nhân sự", "Extend")],
    "UC-02": [("Làm mới access token", "Đăng nhập", "Extend"),
              ("Đổi mật khẩu", "Cập nhật hồ sơ", "Extend"),
              ("Gán vai trò", "Quản lý tài khoản", "Extend"),
              ("Cấp quyền ứng dụng", "Quản lý tài khoản", "Extend")],
    "UC-03": [("Thiết lập phụ thuộc", "Tạo / sửa / xóa công việc", "Extend"),
              ("Nhập Excel", "Tạo / sửa / xóa công việc", "Extend")],
    "UC-04": [("Tính lại workload", "Theo dõi workload", "Include")],
    "UC-05": [("Chạy Hybrid", "Chạy CSP", "Include"),
              ("Chạy Hybrid", "Chạy Genetic Algorithm", "Include"),
              ("Hoàn tác phương án", "Áp dụng phương án", "Extend")],
    "UC-06": [("Đánh dấu đã đọc", "Đọc thông báo", "Extend"),
              ("Xuất CSV / PDF", "Xem báo cáo utilization", "Extend"),
              ("Xem Gantt và đường găng", "Xem lịch ngày / tuần / tháng", "Extend")],
}


def add_use_case_relations(conn: sqlite3.Connection, diagram: sqlite3.Row,
                           cases: list[sqlite3.Row], positions: dict[str, dict[str, int]]) -> None:
    did = diagram["ID"]
    source = sqlite3.connect(r"C:\Program Files\Visual Paradigm for UML 10.0\Samples\UML 2.0 Notations\UMLNotations.vpp")
    source.row_factory = sqlite3.Row
    template = source.execute("SELECT * FROM DIAGRAM_ELEMENT WHERE SHAPE_TYPE='Dependency' LIMIT 1").fetchone()
    model_template = source.execute("SELECT * FROM MODEL_ELEMENT WHERE ID=?", (template["MODEL_ELEMENT_ID"],)).fetchone()
    by_name = {conn.execute("SELECT NAME FROM MODEL_ELEMENT WHERE ID=?", (row["MODEL_ELEMENT_ID"],)).fetchone()[0]: row for row in cases}
    model_address_prefix = re.search(r"metaModelElement=<([^>]+)>", val(template["DEFINITION"])).group(1).rsplit(":", 1)[0]
    diagram_refs = []
    model_refs = []
    for from_name, to_name, kind in USE_CASE_RELATIONS[diagram["NAME"][:5]]:
        from_row, to_row = by_name[from_name], by_name[to_name]
        a, z = positions[from_row["ID"]], positions[to_row["ID"]]
        mid, sid = uid(), uid()
        label = "«include»" if kind == "Include" else "«extend»"
        md = name(val(model_template["DEFINITION"]), mid, label)
        md = md.replace(":Dependency {", f":{kind} {{", 1)
        from_model = re.search(r"metaModelElement=<([^>]+)>", val(from_row["DEFINITION"])).group(1)
        to_model = re.search(r"metaModelElement=<([^>]+)>", val(to_row["DEFINITION"])).group(1)
        md = field(md, "fromModel", f"<{from_model}>")
        md = field(md, "toModel", f"<{to_model}>")
        md = field(md, "_masterViewId", f'"{sid}"')
        md = re.sub(r'(container=<)[^>]+', r"\g<1>" + did, md, count=1)
        md = re.sub(r'(view=")[^"]+', r"\g<1>" + sid, md, count=1)
        md = re.sub(r'(\{)[\w.-]+:("View":ModelView)', lambda m: m.group(1) + uid() + ":" + m.group(2), md, count=1)
        insert_row(conn, "MODEL_ELEMENT", model_template, ID=mid, MODEL_TYPE=kind,
                   NAME=label, DEFINITION=bval(md))
        sd = name(val(template["DEFINITION"]), sid, label)
        sd = sd.replace(":Dependency {", f":{kind} {{", 1)
        sd = field(sd, "_fromShape", f"<{did}:{from_row['ID']}>")
        sd = field(sd, "_toShape", f"<{did}:{to_row['ID']}>")
        sd = field(sd, "metaModelElement", f"<{model_address_prefix}:{mid}>")
        if abs(z["y"] - a["y"]) > 120:
            p1, p2 = (a["width"], a["height"] // 2), (z["width"], z["height"] // 2)
        elif z["y"] > a["y"]:
            p1, p2 = (a["width"] // 2, a["height"]), (z["width"] // 2, 0)
        else:
            p1, p2 = (a["width"] // 2, 0), (z["width"] // 2, z["height"])
        sd = field(sd, "_points", f'"{p1[0]},{p1[1]};{p2[0]},{p2[1]};"')
        start, end = (a["x"] + p1[0], a["y"] + p1[1]), (z["x"] + p2[0], z["y"] + p2[1])
        sd = field(sd, "x", str(min(start[0], end[0]) - a["x"] - 30))
        sd = field(sd, "y", str(min(start[1], end[1]) - a["y"] - 30))
        sd = field(sd, "width", str(abs(end[0] - start[0]) + 60))
        sd = field(sd, "height", str(abs(end[1] - start[1]) + 60))
        sd = caption_size(sd, 95, 18)
        sd = re.sub(r"(?s)(_captionUIModel=\(.*?)@y=-?\d+;", r"\g<1>@y=-20;", sd, count=1)
        insert_row(conn, "DIAGRAM_ELEMENT", template, ID=sid, SHAPE_TYPE=kind,
                   DIAGRAM_ID=did, MODEL_ELEMENT_ID=mid, DEFINITION=bval(sd))
        diagram_refs.append(f"<{did}:{sid}>")
        model_refs.append(f"<{model_address_prefix}:{mid}>")
    source.close()
    dd = val(conn.execute("SELECT DEFINITION FROM DIAGRAM WHERE ID=?", (did,)).fetchone()[0])
    match = re.search(r"(?s)\bChild=\((.*?)\);", dd)
    refs = re.findall(r"<[^>]+>", match.group(1)) + diagram_refs
    dd = replace_block(dd, "Child", "(\n\t\t" + ",\n\t\t".join(refs) + "\n\t)")
    conn.execute("UPDATE DIAGRAM SET DEFINITION=? WHERE ID=?", (bval(dd), did))
    parent = model_template["PARENT_ID"]
    parent_definition = val(conn.execute("SELECT DEFINITION FROM MODEL_ELEMENT WHERE ID=?", (parent,)).fetchone()[0])
    match = re.search(r"(?s)\bChild=\((.*?)\);", parent_definition)
    refs = re.findall(r"<[^>]+>", match.group(1)) + model_refs
    parent_definition = replace_block(parent_definition, "Child", "(\n\t\t" + ",\n\t\t".join(refs) + "\n\t)")
    conn.execute("UPDATE MODEL_ELEMENT SET DEFINITION=? WHERE ID=?", (bval(parent_definition), parent))


def improve_class(conn: sqlite3.Connection, diagram: sqlite3.Row) -> None:
    did = diagram["ID"]
    rows = conn.execute("SELECT * FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=? ORDER BY rowid", (did,)).fetchall()
    classes = [r for r in rows if r["SHAPE_TYPE"] == "Class"]
    order = CLASS_ORDER[diagram["NAME"][:6]]
    names = {r["ID"]: conn.execute("SELECT NAME FROM MODEL_ELEMENT WHERE ID=?", (r["MODEL_ELEMENT_ID"],)).fetchone()[0] for r in classes}
    rank = {n: i for i, n in enumerate(order)}
    if set(names.values()) != set(order):
        raise ValueError(f"Class list mismatch: {diagram['NAME']}")
    positions: dict[str, dict[str, int]] = {}
    class_model_ids = {r["ID"]: r["MODEL_ELEMENT_ID"] for r in classes}
    for row in classes:
        index = rank[names[row["ID"]]]
        x, y = 60 + (index % 4) * 360, 50 + (index // 4) * 255
        width, height = 300, 190
        sd = val(row["DEFINITION"])
        for key, value in (("x", x), ("y", y), ("width", width), ("height", height)):
            sd = field(sd, key, str(value))
        sd = color(sd, (122, 207, 245))
        sd = caption_size(sd, width - 18, 20)
        conn.execute("UPDATE DIAGRAM_ELEMENT SET DEFINITION=? WHERE ID=?", (bval(sd), row["ID"]))
        positions[row["ID"]] = {"x": x, "y": y, "width": width, "height": height}

    for row in (r for r in rows if r["SHAPE_TYPE"] == "Association"):
        sd = val(row["DEFINITION"])
        fm = re.search(r"_fromShape=<[^:>]+:([^>]+)>", sd)
        tm = re.search(r"_toShape=<[^:>]+:([^>]+)>", sd)
        if not fm or not tm or fm.group(1) not in positions or tm.group(1) not in positions:
            continue
        a, z = positions[fm.group(1)], positions[tm.group(1)]
        ac = (a["x"] + a["width"] // 2, a["y"] + a["height"] // 2)
        zc = (z["x"] + z["width"] // 2, z["y"] + z["height"] // 2)
        dx, dy = zc[0] - ac[0], zc[1] - ac[1]
        if abs(dx) >= abs(dy):
            p1 = (a["width"] if dx > 0 else 0, a["height"] // 2)
            p2 = (0 if dx > 0 else z["width"], z["height"] // 2)
        else:
            p1 = (a["width"] // 2, a["height"] if dy > 0 else 0)
            p2 = (z["width"] // 2, 0 if dy > 0 else z["height"])
        sd = field(sd, "_points", f'"{p1[0]},{p1[1]};{p2[0]},{p2[1]};"')
        sd = field(sd, "connectorStyle", "0")
        start, end = (a["x"] + p1[0], a["y"] + p1[1]), (z["x"] + p2[0], z["y"] + p2[1])
        sd = field(sd, "x", str(min(start[0], end[0]) - a["x"] - 45))
        sd = field(sd, "y", str(min(start[1], end[1]) - a["y"] - 45))
        sd = field(sd, "width", str(abs(end[0] - start[0]) + 90))
        sd = field(sd, "height", str(abs(end[1] - start[1]) + 90))
        for key in ("showFromRoleName", "showToRoleName", "hasRoleAShape", "hasRoleBShape"):
            if re.search(rf"(?m)^\s*{key}=", sd):
                sd = field(sd, key, "F")
        sd = re.sub(r"(?s)(_captionUIModel=\(.*?)@visible=T;", r"\g<1>@visible=F;", sd, count=1)
        if not diagram["NAME"].startswith("CLS-01"):
            for key in ("showFromMultiplicity", "showToMultiplicity", "hasMultiplicityAShape", "hasMultiplicityBShape"):
                if re.search(rf"(?m)^\s*{key}=", sd):
                    sd = field(sd, key, "F")
        conn.execute("UPDATE DIAGRAM_ELEMENT SET DEFINITION=? WHERE ID=?", (bval(sd), row["ID"]))

        model = conn.execute("SELECT * FROM MODEL_ELEMENT WHERE ID=?", (row["MODEL_ELEMENT_ID"],)).fetchone()
        md = val(model["DEFINITION"])
        endpoints = iter((class_model_ids[fm.group(1)], class_model_ids[tm.group(1)]))
        md = re.sub(r'(EndModelElement=<)[^>]+', lambda m: m.group(1) + next(endpoints), md, count=2)
        md = re.sub(r'(from=\{[\w.-]+:)"[^"]*"', r'\g<1>""', md, count=1)
        md = re.sub(r'(to=\{[\w.-]+:)"[^"]*"', r'\g<1>""', md, count=1)
        if diagram["NAME"].startswith("CLS-01"):
            multiplicities = iter(("1", "0..*"))
            md = re.sub(r'multiplicity="[^"]*"', lambda m: 'multiplicity="' + next(multiplicities) + '"', md, count=2)
        conn.execute("UPDATE MODEL_ELEMENT SET DEFINITION=? WHERE ID=?", (bval(md), model["ID"]))


def improve_use_case(conn: sqlite3.Connection, diagram: sqlite3.Row) -> None:
    did = diagram["ID"]
    rows = conn.execute("SELECT * FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=? ORDER BY rowid", (did,)).fetchall()
    actors = [r for r in rows if r["SHAPE_TYPE"] == "Actor"]
    cases = [r for r in rows if r["SHAPE_TYPE"] == "UseCase"]
    associations = [r for r in rows if r["SHAPE_TYPE"] == "Association"]
    roles = USE_CASE_ROLES[diagram["NAME"][:5]]
    if len(roles) != len(cases):
        raise ValueError(f"Use-case role count mismatch: {diagram['NAME']}")
    y_cursor = 95
    actor_centers: dict[int, list[int]] = {i: [] for i in range(len(actors))}
    positions: dict[str, dict[str, int]] = {}
    primary_indices: list[int] = []
    for role_index in range(len(actors)):
        group = [i for i, r in enumerate(roles) if r == role_index]
        for group_index, index in enumerate(group):
            row = cases[index]
            x, y, width, height = 175, y_cursor, 510, 62
            sd = val(row["DEFINITION"])
            for key, value in (("x", x), ("y", y), ("width", width), ("height", height)):
                sd = field(sd, key, str(value))
            sd = color(sd, (255, 244, 163) if group_index == 0 else (122, 207, 245))
            sd = caption_size(sd, width - 45, height - 10)
            conn.execute("UPDATE DIAGRAM_ELEMENT SET DEFINITION=? WHERE ID=?", (bval(sd), row["ID"]))
            actor_centers[role_index].append(35 + y + height // 2)
            positions[row["ID"]] = {"x": 250 + x, "y": 35 + y, "width": width, "height": height}
            if group_index == 0:
                primary_indices.append(index)
            y_cursor += 100
        y_cursor += 32

    for i, row in enumerate(actors):
        y = max(85, sum(actor_centers[i]) // len(actor_centers[i]) - 44) if actor_centers[i] else 90
        x, width, height = 70, 70, 88
        sd = val(row["DEFINITION"])
        for key, value in (("x", x), ("y", y), ("width", width), ("height", height)):
            sd = field(sd, key, str(value))
        sd = caption_size(sd, 160, 30)
        conn.execute("UPDATE DIAGRAM_ELEMENT SET DEFINITION=? WHERE ID=?", (bval(sd), row["ID"]))
        positions[row["ID"]] = {"x": x, "y": y, "width": width, "height": height}

    boundary = next(r for r in rows if r["SHAPE_TYPE"] == "System")
    sd = val(boundary["DEFINITION"])
    for key, value in (("x", 250), ("y", 35), ("width", 750), ("height", y_cursor + 35)):
        sd = field(sd, key, str(value))
    sd = color(sd, (255, 255, 255))
    conn.execute("UPDATE DIAGRAM_ELEMENT SET DEFINITION=? WHERE ID=?", (bval(sd), boundary["ID"]))

    actor_index = {row["ID"]: i for i, row in enumerate(actors)}
    case_index = {row["ID"]: i for i, row in enumerate(cases)}
    candidates: dict[int, list[sqlite3.Row]] = {i: [] for i in range(len(cases))}
    for row in associations:
        sd = val(row["DEFINITION"])
        fm = re.search(r"_fromShape=<[^:>]+:([^>]+)>", sd)
        tm = re.search(r"_toShape=<[^:>]+:([^>]+)>", sd)
        if not fm or not tm:
            continue
        if fm.group(1) in actor_index and tm.group(1) in case_index:
            candidates[case_index[tm.group(1)]].append(row)
    keep: set[str] = set()
    for index, uc in enumerate(cases):
        options = candidates[index]
        if not options:
            continue
        desired_actor_id = actors[roles[index]]["ID"]
        chosen = next((row for row in options if desired_actor_id in val(row["DEFINITION"])), options[0])
        keep.add(chosen["ID"])
        sd = val(chosen["DEFINITION"])
        # Keep the model's real actor endpoint; a fallback link may use another role.
        actual_actor_id = re.search(r"_fromShape=<[^:>]+:([^>]+)>", sd).group(1)
        a, z = positions[actual_actor_id], positions[uc["ID"]]
        p1, p2 = (a["width"], a["height"] // 2), (0, z["height"] // 2)
        sd = field(sd, "_points", f'"{p1[0]},{p1[1]};{p2[0]},{p2[1]};"')
        sd = field(sd, "connectorStyle", "0")
        source = (a["x"] + p1[0], a["y"] + p1[1])
        target = (z["x"] + p2[0], z["y"] + p2[1])
        sd = field(sd, "x", str(min(source[0], target[0]) - a["x"] - 30))
        sd = field(sd, "y", str(min(source[1], target[1]) - a["y"] - 30))
        sd = field(sd, "width", str(abs(target[0] - source[0]) + 60))
        sd = field(sd, "height", str(abs(target[1] - source[1]) + 60))
        conn.execute("UPDATE DIAGRAM_ELEMENT SET DEFINITION=? WHERE ID=?", (bval(sd), chosen["ID"]))

    removed = {row["ID"] for row in associations if row["ID"] not in keep}
    for sid in removed:
        conn.execute("DELETE FROM DIAGRAM_ELEMENT WHERE ID=?", (sid,))
    dd = val(diagram["DEFINITION"])
    match = re.search(r"(?s)\bChild=\((.*?)\);", dd)
    refs = [r for r in re.findall(r"<[^>]+>", match.group(1)) if r.rsplit(":", 1)[-1][:-1] not in removed]
    dd = replace_block(dd, "Child", "(\n\t\t" + ",\n\t\t".join(refs) + "\n\t)")
    conn.execute("UPDATE DIAGRAM SET DEFINITION=? WHERE ID=?", (bval(dd), did))
    add_use_case_relations(conn, diagram, cases, positions)


def activity_edges(prefix: str, sequence: list[sqlite3.Row], main_count: int) -> list[tuple[int, int, str]]:
    kinds = [row["SHAPE_TYPE"] for row in sequence[:main_count]]
    decisions = [i for i, kind in enumerate(kinds) if kind == "DecisionNode"]
    edges = [(i, i + 1, "") for i in range(main_count - 1)]
    final = main_count - 1
    for i in decisions:
        edges[i] = (i, i + 1, "[Có]")
    if prefix == "ACT-05":
        # Completed and failed are alternative outcomes, never a serial chain.
        completed = final - 3
        failed = final - 2
        display = final - 1
        edges = [e for e in edges if e[:2] != (completed, failed)]
        edges.extend([(completed, display, ""), (decisions[0], main_count, "[Không]"),
                      (decisions[1], failed, "[Không]")])
    elif prefix == "ACT-04":
        edges.append((decisions[0], final - 1, "[Không]"))
    elif prefix == "ACT-06":
        edges.append((decisions[0], final - 1, "[Không]"))
    elif prefix == "ACT-09":
        edges.append((decisions[0], decisions[0] + 2, "[Không]"))
    else:
        for offset, i in enumerate(decisions):
            edges.append((i, main_count + offset, "[Không]"))
    return edges


def add_error_finals(conn: sqlite3.Connection, diagram: sqlite3.Row,
                     sequence: list[sqlite3.Row], shapes: dict[str, dict[str, int]]) -> list[sqlite3.Row]:
    prefix = diagram["NAME"][:6]
    if prefix not in {"ACT-01", "ACT-02", "ACT-03", "ACT-05", "ACT-07", "ACT-08", "ACT-10"}:
        return sequence
    did = diagram["ID"]
    decisions = [row for row in sequence if row["SHAPE_TYPE"] == "DecisionNode"]
    if prefix == "ACT-05":
        decisions = decisions[:1]
    template = next(row for row in sequence if row["SHAPE_TYPE"] == "ActivityFinalNode")
    model_template = conn.execute("SELECT * FROM MODEL_ELEMENT WHERE ID=?", (template["MODEL_ELEMENT_ID"],)).fetchone()
    parent = model_template["PARENT_ID"]
    new_rows = []
    diagram_refs = []
    model_refs = []
    address_prefix = re.search(r"metaModelElement=<([^>]+)>", val(template["DEFINITION"])).group(1).rsplit(":", 1)[0]
    for decision in decisions:
        mid, sid = uid(), uid()
        md = name(val(model_template["DEFINITION"]), mid, "Kết thúc nhánh lỗi")
        md = field(md, "_masterViewId", f'"{sid}"')
        md = replace_block(md, "ToSimpleRelationships", "NULL")
        md = re.sub(r'(container=<)[^>]+', r"\g<1>" + did, md, count=1)
        md = re.sub(r'(view=")[^"]+', r"\g<1>" + sid, md, count=1)
        md = re.sub(r'(\{)[\w.-]+:("View":ModelView)', lambda m: m.group(1) + uid() + ":" + m.group(2), md, count=1)
        insert_row(conn, "MODEL_ELEMENT", model_template, ID=mid, NAME="Kết thúc nhánh lỗi", DEFINITION=bval(md))
        d = shapes[decision["ID"]]
        x, y, width, height = 1055, d["y"] + 17, 38, 38
        sd = name(val(template["DEFINITION"]), sid, "Kết thúc nhánh lỗi")
        sd = field(sd, "metaModelElement", f"<{address_prefix}:{mid}>")
        for key, value in (("x", x), ("y", y), ("width", width), ("height", height)):
            sd = field(sd, key, str(value))
        insert_row(conn, "DIAGRAM_ELEMENT", template, ID=sid, DIAGRAM_ID=did,
                   MODEL_ELEMENT_ID=mid, DEFINITION=bval(sd))
        shapes[sid] = {"x": x, "y": y, "width": width, "height": height}
        new_rows.append(conn.execute("SELECT * FROM DIAGRAM_ELEMENT WHERE ID=?", (sid,)).fetchone())
        diagram_refs.append(f"<{did}:{sid}>")
        model_refs.append(f"<{address_prefix}:{mid}>")
    dd = val(conn.execute("SELECT DEFINITION FROM DIAGRAM WHERE ID=?", (did,)).fetchone()[0])
    match = re.search(r"(?s)\bChild=\((.*?)\);", dd)
    refs = re.findall(r"<[^>]+>", match.group(1)) + diagram_refs
    dd = replace_block(dd, "Child", "(\n\t\t" + ",\n\t\t".join(refs) + "\n\t)")
    conn.execute("UPDATE DIAGRAM SET DEFINITION=? WHERE ID=?", (bval(dd), did))
    parent_definition = val(conn.execute("SELECT DEFINITION FROM MODEL_ELEMENT WHERE ID=?", (parent,)).fetchone()[0])
    match = re.search(r"(?s)\bChild=\((.*?)\);", parent_definition)
    refs = re.findall(r"<[^>]+>", match.group(1)) + model_refs
    parent_definition = replace_block(parent_definition, "Child", "(\n\t\t" + ",\n\t\t".join(refs) + "\n\t)")
    conn.execute("UPDATE MODEL_ELEMENT SET DEFINITION=? WHERE ID=?", (bval(parent_definition), parent))
    return sequence + new_rows


def rebuild_activity_flows(conn: sqlite3.Connection, diagram: sqlite3.Row,
                           rows: list[sqlite3.Row], sequence: list[sqlite3.Row], main_count: int,
                           shapes: dict[str, dict[str, int]]) -> None:
    did = diagram["ID"]
    old_flows = [row for row in rows if row["SHAPE_TYPE"] == "ControlFlow"]
    template = old_flows[0]
    model_template = conn.execute("SELECT * FROM MODEL_ELEMENT WHERE ID=?", (template["MODEL_ELEMENT_ID"],)).fetchone()
    parent = model_template["PARENT_ID"]
    flow_address = re.search(r"metaModelElement=<([^>]+)>", val(template["DEFINITION"])).group(1)
    prefix = flow_address.rsplit(":", 1)[0]
    old_ids = {row["MODEL_ELEMENT_ID"] for row in old_flows}
    for row in old_flows:
        conn.execute("DELETE FROM DIAGRAM_ELEMENT WHERE ID=?", (row["ID"],))
        conn.execute("DELETE FROM MODEL_ELEMENT WHERE ID=?", (row["MODEL_ELEMENT_ID"],))

    new_diagram_refs = []
    new_model_refs = []
    for source_index, target_index, guard in activity_edges(diagram["NAME"][:6], sequence, main_count):
        source, target = sequence[source_index], sequence[target_index]
        a, z = shapes[source["ID"]], shapes[target["ID"]]
        mid, sid = uid(), uid()
        source_model = re.search(r"metaModelElement=<([^>]+)>", val(source["DEFINITION"])).group(1)
        target_model = re.search(r"metaModelElement=<([^>]+)>", val(target["DEFINITION"])).group(1)
        md = name(val(model_template["DEFINITION"]), mid, guard)
        md = field(md, "fromModel", f"<{source_model}>")
        md = field(md, "toModel", f"<{target_model}>")
        md = field(md, "_masterViewId", f'"{sid}"')
        md = re.sub(r'(container=<)[^>]+', r"\g<1>" + did, md, count=1)
        md = re.sub(r'(view=")[^"]+', r"\g<1>" + sid, md, count=1)
        md = re.sub(r'(\{)[\w.-]+:("View":ModelView)', lambda m: m.group(1) + uid() + ":" + m.group(2), md, count=1)
        insert_row(conn, "MODEL_ELEMENT", model_template, ID=mid, NAME=guard, DEFINITION=bval(md))
        sd = name(val(template["DEFINITION"]), sid, guard)
        sd = field(sd, "_fromShape", f"<{did}:{source['ID']}>")
        sd = field(sd, "_toShape", f"<{did}:{target['ID']}>")
        sd = field(sd, "metaModelElement", f"<{prefix}:{mid}>")
        if z["y"] > a["y"] + a["height"]:
            p1 = (a["width"] // 2, a["height"])
            p2 = (z["width"] // 2, 0)
        elif z["x"] > a["x"]:
            p1 = (a["width"], a["height"] // 2)
            p2 = (0, z["height"] // 2)
        else:
            p1 = (0, a["height"] // 2)
            p2 = (z["width"], z["height"] // 2)
        sd = field(sd, "_points", f'"{p1[0]},{p1[1]};{p2[0]},{p2[1]};"')
        sd = field(sd, "connectorStyle", "0")
        from_abs = (a["x"] + p1[0], a["y"] + p1[1])
        to_abs = (z["x"] + p2[0], z["y"] + p2[1])
        sd = field(sd, "x", str(min(from_abs[0], to_abs[0]) - a["x"] - 50))
        sd = field(sd, "y", str(min(from_abs[1], to_abs[1]) - a["y"] - 50))
        sd = field(sd, "width", str(abs(to_abs[0] - from_abs[0]) + 100))
        sd = field(sd, "height", str(abs(to_abs[1] - from_abs[1]) + 100))
        if guard:
            sd = caption_size(sd, 65, 18)
        insert_row(conn, "DIAGRAM_ELEMENT", template, ID=sid, DIAGRAM_ID=did,
                   MODEL_ELEMENT_ID=mid, DEFINITION=bval(sd))
        new_diagram_refs.append(f"<{did}:{sid}>")
        new_model_refs.append(f"<{prefix}:{mid}>")

    diagram_definition = val(conn.execute("SELECT DEFINITION FROM DIAGRAM WHERE ID=?", (did,)).fetchone()[0])
    match = re.search(r"(?s)\bChild=\((.*?)\);", diagram_definition)
    old_shape_ids = {row["ID"] for row in old_flows}
    refs = [r for r in re.findall(r"<[^>]+>", match.group(1)) if r.rsplit(":", 1)[-1][:-1] not in old_shape_ids]
    refs.extend(new_diagram_refs)
    diagram_definition = replace_block(diagram_definition, "Child", "(\n\t\t" + ",\n\t\t".join(refs) + "\n\t)")
    conn.execute("UPDATE DIAGRAM SET DEFINITION=? WHERE ID=?", (bval(diagram_definition), did))
    parent_definition = val(conn.execute("SELECT DEFINITION FROM MODEL_ELEMENT WHERE ID=?", (parent,)).fetchone()[0])
    match = re.search(r"(?s)\bChild=\((.*?)\);", parent_definition)
    refs = [r for r in re.findall(r"<[^>]+>", match.group(1)) if r.rsplit(":", 1)[-1][:-1] not in old_ids]
    refs.extend(new_model_refs)
    parent_definition = replace_block(parent_definition, "Child", "(\n\t\t" + ",\n\t\t".join(refs) + "\n\t)")
    conn.execute("UPDATE MODEL_ELEMENT SET DEFINITION=? WHERE ID=?", (bval(parent_definition), parent))


def improve_activity(conn: sqlite3.Connection, diagram: sqlite3.Row) -> None:
    did = diagram["ID"]
    rows = conn.execute("SELECT * FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=? ORDER BY rowid", (did,)).fetchall()
    actions = [r for r in rows if r["SHAPE_TYPE"] in ("ActivityAction", "DecisionNode")]
    sequence = [r for r in rows if r["SHAPE_TYPE"] in ("InitialNode", "ActivityAction", "DecisionNode", "ActivityFinalNode")]
    total_h = 180 + 100 * len(sequence)
    shapes: dict[str, dict[str, int]] = {}
    for order, row in enumerate(sequence):
        kind = row["SHAPE_TYPE"]
        action_index = actions.index(row) if row in actions else -1
        user_lane = kind == "InitialNode" or (kind == "ActivityAction" and action_index in USER_STEPS.get(diagram["NAME"][:6], set()))
        if kind == "ActivityFinalNode":
            user_lane = diagram["NAME"].startswith("ACT-05")
        y = 115 + 95 * order
        if kind in ("InitialNode", "ActivityFinalNode"):
            x, width, height = (290 if user_lane else 840), 38, 38
        elif kind == "DecisionNode":
            x, width, height = 787, 145, 72
        else:
            x, width, height = (150 if user_lane else 655), 320 if user_lane else 370, 66
        if diagram["NAME"].startswith("ACT-05"):
            if order == 9:
                x, y, width = 650, 970, 178
            elif order == 10:
                x, y, width = 845, 970, 178
            elif order == 11:
                x, y, width = 705, 1080, 260
            elif order == 12:
                x, y = 290, 1190
        sd = val(row["DEFINITION"])
        for key, value in (("x", x), ("y", y), ("width", width), ("height", height)):
            sd = field(sd, key, str(value))
        if kind == "ActivityAction":
            sd = color(sd, (122, 207, 245))
            sd = caption_size(sd, width - 25, height - 10)
        elif kind == "DecisionNode":
            sd = color(sd, (255, 245, 183))
            sd = caption_size(sd, width - 20, height - 15)
            sd = re.sub(r"(?s)(_captionUIModel=\(.*?)@visible=F;", r"\g<1>@visible=T;", sd, count=1)
        conn.execute("UPDATE DIAGRAM_ELEMENT SET DEFINITION=? WHERE ID=?", (bval(sd), row["ID"]))
        shapes[row["ID"]] = {"x": x, "y": y, "width": width, "height": height}

    main_count = len(sequence)
    sequence = add_error_finals(conn, diagram, sequence, shapes)
    rebuild_activity_flows(conn, diagram, rows, sequence, main_count, shapes)

    overall = next(r for r in rows if r["SHAPE_TYPE"] == "Activity")
    od = val(overall["DEFINITION"])
    for key, value in (("x", 55), ("y", 25), ("width", 1150), ("height", total_h)):
        od = field(od, key, str(value))
    od = color(od, (255, 255, 255))
    conn.execute("UPDATE DIAGRAM_ELEMENT SET DEFINITION=? WHERE ID=?", (bval(od), overall["ID"]))

    # Two large native Activity nodes form editable operator/system lanes.
    # They are inserted below the actual action nodes in the diagram's order.
    overall_model = conn.execute("SELECT * FROM MODEL_ELEMENT WHERE ID=?", (overall["MODEL_ELEMENT_ID"],)).fetchone()
    lane_refs = []
    for label, x, background in (("Người thao tác", 70, (246, 252, 255)), ("Hệ thống", 605, (246, 250, 255))):
        mid, sid = uid(), uid()
        md = name(val(overall_model["DEFINITION"]), mid, label)
        md = field(md, "_masterViewId", f'"{sid}"')
        md = re.sub(r'(view=")[^"]+', r"\g<1>" + sid, md, count=1)
        md = re.sub(r'(container=<)[^>]+', r"\g<1>" + did, md, count=1)
        md = re.sub(r'(\{)[\w.-]+:("View":ModelView)', lambda m: m.group(1) + uid() + ":" + m.group(2), md, count=1)
        insert_row(conn, "MODEL_ELEMENT", overall_model, ID=mid, NAME=label, DEFINITION=bval(md))
        sd = name(val(overall["DEFINITION"]), sid, label)
        for key, value in (("x", x), ("y", 65), ("width", 525), ("height", total_h - 80)):
            sd = field(sd, key, str(value))
        sd = field(sd, "metaModelElement", f"<{mid}>")
        sd = color(sd, background)
        sd = transparent_fill(sd)
        sd = re.sub(r"(?s)\bContainedDiagramElements=\(.*?\);", "ContainedDiagramElements=NULL;", sd, count=1)
        insert_row(conn, "DIAGRAM_ELEMENT", overall, ID=sid, DIAGRAM_ID=did,
                   MODEL_ELEMENT_ID=mid, DEFINITION=bval(sd))
        lane_refs.append(f"<{did}:{sid}>")
    dd = val(conn.execute("SELECT DEFINITION FROM DIAGRAM WHERE ID=?", (did,)).fetchone()[0])
    dd = dd.replace(f"<{did}:{overall['ID']}>,", f"<{did}:{overall['ID']}>,\n\t\t" + ",\n\t\t".join(lane_refs) + ",", 1)
    conn.execute("UPDATE DIAGRAM SET DEFINITION=? WHERE ID=?", (bval(dd), did))


def main() -> None:
    conn = sqlite3.connect(PROJECT)
    conn.row_factory = sqlite3.Row
    for diagram in conn.execute("SELECT * FROM DIAGRAM WHERE DIAGRAM_TYPE='UseCaseDiagram' ORDER BY NAME").fetchall():
        improve_use_case(conn, diagram)
    for diagram in conn.execute("SELECT * FROM DIAGRAM WHERE DIAGRAM_TYPE='ActivityDiagram' ORDER BY NAME").fetchall():
        improve_activity(conn, diagram)
    for diagram in conn.execute("SELECT * FROM DIAGRAM WHERE DIAGRAM_TYPE='ClassDiagram' ORDER BY NAME").fetchall():
        improve_class(conn, diagram)
    conn.commit()
    print("SQLite:", conn.execute("PRAGMA integrity_check").fetchone()[0])
    conn.close()


if __name__ == "__main__":
    main()
