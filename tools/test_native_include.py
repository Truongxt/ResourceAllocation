"""Disposable Visual Paradigm 10 compatibility test for native Include relations."""
import re
import shutil
import sqlite3

source = r"D:\ResourceAllocation\docs\ResourceAllocation_UML_revised.vpp"
target = r"D:\ResourceAllocation\docs\UML_include_test.vpp"
modern = r"C:\Program Files\Visual Paradigm for UML 10.0\Samples\UML 2.0 Notations\UMLNotations.vpp"
shutil.copy2(source, target)
conn = sqlite3.connect(target)
conn.row_factory = sqlite3.Row
other = sqlite3.connect(modern)
other.row_factory = sqlite3.Row
diagram = conn.execute("SELECT * FROM DIAGRAM WHERE NAME LIKE 'UC-02%'").fetchone()
uc = conn.execute("SELECT * FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=? AND SHAPE_TYPE='UseCase' ORDER BY rowid", (diagram['ID'],)).fetchall()
sample_shape = other.execute("SELECT * FROM DIAGRAM_ELEMENT WHERE SHAPE_TYPE='Dependency' LIMIT 1").fetchone()
sample_model = other.execute("SELECT * FROM MODEL_ELEMENT WHERE ID=?", (sample_shape['MODEL_ELEMENT_ID'],)).fetchone()
mid, sid = 'RATESTINCLUDE0001', 'RATESTINCLUDEVIEW1'
md = sample_model['DEFINITION'].decode()
md = re.sub(r'^[^:]+:"[^"]*":Dependency', mid + ':"«include»":Dependency', md, count=1)
md = re.sub(r'toModel=<[^>]+>', 'toModel=<' + uc[1]['MODEL_ELEMENT_ID'] + '>', md)
md = re.sub(r'fromModel=<[^>]+>', 'fromModel=<' + uc[0]['MODEL_ELEMENT_ID'] + '>', md)
md = re.sub(r'_masterViewId="[^"]+"', '_masterViewId="' + sid + '"', md)
md = re.sub(r'container=<[^>]+>', 'container=<' + diagram['ID'] + '>', md)
md = re.sub(r'view="[^"]+"', 'view="' + sid + '"', md)
model_cols = [r[1] for r in conn.execute('PRAGMA table_info(MODEL_ELEMENT)')]
fields = {key: sample_model[key] if key in sample_model.keys() else None for key in model_cols}
md = md.replace(':Dependency {', ':Include {', 1)
fields.update(ID=mid, MODEL_TYPE='Include', PARENT_ID=sample_model['PARENT_ID'], NAME='«include»', DEFINITION=md.encode())
conn.execute('INSERT INTO MODEL_ELEMENT (%s) VALUES (%s)' % (','.join(fields), ','.join('?' for _ in fields)), tuple(fields.values()))
sd = sample_shape['DEFINITION'].decode()
sd = re.sub(r'^[^:]+:"[^"]*":Dependency', sid + ':"«include»":Dependency', sd, count=1)
sd = re.sub(r'_fromShape=<[^>]+>', '_fromShape=<' + diagram['ID'] + ':' + uc[0]['ID'] + '>', sd)
sd = re.sub(r'_toShape=<[^>]+>', '_toShape=<' + diagram['ID'] + ':' + uc[1]['ID'] + '>', sd)
original_address = re.search(r'metaModelElement=<([^>]+)>', sd).group(1)
sd = re.sub(r'metaModelElement=<[^>]+>', 'metaModelElement=<' + original_address.rsplit(':', 1)[0] + ':' + mid + '>', sd)
sd = re.sub(r'_points="[^"]+"', '_points="255,62;255,0;"', sd)
for key, value in (('x', -30), ('y', -30), ('width', 570), ('height', 160)):
    sd = re.sub(r'(?m)^(\s*' + key + r'=)-?\d+;', lambda m: m.group(1) + str(value) + ';', sd, count=1)
sd = re.sub(r'(?s)(_captionUIModel=\(.*?)@width=-?\d+;', r'\g<1>@width=90;', sd, count=1)
shape_cols = [r[1] for r in conn.execute('PRAGMA table_info(DIAGRAM_ELEMENT)')]
fields = {key: sample_shape[key] if key in sample_shape.keys() else None for key in shape_cols}
sd = sd.replace(':Dependency {', ':Include {', 1)
fields.update(ID=sid, SHAPE_TYPE='Include', DIAGRAM_ID=diagram['ID'], MODEL_ELEMENT_ID=mid, DEFINITION=sd.encode())
conn.execute('INSERT INTO DIAGRAM_ELEMENT (%s) VALUES (%s)' % (','.join(fields), ','.join('?' for _ in fields)), tuple(fields.values()))
dd = diagram['DEFINITION'].decode()
dd = dd.replace('Child=(\n', 'Child=(\n\t\t<' + diagram['ID'] + ':' + sid + '>,\n', 1)
dd = re.sub(r'^[^:]+:"[^"]+":UseCaseDiagram', diagram['ID'] + ':"UC-02 TEST":UseCaseDiagram', dd, count=1)
conn.execute("UPDATE DIAGRAM SET NAME='UC-02 TEST',DEFINITION=? WHERE ID=?", (dd.encode(), diagram['ID']))
conn.commit()
print(conn.execute('PRAGMA integrity_check').fetchone()[0])
