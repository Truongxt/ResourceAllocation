import io
import re
import shutil
import sqlite3
from PIL import Image, ImageDraw

source_project = r"D:\ResourceAllocation\docs\ResourceAllocation_UML.vpp"
test_project = r"D:\ResourceAllocation\docs\UML_embed_test.vpp"
visio_project = r"C:\Program Files\Visual Paradigm for UML 10.0\Samples\Visio Shape\VisioShape.vpp"
shutil.copy2(source_project, test_project)

conn = sqlite3.connect(test_project)
source = sqlite3.connect(visio_project)
source.row_factory = sqlite3.Row
target_diagram = conn.execute("SELECT ID,DEFINITION FROM DIAGRAM WHERE NAME LIKE 'UC-01%'").fetchone()
source_diagram = source.execute("SELECT ID FROM DIAGRAM LIMIT 1").fetchone()["ID"]
shape = source.execute("SELECT * FROM DIAGRAM_ELEMENT WHERE ID='XfhuRSCGAqAKZmPe'").fetchone()
model = source.execute("SELECT * FROM MODEL_ELEMENT WHERE ID='XfhuRSCGAqAKZmPf'").fetchone()

model_definition = model["DEFINITION"].decode().replace(source_diagram, target_diagram[0])
conn.execute("INSERT INTO MODEL_ELEMENT (ID,USER_ID,MODEL_TYPE,PARENT_ID,NAME,DEFINITION,MIRROR_SOURCE,AUTHOR,CREATE_AT,LAST_MOD_AT) VALUES (?,?,?,?,?,?,?,?,?,?)",
             (model["ID"], model["USER_ID"], model["MODEL_TYPE"], model["PARENT_ID"], "Image test", model_definition.encode(), model["MIRROR_SOURCE"], model["AUTHOR"], model["CREATE_AT"], model["LAST_MOD_AT"]))

shape_definition = shape["DEFINITION"].decode().replace(source_diagram, target_diagram[0])
shape_definition = re.sub(r'(?m)^\s*x=\d+;', '\tx=40;', shape_definition, count=1)
shape_definition = re.sub(r'(?m)^\s*y=\d+;', '\ty=40;', shape_definition, count=1)
shape_definition = re.sub(r'(?m)^\s*width=\d+;', '\twidth=1200;', shape_definition, count=1)
shape_definition = re.sub(r'(?m)^\s*height=\d+;', '\theight=800;', shape_definition, count=1)
conn.execute("INSERT INTO DIAGRAM_ELEMENT (ID,SHAPE_TYPE,DIAGRAM_ID,MODEL_ELEMENT_ID,COMPOSITE_MODEL_ELEMENT_ADDRESS,REF_MODEL_ELEMENT_ADDRESS,PARENT_ID,DEFINITION) VALUES (?,?,?,?,?,?,?,?)",
             (shape["ID"], shape["SHAPE_TYPE"], target_diagram[0], model["ID"], shape["COMPOSITE_MODEL_ELEMENT_ADDRESS"], shape["REF_MODEL_ELEMENT_ADDRESS"], shape["PARENT_ID"], shape_definition.encode()))

image = Image.new("RGB", (1200, 800), "white")
draw = ImageDraw.Draw(image)
draw.rectangle((40, 40, 1160, 760), fill="#1d4ed8")
draw.text((100, 100), "VISIO EMBED TEST", fill="white")
buffer = io.BytesIO()
image.save(buffer, "PNG")
for file in source.execute("SELECT * FROM PROJECT_FILE WHERE PATH LIKE 'XfhuRSCGAqAKZmPf.%'"):
    content = buffer.getvalue() if file["PATH"].endswith(".png") else file["CONTENT"]
    conn.execute("INSERT OR REPLACE INTO PROJECT_FILE (PATH,CONTENT,STATUS) VALUES (?,?,?)",
                 (file["PATH"], content, file["STATUS"]))

diagram_definition = target_diagram[1].decode()
diagram_definition = diagram_definition.replace("\tChild=(", "\tChild=(\n\t\t<%s:%s>," % (target_diagram[0], shape["ID"]), 1)
conn.execute("UPDATE DIAGRAM SET DEFINITION=? WHERE ID=?", (diagram_definition.encode(), target_diagram[0]))
conn.commit()
print(conn.execute("PRAGMA integrity_check").fetchone())
