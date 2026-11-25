"""Prototype and verify VP 10 rendering of detailed Sequence & Activity diagrams."""

from __future__ import annotations

import hashlib
import re
import shutil
import sqlite3
from pathlib import Path

ROOT = Path(r"D:\ResourceAllocation\docs")
SOURCE = ROOT / "ResourceAllocation_UML_MotKhung.vpp"
TEST_VPP = ROOT / "report_assets" / "UML_style_test.vpp"

ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz._"
MSG_REL_CONTAINER = "wUk7SByGAqAKbSFk:kUk7SByGAqAKbSFt"
CF_REL_CONTAINER = "wUk7SByGAqAKbSFk:4Uk7SByGAqAKbSFr"


def vp_id(seed: str) -> str:
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    chars = [ALPHABET[b % 64] for b in digest[:14]]
    return "RA" + "".join(chars)


def insert_model_row(
    cur: sqlite3.Cursor,
    model_id: str,
    name: str,
    model_type: str,
    parent_id: str | None,
    definition: str,
) -> None:
    cur.execute(
        """INSERT INTO MODEL_ELEMENT
        (ID, USER_ID, MODEL_TYPE, PARENT_ID, NAME, DEFINITION,
         MIRROR_SOURCE, AUTHOR, CREATE_AT, LAST_MOD_AT)
        VALUES (?, NULL, ?, ?, ?, ?, NULL, 'user', 1340346240490, 1340346241685)""",
        (model_id, model_type, parent_id, name, definition.encode("utf-8")),
    )


def insert_shape_row(
    cur: sqlite3.Cursor,
    shape_id: str,
    diagram_id: str,
    parent_id: str | None,
    shape_type: str,
    definition: str,
    model_id: str | None,
    composite_addr: str | None = None,
) -> None:
    cur.execute(
        """INSERT INTO DIAGRAM_ELEMENT
        (ID, SHAPE_TYPE, DIAGRAM_ID, MODEL_ELEMENT_ID,
         COMPOSITE_MODEL_ELEMENT_ADDRESS, REF_MODEL_ELEMENT_ADDRESS,
         PARENT_ID, DEFINITION)
        VALUES (?, ?, ?, ?, ?, NULL, ?, ?)""",
        (
            shape_id,
            shape_type,
            diagram_id,
            model_id,
            composite_addr,
            parent_id,
            definition.encode("utf-8"),
        ),
    )


def ensure_stereotypes(cur: sqlite3.Cursor) -> dict[str, str]:
    """Ensure boundary, control, entity stereotypes exist for InteractionLifeLine."""
    result: dict[str, str] = {}
    for name in ("boundary", "control", "entity"):
        row = cur.execute(
            "SELECT ID FROM MODEL_ELEMENT WHERE MODEL_TYPE='Stereotype' AND NAME=?",
            (name,),
        ).fetchone()
        if row:
            result[name] = row[0]
            continue
        sid = vp_id(f"stereotype:{name}")
        model_def = f"""{sid}:"{name}":Stereotype {{\r
\t_modelEditable=T;\r
\t_masterViewId="";\r
\tpmAuthor="user";\r
\tpmCreateDateTime="1340346240319";\r
\t_modelViews=NULL;\r
\ticonPath="";\r
\tbaseType="InteractionLifeLine";\r
\tdocumentation_plain=NULL;\r
\tpmLastModified="1340346241675";\r
}}"""
        insert_model_row(cur, sid, name, "Stereotype", None, model_def)
        result[name] = sid
    return result


def build_lifeline_model(
    model_id: str,
    shape_id: str,
    diagram_id: str,
    name: str,
    kind: str,
    stereo_ids: dict[str, str],
    act_defs: list[str],
    from_rels: list[str],
    to_rels: list[str],
) -> tuple[str, str]:
    model_type = "InteractionActor" if kind == "actor" else "InteractionLifeLine"
    view_id = vp_id(f"mv:{model_id}")
    from_block = ""
    if from_rels:
        joined = ", \r\n\t\t".join(f"<{r}>" for r in from_rels)
        from_block = f"\tFromEndRelationships=(\r\n\t\t{joined}\r\n\t);\r\n"
    to_block = ""
    if to_rels:
        joined = ", \r\n\t\t".join(f"<{r}>" for r in to_rels)
        to_block = f"\tToEndRelationships=(\r\n\t\t{joined}\r\n\t);\r\n"
    act_block = ""
    if act_defs:
        joined = ", \r\n\t\t".join(act_defs)
        act_block = f"\tactivations=(\r\n\t\t{joined}\r\n\t);\r\n"
    stereo_block = ""
    if kind in stereo_ids:
        stereo_block = (
            f"\tstereotypes=(\r\n\t\t<{stereo_ids[kind]}>\r\n\t);\r\n"
            f"\tclassLevelStereotype=T;\r\n"
        )
    text = f"""{model_id}:"{name}":{model_type} {{\r
\t_modelEditable=T;\r
\t_masterViewId="{shape_id}";\r
\tpmAuthor="user";\r
{from_block}\tpmCreateDateTime="1340346240490";\r
\t_modelViews=(\r
\t\t{{{view_id}:"View":ModelView {{\r
\t\t\tcontainer=<{diagram_id}>;\r
\t\t\tview="{shape_id}";\r
\t\t}}}}\r
\t);\r
{to_block}{act_block}{stereo_block}\tdocumentation_plain=NULL;\r
\tpmLastModified="1340346241685";\r
}}"""
    return model_type, text


def build_lifeline_shape(
    shape_id: str,
    model_id: str,
    name: str,
    kind: str,
    x: int,
    y: int,
    width: int,
    height: int,
) -> tuple[str, str]:
    shape_type = "InteractionActor" if kind == "actor" else "InteractionLifeLine"
    disp_stereo = "T" if kind in ("boundary", "control", "entity") else "F"
    cap_y = 48 if kind == "actor" else 0
    cap_w = max(width, 90)
    text = f"""{shape_id}:"{name}":{shape_type} {{\r
\tforeground=(\r
\t\t0, \r
\t\t0, \r
\t\t0, \r
\t\t255\r
\t);\r
\tparentFrame=NULL;\r
\tconnectToPoint=T;\r
\ty={y};\r
\tx={x};\r
\tmetaModelElement=<{model_id}>;\r
\toverrideAppearanceWithStereotypeIcon=T;\r
\tparentConnectorHeaderLength=40;\r
\tconnectionPointType=0;\r
\tparentConnectorLineLength=10;\r
\theight={height};\r
\tdisplayStereotypeIcon={disp_stereo};\r
\t_fillColor=(\r
\t\t@gradientStyle=1;, \r
\t\t@transparency=0;, \r
\t\t@type=2;, \r
\t\t@color1=(\r
\t\t\t125, \r
\t\t\t205, \r
\t\t\t240, \r
\t\t\t255\r
\t\t);, \r
\t\t@color2=(\r
\t\t\t125, \r
\t\t\t205, \r
\t\t\t240, \r
\t\t\t255\r
\t\t);\r
\t);\r
\twidth={width};\r
\tbackground=(\r
\t\t125, \r
\t\t205, \r
\t\t240, \r
\t\t255\r
\t);\r
\tstyle=NULL;\r
\t_elementFont=(\r
\t\t@name="Dialog";, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@size=11;, \r
\t\t@style=0;\r
\t);\r
\t_captionUIModel=(\r
\t\t@x=0;, \r
\t\t@y={cap_y};, \r
\t\t@width={cap_w};, \r
\t\t@height=18;, \r
\t\t@side=1;, \r
\t\t@visible=T;, \r
\t\t@internalWidth=-2147483648;, \r
\t\t@internalHeight=-2147483648;\r
\t);\r
\t_lineModel=(\r
\t\t@cap=0;, \r
\t\t@transparency=0;, \r
\t\t@weight=1.0;, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@hasStroke=T;\r
\t);\r
}}"""
    return shape_type, text


def build_activation_embed(act_model_id: str, act_shape_id: str, diagram_id: str) -> str:
    view_id = vp_id(f"mv:{act_model_id}")
    return f"""{{{act_model_id}:"Activation":Activation {{\r
\t\t\tdocumentation_plain=NULL;\r
\t\t\t_masterViewId="{act_shape_id}";\r
\t\t\tpmLastModified="1340346241685";\r
\t\t\tpmAuthor="user";\r
\t\t\tpmCreateDateTime="1340346240493";\r
\t\t\t_modelViews=(\r
\t\t\t\t{{{view_id}:"View":ModelView {{\r
\t\t\t\t\tcontainer=<{diagram_id}>;\r
\t\t\t\t\tview="{act_shape_id}";\r
\t\t\t\t}}}}\r
\t\t\t);\r
\t\t\t_modelEditable=T;\r
\t\t}}}}"""


