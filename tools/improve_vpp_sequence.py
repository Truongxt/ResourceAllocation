"""Improve the native, individually editable Visual Paradigm sequence diagrams.

The project uses Visual Paradigm 10's SQLite-based .vpp format. This script
clones its own native lifeline, activation and message elements, updating every
model/view reference. It deliberately does not rasterize any diagram.
"""

from __future__ import annotations

import base64
import os
import re
import shutil
import sqlite3
from pathlib import Path


ROOT = Path(r"D:\ResourceAllocation\docs")
SOURCE = ROOT / "ResourceAllocation_UML.vpp"
OUTPUT = ROOT / "ResourceAllocation_UML_revised.vpp"


def uid() -> str:
    return "RA" + base64.urlsafe_b64encode(os.urandom(11)).decode().rstrip("=").replace("-", "_")


def val(blob: bytes) -> str:
    return blob.decode("utf-8")


def bval(s: str) -> bytes:
    return s.encode("utf-8")


def field(s: str, key: str, value: str) -> str:
    pattern = rf"(?m)^(\s*{re.escape(key)}=)[^\r\n]*;"
    out, count = re.subn(pattern, lambda m: m.group(1) + value + ";", s, count=1)
    if count != 1:
        raise ValueError(f"Missing field {key}")
    return out


def name(s: str, new_id: str, new_name: str) -> str:
    new_name = new_name.replace('"', "'")
    return re.sub(r'^[^:]+:"[^"]*":', f'{new_id}:"{new_name}":', s, count=1)


def insert_row(conn, table: str, template: sqlite3.Row, **changes) -> None:
    item = dict(template)
    item.update(changes)
    keys = list(item)
    conn.execute(
        f"INSERT INTO {table} ({','.join(keys)}) VALUES ({','.join('?' for _ in keys)})",
        tuple(item[k] for k in keys),
    )


def replace_block(s: str, key: str, value: str) -> str:
    match = re.search(rf"\b{re.escape(key)}=", s)
    if not match:
        raise ValueError(f"Missing block {key}")
    start = match.end()
    if s.startswith("NULL;", start):
        end = start + 5
    elif s[start] == "(":
        depth = 0
        quoted = False
        escaped = False
        end = -1
        for pos in range(start, len(s)):
            ch = s[pos]
            if escaped:
                escaped = False
            elif ch == "\\" and quoted:
                escaped = True
            elif ch == '"':
                quoted = not quoted
            elif not quoted and ch == "(":
                depth += 1
            elif not quoted and ch == ")":
                depth -= 1
                if depth == 0:
                    end = pos + 2
                    break
        if end < 0 or s[end - 1] != ";":
            raise ValueError(f"Unbalanced block {key}")
    else:
        raise ValueError(f"Unexpected block syntax {key}")
    return s[:start] + value + ";" + s[end:]


