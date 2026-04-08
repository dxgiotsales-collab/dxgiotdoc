from pathlib import Path
from shutil import copyfile

from routers.document_router import get_template_path, get_generation_type
from engines.token_engine import generate_token_doc
from engines.block_engine import generate_block_doc
from engines.image_engine import generate_image_doc
from engines.doc_10040_engine import generate_doc_10040
from engines.doc_10010_a_engine import generate_doc_10010_a
from engines.doc_10010_b_engine import generate_doc_10010_b
from engines.doc_10021_engine import generate_doc_10021
from engines.doc_10024_engine import generate_doc_10024
from engines.doc_10020_engine import generate_doc_10020
from engines.doc_10110_a_engine import generate_doc_10110_a
from engines.doc_10110_b_engine import generate_doc_10110_b
from engines.doc_10160_engine import generate_doc_10160

from services.doc_merger import merge_documents
from document_names import DOCUMENT_NAME_MAP


OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)


def generate_documents(
    project_data: dict,
    selected_docs: list[str],
    output_dir: str | Path | None = None,
) -> list[str]:
    output_files = []

    business_name = project_data.get("fields", {}).get("BUSINESS_NAME", "사업장")
    target_dir = Path(output_dir) if output_dir else OUTPUT_DIR
    target_dir.mkdir(parents=True, exist_ok=True)

    for doc_code in selected_docs:
        template_path = get_template_path(doc_code)
        generation_type = get_generation_type(doc_code)

        doc_name = DOCUMENT_NAME_MAP.get(doc_code, doc_code)
        output_path = target_dir / f"{doc_name}_{business_name}.docx"

        if generation_type == "fixed":
            copyfile(template_path, output_path)

        elif doc_code == "DOC_10010_A":
            generate_doc_10010_a(template_path, output_path, project_data)

        elif doc_code == "DOC_10010_B":
            generate_doc_10010_b(template_path, output_path, project_data)

        elif doc_code == "DOC_10020":
            generate_doc_10020(template_path, output_path, project_data)

        elif doc_code == "DOC_10021":
            generate_doc_10021(template_path, output_path, project_data)

        elif doc_code == "DOC_10024":
            output_file = generate_doc_10024(
                template_path=str(template_path),
                output_dir=str(target_dir),
                data=project_data,
            )
            output_files.append(str(output_file))
            continue

        elif doc_code == "DOC_10040":
            generate_doc_10040(template_path, output_path, project_data)

        elif doc_code == "DOC_10110_A":
            generate_doc_10110_a(template_path, output_path, project_data)

        elif doc_code == "DOC_10110_B":
            generate_doc_10110_b(template_path, output_path, project_data)

        elif doc_code == "DOC_10160":
            generate_doc_10160(template_path, output_path, project_data)

        elif generation_type == "token":
            generate_token_doc(template_path, output_path, project_data)

        elif generation_type == "block":
            generate_block_doc(template_path, output_path, project_data, doc_code)

        elif generation_type == "image":
            generate_image_doc(template_path, output_path, project_data, doc_code)

        else:
            raise ValueError(f"지원하지 않는 생성 타입입니다: {doc_code} / {generation_type}")

        output_files.append(str(output_path))

    return output_files


from pathlib import Path
import os

def generate_merged_document(output_files: list[str], merged_filename: str) -> str | None:
    if not output_files:
        return None

    merged_path = OUTPUT_DIR / merged_filename
    result = merge_documents(output_files, merged_path)
    return str(result) if result else None