def build_activation_shape(
    act_shape_id: str,
    life_model_id: str,
    act_model_id: str,
    x: int,
    y: int,
    height: int,
) -> str:
    return f"""{act_shape_id}:"Activation":Activation {{\r
\tforeground=(\r
\t\t0, \r
\t\t0, \r
\t\t0, \r
\t\t255\r
\t);\r
\tconnectToPoint=T;\r
\ty={y};\r
\tx={x};\r
\tmetaModelElement=<{life_model_id}${act_model_id}>;\r
\toverrideAppearanceWithStereotypeIcon=T;\r
\tparentConnectorHeaderLength=40;\r
\tconnectionPointType=0;\r
\tparentConnectorLineLength=10;\r
\theight={height};\r
\tdisplayStereotypeIcon=F;\r
\t_fillColor=(\r
\t\t@gradientStyle=1;, \r
\t\t@transparency=0;, \r
\t\t@type=2;, \r
\t\t@color1=(\r
\t\t\t125, \r
\t\t\t205, \r
\t\t\t240, \r
\t\t\t255\r
\t\t);, \r
\t\t@color2=(\r
\t\t\t125, \r
\t\t\t205, \r
\t\t\t240, \r
\t\t\t255\r
\t\t);\r
\t);\r
\twidth=10;\r
\tbackground=(\r
\t\t125, \r
\t\t205, \r
\t\t240, \r
\t\t255\r
\t);\r
\tstyle=NULL;\r
\t_elementFont=(\r
\t\t@name="Dialog";, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@size=11;, \r
\t\t@style=0;\r
\t);\r
\t_captionUIModel=(\r
\t\t@x=0;, \r
\t\t@y=0;, \r
\t\t@width=70;, \r
\t\t@height=20;, \r
\t\t@side=1;, \r
\t\t@visible=F;, \r
\t\t@internalWidth=-2147483648;, \r
\t\t@internalHeight=-2147483648;\r
\t);\r
\t_lineModel=(\r
\t\t@cap=0;, \r
\t\t@transparency=0;, \r
\t\t@weight=1.0;, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@hasStroke=T;\r
\t);\r
}}"""


def clean_label(text: str) -> str:
    return text.replace('"', "'")


def build_message_model(
    msg_model_id: str,
    msg_shape_id: str,
    diagram_id: str,
    label: str,
    seq_no: str,
    from_life_model: str,
    to_life_model: str,
    from_act_model: str,
    to_act_model: str,
    is_return: bool = False,
) -> tuple[str, str, str]:
    label = clean_label(label)
    from_end_id = vp_id(f"fe:{msg_model_id}")
    to_end_id = vp_id(f"te:{msg_model_id}")
    view_id = vp_id(f"mv:{msg_model_id}")
    action_block = ""
    if is_return:
        act_type_id = vp_id(f"ret:{msg_model_id}")
        action_block = f"""\tactionType={{{act_type_id}:"Return":ActionTypeReturn {{\r
\t\t_modelEditable=T;\r
\t\t_masterViewId="";\r
\t\tpmAuthor="user";\r
\t\tpmCreateDateTime="1340346240494";\r
\t\t_modelViews=NULL;\r
\t\tdocumentation_plain=NULL;\r
\t\tpmLastModified="1340346241678";\r
\t}}}};\r\n"""
    text = f"""{msg_model_id}:"{label}":Message {{\r
\t_modelEditable=T;\r
\t_masterViewId="{msg_shape_id}";\r
{action_block}\tsequenceNumber="{seq_no}";\r
\tpmAuthor="user";\r
\tpmCreateDateTime="1340346240494";\r
\t_modelViews=(\r
\t\t{{{view_id}:"View":ModelView {{\r
\t\t\tcontainer=<{diagram_id}>;\r
\t\t\tview="{msg_shape_id}";\r
\t\t}}}}\r
\t);\r
\tasynchronous=F;\r
\tFromEnd={{{from_end_id}:"":MessageEnd {{\r
\t\tdocumentation_plain=NULL;\r
\t\tEndModelElement=<{from_life_model}>;\r
\t\t_masterViewId="";\r
\t\tpmLastModified="1340346241679";\r
\t\tpmAuthor="user";\r
\t\tpmCreateDateTime="1340346240494";\r
\t\t_modelViews=NULL;\r
\t\t_modelEditable=T;\r
\t}}}};\r
\tToEnd={{{to_end_id}:"":MessageEnd {{\r
\t\tdocumentation_plain=NULL;\r
\t\tEndModelElement=<{to_life_model}>;\r
\t\t_masterViewId="";\r
\t\tpmLastModified="1340346241679";\r
\t\tpmAuthor="user";\r
\t\tpmCreateDateTime="1340346240494";\r
\t\t_modelViews=NULL;\r
\t\t_modelEditable=T;\r
\t}}}};\r
\tfromActivation=<{from_life_model}${from_act_model}>;\r
\ttoActivation=<{to_life_model}${to_act_model}>;\r
\tdocumentation_plain=NULL;\r
\tpmLastModified="1340346241685";\r
}}"""
    from_ref = f"{MSG_REL_CONTAINER}:{msg_model_id}${from_end_id}"
    to_ref = f"{MSG_REL_CONTAINER}:{msg_model_id}${to_end_id}"
    return text, from_ref, to_ref


def build_message_shape(
    msg_shape_id: str,
    msg_model_id: str,
    diagram_id: str,
    from_life_shape: str,
    to_life_shape: str,
    from_x: int,
    to_x: int,
    life_y: int,
    msg_y: int,
    label: str,
    seq_no: str,
    from_w: int,
    to_w: int,
) -> str:
    rel_y = msg_y - life_y
    if from_x == to_x:
        # Self message
        start_x = from_w // 2 + 5
        end_x = from_w // 2 + 5
        pts = f"{start_x},{rel_y};{start_x + 42},{rel_y};{start_x + 42},{rel_y + 22};{end_x},{rel_y + 22};"
        x = -20
        width = 140
        cap_x = 18
        cap_y = -18
    elif to_x > from_x:
        start_x = from_w // 2 + 5
        end_x = to_w // 2 - 5
        pts = f"{start_x},{rel_y};{end_x},{rel_y};"
        x = -14
        width = abs(to_x - from_x) + 90
        cap_w = max(120, len(f"{seq_no}: {label}") * 7 + 28)
        cap_x = (abs(to_x - from_x) - cap_w) // 2
        cap_y = -20
    else:
        start_x = from_w // 2 - 5
        end_x = to_w // 2 + 5
        pts = f"{start_x},{rel_y};{end_x},{rel_y};"
        x = (to_x - from_x) - 14
        width = abs(to_x - from_x) + 90
        cap_w = max(120, len(f"{seq_no}: {label}") * 7 + 28)
        cap_x = -abs(to_x - from_x) + (abs(to_x - from_x) - cap_w) // 2
        cap_y = -20
    cap_w = max(120, len(f"{seq_no}: {label}") * 7 + 28)
    return f"""{msg_shape_id}:"":Message {{\r
\tforeground=(\r
\t\t0, \r
\t\t0, \r
\t\t0, \r
\t\t255\r
\t);\r
\tconnectorStyle=1;\r
\tfromPinType=1;\r
\t_points="{pts}";\r
\ttoPinType=1;\r
\tuseToShapeCenter=T;\r
\t_fromShape=<{diagram_id}:{from_life_shape}>;\r
\tuseFromShapeCenter=T;\r
\ty={rel_y - 50};\r
\tx={x};\r
\tmetaModelElement=<{MSG_REL_CONTAINER}:{msg_model_id}>;\r
\theight=100;\r
\twidth={width};\r
\tbackground=(\r
\t\t0, \r
\t\t0, \r
\t\t0, \r
\t\t255\r
\t);\r
\tstyle=NULL;\r
\t_elementFont=(\r
\t\t@name="Dialog";, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@size=11;, \r
\t\t@style=0;\r
\t);\r
\t_captionUIModel=(\r
\t\t@x={cap_x};, \r
\t\t@y={cap_y};, \r
\t\t@width={cap_w};, \r
\t\t@height=18;, \r
\t\t@side=1;, \r
\t\t@visible=T;, \r
\t\t@internalWidth=-2147483648;, \r
\t\t@internalHeight=-2147483648;\r
\t);\r
\t_toShape=<{diagram_id}:{to_life_shape}>;\r
\t_lineModel=(\r
\t\t@cap=0;, \r
\t\t@transparency=0;, \r
\t\t@weight=1.0;, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@hasStroke=T;\r
\t);\r
}}"""


