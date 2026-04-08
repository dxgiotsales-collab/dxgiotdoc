from pathlib import Path


TEMPLATE_DIR = Path("templates")

# 생성형 템플릿
TEMPLATE_MAP = {
    "DOC_10010_A": TEMPLATE_DIR / "DOC_10010_A.docx",
    "DOC_10010_B": TEMPLATE_DIR / "DOC_10010_B.docx",
    "DOC_10020": TEMPLATE_DIR / "DOC_10020.docx",
    "DOC_10021": TEMPLATE_DIR / "DOC_10021.docx",
    "DOC_10022": TEMPLATE_DIR / "DOC_10022.docx",
    "DOC_10024": TEMPLATE_DIR / "DOC_10024.docx",
    "DOC_10040": TEMPLATE_DIR / "DOC_10040.docx",
    "DOC_10050": TEMPLATE_DIR / "DOC_10050.docx",
    "DOC_10090": TEMPLATE_DIR / "DOC_10090.docx",
    "DOC_10100": TEMPLATE_DIR / "DOC_10100.docx",
    "DOC_10110_A": TEMPLATE_DIR / "DOC_10110_A.docx",
    "DOC_10110_B": TEMPLATE_DIR / "DOC_10110_B.docx",
    "DOC_10120": TEMPLATE_DIR / "DOC_10120.docx",
    "DOC_10130": TEMPLATE_DIR / "DOC_10130.docx",
    "DOC_10160": TEMPLATE_DIR / "DOC_10160.docx",
}

# 고정 첨부 문서
FIXED_DOCS = {
    "DOC_10023": TEMPLATE_DIR / "DOC_10023_fixed.docx",
    "DOC_10026": TEMPLATE_DIR / "DOC_10026_fixed.docx",
}

# 생성 방식
GENERATION_TYPE_MAP = {
    "DOC_10010_A": "special",
    "DOC_10010_B": "special",
    "DOC_10020": "special",
    "DOC_10021": "special",
    "DOC_10022": "image",
    "DOC_10023": "fixed",
    "DOC_10024": "special",
    "DOC_10026": "fixed",
    "DOC_10040": "special",
    "DOC_10050": "image",
    "DOC_10090": "token",
    "DOC_10100": "token",
    "DOC_10110_A": "token",
    "DOC_10110_B": "token",
    "DOC_10120": "token",
    "DOC_10130": "token",
    "DOC_10160": "token",
}


def get_template_path(doc_code: str) -> Path:
    if doc_code in FIXED_DOCS:
        return FIXED_DOCS[doc_code]

    if doc_code in TEMPLATE_MAP:
        return TEMPLATE_MAP[doc_code]

    raise ValueError(f"템플릿 경로를 찾을 수 없습니다: {doc_code}")


def get_generation_type(doc_code: str) -> str:
    if doc_code not in GENERATION_TYPE_MAP:
        raise ValueError(f"생성 타입을 찾을 수 없습니다: {doc_code}")
    return GENERATION_TYPE_MAP[doc_code]