from pathlib import Path

from docx import Document
from docxcompose.composer import Composer
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


def add_page_break_to_end(doc: Document):
    p = OxmlElement("w:p")
    r = OxmlElement("w:r")
    br = OxmlElement("w:br")
    br.set(qn("w:type"), "page")

    r.append(br)
    p.append(r)

    body = doc.element.body
    sect_pr = body.sectPr

    if sect_pr is not None:
        body.insert(len(body) - 1, p)
    else:
        body.append(p)


def merge_documents(file_paths: list[str], output_path: Path):
    if not file_paths:
        return None

    valid_files = [p for p in file_paths if p and Path(p).exists()]
    if not valid_files:
        return None

    try:
        master = Document(valid_files[0])
        composer = Composer(master)

        for path in valid_files[1:]:
            add_page_break_to_end(master)
            doc = Document(path)
            composer.append(doc)

        composer.save(output_path)
        return output_path

    except Exception as e:
        print(f"[ERROR] merge 실패: {e}")
        return None