def build_combined_fragment(
    cf_model_id: str,
    cf_shape_id: str,
    diagram_id: str,
    frame_id: str,
    covered_life_models: list[str],
    operands_spec: list[tuple[str, int, int, list[str]]],
    x: int,
    y: int,
    width: int,
    height: int,
) -> tuple[str, str, list[tuple[str, str, str]]]:
    """Build CombinedFragment (alt) model, shape, and InteractionOperand models/shapes."""
    op_entries: list[tuple[str, str, str]] = []
    op_model_refs = []
    op_shape_refs = []

    for idx, (guard_text, op_y, op_h, msg_ids) in enumerate(operands_spec, 1):
        guard_clean = clean_label(guard_text.strip("[]"))
        op_model_id = vp_id(f"op_m:{cf_model_id}:{idx}")
        op_shape_id = vp_id(f"op_s:{cf_model_id}:{idx}")
        op_view_id = vp_id(f"mv:{op_model_id}")
        guard_id = vp_id(f"guard:{op_model_id}")
        op_model_refs.append(f"<{cf_model_id}:{op_model_id}>")
        op_shape_refs.append(f"<{diagram_id}:{op_shape_id}>")
        msgs_block = ""
        if msg_ids:
            m_joined = ", \r\n\t\t".join(f"<{MSG_REL_CONTAINER}:{m}>" for m in msg_ids)
            msgs_block = f"\tmessages=(\r\n\t\t{m_joined}\r\n\t);\r\n"
        op_model_def = f"""{op_model_id}:"Operand{idx}":InteractionOperand {{\r
\t_modelEditable=T;\r
\t_masterViewId="{op_shape_id}";\r
\tpmAuthor="user";\r
\tpmCreateDateTime="1340346240495";\r
\t_modelViews=(\r
\t\t{{{op_view_id}:"View":ModelView {{\r
\t\t\tcontainer=<{diagram_id}>;\r
\t\t\tview="{op_shape_id}";\r
\t\t}}}}\r
\t);\r
\tguard={{{guard_id}:"":InteractionConstraint {{\r
\t\t_modelEditable=T;\r
\t\t_masterViewId="";\r
\t\tpmAuthor="user";\r
\t\tpmCreateDateTime="1340346240495";\r
\t\t_modelViews=NULL;\r
\t\tconstraint="{guard_clean}";\r
\t\tdocumentation_plain=NULL;\r
\t\tpmLastModified="1340346241685";\r
\t}}}};\r
{msgs_block}\tdocumentation_plain=NULL;\r
\tpmLastModified="1340346241685";\r
}}"""
        op_shape_def = f"""{op_shape_id}:"Operand{idx}":InteractionOperand {{\r
\tforeground=(\r
\t\t0, \r
\t\t0, \r
\t\t0, \r
\t\t255\r
\t);\r
\tconnectToPoint=T;\r
\ty={op_y};\r
\tx=0;\r
\tmetaModelElement=<{frame_id}:{cf_model_id}:{op_model_id}>;\r
\toverrideAppearanceWithStereotypeIcon=T;\r
\tparentConnectorHeaderLength=40;\r
\tconnectionPointType=0;\r
\tparentConnectorLineLength=10;\r
\theight={op_h};\r
\tdisplayStereotypeIcon=F;\r
\t_fillColor=(\r
\t\t@gradientStyle=1;, \r
\t\t@transparency=100;, \r
\t\t@type=1;, \r
\t\t@color1=(\r
\t\t\t122, \r
\t\t\t207, \r
\t\t\t245, \r
\t\t\t0\r
\t\t);\r
\t);\r
\twidth={width};\r
\tbackground=(\r
\t\t122, \r
\t\t207, \r
\t\t245, \r
\t\t0\r
\t);\r
\tstyle=NULL;\r
\t_parent=<{diagram_id}:{cf_shape_id}>;\r
\t_elementFont=(\r
\t\t@name="Dialog";, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@size=11;, \r
\t\t@style=0;\r
\t);\r
\t_captionUIModel=(\r
\t\t@x=14;, \r
\t\t@y=4;, \r
\t\t@width=280;, \r
\t\t@height=20;, \r
\t\t@side=1;, \r
\t\t@visible=F;, \r
\t\t@internalWidth=-2147483648;, \r
\t\t@internalHeight=-2147483648;\r
\t);\r
\t_lineModel=(\r
\t\t@cap=0;, \r
\t\t@transparency=0;, \r
\t\t@weight=1.0;, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@hasStroke=T;\r
\t);\r
}}"""
        op_entries.append((op_model_id, op_shape_id, op_model_def, op_shape_def))

    cf_view_id = vp_id(f"mv:{cf_model_id}")
    cov_joined = ", \r\n\t\t".join(f"<{lid}>" for lid in covered_life_models)
    ops_joined = ", \r\n\t\t".join(op_model_refs)
    shapes_joined = ", \r\n\t\t".join(op_shape_refs)
    cf_model_def = f"""{cf_model_id}:"":CombinedFragment {{\r
\t_modelEditable=T;\r
\t_masterViewId="{cf_shape_id}";\r
\tpmAuthor="user";\r
\tpmCreateDateTime="1340346240495";\r
\t_modelViews=(\r
\t\t{{{cf_view_id}:"View":ModelView {{\r
\t\t\tcontainer=<{diagram_id}>;\r
\t\t\tview="{cf_shape_id}";\r
\t\t}}}}\r
\t);\r
\tinteractionOperator=65;\r
\tcoveredLifeLines=(\r
\t\t{cov_joined}\r
\t);\r
\tChild=(\r
\t\t{ops_joined}\r
\t);\r
\toperands=(\r
\t\t{ops_joined}\r
\t);\r
\tdocumentation_plain=NULL;\r
\tpmLastModified="1340346241685";\r
}}"""
    cf_shape_def = f"""{cf_shape_id}:"":CombinedFragment {{\r
\tforeground=(\r
\t\t0, \r
\t\t0, \r
\t\t0, \r
\t\t255\r
\t);\r
\tparentFrame=NULL;\r
\tconnectToPoint=T;\r
\ty={y};\r
\tx={x};\r
\tmetaModelElement=<{frame_id}:{cf_model_id}>;\r
\toverrideAppearanceWithStereotypeIcon=T;\r
\tparentConnectorHeaderLength=40;\r
\tconnectionPointType=0;\r
\tparentConnectorLineLength=10;\r
\theight={height};\r
\tdisplayStereotypeIcon=F;\r
\t_fillColor=(\r
\t\t@gradientStyle=1;, \r
\t\t@transparency=100;, \r
\t\t@type=1;, \r
\t\t@color1=(\r
\t\t\t122, \r
\t\t\t207, \r
\t\t\t245, \r
\t\t\t0\r
\t\t);\r
\t);\r
\twidth={width};\r
\tbackground=(\r
\t\t122, \r
\t\t207, \r
\t\t245, \r
\t\t0\r
\t);\r
\tstyle=NULL;\r
\t_elementFont=(\r
\t\t@name="Dialog";, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@size=11;, \r
\t\t@style=0;\r
\t);\r
\t_captionUIModel=(\r
\t\t@x={x};, \r
\t\t@y={y};, \r
\t\t@width=40;, \r
\t\t@height=18;, \r
\t\t@side=12;, \r
\t\t@visible=T;, \r
\t\t@internalWidth=-2147483648;, \r
\t\t@internalHeight=-2147483648;\r
\t);\r
\t_lineModel=(\r
\t\t@cap=0;, \r
\t\t@transparency=0;, \r
\t\t@weight=1.0;, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@hasStroke=T;\r
\t);\r
\tContainedDiagramElements=(\r
\t\t{shapes_joined}\r
\t);\r
}}"""
    return cf_model_def, cf_shape_def, op_entries