def make_sequence(conn: sqlite3.Connection, title: str, lifelines: list[str], messages: list[tuple[int, int, str]]) -> None:
    diagram = conn.execute("SELECT * FROM DIAGRAM WHERE NAME=?", (title,)).fetchone()
    if diagram is None:
        raise ValueError(title)
    did = diagram["ID"]
    old = conn.execute("SELECT * FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=? ORDER BY rowid", (did,)).fetchall()
    old_by_type: dict[str, list[sqlite3.Row]] = {}
    for row in old:
        old_by_type.setdefault(row["SHAPE_TYPE"], []).append(row)
    life_shape = old_by_type["InteractionLifeLine"][0]
    activation_shape = old_by_type["Activation"][0]
    message_shape = old_by_type["Message"][0]
    old_message_ids = {shape["MODEL_ELEMENT_ID"] for shape in old_by_type["Message"]}
    life_model = conn.execute("SELECT * FROM MODEL_ELEMENT WHERE ID=?", (life_shape["MODEL_ELEMENT_ID"],)).fetchone()
    message_model = conn.execute("SELECT * FROM MODEL_ELEMENT WHERE ID=?", (message_shape["MODEL_ELEMENT_ID"],)).fetchone()
    activation_match = re.search(r'\{[\w.-]+:"Activation":Activation \{', val(life_model["DEFINITION"]))
    if not activation_match:
        raise ValueError("Activation model template not found")
    source_life_definition = val(life_model["DEFINITION"])
    depth = 0
    activation_end = None
    for pos in range(activation_match.start(), len(source_life_definition)):
        if source_life_definition[pos] == "{":
            depth += 1
        elif source_life_definition[pos] == "}":
            depth -= 1
            if depth == 0:
                activation_end = pos + 1
                break
    if activation_end is None:
        raise ValueError("Unbalanced activation template")
    activation_template = source_life_definition[activation_match.start():activation_end]

    # Remove only the old diagram's view rows and its two message model rows.
    conn.execute("DELETE FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=?", (did,))
    for shape in old_by_type["Message"]:
        conn.execute("DELETE FROM MODEL_ELEMENT WHERE ID=?", (shape["MODEL_ELEMENT_ID"],))
    for shape in old_by_type["InteractionLifeLine"]:
        conn.execute("DELETE FROM MODEL_ELEMENT WHERE ID=?", (shape["MODEL_ELEMENT_ID"],))

    life_ids = [uid() for _ in lifelines]
    life_view_ids = [uid() for _ in lifelines]
    activation_defs: list[list[str]] = [[] for _ in lifelines]
    from_refs: list[list[str]] = [[] for _ in lifelines]
    to_refs: list[list[str]] = [[] for _ in lifelines]
    child_refs: list[str] = []
    message_refs: list[str] = []
    x_positions = [80 + i * 185 for i in range(len(lifelines))]
    life_y = 60
    life_height = max(760, 185 + 57 * len(messages))
    life_width = 145

    for i, label in enumerate(lifelines):
        sid = life_view_ids[i]
        sm = name(val(life_shape["DEFINITION"]), sid, label)
        for key, value in (("x", x_positions[i]), ("y", life_y), ("width", life_width), ("height", life_height)):
            sm = field(sm, key, str(value))
        sm = field(sm, "metaModelElement", f"<{life_ids[i]}>")
        # Reference images use light blue for the lifeline headers.
        sm = sm.replace("195, \r\n\t\t\t245, \r\n\t\t\t122", "125, \r\n\t\t\t205, \r\n\t\t\t240")
        insert_row(conn, "DIAGRAM_ELEMENT", life_shape, ID=sid, DIAGRAM_ID=did,
                   MODEL_ELEMENT_ID=life_ids[i], DEFINITION=bval(sm))
        child_refs.append(f"<{did}:{sid}>")

    for index, (source, target, label) in enumerate(messages):
        if source == target or not (0 <= source < len(lifelines) and 0 <= target < len(lifelines)):
            raise ValueError(f"Invalid message endpoints in {title}: {source}, {target}")
        line_y = 160 + 57 * index
        rel_y = line_y - life_y
        msg_id, msg_view_id = uid(), uid()
        start_activation_id, end_activation_id = uid(), uid()
        start_activation_view, end_activation_view = uid(), uid()
        start_end_id, end_end_id = uid(), uid()

        for i, aid, avid in ((source, start_activation_id, start_activation_view),
                             (target, end_activation_id, end_activation_view)):
            a = activation_template
            a = re.sub(r'^\{[\w.-]+:', "{" + aid + ":", a, count=1)
            a = re.sub(r'(_masterViewId=")[^"]+', r"\g<1>" + avid, a, count=1)
            a = re.sub(r'(view=")[^"]+', r"\g<1>" + avid, a, count=1)
            a = re.sub(r'(container=<)[^>]+', r"\g<1>" + did, a, count=1)
            a = re.sub(r'(\{)[\w.-]+:("View":ModelView)', r"\g<1>" + uid() + r":\2", a, count=1)
            activation_defs[i].append(a)
            shape_def = name(val(activation_shape["DEFINITION"]), avid, "Activation")
            shape_def = field(shape_def, "x", str(x_positions[i] + life_width // 2 - 6))
            shape_def = field(shape_def, "y", str(line_y))
            shape_def = field(shape_def, "width", "12")
            shape_def = field(shape_def, "height", "32")
            shape_def = field(shape_def, "metaModelElement", f"<{life_ids[i]}${aid}>")
            insert_row(conn, "DIAGRAM_ELEMENT", activation_shape, ID=avid, DIAGRAM_ID=did,
                       MODEL_ELEMENT_ID=None, COMPOSITE_MODEL_ELEMENT_ADDRESS=f"{life_ids[i]}${aid}",
                       DEFINITION=bval(shape_def))
            child_refs.append(f"<{did}:{avid}>")

        md = name(val(message_model["DEFINITION"]), msg_id, label)
        md = field(md, "fromActivation", f"<{life_ids[source]}${start_activation_id}>")
        md = field(md, "toActivation", f"<{life_ids[target]}${end_activation_id}>")
        md = field(md, "_masterViewId", f'"{msg_view_id}"')
        md = field(md, "sequenceNumber", f'"{index + 1}"')
        md = re.sub(r'(view=")[^"]+', r"\g<1>" + msg_view_id, md, count=1)
        md = re.sub(r'(container=<)[^>]+', r"\g<1>" + did, md, count=1)
        md = re.sub(r'(\{)[\w.-]+:("View":ModelView)', lambda m: m.group(1) + uid() + ":" + m.group(2), md, count=1)
        md = re.sub(r'(from=\{)[\w.-]+:', r"\g<1>" + start_end_id + ":", md, count=1)
        md = re.sub(r'(to=\{)[\w.-]+:', r"\g<1>" + end_end_id + ":", md, count=1)
        endpoints = iter((life_ids[source], life_ids[target]))
        md = re.sub(r'(EndModelElement=<)[^>]+', lambda m: m.group(1) + next(endpoints), md, count=2)
        insert_row(conn, "MODEL_ELEMENT", message_model, ID=msg_id, NAME=label,
                   DEFINITION=bval(md))
        container = message_model["PARENT_ID"]
        message_refs.append(f"<{container}:{msg_id}>")
        prefix = conn.execute("SELECT PARENT_ID FROM MODEL_ELEMENT WHERE ID=?", (container,)).fetchone()[0]
        from_refs[source].append(f"<{prefix}:{container}:{msg_id}${start_end_id}>")
        to_refs[target].append(f"<{prefix}:{container}:{msg_id}${end_end_id}>")

        sd = name(val(message_shape["DEFINITION"]), msg_view_id, label)
        dx = x_positions[target] - x_positions[source]
        sd = field(sd, "x", str(-14 if dx > 0 else dx - 14))
        sd = field(sd, "y", str(line_y - 90))
        sd = field(sd, "width", str(abs(dx) + 90))
        sd = field(sd, "height", "100")
        sd = field(sd, "_points", f'"{life_width // 2},{rel_y};{life_width // 2},{rel_y};"')
        sd = field(sd, "_fromShape", f"<{did}:{life_view_ids[source]}>")
        sd = field(sd, "_toShape", f"<{did}:{life_view_ids[target]}>")
        sd = field(sd, "metaModelElement", f"<{prefix}:{container}:{msg_id}>")
        caption = re.search(r"(?s)(_captionUIModel=\()(.*?)(\);)", sd)
        if caption:
            c = caption.group(2)
            c = re.sub(r"@x=-?\d+;", f"@x={15 if dx > 0 else -85};", c, count=1)
            c = re.sub(r"@width=-?\d+;", "@width=225;", c, count=1)
            sd = sd[:caption.start(2)] + c + sd[caption.end(2):]
        insert_row(conn, "DIAGRAM_ELEMENT", message_shape, ID=msg_view_id, DIAGRAM_ID=did,
                   MODEL_ELEMENT_ID=msg_id, DEFINITION=bval(sd))
        child_refs.append(f"<{did}:{msg_view_id}>")

    for i, label in enumerate(lifelines):
        lm = name(val(life_model["DEFINITION"]), life_ids[i], label)
        lm = field(lm, "_masterViewId", f'"{life_view_ids[i]}"')
        lm = re.sub(r'(view=")[^"]+', r"\g<1>" + life_view_ids[i], lm, count=1)
        lm = re.sub(r'(container=<)[^>]+', r"\g<1>" + did, lm, count=1)
        lm = re.sub(r'(\{)[\w.-]+:("View":ModelView)', lambda m: m.group(1) + uid() + ":" + m.group(2), lm, count=1)
        lm = replace_block(lm, "FromEndRelationships", "(\n\t\t" + ",\n\t\t".join(from_refs[i]) + "\n\t)" if from_refs[i] else "NULL")
        lm = replace_block(lm, "ToEndRelationships", "(\n\t\t" + ",\n\t\t".join(to_refs[i]) + "\n\t)" if to_refs[i] else "NULL")
        lm = replace_block(lm, "activations", "(\n\t\t" + ",\n\t\t".join(activation_defs[i]) + "\n\t)" if activation_defs[i] else "NULL")
        insert_row(conn, "MODEL_ELEMENT", life_model, ID=life_ids[i], NAME=label,
                   DEFINITION=bval(lm))

    container = message_model["PARENT_ID"]
    crow = conn.execute("SELECT DEFINITION FROM MODEL_ELEMENT WHERE ID=?", (container,)).fetchone()
    current_children = re.search(r"(?s)\bChild=\((.*?)\);", val(crow[0]))
    refs = re.findall(r"<[^>]+>", current_children.group(1)) if current_children else []
    refs = [ref for ref in refs if ref.rsplit(":", 1)[-1][:-1] not in old_message_ids]
    refs.extend(message_refs)
    cd = replace_block(val(crow[0]), "Child", "(\n\t\t" + ",\n\t\t".join(refs) + "\n\t)")
    conn.execute("UPDATE MODEL_ELEMENT SET DEFINITION=? WHERE ID=?", (bval(cd), container))
    dd = replace_block(val(diagram["DEFINITION"]), "Child", "(\n\t\t" + ",\n\t\t".join(child_refs) + "\n\t)")
    conn.execute("UPDATE DIAGRAM SET DEFINITION=? WHERE ID=?", (bval(dd), did))


SEQUENCES = {
    "SEQ-01 Đăng nhập và refresh token": (
        ["Người dùng", "Web UI", "AuthController", "User", "TokenService", "Cookie"],
        [(0, 1, "Nhập email, mật khẩu"), (1, 2, "POST /auth/login"),
         (2, 3, "findOne(email)"), (3, 2, "User và passwordHash"),
         (2, 4, "Tạo access/refresh token"), (4, 3, "Lưu hash refresh token"),
         (2, 5, "Set refresh cookie"), (2, 1, "Trả access token"),
         (1, 0, "Hiển thị dashboard")],
    ),
    "SEQ-02 Tạo và cập nhật công việc": (
        ["Quản lý dự án", "Task UI", "TaskController", "TaskService", "Task", "Socket Hub"],
        [(0, 1, "Nhập thông tin task"), (1, 2, "POST /api/tasks"),
         (2, 3, "Kiểm tra quyền dự án"), (3, 4, "Tạo Task"),
         (4, 2, "Trả task đã lưu"), (2, 5, "Phát task:created"),
         (2, 1, "Trả 201 Created"), (0, 1, "Đổi trạng thái Kanban"),
         (1, 2, "PATCH /tasks/:id/status"), (2, 4, "Cập nhật trạng thái"),
         (2, 5, "Phát task:updated")],
    ),
    "SEQ-03 Thông báo thời gian thực": (
        ["Người thao tác", "Web UI", "API", "NotificationService", "Notification", "Socket Hub"],
        [(0, 1, "Gán người phụ trách"), (1, 2, "Cập nhật công việc"),
         (2, 3, "Tạo thông báo"), (3, 4, "Lưu Notification"),
         (3, 5, "Emit tới phòng user"), (5, 1, "notification:new"),
         (1, 0, "Hiển thị badge/toast"), (0, 1, "Đánh dấu đã đọc"),
         (1, 2, "PATCH thông báo"), (2, 4, "Đặt isRead=true")],
    ),
    "SEQ-04 Chạy Hybrid CSP–GA": (
        ["Quản lý dự án", "Optimization UI", "OptimizationController", "CSPSolver", "GeneticAlgorithm", "OptimizationResult"],
        [(0, 1, "Chọn dự án, tham số"), (1, 2, "POST /optimization/run/hybrid"),
         (2, 3, "Tạo phương án khả thi"), (3, 2, "Tập nghiệm CSP"),
         (2, 4, "Khởi tạo và tiến hóa GA"),
         (4, 2, "Phương án tối ưu"), (2, 5, "Lưu kết quả"),
         (2, 1, "Trả phân bổ và metrics")],
    ),
    "SEQ-05 Áp dụng và hoàn tác tối ưu": (
        ["Quản lý dự án", "Optimization UI", "OptimizationController", "OptimizationResult", "Task", "ActivityLog"],
        [(0, 1, "Chọn phương án"), (1, 2, "POST /:id/apply"),
         (2, 3, "Đọc kết quả tối ưu"), (3, 2, "Assignments"),
         (2, 4, "Lưu trạng thái trước áp dụng"), (2, 4, "Gán nhân sự cho Task"),
         (2, 5, "Ghi nhật ký"), (2, 1, "Thông báo áp dụng xong"),
         (0, 1, "Yêu cầu hoàn tác"), (1, 2, "POST /:id/rollback"),
         (2, 4, "Khôi phục phân công cũ")],
    ),
    "SEQ-06 Quản lý dự án và thành viên": (
        ["Quản lý dự án", "Project UI", "ProjectController", "Project", "User", "ActivityLog"],
        [(0, 1, "Tạo dự án"), (1, 2, "POST /api/projects"),
         (2, 3, "Lưu Project"), (3, 2, "Project mới"),
         (2, 5, "Ghi hoạt động"), (2, 1, "Trả dự án"),
         (0, 1, "Thêm thành viên"), (1, 2, "POST /projects/:id/members"),
         (2, 4, "Kiểm tra người dùng"), (2, 3, "Cập nhật members"),
         (2, 1, "Trả danh sách thành viên")],
    ),
    "SEQ-07 Import Excel công việc": (
        ["Quản lý dự án", "Import UI", "TaskController", "ExcelTaskImport", "Project", "Task"],
        [(0, 1, "Chọn file Excel"), (1, 2, "POST /tasks/excel/import"),
         (2, 3, "Đọc và chuẩn hóa dòng"), (3, 4, "Kiểm tra dự án"),
         (3, 5, "Tạo các Task hợp lệ"),
         (5, 3, "Kết quả lưu"), (3, 2, "Thống kê và lỗi theo dòng"),
         (2, 1, "Hiển thị kết quả import")],
    ),
    "SEQ-08 Sinh công việc lặp": (
        ["Bộ lập lịch", "RecurringTaskService", "RecurringTask", "Task", "Project", "Socket Hub"],
        [(0, 1, "Kích hoạt chu kỳ"), (1, 2, "Tìm mẫu đến hạn"),
         (2, 1, "Danh sách mẫu"), (1, 3, "Kiểm tra lần sinh trước"),
         (1, 4, "Xác minh dự án"), (1, 3, "Tạo task theo mẫu"),
         (1, 2, "Cập nhật nextRunAt"), (1, 5, "Phát task:created"),
         (1, 0, "Ghi kết quả chu kỳ")],
    ),
    "SEQ-09 Tải dashboard và báo cáo": (
        ["Người dùng", "Dashboard UI", "AnalyticsController", "AnalyticsScope", "Task", "Resource"],
        [(0, 1, "Mở dashboard"), (1, 2, "GET /analytics/dashboard"),
         (2, 3, "Xác định phạm vi RBAC"), (3, 2, "Bộ lọc theo quyền"),
         (2, 4, "Tổng hợp task/status"), (2, 5, "Tổng hợp năng lực/tải"),
         (2, 1, "Trả KPI, xu hướng, biểu đồ"),
         (1, 0, "Hiển thị báo cáo")],
    ),
    "SEQ-10 Lịch và Gantt": (
        ["Người dùng", "Calendar/Gantt UI", "Task API", "Task", "DependencyService", "CPM Engine"],
        [(0, 1, "Chọn dự án/khoảng ngày"), (1, 2, "GET tasks theo bộ lọc"),
         (2, 3, "Truy vấn task và mốc"), (3, 2, "Danh sách task"),
         (2, 4, "Lấy quan hệ phụ thuộc"), (4, 2, "Các cạnh phụ thuộc"),
         (1, 5, "Tính đường găng"), (5, 1, "Critical path, slack"),
         (1, 0, "Hiển thị Calendar/Gantt")],
    ),
}


def main() -> None:
    shutil.copy2(SOURCE, OUTPUT)
    conn = sqlite3.connect(OUTPUT)
    conn.row_factory = sqlite3.Row
    for title, (lifelines, messages) in SEQUENCES.items():
        make_sequence(conn, title, lifelines, messages)
    conn.commit()
    print("SQLite:", conn.execute("PRAGMA integrity_check").fetchone()[0])
    print("Sequence elements:", conn.execute("SELECT SHAPE_TYPE,COUNT(*) FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=(SELECT ID FROM DIAGRAM WHERE NAME LIKE 'SEQ-01%') GROUP BY SHAPE_TYPE").fetchall())
    for table in ("MODEL_ELEMENT", "DIAGRAM_ELEMENT", "DIAGRAM"):
        for row in conn.execute(f"SELECT ID,DEFINITION FROM {table}"):
            definition = val(row[1])
            lines = definition.splitlines()
            if len(lines) >= 10 and "78" in lines[9]:
                print("Possibly malformed", table, row[0], "line 10:", lines[9])
    conn.close()


if __name__ == "__main__":
    main()
