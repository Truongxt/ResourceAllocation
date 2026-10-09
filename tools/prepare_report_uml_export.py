"""Prepare an ASCII-named copy of the editable UML project for VP 10 CLI.

The old Windows batch launcher can garble Vietnamese diagram names when many
names are passed on the command line.  The delivered .vpp remains untouched.
"""

from __future__ import annotations

import re
import shutil
import sqlite3
from pathlib import Path


ROOT = Path(r"D:\ResourceAllocation\docs")
SOURCE = ROOT / "ResourceAllocation_UML_MotKhung.vpp"
OUTPUT = ROOT / "report_assets" / "UML_export_ascii.vpp"


def main() -> None:
    OUTPUT.parent.mkdir(exist_ok=True)
    if OUTPUT.exists():
        raise FileExistsError(OUTPUT)
    shutil.copy2(SOURCE, OUTPUT)
    conn = sqlite3.connect(OUTPUT)
    rows = conn.execute("SELECT ID, NAME, DEFINITION FROM DIAGRAM ORDER BY NAME").fetchall()
    codes = []
    for did, old_name, blob in rows:
        code = old_name.split(" ", 1)[0].replace("-", "")
        if not re.fullmatch(r"(UC|ACT|SEQ|CLS)\d\d", code):
            raise ValueError(old_name)
        definition = blob.decode("utf-8")
        definition = re.sub(
            r'^[^:]+:"[^"]*":', f'{did}:"{code}":', definition, count=1
        )
        conn.execute(
            "UPDATE DIAGRAM SET NAME=?, DEFINITION=? WHERE ID=?",
            (code, definition.encode("utf-8"), did),
        )
        codes.append(code)
    conn.commit()
    conn.close()
    print(OUTPUT)
    print(" ".join(codes))


if __name__ == "__main__":
    main()