def rebuild_seq01(cur: sqlite3.Cursor, stereo_ids: dict[str, str]) -> None:
    drow = cur.execute(
        "SELECT ID, NAME, DEFINITION FROM DIAGRAM WHERE NAME LIKE 'SEQ-01%'"
    ).fetchone()
    did, dname, dblob = drow[0], drow[1], drow[2].decode("utf-8")
    frame_match = re.search(r"_rootFrame=<([^>]+)>", dblob)
    frame_id = frame_match.group(1) if frame_match else "81N2lSCGAqAKZh1v"

    # Delete existing SEQ-01 elements
    old_rows = cur.execute(
        "SELECT ID, MODEL_ELEMENT_ID, SHAPE_TYPE FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=?",
        (did,),
    ).fetchall()
    old_model_ids = {r[1] for r in old_rows if r[1]}
    cur.execute("DELETE FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=?", (did,))
    for mid in old_model_ids:
        cur.execute("DELETE FROM MODEL_ELEMENT WHERE ID=?", (mid,))

    lifelines = [
        ("Người dùng", "actor"),
        ("Main_GUI", "boundary"),
        ("Main_BUS", "control"),
        ("Auth_GUI", "boundary"),
        ("Auth_BUS", "control"),
        ("Token_Service", "control"),
        ("User_DAO", "control"),
        ("User", "entity"),
        ("Session_DAO", "control"),
        ("Session", "entity"),
    ]
    # Message tuple: (seq_no, from_idx, to_idx, label, is_return, in_operand)
    messages = [
        ("1", 0, 1, "Chọn chức năng đăng nhập", False, 0),
        ("1.1", 1, 2, "Mở giao diện đăng nhập", False, 0),
        ("1.1.1", 2, 3, "Hiển thị giao diện đăng nhập", False, 0),
        ("2", 0, 3, "Nhập email và mật khẩu", False, 0),
        ("2.1", 3, 4, "Gửi thông tin đăng nhập", False, 0),
        ("2.1.1", 4, 6, "Tìm tài khoản theo email", False, 0),
        ("2.1.1.1", 6, 7, "Lấy thông tin người dùng", False, 0),
        ("2.1.1.2", 7, 6, "Thông tin người dùng & passwordHash", True, 0),
        ("2.1.2", 6, 4, "Hồ sơ người dùng", True, 0),
        ("2.1.3", 4, 3, "Hiển thị trạng thái kiểm tra", False, 0),
        ("3", 0, 3, "Xác nhận đăng nhập / mã 2FA", False, 0),
        ("3.1", 3, 4, "Kiểm tra bcrypt và trạng thái", False, 0),
        ("3.1.1", 4, 6, "Đối chiếu thông tin xác thực", False, 0),
        ("3.1.1.1", 6, 7, "Lấy mã nhân sự, vai trò và trạng thái", False, 1),
        ("3.1.1.2", 7, 6, "Mã nhân sự, vai trò, isActive", True, 1),
        ("2.1.4", 4, 3, "Hiển thị tên, vai trò, thời gian phiên", False, 1),
        ("3.1.1.1.1", 6, 4, "Thông báo sai thông tin / tài khoản khóa", False, 2),
        ("3.1.1.1.1.1", 4, 3, "Hiển thị thông báo đăng nhập thất bại", False, 2),
        ("4", 0, 3, "Yêu cầu khởi tạo phiên làm việc", False, 0),
        ("4.1", 3, 4, "Tạo cặp Access & Refresh Token", False, 0),
        ("4.1.1", 4, 5, "Ký JWT Access Token & Refresh Token", False, 0),
        ("4.1.2", 5, 4, "Chuỗi token và thời hạn", True, 0),
        ("4.1.3", 4, 3, "Hiển thị thông tin phiên đăng nhập", False, 0),
        ("5", 0, 3, "Chọn \"Lưu phiên & Vào hệ thống\"", False, 0),
        ("5.1", 3, 4, "Chuẩn bị dữ liệu phiên và cookie", False, 0),
        ("5.1.1", 4, 3, "Hiển thị chi tiết quyền và tenant", False, 0),
        ("6", 0, 3, "Xác nhận vào Dashboard", False, 0),
        ("6.1", 3, 4, "Lưu phiên đăng nhập", False, 0),
        ("6.1.1", 4, 8, "Tạo bản ghi phiên làm việc", False, 0),
        ("6.1.1.1", 8, 9, "Lưu refreshToken và lastLoginAt", False, 0),
        ("6.1.1.1.1", 8, 4, "Thông báo tạo phiên thành công", False, 0),
        ("6.1.1.1.1.1", 4, 3, "Hiển thị thông báo đăng nhập thành công", False, 0),
    ]

    life_y = 45
    base_msg_y = 140
    msg_step = 42
    life_xs = [60 + i * 185 for i in range(len(lifelines))]
    life_widths = [70 if kind == "actor" else 110 for _, kind in lifelines]

    # Compute y for each message (add extra padding around alt block transitions)
    msg_ys: list[int] = []
    cur_y = base_msg_y
    prev_op = 0
    for idx, (_, _, _, _, _, op_idx) in enumerate(messages):
        if op_idx != prev_op:
            cur_y += 28
        msg_ys.append(cur_y)
        cur_y += msg_step
        prev_op = op_idx

    life_height = cur_y - life_y + 70

    life_model_ids = [vp_id(f"{did}:life_m:{i}") for i in range(len(lifelines))]
    life_shape_ids = [vp_id(f"{did}:life_s:{i}") for i in range(len(lifelines))]

    # Compute continuous activation intervals per lifeline!
    # In the reference screenshot:
    # - Actor (idx 0) has a continuous bar from first message to last message
    # - Main_GUI (1) and Main_BUS (2) have continuous bars from their first message down to message 6
    # - Feature_GUI (3) and Feature_BUS (4) have continuous bars across their active blocks
    # - Services/DAOs/Entities have bars spanning each contiguous cluster of messages they participate in
    life_msg_ys: dict[int, list[int]] = {i: [] for i in range(len(lifelines))}
    for m_idx, (_, f_idx, t_idx, _, _, _) in enumerate(messages):
        y_val = msg_ys[m_idx]
        life_msg_ys[f_idx].append(y_val)
        life_msg_ys[t_idx].append(y_val)

    life_bars: dict[int, list[tuple[int, int, str, str]]] = {i: [] for i in range(len(lifelines))}
    for i in range(len(lifelines)):
        ys = sorted(set(life_msg_ys[i]))
        if not ys:
            continue
        if i in (0, 1, 2):
            # Long bar like in the user's screenshot
            start_y = ys[0] - 8
            end_y = (msg_ys[-6] if i in (1, 2) else ys[-1]) + 18
            act_m = vp_id(f"{did}:act_m:{i}:0")
            act_s = vp_id(f"{did}:act_s:{i}:0")
            life_bars[i].append((start_y, end_y, act_m, act_s))
        elif i in (3, 4):
            # Continuous bar from first involvement to end
            start_y = ys[0] - 8
            end_y = ys[-1] + 22
            act_m = vp_id(f"{did}:act_m:{i}:0")
            act_s = vp_id(f"{did}:act_s:{i}:0")
            life_bars[i].append((start_y, end_y, act_m, act_s))
        else:
            # Cluster messages that are within 3 * msg_step of each other
            clusters: list[list[int]] = [[ys[0]]]
            for yv in ys[1:]:
                if yv - clusters[-1][-1] <= msg_step * 3 + 35:
                    clusters[-1].append(yv)
                else:
                    clusters.append([yv])
            for c_idx, cluster in enumerate(clusters):
                start_y = cluster[0] - 8
                end_y = cluster[-1] + 20
                act_m = vp_id(f"{did}:act_m:{i}:{c_idx}")
                act_s = vp_id(f"{did}:act_s:{i}:{c_idx}")
                life_bars[i].append((start_y, end_y, act_m, act_s))

    def find_act_model(life_idx: int, y_val: int) -> str:
        for sy, ey, am, _ in life_bars[life_idx]:
            if sy - 15 <= y_val <= ey + 15:
                return am
        return life_bars[life_idx][0][2]

    life_act_embeds: dict[int, list[str]] = {i: [] for i in range(len(lifelines))}
    act_shape_rows: list[tuple[str, str, str, str]] = []
    for i in range(len(lifelines)):
        cx = life_xs[i] + life_widths[i] // 2 - 5
        for sy, ey, am, a_s in life_bars[i]:
            life_act_embeds[i].append(build_activation_embed(am, a_s, did))
            act_shape_rows.append(
                (
                    a_s,
                    am,
                    "Activation",
                    build_activation_shape(a_s, life_model_ids[i], am, cx, sy, max(24, ey - sy)),
                )
            )

    from_rels: dict[int, list[str]] = {i: [] for i in range(len(lifelines))}
    to_rels: dict[int, list[str]] = {i: [] for i in range(len(lifelines))}
    msg_model_rows: list[tuple[str, str, str]] = []
    msg_shape_rows: list[tuple[str, str, str]] = []
    op1_msgs: list[str] = []
    op2_msgs: list[str] = []

    for m_idx, (seq_no, f_idx, t_idx, label, is_ret, op_idx) in enumerate(messages):
        y_val = msg_ys[m_idx]
        mm_id = vp_id(f"{did}:msg_m:{m_idx}")
        ms_id = vp_id(f"{did}:msg_s:{m_idx}")
        f_act = find_act_model(f_idx, y_val)
        t_act = find_act_model(t_idx, y_val)
        m_def, f_ref, t_ref = build_message_model(
            mm_id,
            ms_id,
            did,
            label,
            seq_no,
            life_model_ids[f_idx],
            life_model_ids[t_idx],
            f_act,
            t_act,
            is_return=is_ret,
        )
        from_rels[f_idx].append(f_ref)
        to_rels[t_idx].append(t_ref)
        msg_model_rows.append((mm_id, label, m_def))
        s_def = build_message_shape(
            ms_id,
            mm_id,
            did,
            life_shape_ids[f_idx],
            life_shape_ids[t_idx],
            life_xs[f_idx],
            life_xs[t_idx],
            life_y,
            y_val,
            label,
            seq_no,
            life_widths[f_idx],
            life_widths[t_idx],
        )
        msg_shape_rows.append((ms_id, mm_id, s_def))
        if op_idx == 1:
            op1_msgs.append(mm_id)
        elif op_idx == 2:
            op2_msgs.append(mm_id)

    # CombinedFragment (alt) around operand 1 & operand 2 messages
    op1_ys = [msg_ys[idx] for idx, m in enumerate(messages) if m[5] == 1]
    op2_ys = [msg_ys[idx] for idx, m in enumerate(messages) if m[5] == 2]
    cf_y = min(op1_ys) - 34
    op1_h = (max(op1_ys) + 24) - cf_y
    op2_h = (max(op2_ys) + 28) - (cf_y + op1_h)
    cf_h = op1_h + op2_h
    cf_x = life_xs[3] - 40
    cf_w = (life_xs[7] + life_widths[7] + 35) - cf_x
    cf_model_id = vp_id(f"{did}:cf_m:alt")
    cf_shape_id = vp_id(f"{did}:cf_s:alt")
    cf_model_def, cf_shape_def, op_entries = build_combined_fragment(
        cf_model_id,
        cf_shape_id,
        did,
        frame_id,
        life_model_ids[3:8],
        [
            ("[Thông tin hợp lệ]", 0, op1_h, op1_msgs),
            ("[Sai thông tin / Tài khoản khóa]", op1_h, op2_h, op2_msgs),
        ],
        cf_x,
        cf_y,
        cf_w,
        cf_h,
    )

    child_shape_ids: list[str] = []

    for i, (lname, lkind) in enumerate(lifelines):
        m_type, m_def = build_lifeline_model(
            life_model_ids[i],
            life_shape_ids[i],
            did,
            lname,
            lkind,
            stereo_ids,
            life_act_embeds[i],
            from_rels[i],
            to_rels[i],
        )
        s_type, s_def = build_lifeline_shape(
            life_shape_ids[i],
            life_model_ids[i],
            lname,
            lkind,
            life_xs[i],
            life_y,
            life_widths[i],
            life_height,
        )
        insert_model_row(cur, life_model_ids[i], lname, m_type, None, m_def)
        insert_shape_row(cur, life_shape_ids[i], did, None, s_type, s_def, life_model_ids[i])
        child_shape_ids.append(life_shape_ids[i])

    # Insert CombinedFragment & operands
    insert_model_row(cur, cf_model_id, "alt", "CombinedFragment", frame_id, cf_model_def)
    insert_shape_row(cur, cf_shape_id, did, None, "CombinedFragment", cf_shape_def, cf_model_id)
    child_shape_ids.append(cf_shape_id)

    for idx, (op_m_id, op_s_id, op_m_def, op_s_def) in enumerate(op_entries, 1):
        insert_model_row(cur, op_m_id, f"Operand{idx}", "InteractionOperand", cf_model_id, op_m_def)
        insert_shape_row(cur, op_s_id, did, cf_shape_id, "InteractionOperand", op_s_def, op_m_id)
        child_shape_ids.append(op_s_id)

    for a_s, a_m, _, a_def in act_shape_rows:
        comp_m = re.search(r"metaModelElement=<([^>]+)>", a_def)
        comp_addr = comp_m.group(1) if comp_m else None
        insert_shape_row(cur, a_s, did, None, "Activation", a_def, None, comp_addr)
        child_shape_ids.append(a_s)

    msg_container_id = "kUk7SByGAqAKbSFt"
    msg_model_refs = []
    for mm_id, label, m_def in msg_model_rows:
        insert_model_row(cur, mm_id, label, "Message", msg_container_id, m_def)
        msg_model_refs.append(f"<{msg_container_id}:{mm_id}>")
    for ms_id, mm_id, s_def in msg_shape_rows:
        insert_shape_row(cur, ms_id, did, None, "Message", s_def, mm_id)
        child_shape_ids.append(ms_id)

    # Also update Frame and ModelRelationshipContainer Child lists
    frow = cur.execute("SELECT DEFINITION FROM MODEL_ELEMENT WHERE ID=?", (frame_id,)).fetchone()
    if frow:
        ftext = frow[0].decode("utf-8")
        f_refs = [f"<{frame_id}:{cf_model_id}>"]
        ftext = re.sub(
            r"Child=\(\s*(?:<[^>]+>\s*,?\s*)*\);",
            "Child=(\r\n\t\t" + ", \r\n\t\t".join(f_refs) + "\r\n\t);",
            ftext,
        )
        cur.execute("UPDATE MODEL_ELEMENT SET DEFINITION=? WHERE ID=?", (ftext.encode("utf-8"), frame_id))

    crow = cur.execute("SELECT DEFINITION FROM MODEL_ELEMENT WHERE ID=?", (msg_container_id,)).fetchone()
    if crow:
        ctext = crow[0].decode("utf-8")
        cm = re.search(r"(?s)\bChild=\((.*?)\);", ctext)
        crefs = re.findall(r"<[^>]+>", cm.group(1)) if cm else []
        crefs = [r for r in crefs if r.rsplit(":", 1)[-1][:-1] not in old_model_ids]
        crefs.extend(msg_model_refs)
        ctext = re.sub(
            r"(?s)\bChild=\(.*?\);",
            "Child=(\r\n\t\t" + ", \r\n\t\t".join(crefs) + "\r\n\t);",
            ctext,
            count=1,
        )
        cur.execute("UPDATE MODEL_ELEMENT SET DEFINITION=? WHERE ID=?", (ctext.encode("utf-8"), msg_container_id))

    children_block = "Child=(\r\n" + ",\r\n".join(f"\t\t<{did}:{cid}>" for cid in child_shape_ids) + "\r\n\t);"
    dblob = re.sub(r"Child=\(\s*(?:<[^>]+>\s*,?\s*)*\);", children_block, dblob)
    cur.execute("UPDATE DIAGRAM SET DEFINITION=? WHERE ID=?", (dblob.encode("utf-8"), did))


def build_act_node_model(
    node_m_id: str,
    node_s_id: str,
    diagram_id: str,
    name: str,
    model_type: str,
    from_cfs: list[str],
    to_cfs: list[str],
) -> str:
    name = clean_label(name)
    view_id = vp_id(f"mv:{node_m_id}")
    from_block = ""
    if from_cfs:
        joined = ", \r\n\t\t".join(f"<{CF_REL_CONTAINER}:{c}>" for c in from_cfs)
        from_block = f"\tFromSimpleRelationships=(\r\n\t\t{joined}\r\n\t);\r\n"
    to_block = ""
    if to_cfs:
        joined = ", \r\n\t\t".join(f"<{CF_REL_CONTAINER}:{c}>" for c in to_cfs)
        to_block = f"\tToSimpleRelationships=(\r\n\t\t{joined}\r\n\t);\r\n"
    return f"""{node_m_id}:"{name}":{model_type} {{\r
\t_modelEditable=T;\r
\t_masterViewId="{node_s_id}";\r
{to_block}\tpmAuthor="user";\r
{from_block}\tpmCreateDateTime="1340346240431";\r
\t_modelViews=(\r
\t\t{{{view_id}:"View":ModelView {{\r
\t\t\tcontainer=<{diagram_id}>;\r
\t\t\tview="{node_s_id}";\r
\t\t}}}}\r
\t);\r
\tdocumentation_plain=NULL;\r
\tpmLastModified="1340346241683";\r
}}"""


def build_act_node_shape(
    node_s_id: str,
    node_m_id: str,
    diagram_id: str,
    parent_shape_id: str,
    name: str,
    shape_type: str,
    x: int,
    y: int,
    width: int,
    height: int,
) -> str:
    name = clean_label(name)
    if shape_type in ("InitialNode", "ActivityFinalNode"):
        c_val = "0, \r\n\t\t\t0, \r\n\t\t\t0, \r\n\t\t\t255"
        bg_val = "0, \r\n\t\t0, \r\n\t\t0, \r\n\t\t255"
        fill_block = f"""\t_fillColor=(\r
\t\t@gradientStyle=1;, \r
\t\t@transparency=0;, \r
\t\t@type=1;, \r
\t\t@color1=(\r
\t\t\t{c_val}\r
\t\t);\r
\t);"""
        cap_block = """\t_captionUIModel=(\r
\t\t@x=-24;, \r
\t\t@y=20;, \r
\t\t@width=68;, \r
\t\t@height=15;, \r
\t\t@side=1;, \r
\t\t@visible=F;, \r
\t\t@internalWidth=-2147483648;, \r
\t\t@internalHeight=-2147483648;\r
\t);"""
        conn_pt = 1
    elif shape_type == "DecisionNode":
        c_val = "255, \r\n\t\t\t255, \r\n\t\t\t255, \r\n\t\t\t255"
        bg_val = "255, \r\n\t\t255, \r\n\t\t255, \r\n\t\t255"
        fill_block = f"""\t_fillColor=(\r
\t\t@gradientStyle=1;, \r
\t\t@transparency=0;, \r
\t\t@type=2;, \r
\t\t@color1=(\r
\t\t\t{c_val}\r
\t\t);, \r
\t\t@color2=(\r
\t\t\t{c_val}\r
\t\t);\r
\t);"""
        cap_w = max(180, len(name) * 7 + 20)
        cap_x = (width - cap_w) // 2
        cap_block = f"""\t_captionUIModel=(\r
\t\t@x={cap_x};, \r
\t\t@y=-24;, \r
\t\t@width={cap_w};, \r
\t\t@height=20;, \r
\t\t@side=1;, \r
\t\t@visible=T;, \r
\t\t@internalWidth=-2147483648;, \r
\t\t@internalHeight=-2147483648;\r
\t);"""
        conn_pt = 1
    else:
        c_val = "255, \r\n\t\t\t255, \r\n\t\t\t255, \r\n\t\t\t255"
        bg_val = "255, \r\n\t\t255, \r\n\t\t255, \r\n\t\t255"
        fill_block = f"""\t_fillColor=(\r
\t\t@gradientStyle=1;, \r
\t\t@transparency=0;, \r
\t\t@type=2;, \r
\t\t@color1=(\r
\t\t\t{c_val}\r
\t\t);, \r
\t\t@color2=(\r
\t\t\t{c_val}\r
\t\t);\r
\t);"""
        cap_block = f"""\t_captionUIModel=(\r
\t\t@x=0;, \r
\t\t@y=0;, \r
\t\t@width={width - 14};, \r
\t\t@height={height - 6};, \r
\t\t@side=6;, \r
\t\t@visible=T;, \r
\t\t@internalWidth=-2147483648;, \r
\t\t@internalHeight=-2147483648;\r
\t);"""
        conn_pt = 0

    return f"""{node_s_id}:"{name}":{shape_type} {{\r
\tforeground=(\r
\t\t0, \r
\t\t0, \r
\t\t0, \r
\t\t255\r
\t);\r
\tconnectToPoint=T;\r
\ty={y};\r
\tx={x};\r
\tmetaModelElement=<{node_m_id}>;\r
\toverrideAppearanceWithStereotypeIcon=T;\r
\tparentConnectorHeaderLength=40;\r
\tconnectionPointType={conn_pt};\r
\tparentConnectorLineLength=10;\r
\theight={height};\r
\tdisplayStereotypeIcon=F;\r
{fill_block}\r
\twidth={width};\r
\tbackground=(\r
\t\t{bg_val}\r
\t);\r
\tstyle=NULL;\r
\t_parent=<{diagram_id}:{parent_shape_id}>;\r
\t_elementFont=(\r
\t\t@name="Dialog";, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@size=11;, \r
\t\t@style=0;\r
\t);\r
{cap_block}\r
\t_lineModel=(\r
\t\t@cap=0;, \r
\t\t@transparency=0;, \r
\t\t@weight=1.0;, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@hasStroke=T;\r
\t);\r
}}"""


def build_control_flow(
    cf_m_id: str,
    cf_s_id: str,
    diagram_id: str,
    guard: str,
    from_m_id: str,
    to_m_id: str,
    from_s_id: str,
    to_s_id: str,
    from_box: dict[str, int],
    to_box: dict[str, int],
    waypoints_abs: list[tuple[int, int]],
    cap_offset: tuple[int, int] | None = None,
) -> tuple[str, str]:
    view_id = vp_id(f"mv:{cf_m_id}")
    m_def = f"""{cf_m_id}:"{guard}":ControlFlow {{\r
\t_modelEditable=T;\r
\ttoModel=<{to_m_id}>;\r
\t_masterViewId="{cf_s_id}";\r
\tpmAuthor="user";\r
\tpmCreateDateTime="1340346240457";\r
\t_modelViews=(\r
\t\t{{{view_id}:"View":ModelView {{\r
\t\t\tcontainer=<{diagram_id}>;\r
\t\t\tview="{cf_s_id}";\r
\t\t}}}}\r
\t);\r
\tfromModel=<{from_m_id}>;\r
\tdocumentation_plain=NULL;\r
\tpmLastModified="1340346241677";\r
}}"""
    # Convert absolute waypoints to VP10 relative _points:
    # All points except the last are relative to from_box (x, y);
    # the last point is relative to to_box (x, y)!
    rel_pts = []
    for idx, (wx, wy) in enumerate(waypoints_abs):
        if idx < len(waypoints_abs) - 1:
            rel_pts.append(f"{wx - from_box['x']},{wy - from_box['y']}")
        else:
            rel_pts.append(f"{wx - to_box['x']},{wy - to_box['y']}")
    pts_str = ";".join(rel_pts) + ";"
    xs = [p[0] for p in waypoints_abs]
    ys = [p[1] for p in waypoints_abs]
    bx = min(xs) - from_box["x"] - 40
    by = min(ys) - from_box["y"] - 40
    bw = (max(xs) - min(xs)) + 80
    bh = (max(ys) - min(ys)) + 80
    if guard:
        cap_w = max(70, len(guard) * 7 + 16)
        cap_h = 18
        if cap_offset is not None:
            cx, cy = cap_offset
        else:
            cx = (waypoints_abs[0][0] + waypoints_abs[1][0]) // 2 - from_box["x"] - cap_w // 2
            cy = (waypoints_abs[0][1] + waypoints_abs[1][1]) // 2 - from_box["y"] - 20
        cap_vis = "T"
    else:
        cx, cy, cap_w, cap_h, cap_vis = 20, 20, 20, 0, "T"

    s_def = f"""{cf_s_id}:"{guard}":ControlFlow {{\r
\tforeground=(\r
\t\t0, \r
\t\t0, \r
\t\t0, \r
\t\t255\r
\t);\r
\tconnectorStyle=0;\r
\tfromPinType=1;\r
\t_points="{pts_str}";\r
\ttoPinType=1;\r
\tuseToShapeCenter=T;\r
\t_fromShape=<{diagram_id}:{from_s_id}>;\r
\t_durationConstraintUIInfo=NULL;\r
\tuseFromShapeCenter=T;\r
\ty={by};\r
\tx={bx};\r
\tmetaModelElement=<{CF_REL_CONTAINER}:{cf_m_id}>;\r
\theight={bh};\r
\twidth={bw};\r
\tbackground=(\r
\t\t0, \r
\t\t0, \r
\t\t0, \r
\t\t255\r
\t);\r
\tstyle=NULL;\r
\t_elementFont=(\r
\t\t@name="Dialog";, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@size=11;, \r
\t\t@style=0;\r
\t);\r
\t_captionUIModel=(\r
\t\t@x={cx};, \r
\t\t@y={cy};, \r
\t\t@width={cap_w};, \r
\t\t@height={cap_h};, \r
\t\t@side=1;, \r
\t\t@visible={cap_vis};, \r
\t\t@internalWidth=-2147483648;, \r
\t\t@internalHeight=-2147483648;\r
\t);\r
\t_toShape=<{diagram_id}:{to_s_id}>;\r
\t_lineModel=(\r
\t\t@cap=0;, \r
\t\t@transparency=0;, \r
\t\t@weight=1.0;, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@hasStroke=T;\r
\t);\r
}}"""
    return m_def, s_def


def rebuild_act01(cur: sqlite3.Cursor) -> None:
    drow = cur.execute(
        "SELECT ID, NAME, DEFINITION FROM DIAGRAM WHERE NAME LIKE 'ACT-01%'"
    ).fetchone()
    did, dname, dblob = drow[0], drow[1], drow[2].decode("utf-8")

    old_rows = cur.execute(
        "SELECT ID, MODEL_ELEMENT_ID, SHAPE_TYPE FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=?",
        (did,),
    ).fetchall()
    old_model_ids = {r[1] for r in old_rows if r[1]}
    cur.execute("DELETE FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=?", (did,))
    for mid in old_model_ids:
        if mid != "qMv6lSCGAqAKZhmF":
            cur.execute("DELETE FROM MODEL_ELEMENT WHERE ID=?", (mid,))

    # Build native ActivitySwimlane2 with 2 vertical partitions: Người dùng | Hệ thống
    sw_m_id = vp_id(f"{did}:swim_m")
    sw_s_id = vp_id(f"{did}:swim_s")
    p_user_m = vp_id(f"{did}:part_user_m")
    p_sys_m = vp_id(f"{did}:part_sys_m")
    h_user_s = vp_id(f"{did}:hdr_user_s")
    h_sys_s = vp_id(f"{did}:hdr_sys_s")
    c_user_s = vp_id(f"{did}:comp_user_s")
    c_sys_s = vp_id(f"{did}:comp_sys_s")

    sw_x, sw_y = 40, 25
    user_w, sys_w = 480, 680
    sw_w = user_w + sys_w
    hdr_h = 30
    sw_h = 1350

    # Define 18 detailed nodes matching the user's reference Activity Diagram style
    # Tuple: (key, lane ('user'|'sys'), shape_type, label, rel_cx, abs_y, w, h)
    # rel_cx is x-center inside its lane (user lane center = 240, sys lane center = 340)
    nodes_spec = [
        ("start", "user", "InitialNode", "Bắt đầu", 240, 80, 26, 26),
        ("choose_login", "user", "ActivityAction", "Chọn chức năng đăng nhập", 240, 145, 240, 44),
        ("show_form", "sys", "ActivityAction", "Hiển thị giao diện đăng nhập", 340, 145, 260, 44),
        ("show_tenant", "sys", "ActivityAction", "Hiển thị thông tin máy chủ và tổ chức", 340, 220, 310, 44),
        ("input_email", "user", "ActivityAction", "Nhập email tài khoản đăng nhập", 240, 290, 280, 44),
        ("dec_find_user", "sys", "DecisionNode", "Tìm kiếm tài khoản người dùng trong cơ sở dữ liệu", 380, 302, 54, 28),
        ("err_not_found", "sys", "ActivityAction", "Hiển thị thông báo không tồn tại tài khoản", 165, 385, 260, 52),
        ("user_ack_nf", "user", "ActivityAction", "Người dùng xác nhận", 240, 390, 180, 44),
        ("end_early", "user", "ActivityFinalNode", "Kết thúc sớm", 240, 470, 26, 26),
        ("sys_show_user", "sys", "ActivityAction", "Hệ thống hiển thị tên, mã và trạng thái tài khoản", 500, 385, 270, 52),
        ("choose_method", "user", "ActivityAction", "Chọn phương thức xác thực", 240, 535, 220, 44),
        ("input_pwd", "user", "ActivityAction", "Nhập mật khẩu và mã xác thực", 240, 625, 240, 44),
        ("click_ok", "user", "ActivityAction", "Chọn \"OK\"", 240, 700, 130, 40),
        ("dec_check_pwd", "sys", "DecisionNode", "Kiểm tra mật khẩu và mã xác thực", 380, 706, 54, 28),
        ("err_invalid_pwd", "sys", "ActivityAction", "Thông báo mật khẩu hoặc mã xác thực không hợp lệ", 210, 795, 310, 44),
        ("user_ack_pwd", "user", "ActivityAction", "Xác nhận", 240, 795, 130, 42),
        ("calc_token", "sys", "ActivityAction", "Khởi tạo quyền truy cập và mã phiên JWT", 510, 795, 265, 44),
        ("dec_complete", "user", "DecisionNode", "Xác nhận hoàn tất bước xác thực", 240, 895, 54, 28),
        ("click_save", "user", "ActivityAction", "Chọn \"Đăng nhập & Lưu phiên\"", 240, 990, 230, 44),
        ("sys_log_time", "sys", "ActivityAction", "Ghi nhận thời gian đăng nhập và thiết bị", 340, 1050, 300, 44),
        ("sys_save_token", "sys", "ActivityAction", "Lưu Refresh Token và khởi tạo kết nối Socket", 340, 1125, 320, 44),
        ("sys_show_dash", "sys", "ActivityAction", "Hiển thị thông tin chi tiết phiên và Dashboard", 340, 1200, 330, 44),
        ("user_ack_done", "user", "ActivityAction", "Xác nhận", 240, 1200, 130, 44),
        ("end_final", "user", "ActivityFinalNode", "Kết thúc", 240, 1290, 26, 26),
    ]

    # Edges: (from_key, to_key, guard, route_hint)
    edges_spec = [
        ("start", "choose_login", "", "v"),
        ("choose_login", "show_form", "", "h"),
        ("show_form", "show_tenant", "", "v"),
        ("show_tenant", "input_email", "", "vh_down"),
        ("input_email", "dec_find_user", "không tồn tại", "h_no_guard"),
        ("dec_find_user", "err_not_found", "không tồn tại", "hv_left"),
        ("err_not_found", "user_ack_nf", "", "h"),
        ("user_ack_nf", "end_early", "", "v"),
        ("dec_find_user", "sys_show_user", "tồn tại", "hv_right"),
        ("sys_show_user", "choose_method", "", "vh_down"),
        ("choose_method", "input_pwd", "", "v"),
        ("input_pwd", "click_ok", "", "v"),
        ("click_ok", "dec_check_pwd", "", "h"),
        ("dec_check_pwd", "err_invalid_pwd", "không hợp lệ", "hv_left"),
        ("err_invalid_pwd", "user_ack_pwd", "", "h"),
        ("user_ack_pwd", "input_pwd", "", "loop_left_inner"),
        ("dec_check_pwd", "calc_token", "hợp lệ", "hv_right"),
        ("calc_token", "dec_complete", "", "vh_down"),
        ("dec_complete", "choose_method", "Chưa hoàn tất", "loop_left_outer"),
        ("dec_complete", "click_save", "Hoàn tất", "v"),
        ("click_save", "sys_log_time", "", "hv_right"),
        ("sys_log_time", "sys_save_token", "", "v"),
        ("sys_save_token", "sys_show_dash", "", "v"),
        ("sys_show_dash", "user_ack_done", "", "h"),
        ("user_ack_done", "end_final", "", "v"),
    ]
    # Fix edge 4 guard (input_email -> dec_find_user has no guard)
    edges_spec[4] = ("input_email", "dec_find_user", "", "h")

    node_m_ids: dict[str, str] = {}
    node_s_ids: dict[str, str] = {}
    node_boxes: dict[str, dict[str, int]] = {}
    from_cfs: dict[str, list[str]] = {n[0]: [] for n in nodes_spec}
    to_cfs: dict[str, list[str]] = {n[0]: [] for n in nodes_spec}

    for key, lane, stype, label, rel_cx, abs_y, w, h in nodes_spec:
        node_m_ids[key] = vp_id(f"{did}:nm:{key}")
        node_s_ids[key] = vp_id(f"{did}:ns:{key}")
        lane_x = sw_x if lane == "user" else (sw_x + user_w)
        abs_x = lane_x + rel_cx - w // 2
        node_boxes[key] = {
            "x": abs_x,
            "y": abs_y,
            "width": w,
            "height": h,
            "lane": lane,
            "rel_x": rel_cx - w // 2,
            "rel_y": abs_y - (sw_y + hdr_h),
        }

    cf_rows: list[tuple[str, str, str, str, str]] = []
    for e_idx, (fk, tk, guard, hint) in enumerate(edges_spec):
        cf_m = vp_id(f"{did}:cfm:{e_idx}")
        cf_s = vp_id(f"{did}:cfs:{e_idx}")
        from_cfs[fk].append(cf_m)
        to_cfs[tk].append(cf_m)
        fb = node_boxes[fk]
        tb = node_boxes[tk]
        fcx, fcy = fb["x"] + fb["width"] // 2, fb["y"] + fb["height"] // 2
        tcx, tcy = tb["x"] + tb["width"] // 2, tb["y"] + tb["height"] // 2

        cap_off = None
        if hint == "v":
            wps = [(fcx, fb["y"] + fb["height"]), (tcx, tb["y"])]
            if guard:
                cap_off = (14, (tb["y"] - (fb["y"] + fb["height"])) // 2 - 8)
        elif hint == "h":
            if tcx > fcx:
                wps = [(fb["x"] + fb["width"], fcy), (tb["x"], tcy)]
            else:
                wps = [(fb["x"], fcy), (tb["x"] + tb["width"], tcy)]
        elif hint == "vh_down":
            mid_y = (fb["y"] + fb["height"] + tb["y"]) // 2
            wps = [
                (fcx, fb["y"] + fb["height"]),
                (fcx, mid_y),
                (tcx, mid_y),
                (tcx, tb["y"]),
            ]
        elif hint == "hv_left":
            wps = [
                (fb["x"], fcy),
                (tcx, fcy),
                (tcx, tb["y"]),
            ]
            if guard:
                cap_off = ((tcx - fb["x"]) // 2 - 35, -20)
        elif hint == "hv_right":
            wps = [
                (fb["x"] + fb["width"], fcy),
                (tcx, fcy),
                (tcx, tb["y"]),
            ]
            if guard:
                cap_off = ((tcx - fb["x"]) // 2 - 10, -20)
        elif hint == "loop_left_inner":
            lx = sw_x + 55
            wps = [
                (fb["x"], fcy),
                (lx, fcy),
                (lx, tcy),
                (tb["x"], tcy),
            ]
        elif hint == "loop_left_outer":
            lx = sw_x + 25
            wps = [
                (fb["x"], fcy),
                (lx, fcy),
                (lx, tcy),
                (tb["x"], tcy),
            ]
            if guard:
                cap_off = (-125, 8)
        else:
            wps = [(fcx, fcy), (tcx, tcy)]

        cf_m_def, cf_s_def = build_control_flow(
            cf_m, cf_s, did, guard, node_m_ids[fk], node_m_ids[tk], node_s_ids[fk], node_s_ids[tk], fb, tb, wps, cap_off
        )
        cf_rows.append((cf_m, cf_s, guard, cf_m_def, cf_s_def))

    # Build two side-by-side crisp white bordered lane containers (or ActivitySwimlane2)
    # Wait: let's check how ActivitySwimlane2 vs 2 crisp white bordered Activity/Swimlane containers render!
    # In ActivitySwimlane2:
    p_user_nodes = [node_m_ids[n[0]] for n in nodes_spec if n[1] == "user"]
    p_sys_nodes = [node_m_ids[n[0]] for n in nodes_spec if n[1] == "sys"]
    c_user_shapes = [f"<{did}:{node_s_ids[n[0]]}>" for n in nodes_spec if n[1] == "user"]
    c_sys_shapes = [f"<{did}:{node_s_ids[n[0]]}>" for n in nodes_spec if n[1] == "sys"]

    def build_partition_model(pm_id: str, hs_id: str, pname: str, c_nodes: list[str]) -> str:
        vid = vp_id(f"mv:{pm_id}")
        c_joined = ", \r\n\t\t".join(f"<{m}>" for m in c_nodes)
        return f"""{pm_id}:"{pname}":ActivityPartition {{\r
\t_modelEditable=T;\r
\t_masterViewId="{hs_id}";\r
\tpmAuthor="user";\r
\tpmCreateDateTime="1340346240415";\r
\t_modelViews=(\r
\t\t{{{vid}:"View":ModelView {{\r
\t\t\tcontainer=<{did}>;\r
\t\t\tview="{hs_id}";\r
\t\t}}}}\r
\t);\r
\tcontainedElements=(\r
\t\t{c_joined}\r
\t);\r
\tdocumentation_plain=NULL;\r
\tpmLastModified="1340346241683";\r
}}"""

    sw_vid = vp_id(f"mv:{sw_m_id}")
    sw_m_def = f"""{sw_m_id}:"":ActivitySwimlane2 {{\r
\t_modelEditable=T;\r
\t_masterViewId="{sw_s_id}";\r
\tpmAuthor="user";\r
\tpmCreateDateTime="1340346240415";\r
\t_modelViews=(\r
\t\t{{{sw_vid}:"View":ModelView {{\r
\t\t\tcontainer=<{did}>;\r
\t\t\tview="{sw_s_id}";\r
\t\t}}}}\r
\t);\r
\tChild=(\r
\t\t<{sw_m_id}:{p_user_m}>, \r
\t\t<{sw_m_id}:{p_sys_m}>\r
\t);\r
\tverticalPartitions=(\r
\t\t<{sw_m_id}:{p_user_m}>, \r
\t\t<{sw_m_id}:{p_sys_m}>\r
\t);\r
\tdocumentation_plain=NULL;\r
\tpmLastModified="1340346241683";\r
}}"""

    def build_hdr_shape(hs_id: str, pm_id: str, pname: str, hx: int, hw: int) -> str:
        return f"""{hs_id}:"{pname}":ActivityPartitionHeader {{\r
\tforeground=(\r
\t\t0, \r
\t\t0, \r
\t\t0, \r
\t\t255\r
\t);\r
\tconnectToPoint=T;\r
\ty=0;\r
\tx={hx};\r
\tmetaModelElement=<{sw_m_id}:{pm_id}>;\r
\toverrideAppearanceWithStereotypeIcon=T;\r
\tparentConnectorHeaderLength=40;\r
\tconnectionPointType=0;\r
\tparentConnectorLineLength=10;\r
\theight={hdr_h};\r
\tdisplayStereotypeIcon=F;\r
\thorizontal=F;\r
\t_fillColor=(\r
\t\t@gradientStyle=1;, \r
\t\t@transparency=0;, \r
\t\t@type=2;, \r
\t\t@color1=(\r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255\r
\t\t);, \r
\t\t@color2=(\r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255\r
\t\t);\r
\t);\r
\twidth={hw};\r
\tbackground=(\r
\t\t255, \r
\t\t255, \r
\t\t255, \r
\t\t255\r
\t);\r
\tstyle=NULL;\r
\t_parent=<{did}:{sw_s_id}>;\r
\t_elementFont=(\r
\t\t@name="Dialog";, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@size=11;, \r
\t\t@style=0;\r
\t);\r
\t_captionUIModel=(\r
\t\t@x=0;, \r
\t\t@y=0;, \r
\t\t@width={hw};, \r
\t\t@height={hdr_h};, \r
\t\t@side=6;, \r
\t\t@visible=T;, \r
\t\t@internalWidth=-2147483648;, \r
\t\t@internalHeight=-2147483648;\r
\t);\r
\t_lineModel=(\r
\t\t@cap=0;, \r
\t\t@transparency=0;, \r
\t\t@weight=1.0;, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@hasStroke=T;\r
\t);\r
}}"""

    def build_comp_shape(cs_id: str, hs_id: str, cx: int, cw: int, c_shapes: list[str]) -> str:
        c_joined = ", \r\n\t\t".join(c_shapes)
        return f"""{cs_id}:"":ActivitySwimlane2Compartment {{\r
\tforeground=(\r
\t\t0, \r
\t\t0, \r
\t\t0, \r
\t\t255\r
\t);\r
\tconnectToPoint=T;\r
\ty={hdr_h};\r
\tx={cx};\r
\tmetaModelElement=NULL;\r
\toverrideAppearanceWithStereotypeIcon=T;\r
\tparentConnectorHeaderLength=40;\r
\tconnectionPointType=0;\r
\tparentConnectorLineLength=10;\r
\theight={sw_h - hdr_h};\r
\tdisplayStereotypeIcon=F;\r
\tverticalPartitionId="{hs_id}";\r
\t_fillColor=(\r
\t\t@gradientStyle=1;, \r
\t\t@transparency=0;, \r
\t\t@type=2;, \r
\t\t@color1=(\r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255\r
\t\t);, \r
\t\t@color2=(\r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255\r
\t\t);\r
\t);\r
\twidth={cw};\r
\tbackground=(\r
\t\t255, \r
\t\t255, \r
\t\t255, \r
\t\t255\r
\t);\r
\tstyle=NULL;\r
\t_parent=<{did}:{sw_s_id}>;\r
\t_elementFont=(\r
\t\t@name="Dialog";, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@size=11;, \r
\t\t@style=0;\r
\t);\r
\t_captionUIModel=(\r
\t\t@x=0;, \r
\t\t@y=0;, \r
\t\t@width=40;, \r
\t\t@height=20;, \r
\t\t@side=1;, \r
\t\t@visible=F;, \r
\t\t@internalWidth=-2147483648;, \r
\t\t@internalHeight=-2147483648;\r
\t);\r
\t_lineModel=(\r
\t\t@cap=0;, \r
\t\t@transparency=0;, \r
\t\t@weight=1.0;, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@hasStroke=T;\r
\t);\r
\tContainedDiagramElements=(\r
\t\t{c_joined}\r
\t);\r
}}"""

    sw_s_def = f"""{sw_s_id}:"":ActivitySwimlane2 {{\r
\tforeground=(\r
\t\t0, \r
\t\t0, \r
\t\t0, \r
\t\t255\r
\t);\r
\tconnectToPoint=T;\r
\ty={sw_y};\r
\tx={sw_x};\r
\tmetaModelElement=<{sw_m_id}>;\r
\toverrideAppearanceWithStereotypeIcon=T;\r
\tparentConnectorHeaderLength=40;\r
\tconnectionPointType=0;\r
\tparentConnectorLineLength=10;\r
\theight={sw_h};\r
\tdisplayStereotypeIcon=F;\r
\tverticalPartitionIds=(\r
\t\t"{h_user_s}", \r
\t\t"{h_sys_s}"\r
\t);\r
\tcompartmentIds=(\r
\t\t"{c_user_s}", \r
\t\t"{c_sys_s}"\r
\t);\r
\t_fillColor=(\r
\t\t@gradientStyle=1;, \r
\t\t@transparency=0;, \r
\t\t@type=2;, \r
\t\t@color1=(\r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255\r
\t\t);, \r
\t\t@color2=(\r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255, \r
\t\t\t255\r
\t\t);\r
\t);\r
\twidth={sw_w};\r
\tbackground=(\r
\t\t255, \r
\t\t255, \r
\t\t255, \r
\t\t255\r
\t);\r
\tstyle=NULL;\r
\t_elementFont=(\r
\t\t@name="Dialog";, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@style=0;, \r
\t\t@size=11;\r
\t);\r
\t_captionUIModel=(\r
\t\t@x=0;, \r
\t\t@y=0;, \r
\t\t@width=60;, \r
\t\t@height=20;, \r
\t\t@side=1;, \r
\t\t@visible=F;, \r
\t\t@internalWidth=-2147483648;, \r
\t\t@internalHeight=-2147483648;\r
\t);\r
\t_lineModel=(\r
\t\t@cap=0;, \r
\t\t@transparency=0;, \r
\t\t@weight=1.0;, \r
\t\t@color=(\r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t0, \r
\t\t\t255\r
\t\t);, \r
\t\t@hasStroke=T;\r
\t);\r
\tContainedDiagramElements=(\r
\t\t<{did}:{h_user_s}>, \r
\t\t<{did}:{h_sys_s}>, \r
\t\t<{did}:{c_user_s}>, \r
\t\t<{did}:{c_sys_s}>\r
\t);\r
}}"""

    child_ids: list[str] = []
    insert_model_row(cur, sw_m_id, "", "ActivitySwimlane2", None, sw_m_def)
    insert_shape_row(cur, sw_s_id, did, None, "ActivitySwimlane2", sw_s_def, sw_m_id)
    child_ids.append(sw_s_id)

    insert_model_row(cur, p_user_m, "Người dùng", "ActivityPartition", sw_m_id, build_partition_model(p_user_m, h_user_s, "Người dùng", p_user_nodes))
    insert_model_row(cur, p_sys_m, "Hệ thống", "ActivityPartition", sw_m_id, build_partition_model(p_sys_m, h_sys_s, "Hệ thống", p_sys_nodes))

    insert_shape_row(cur, h_user_s, did, sw_s_id, "ActivityPartitionHeader", build_hdr_shape(h_user_s, p_user_m, "Người dùng", 0, user_w), p_user_m)
    insert_shape_row(cur, h_sys_s, did, sw_s_id, "ActivityPartitionHeader", build_hdr_shape(h_sys_s, p_sys_m, "Hệ thống", user_w, sys_w), p_sys_m)
    child_ids.extend([h_user_s, h_sys_s])

    insert_shape_row(cur, c_user_s, did, sw_s_id, "ActivitySwimlane2Compartment", build_comp_shape(c_user_s, h_user_s, 0, user_w, c_user_shapes), None)
    insert_shape_row(cur, c_sys_s, did, sw_s_id, "ActivitySwimlane2Compartment", build_comp_shape(c_sys_s, h_sys_s, user_w, sys_w, c_sys_shapes), None)
    child_ids.extend([c_user_s, c_sys_s])

    for key, lane, stype, label, rel_cx, abs_y, w, h in nodes_spec:
        nm = node_m_ids[key]
        ns = node_s_ids[key]
        nb = node_boxes[key]
        parent_comp = c_user_s if lane == "user" else c_sys_s
        m_def = build_act_node_model(nm, ns, did, label, stype, from_cfs[key], to_cfs[key])
        s_def = build_act_node_shape(
            ns,
            nm,
            did,
            parent_comp,
            label,
            stype,
            nb["rel_x"],
            nb["rel_y"],
            w,
            h,
        )
        insert_model_row(cur, nm, label, stype, None, m_def)
        insert_shape_row(cur, ns, did, parent_comp, stype, s_def, nm)
        child_ids.append(ns)

    cf_container_id = "4Uk7SByGAqAKbSFr"
    cf_model_refs = []
    for cf_m, cf_s, guard, cf_m_def, cf_s_def in cf_rows:
        insert_model_row(cur, cf_m, guard, "ControlFlow", cf_container_id, cf_m_def)
        insert_shape_row(cur, cf_s, did, None, "ControlFlow", cf_s_def, cf_m)
        cf_model_refs.append(f"<{cf_container_id}:{cf_m}>")
        child_ids.append(cf_s)

    crow = cur.execute("SELECT DEFINITION FROM MODEL_ELEMENT WHERE ID=?", (cf_container_id,)).fetchone()
    if crow:
        ctext = crow[0].decode("utf-8")
        cm = re.search(r"(?s)\bChild=\((.*?)\);", ctext)
        crefs = re.findall(r"<[^>]+>", cm.group(1)) if cm else []
        crefs = [r for r in crefs if r.rsplit(":", 1)[-1][:-1] not in old_model_ids]
        crefs.extend(cf_model_refs)
        ctext = re.sub(
            r"(?s)\bChild=\(.*?\);",
            "Child=(\r\n\t\t" + ", \r\n\t\t".join(crefs) + "\r\n\t);",
            ctext,
            count=1,
        )
        cur.execute("UPDATE MODEL_ELEMENT SET DEFINITION=? WHERE ID=?", (ctext.encode("utf-8"), cf_container_id))

    children_block = "Child=(\r\n" + ",\r\n".join(f"\t\t<{did}:{cid}>" for cid in child_ids) + "\r\n\t);"
    dblob = re.sub(r"Child=\(\s*(?:<[^>]+>\s*,?\s*)*\);", children_block, dblob)
    cur.execute("UPDATE DIAGRAM SET DEFINITION=? WHERE ID=?", (dblob.encode("utf-8"), did))


if __name__ == "__main__":
    TEST_VPP.parent.mkdir(exist_ok=True)
    if TEST_VPP.exists():
        TEST_VPP.unlink()
    shutil.copy2(SOURCE, TEST_VPP)
    conn = sqlite3.connect(TEST_VPP)
    cur = conn.cursor()
    stereos = ensure_stereotypes(cur)
    rebuild_seq01(cur, stereos)
    rebuild_act01(cur)
    for prefix, code in (("SEQ-01%", "SEQ01"), ("ACT-01%", "ACT01")):
        did, blob = cur.execute("SELECT ID, DEFINITION FROM DIAGRAM WHERE NAME LIKE ?", (prefix,)).fetchone()
        dtext = re.sub(r'^[^:]+:"[^"]*":', f'{did}:"{code}":', blob.decode("utf-8"), count=1)
        cur.execute("UPDATE DIAGRAM SET NAME=?, DEFINITION=? WHERE ID=?", (code, dtext.encode("utf-8"), did))
    conn.commit()
    conn.close()
    print("Prepared", TEST_VPP)
