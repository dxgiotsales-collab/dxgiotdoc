from pathlib import Path
from typing import Dict, List, Any
import os
import re
import tempfile
import shutil
import json
import pandas as pd
from datetime import datetime

import streamlit as st

from services.doc_generator import generate_documents, generate_merged_document
from services.certificate_pdf import generate_certificate_pdf
from config.merge_orders import DAEJIN_ORDER, ENERGY_ORDER

from docx import Document
from docxcompose.composer import Composer
from core.calculator import calculate_application

if "user_name" not in st.session_state:
    st.session_state["user_name"] = "정은희"
    st.session_state["user_phone"] = "010-4223-4712"
    st.session_state["user_id"] = "90250513"
    st.session_state["user_role"] = "admin"


def merge_docx_files(file_paths, output_path):
    master = Document(file_paths[0])
    composer = Composer(master)

    for path in file_paths[1:]:
        doc = Document(path)
        composer.append(doc)

    composer.save(output_path)
    return output_path

import hashlib
from docx.opc.part import Part

def patch_docxcompose_sha1():
    if not hasattr(Part, "sha1"):
        Part.sha1 = property(
            lambda self: hashlib.sha1(
                getattr(self, "blob", b"") if getattr(self, "blob", b"") else b""
            ).hexdigest()
        )

# =========================
# 기본 설정
# =========================
st.set_page_config(page_title="DXG 문서자동화", layout="wide")

APP_DATA_DIR = Path("app_data")
PROJECT_DIR = APP_DATA_DIR / "projects"
PROJECT_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR = APP_DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

USER_NAME = st.session_state.get("user_name", "관리자")

UNIT_OPTIONS = ["HP", "㎥", "㎥/분", "KW", "ton"]
PREVENTION_METHOD_OPTIONS = [
    "여과집진시설",
    "흡착에 의한 시설",
    "원심력 집진시설",
    "세정집진시설",
    "전기집진시설",
    "흡수에 의한 시설",
    "여과 및 흡착에 의한 시설",
]
DOCUMENT_OPTIONS = [
    "DOC_10010_A",
    "DOC_10010_B",
    "DOC_10020",
    "DOC_10021",
    "DOC_10022",
    "DOC_10024",
    "DOC_10040",
    "DOC_10050",
    "DOC_10090",
    "DOC_10100",
    "DOC_10110_A",
    "DOC_10110_B",
    "DOC_10120",
    "DOC_10130",
    "DOC_10160",
]

SENSOR_UNIT_PRICE = {
    "전류계(세정/전기시설)": 300000,
    "차압계(압력계)": 400000,
    "온도계": 500000,
    "ph계": 1000000,
    "전류계(배출시설)": 300000,
    "전류계(방지시설)": 300000,
    "IoT게이트웨이": 1600000,
    "IoT게이트웨이(복수형)": 2080000,
    "VPN": 400000,
}

PREVENTION_SENSOR_RULES = {
    "여과집진시설": [
        ("차압계(압력계)", 1),
        ("온도계", 1),
        ("전류계(방지시설)", 1),
    ],
    "흡착에 의한 시설": [
        ("차압계(압력계)", 1),
        ("온도계", 1),
        ("전류계(방지시설)", 1),
    ],
    "원심력 집진시설": [
        ("전류계(방지시설)", 1),
    ],
    "세정집진시설": [
        ("전류계(세정/전기시설)", 1),
        ("전류계(방지시설)", 1),
    ],
    "전기집진시설": [
        ("전류계(세정/전기시설)", 1),
        ("전류계(방지시설)", 1),
    ],
    "흡수에 의한 시설": [
        ("전류계(세정/전기시설)", 1),
        ("전류계(방지시설)", 1),
        ("ph계", 1),
    ],
    "여과집진시설 및 흡착에 의한 시설(일체형)": [
        ("차압계(압력계)", 1),
        ("온도계", 1),
        ("전류계(방지시설)", 1),
    ],
}

SENSOR_BASIS_DEFAULT = {
    "전류계(세정/전기시설)": "",
    "차압계(압력계)": "",
    "온도계": "",
    "ph계": "",
    "전류계(배출시설)": "",
    "전류계(방지시설)": "",
    "IoT게이트웨이": "",
    "IoT게이트웨이(복수형)": "",
    "VPN": "",
}


# =========================
# 유틸
# =========================
def safe_location_from_address(address: str) -> str:
    if not address:
        return ""
    m = re.match(r"^\s*([가-힣]+(?:특별시|광역시|도|특별자치시|특별자치도))", address)
    if not m:
        return ""
    raw = m.group(1)
    return (
        raw.replace("특별시", "")
        .replace("광역시", "")
        .replace("특별자치시", "")
        .replace("특별자치도", "")
        .replace("도", "")
    )

def delete_project(file_path: str):
    json_path = Path(file_path)

    if json_path.exists():
        json_path.unlink()

    excel_path = json_path.with_suffix(".xlsx")
    if excel_path.exists():
        excel_path.unlink()

def build_project_name(year_yy: str, business_name: str, location: str) -> str:
    if not year_yy:
        year_yy = "YY"
    return f"{year_yy}_{business_name or '사업장명'}_{location or '지역'}"


def build_submission_filename(org_type: str) -> str:
    date_str = st.session_state.get("DOCUMENT_DATE", "")
    year = "2026"
    if date_str and len(date_str) >= 4:
        year = date_str[:4]

    business_name = st.session_state.get("BUSINESS_NAME", "") or "사업장"

    address = st.session_state.get("BUSINESS_ADDRESS", "") or ""
    tokens = address.split()

    city = tokens[0] if len(tokens) >= 1 else "지역"
    district = tokens[1] if len(tokens) >= 2 else ""

    city = (
        city.replace("특별시", "")
        .replace("광역시", "")
        .replace("특별자치시", "")
        .replace("특별자치도", "")
        .replace("도", "")
    )

    suffix = "_dt" if org_type == "daejin" else ""

    if district:
        return f"{year}_{business_name}_{city}_{district}{suffix}_001.docx"
    return f"{year}_{business_name}_{city}{suffix}_001.docx"


def build_certificate_filename() -> str:
    date_str = st.session_state.get("DOCUMENT_DATE", "")
    year = "2026"
    if date_str and len(date_str) >= 4:
        year = date_str[:4]

    business_name = st.session_state.get("BUSINESS_NAME", "") or "사업장"

    address = st.session_state.get("BUSINESS_ADDRESS", "") or ""
    tokens = address.split()

    city = tokens[0] if len(tokens) >= 1 else "지역"
    district = tokens[1] if len(tokens) >= 2 else ""

    city = (
        city.replace("특별시", "")
        .replace("광역시", "")
        .replace("특별자치시", "")
        .replace("특별자치도", "")
        .replace("도", "")
    )

    if district:
        return f"{year}_{business_name}_{city}_{district}_004_성적서.pdf"
    return f"{year}_{business_name}_{city}_004_성적서.pdf"


def format_korean_date(date_str: str):
    if not date_str:
        return ""
    try:
        y, m, d = date_str.split("-")
        return f"{y}년 {m}월 {d}일"
    except:
        return date_str


def normalize_prevention_name(name: str) -> str:
    if name == "여과집진시설 및 흡착에 의한 시설(일체형)":
        return "여과 및 흡착에 의한 시설"
    return name

def get_default_emission_no(idx: int) -> str:
    return f"배{idx + 1}"

def get_default_prevention_no(idx: int) -> str:
    return f"방{idx + 1}"


def format_business_license(num: str):
    if len(num) == 10 and "-" not in num:
        return f"{num[:3]}-{num[3:5]}-{num[5:]}"
    return num


def krw(n):
    try:
        return f"{int(n):,}"
    except:
        return ""


def format_birth_date(date_str: str):
    if not date_str:
        return ""
    date_str = str(date_str).strip().replace(".", "-").replace("/", "-")
    return date_str


def build_prevention_facility_text():
    parts = []
    for p in support_preventions():
        name = normalize_prevention_name(p.get("facility_name", ""))
        capacity = f'{p.get("capacity", "")}{p.get("unit", "")}'
        if name or capacity:
            parts.append(f"{name}*{capacity}")
    return ", ".join(parts)


def build_project_device_text_simple(install_items: list[dict]):
    parts = []
    for item in install_items:
        name = item.get("ITEM_NAME", "")
        qty = item.get("ITEM_QTY", 0)
        if name and qty:
            parts.append(f"{name}*{qty}EA")
    return ", ".join(parts)


def save_uploaded_file(uploaded_file, subdir: Path) -> str:
    subdir.mkdir(parents=True, exist_ok=True)
    file_path = subdir / uploaded_file.name
    with open(file_path, "wb") as f:
        f.write(uploaded_file.getbuffer())
    return str(file_path)


def calc_subsidy(total_cost: int, subsidy_ratio: int, self_ratio: int):
    national = int(total_cost * subsidy_ratio / 100)
    self_burden = int(total_cost * self_ratio / 100)
    return national, self_burden


def number_to_korean_money(num: int) -> str:
    if not num:
        return "영원"

    units = ["", "만", "억", "조"]
    nums = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"]
    small_units = ["", "십", "백", "천"]

    def four_digit_to_korean(n: int) -> str:
        result = ""
        s = str(n).zfill(4)
        for i, ch in enumerate(s):
            digit = int(ch)
            if digit == 0:
                continue
            pos = 3 - i
            if digit == 1 and pos > 0:
                result += small_units[pos]
            else:
                result += nums[digit] + small_units[pos]
        return result

    parts = []
    unit_idx = 0

    while num > 0:
        chunk = num % 10000
        if chunk:
            parts.append(four_digit_to_korean(chunk) + units[unit_idx])
        num //= 10000
        unit_idx += 1

    return "".join(reversed(parts)) + "원"


def support_emissions():
    return [x for x in st.session_state.emission_facilities if x.get("is_supported")]


def support_preventions():
    return [x for x in st.session_state.prevention_facilities if x.get("is_supported")]


def find_emissions_by_outlet(outlet_no: str):
    return [
        x for x in support_emissions()
        if str(x.get("outlet_no", "")).strip() == str(outlet_no).strip()
        and not x.get("is_exempt")
    ]


def build_site_facility_status():
    rows = []
    for p in st.session_state.prevention_facilities:
        outlet_no = p.get("outlet_no", "")

        linked_emissions = [
            x for x in st.session_state.emission_facilities
            if x.get("outlet_no") == outlet_no
        ]

        if not linked_emissions:
            continue

        for e in linked_emissions:
            rows.append(
                {
                    "EMISSION_FACILITY_NAME": e.get("facility_name", ""),
                    "EMISSION_CAPACITY": f'{e.get("capacity", "")}{e.get("unit", "")}',
                    "EMISSION_QTY": 1,
                    "PREVENTION_METHOD": normalize_prevention_name(
                        p.get("facility_name", "")
                    ),
                    "PREVENTION_CAPACITY": f'{p.get("capacity", "")}{p.get("unit", "")}',
                    "PREVENTION_QTY": 1,
                }
            )
    return rows


def get_project_key():
    yy = str(st.session_state.get("DOCUMENT_DATE", ""))[:4][-2:] if st.session_state.get("DOCUMENT_DATE", "") else "YY"
    location = st.session_state.get(
        "BUSINESS_LOCATION",
        safe_location_from_address(st.session_state.get("BUSINESS_ADDRESS", ""))
    )
    return build_project_name(
        yy,
        st.session_state.get("BUSINESS_NAME", ""),
        location,
    )


def get_project_file_path(project_key: str) -> Path:
    return PROJECT_DIR / f"{project_key}.json"

def get_project_excel_path(project_key: str) -> Path:
    return PROJECT_DIR / f"{project_key}.xlsx"

def build_project_snapshot(save_status: str = "draft") -> dict:
    keys_to_save = [
        "BUSINESS_NAME",
        "BUSINESS_LICENSE_NUMBER",
        "BUSINESS_ADDRESS",
        "BUSINESS_LOCATION",
        "BUSINESS_TYPE",
        "BUSINESS_TYPE_NUMBER",
        "BUSINESS_MAIN_PRODUCT",
        "BUSINESS_PHONE",
        "BUSINESS_FAX",
        "BUSINESS_MAIL_ADDRESS",
        "BUSINESS_CEO_NAME",
        "CEO_BIRTHDAY_DATE",
        "BUSINESS_CONTACT_NAME",
        "BUSINESS_CONTACT_PHONE",
        "MEASURE_DATE",
        "DOCUMENT_DATE",
        "MUNICIPALITY_OFFICE_NAME",
        "CONSTRUCTION_START_DATE",
        "CONSTRUCTION_END_DATE",
        "TOTAL_COST",
        "subsidy_ratio",
        "self_ratio",
        "selected_docs",
        "sensor_basis",
        "pollutants",
        "emission_facilities",
        "prevention_facilities",
    ]

    data = {}
    for key in keys_to_save:
        data[key] = st.session_state.get(key)

    project_key = get_project_key()

    return {
        "project_key": project_key,
        "save_status": save_status,   # draft / final
        "saved_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "data": data,
    }


def save_project(save_status: str = "draft"):
    project_key = get_project_key()
    file_path = get_project_file_path(project_key)

    snapshot = build_project_snapshot(save_status=save_status)

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)

    save_project_excel(snapshot)

    return file_path

def save_project_excel(snapshot: dict):
    project_key = snapshot.get("project_key", "project")
    excel_path = get_project_excel_path(project_key)

    data = snapshot.get("data", {})

    basic_info_rows = [
        {"항목": "project_key", "값": snapshot.get("project_key", "")},
        {"항목": "save_status", "값": snapshot.get("save_status", "")},
        {"항목": "saved_at", "값": snapshot.get("saved_at", "")},
        {"항목": "BUSINESS_NAME", "값": data.get("BUSINESS_NAME", "")},
        {"항목": "BUSINESS_LICENSE_NUMBER", "값": data.get("BUSINESS_LICENSE_NUMBER", "")},
        {"항목": "BUSINESS_ADDRESS", "값": data.get("BUSINESS_ADDRESS", "")},
        {"항목": "BUSINESS_LOCATION", "값": data.get("BUSINESS_LOCATION", "")},
        {"항목": "BUSINESS_TYPE", "값": data.get("BUSINESS_TYPE", "")},
        {"항목": "BUSINESS_TYPE_NUMBER", "값": data.get("BUSINESS_TYPE_NUMBER", "")},
        {"항목": "BUSINESS_MAIN_PRODUCT", "값": data.get("BUSINESS_MAIN_PRODUCT", "")},
        {"항목": "BUSINESS_PHONE", "값": data.get("BUSINESS_PHONE", "")},
        {"항목": "BUSINESS_FAX", "값": data.get("BUSINESS_FAX", "")},
        {"항목": "BUSINESS_MAIL_ADDRESS", "값": data.get("BUSINESS_MAIL_ADDRESS", "")},
        {"항목": "BUSINESS_CEO_NAME", "값": data.get("BUSINESS_CEO_NAME", "")},
        {"항목": "CEO_BIRTHDAY_DATE", "값": data.get("CEO_BIRTHDAY_DATE", "")},
        {"항목": "BUSINESS_CONTACT_NAME", "값": data.get("BUSINESS_CONTACT_NAME", "")},
        {"항목": "BUSINESS_CONTACT_PHONE", "값": data.get("BUSINESS_CONTACT_PHONE", "")},
        {"항목": "MEASURE_DATE", "값": data.get("MEASURE_DATE", "")},
        {"항목": "DOCUMENT_DATE", "값": data.get("DOCUMENT_DATE", "")},
        {"항목": "MUNICIPALITY_OFFICE_NAME", "값": data.get("MUNICIPALITY_OFFICE_NAME", "")},
        {"항목": "CONSTRUCTION_START_DATE", "값": data.get("CONSTRUCTION_START_DATE", "")},
        {"항목": "CONSTRUCTION_END_DATE", "값": data.get("CONSTRUCTION_END_DATE", "")},
        {"항목": "TOTAL_COST", "값": data.get("TOTAL_COST", "")},
        {"항목": "subsidy_ratio", "값": data.get("subsidy_ratio", "")},
        {"항목": "self_ratio", "값": data.get("self_ratio", "")},
    ]
    df_basic = pd.DataFrame(basic_info_rows)

    df_pollutants = pd.DataFrame(data.get("pollutants", []))
    df_emissions = pd.DataFrame(data.get("emission_facilities", []))
    df_preventions = pd.DataFrame(data.get("prevention_facilities", []))

    sensor_basis = data.get("sensor_basis", {}) or {}
    df_sensor_basis = pd.DataFrame(
        [{"센서명": k, "부착근거": v} for k, v in sensor_basis.items()]
    )

    selected_docs = data.get("selected_docs", []) or []
    df_selected_docs = pd.DataFrame(
        [{"선택문서": doc_code} for doc_code in selected_docs]
    )

    with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
        df_basic.to_excel(writer, sheet_name="기본정보", index=False)
        df_pollutants.to_excel(writer, sheet_name="오염물질", index=False)
        df_emissions.to_excel(writer, sheet_name="배출시설", index=False)
        df_preventions.to_excel(writer, sheet_name="방지시설", index=False)
        df_sensor_basis.to_excel(writer, sheet_name="센서근거", index=False)
        df_selected_docs.to_excel(writer, sheet_name="문서선택", index=False)

    return excel_path

def list_saved_projects():
    items = []

    for file_path in sorted(PROJECT_DIR.glob("*.json"), reverse=True):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                payload = json.load(f)

            items.append({
                "project_key": payload.get("project_key", file_path.stem),
                "save_status": payload.get("save_status", "draft"),
                "saved_at": payload.get("saved_at", ""),
                "file_path": str(file_path),
            })
        except Exception as e:
            print(f"[WARN] 프로젝트 목록 읽기 실패: {file_path} / {e}")

    return items


def load_project(file_path: str):
    with open(file_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    data = payload.get("data", {})

    for key, value in data.items():
        st.session_state[key] = value

    # 🔥 여기에 넣어야 함 (for문 밖)
    st.session_state["BUSINESS_LOCATION_MAP_FILE"] = None
    st.session_state["INSTALL_LAYOUT_FILE"] = None
    st.session_state["photo_inputs"] = {}

    return payload

def build_site_facility_status_supported():
    rows = []
    for p in support_preventions():
        outlet_no = p.get("outlet_no", "")

        linked_emissions = [
            x for x in support_emissions()
            if x.get("outlet_no") == outlet_no and not x.get("is_exempt")
        ]

        if not linked_emissions:
            continue

        for e in linked_emissions:
            rows.append(
                {
                    "OUTLET_NO": outlet_no,
                    "EMISSION_FACILITY_NO": e.get("facility_no", ""),
                    "EMISSION_FACILITY_NAME": e.get("facility_name", ""),
                    "EMISSION_CAPACITY": f'{e.get("capacity", "")}{e.get("unit", "")}',
                    "EMISSION_QTY": 1,
                    "PREVENTION_FACILITY_NO": p.get("facility_no", ""),
                    "PREVENTION_METHOD": normalize_prevention_name(
                        p.get("facility_name", "")
                    ),
                    "PREVENTION_CAPACITY": f'{p.get("capacity", "")}{p.get("unit", "")}',
                    "PREVENTION_QTY": 1,
                }
            )
    return rows


def build_project_device_text(site_facility_status: List[Dict[str, Any]]) -> str:
    emission_parts = []
    prevention_parts = []

    seen_emissions = set()
    seen_preventions = set()

    for row in site_facility_status:
        emission_no = row.get("EMISSION_FACILITY_NO", "").strip()
        emission_name = row.get("EMISSION_FACILITY_NAME", "").strip()
        emission_capacity = row.get("EMISSION_CAPACITY", "").strip()

        emission_key = (emission_no, emission_name, emission_capacity)
        if emission_key not in seen_emissions:
            seen_emissions.add(emission_key)
            emission_parts.append(
                f"({emission_no}) {emission_name}({emission_capacity})*1"
            )

        prevention_no = row.get("PREVENTION_FACILITY_NO", "").strip()
        prevention_name = row.get("PREVENTION_METHOD", "").strip()
        prevention_capacity = row.get("PREVENTION_CAPACITY", "").strip()

        prevention_key = (prevention_no, prevention_name, prevention_capacity)
        if prevention_key not in seen_preventions:
            seen_preventions.add(prevention_key)
            prevention_parts.append(
                f"({prevention_no}) {prevention_name}({prevention_capacity})*1"
            )

    parts = emission_parts + prevention_parts
    return ", ".join(parts)


def compute_install_items():
    preventions = support_preventions()

    per_prevention_rows = []
    install_items_map = {}

    for idx, p in enumerate(preventions, start=1):
        method = p.get("facility_name", "")
        outlet_no = p.get("outlet_no", "")
        linked_emissions = find_emissions_by_outlet(outlet_no)
        emission_count = len(linked_emissions)

        row_map = {
            "전류계(세정/전기시설)": 0,
            "차압계(압력계)": 0,
            "온도계": 0,
            "ph계": 0,
            "전류계(배출시설)": emission_count,
            "전류계(방지시설)": 0,
            "IoT게이트웨이": 0,
            "IoT게이트웨이(복수형)": 0,
            "VPN": 0,
        }

        for sensor_name, qty in PREVENTION_SENSOR_RULES.get(method, []):
            row_map[sensor_name] = qty

        overrides = st.session_state.get("sensor_qty_overrides", {})
        for sensor_name in list(row_map.keys()):
            override_key = f"{sensor_name}_{idx-1}"
            if override_key in overrides:
                row_map[sensor_name] = overrides[override_key]

        per_prevention_rows.append(
            {
                "prevention_label": f"방지{idx}",
                "prevention_no": idx,
                "prevention_method": method,
                "outlet_no": outlet_no,
                "sensor_qty_map": row_map,
            }
        )

    prevention_count = len(preventions)

    if prevention_count == 1 and per_prevention_rows:
        per_prevention_rows[0]["sensor_qty_map"]["IoT게이트웨이"] = 1
        per_prevention_rows[0]["sensor_qty_map"]["VPN"] = 1
    elif prevention_count >= 2 and per_prevention_rows:
        per_prevention_rows[0]["sensor_qty_map"]["IoT게이트웨이(복수형)"] = 1
        per_prevention_rows[0]["sensor_qty_map"]["VPN"] = 1

    sensor_rows = []
    for sensor_name, unit_price in SENSOR_UNIT_PRICE.items():
        total_qty = 0
        prevention_qtys = []

        for row in per_prevention_rows:
            qty = row["sensor_qty_map"].get(sensor_name, 0)
            prevention_qtys.append(qty)
            total_qty += qty

        sensor_rows.append(
            {
                "ITEM_NAME": sensor_name,
                "ITEM_UNIT_PRICE": unit_price,
                "ITEM_QTY": total_qty,
                "ITEM_AMOUNT": unit_price * total_qty,
                "prevention_qtys": prevention_qtys,
                "basis_text": st.session_state.sensor_basis.get(sensor_name, ""),
            }
        )

        if total_qty > 0:
            install_items_map[sensor_name] = {
                "ITEM_NAME": sensor_name,
                "ITEM_UNIT_PRICE": unit_price,
                "ITEM_QTY": total_qty,
                "ITEM_AMOUNT": unit_price * total_qty,
            }

    install_items = list(install_items_map.values())
    total_cost = sum(x["ITEM_AMOUNT"] for x in install_items)

    return per_prevention_rows, sensor_rows, install_items, total_cost


def build_prevention_sections(project_key: str):
    sections = []
    preventions = support_preventions()

    for idx, p in enumerate(preventions, start=1):
        outlet_no = p.get("outlet_no", "")
        linked_emissions = find_emissions_by_outlet(outlet_no)
        image_group = st.session_state.photo_inputs.get(f"prevention_{idx}", {})

        prevention_method = normalize_prevention_name(
            p.get("facility_name", "")
        )

        common_images = {
            "overview": image_group.get("common_overview"),
            "gw_location": image_group.get("common_gw_location"),
            "fan_ctrl_panel_out": image_group.get("common_fan_ctrl_out"),
            "fan_ctrl_panel_in": image_group.get("common_fan_ctrl_in"),
        }

        detail_images = {
            "temp_location": image_group.get("detail_temp"),
            "dp_in_location": image_group.get("detail_dp_in"),
            "dp_out_location": image_group.get("detail_dp_out"),
            "pump_ctrl_panel_out": image_group.get("detail_pump_out"),
            "pump_ctrl_panel_in": image_group.get("detail_pump_in"),
            "hv_ctrl_panel_out": image_group.get("detail_hv_out"),
            "hv_ctrl_panel_in": image_group.get("detail_hv_in"),
            "ph_location": image_group.get("detail_ph"),
        }

        emissions = []
        for em_idx, e in enumerate(linked_emissions, start=1):
            em_group = image_group.get(f"emission_{em_idx}", {})
            emissions.append(
                {
                    "emission_name": f"({e.get('facility_no','')}) {e.get('facility_name','')}",
                    "emission_capacity": f'{e.get("capacity", "")}{e.get("unit", "")}',
                    "overview": em_group.get("overview"),
                }
            )

        sections.append(
            {
                "prevention_name": f"({p.get('facility_no', '')}) {prevention_method}",
                "prevention_method": prevention_method,
                "prevention_capacity": f'{p.get("capacity", "")}{p.get("unit", "")}',
                "common_images": common_images,
                "detail_images": detail_images,
                "emissions": emissions,
                "emission_ctrl_panel_out": image_group.get("emission_ctrl_panel_out"),
                "emission_ctrl_panel_in": image_group.get("emission_ctrl_panel_in"),
            }
        )

    return sections


# =========================
# 상태 초기화
# =========================
def init_state():
    defaults = {
        "menu": "사업장 정보",
        "project_search": "",
        "selected_docs": [],
        "subsidy_ratio": 60,
        "self_ratio": 40,
        "photo_inputs": {},
        "sensor_basis": dict(SENSOR_BASIS_DEFAULT),
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

    if "pollutants" not in st.session_state:
        st.session_state.pollutants = [{"type": "", "amount": ""}]

    if "emission_facilities" not in st.session_state:
        st.session_state.emission_facilities = [
            {
                "outlet_no": "1",
                "facility_no": "배1",
                "facility_name": "",
                "capacity": "",
                "unit": "㎥/분",
                "is_supported": True,
                "is_exempt": False,
            }
        ]

    if "prevention_facilities" not in st.session_state:
        st.session_state.prevention_facilities = [
            {
                "outlet_no": "1",
                "facility_no": "방1",
                "facility_name": PREVENTION_METHOD_OPTIONS[0],
                "capacity": "",
                "unit": "㎥/분",
                "install_date": "",
                "is_supported": True,
            }
        ]


# =========================
# 사업장 정보 탭
# =========================
def render_business_tab():
    st.subheader("사업장 정보")

    # 좌우 2열
    col_left, col_right = st.columns(2)

    # -------------------------
    # Section 1. 사업장 기본정보
    # -------------------------
    with col_left:
        st.markdown("### Section 1. 사업장 기본정보")

        c1, c2 = st.columns(2)

        with c1:
            st.text_input("사업장 명", key="BUSINESS_NAME")
            st.text_input("사업자 등록번호", key="BUSINESS_LICENSE_NUMBER")
            st.text_input("사업장 주소", key="BUSINESS_ADDRESS")

            # 소재지 자동
            address = st.session_state.get("BUSINESS_ADDRESS", "")
            location = safe_location_from_address(address)
            st.text_input("사업장 소재지", value=location, disabled=True)

            st.text_input("업종", key="BUSINESS_TYPE")
            st.text_input("종 수", key="BUSINESS_TYPE_NUMBER", placeholder="예: 5종")

            st.text_input("주 생산품", key="BUSINESS_MAIN_PRODUCT")

        with c2:
            st.text_input("대표번호(전화)", key="BUSINESS_PHONE", placeholder="02-564-3772")
            st.text_input("대표번호(팩스)", key="BUSINESS_FAX", placeholder="02-564-0222")
            st.text_input("대표 메일주소", key="BUSINESS_MAIL_ADDRESS")

            st.text_input("대표자명", key="BUSINESS_CEO_NAME")
            st.text_input("대표자 생년월일", key="CEO_BIRTHDAY_DATE", placeholder="1999-05-10")

            st.text_input("담당자명", key="BUSINESS_CONTACT_NAME")
            st.text_input("담당자 연락처", key="BUSINESS_CONTACT_PHONE", placeholder="010-7402-3772")

            for idx, row in enumerate(st.session_state.pollutants):
                p1, p2, p3 = st.columns([4, 4, 1])

                with p1:
                    row["type"] = st.text_input(
                        f"오염물질 종류_{idx}",
                        row.get("type", ""),
                        label_visibility="collapsed",
                        placeholder="오염물질 종류",
                    )

                with p2:
                    row["amount"] = st.text_input(
                        f"오염물질 발생양_{idx}",
                        row.get("amount", ""),
                        label_visibility="collapsed",
                        placeholder="오염물질 발생양",
                    )

                with p3:
                    if st.button("−", key=f"del_pollutant_{idx}") and len(st.session_state.pollutants) > 1:
                        st.session_state.pollutants.pop(idx)
                        st.rerun()

            if st.button("+ 오염물질 추가"):
                st.session_state.pollutants.append({"type": "", "amount": ""})
                st.rerun()

    # -------------------------
    # Section 2. 사업장 부가정보
    # -------------------------
    with col_right:
        st.markdown("### Section 2. 사업장 부가정보")

        c1, c2 = st.columns(2)

        with c1:
            st.text_input("최근 자가측정일", key="MEASURE_DATE", placeholder="1999-05-10")

            uploaded_map = st.file_uploader("사업장 위치도", key="BUSINESS_LOCATION_MAP_FILE")

            st.text_input("지원사업 신청일자", key="DOCUMENT_DATE", placeholder="1999-05-10")
            st.text_input("지원사업 관할기관", key="MUNICIPALITY_OFFICE_NAME", placeholder="(재)경기환경에너지진흥원")

        with c2:
            # 기존 key 바꿔
            uploaded_layout = st.file_uploader("설치 배치도", key="INSTALL_LAYOUT_FILE_UPLOAD")

            if uploaded_layout:
                project_key = get_project_key()
                upload_subdir = UPLOAD_DIR / project_key / "attachments"
                saved_path = save_uploaded_file(uploaded_layout, upload_subdir)

                st.session_state["INSTALL_LAYOUT_FILE"] = saved_path


# =========================
# 시설 정보 탭
# =========================
def render_emission_section():
    st.markdown("### Section 1. 배출시설")
    header = st.columns([1.1, 1.1, 2, 1.2, 1.2, 1.2, 1, 1])
    titles = ["배출구", "시설번호", "시설이름", "용량", "단위", "지원대상", "면제", "삭제"]
    for c, t in zip(header, titles):
        c.markdown(f"**{t}**")

    delete_idx = None
    for idx, row in enumerate(st.session_state.emission_facilities):
        if not row.get("outlet_no"):
            row["outlet_no"] = str(idx + 1)
        if not row.get("facility_no"):
            row["facility_no"] = get_default_emission_no(idx)

        cols = st.columns([1.1, 1.1, 2, 1.2, 1.2, 1.2, 1, 1])
        row["outlet_no"] = cols[0].text_input(
            f"em_outlet_{idx}",
            row["outlet_no"],
            label_visibility="collapsed"
        )
        row["facility_no"] = cols[1].text_input(
            f"em_no_{idx}",
            row["facility_no"],
            label_visibility="collapsed"
        )
        row["facility_name"] = cols[2].text_input(
            f"em_name_{idx}",
            row["facility_name"],
            label_visibility="collapsed"
        )
        row["capacity"] = cols[3].text_input(
            f"em_cap_{idx}",
            row["capacity"],
            label_visibility="collapsed"
        )
        row["unit"] = cols[4].selectbox(
            f"em_unit_{idx}",
            UNIT_OPTIONS,
            index=UNIT_OPTIONS.index(row["unit"]) if row["unit"] in UNIT_OPTIONS else 0,
            label_visibility="collapsed"
        )
        row["is_supported"] = cols[5].checkbox(
            "지원",
            value=row["is_supported"],
            key=f"em_support_{idx}",
            label_visibility="collapsed"
        )
        row["is_exempt"] = cols[6].checkbox(
            "면제",
            value=row["is_exempt"],
            key=f"em_exempt_{idx}",
            label_visibility="collapsed"
        )
        if cols[7].button("🗑", key=f"del_em_{idx}"):
            delete_idx = idx

    if delete_idx is not None and len(st.session_state.emission_facilities) > 1:
        st.session_state.emission_facilities.pop(delete_idx)
        st.rerun()

    if st.button("+ 배출시설 행 추가"):
        next_idx = len(st.session_state.emission_facilities)
        st.session_state.emission_facilities.append(
            {
                "outlet_no": str(next_idx + 1),
                "facility_no": get_default_emission_no(next_idx),
                "facility_name": "",
                "capacity": "",
                "unit": "㎥/분",
                "is_supported": True,
                "is_exempt": False,
            }
        )
        st.rerun()


def render_prevention_section():
    st.markdown("### Section 2. 방지시설")
    header = st.columns([1.1, 1.1, 2.2, 1.2, 1.2, 1.5, 1.2, 1])
    titles = ["배출구", "시설번호", "시설종류", "용량", "단위", "설치일자", "지원대상", "삭제"]
    for c, t in zip(header, titles):
        c.markdown(f"**{t}**")

    delete_idx = None
    for idx, row in enumerate(st.session_state.prevention_facilities):
        if not row.get("outlet_no"):
            row["outlet_no"] = str(idx + 1)
        if not row.get("facility_no"):
            row["facility_no"] = get_default_prevention_no(idx)

        cols = st.columns([1.1, 1.1, 2.2, 1.2, 1.2, 1.5, 1.2, 1])
        row["outlet_no"] = cols[0].text_input(
            f"pr_outlet_{idx}",
            row["outlet_no"],
            label_visibility="collapsed"
        )
        row["facility_no"] = cols[1].text_input(
            f"pr_no_{idx}",
            row["facility_no"],
            label_visibility="collapsed"
        )
        row["facility_name"] = cols[2].selectbox(
            f"pr_name_{idx}",
            PREVENTION_METHOD_OPTIONS,
            index=PREVENTION_METHOD_OPTIONS.index(row["facility_name"]) if row["facility_name"] in PREVENTION_METHOD_OPTIONS else 0,
            label_visibility="collapsed",
        )
        row["capacity"] = cols[3].text_input(
            f"pr_cap_{idx}",
            row["capacity"],
            label_visibility="collapsed"
        )
        row["unit"] = cols[4].selectbox(
            f"pr_unit_{idx}",
            UNIT_OPTIONS,
            index=UNIT_OPTIONS.index(row["unit"]) if row["unit"] in UNIT_OPTIONS else 0,
            label_visibility="collapsed"
        )
        row["install_date"] = cols[5].text_input(
            f"pr_date_{idx}",
            row["install_date"],
            label_visibility="collapsed"
        )
        row["is_supported"] = cols[6].checkbox(
            "지원",
            value=row["is_supported"],
            key=f"pr_support_{idx}",
            label_visibility="collapsed"
        )
        if cols[7].button("🗑", key=f"del_pr_{idx}"):
            delete_idx = idx

    if delete_idx is not None and len(st.session_state.prevention_facilities) > 1:
        st.session_state.prevention_facilities.pop(delete_idx)
        st.rerun()

    if st.button("+ 방지시설 행 추가"):
        next_idx = len(st.session_state.prevention_facilities)
        st.session_state.prevention_facilities.append(
            {
                "outlet_no": str(next_idx + 1),
                "facility_no": get_default_prevention_no(next_idx),
                "facility_name": PREVENTION_METHOD_OPTIONS[0],
                "capacity": "",
                "unit": "㎥/분",
                "install_date": "",
                "is_supported": True,
            }
        )
        st.rerun()


def render_site_facility_status_section():
    st.markdown("### Section 3. 지원사업 신청대상 시설정보")

    rows = build_site_facility_status_supported()
    if not rows:
        st.info("지원대상 배출시설/방지시설을 입력하면 자동 산출된다.")
        return

    display_rows = []
    for row in rows:
        display_rows.append({
            "배출구": row.get("OUTLET_NO", ""),
            "배출시설 번호": row.get("EMISSION_FACILITY_NO", ""),
            "배출시설명": row.get("EMISSION_FACILITY_NAME", ""),
            "배출시설 용량": row.get("EMISSION_CAPACITY", ""),
            "배출시설 수량": row.get("EMISSION_QTY", ""),
            "방지시설 번호": row.get("PREVENTION_FACILITY_NO", ""),
            "방지시설 종류": row.get("PREVENTION_METHOD", ""),
            "방지시설 용량": row.get("PREVENTION_CAPACITY", ""),
            "방지시설 수량": row.get("PREVENTION_QTY", ""),
        })

    st.dataframe(display_rows, use_container_width=True)


def render_photo_upload_section():
    st.markdown("### Section 4. 사진 첨부")

    project_key = build_project_name(
        str(st.session_state.get("DOCUMENT_DATE", ""))[:4][-2:] if st.session_state.get("DOCUMENT_DATE", "") else "YY",
        st.session_state.get("BUSINESS_NAME", ""),
        st.session_state.get("BUSINESS_LOCATION", ""),
    )
    base_dir = UPLOAD_DIR / project_key / "photos"

    preventions = support_preventions()
    if not preventions:
        st.info("지원대상 방지시설을 입력하면 사진 첨부 영역이 생성된다.")
        return

    for idx, p in enumerate(preventions, start=1):
        outlet_no = p.get("outlet_no", "")
        method = p.get("facility_name", "")
        facility_no = p.get("facility_no", "")

        st.markdown(f"#### 방지시설 {idx} / {facility_no} / {method} / 배출구 {outlet_no}")

        st.session_state.photo_inputs.setdefault(f"prevention_{idx}", {})
        pdir = base_dir / f"prevention_{idx}"

        col1, col2, col3 = st.columns(3)

        # -------------------------
        # 1열: ○ 방지시설 ○
        # -------------------------
        with col1:
            st.markdown("##### ○ 방지시설 ○")

            f = st.file_uploader(
                "방지시설 전경",
                type=["png", "jpg", "jpeg"],
                key=f"p{idx}_common_1",
                label_visibility="visible",
            )
            if f:
                st.session_state.photo_inputs[f"prevention_{idx}"]["common_overview"] = save_uploaded_file(f, pdir)

            f = st.file_uploader(
                "GATE WAY 설치 위치",
                type=["png", "jpg", "jpeg"],
                key=f"p{idx}_common_2",
                label_visibility="visible",
            )
            if f:
                st.session_state.photo_inputs[f"prevention_{idx}"]["common_gw_location"] = save_uploaded_file(f, pdir)

            f = st.file_uploader(
                "송풍전류계 제어판넬 외함",
                type=["png", "jpg", "jpeg"],
                key=f"p{idx}_common_3",
                label_visibility="visible",
            )
            if f:
                st.session_state.photo_inputs[f"prevention_{idx}"]["common_fan_ctrl_out"] = save_uploaded_file(f, pdir)

            f = st.file_uploader(
                "송풍전류계 제어판넬 내부",
                type=["png", "jpg", "jpeg"],
                key=f"p{idx}_common_4",
                label_visibility="visible",
            )
            if f:
                st.session_state.photo_inputs[f"prevention_{idx}"]["common_fan_ctrl_in"] = save_uploaded_file(f, pdir)

        # -------------------------
        # 2열: ○ 방지시설 상세 ○
        # -------------------------
        with col2:
            st.markdown("##### ○ 방지시설 상세 ○")

            if method in [
                "여과집진시설",
                "흡착에 의한 시설",
                "여과 및 흡착에 의한 시설",
            ]:
                f = st.file_uploader(
                    "온도계 설치 위치",
                    type=["png", "jpg", "jpeg"],
                    key=f"p{idx}_detail_temp",
                )
                if f:
                    st.session_state.photo_inputs[f"prevention_{idx}"]["detail_temp"] = save_uploaded_file(f, pdir)

                f = st.file_uploader(
                    "차압계 IN 설치 위치",
                    type=["png", "jpg", "jpeg"],
                    key=f"p{idx}_detail_dpin",
                )
                if f:
                    st.session_state.photo_inputs[f"prevention_{idx}"]["detail_dp_in"] = save_uploaded_file(f, pdir)

                f = st.file_uploader(
                    "차압계 OUT 설치 위치",
                    type=["png", "jpg", "jpeg"],
                    key=f"p{idx}_detail_dpout",
                )
                if f:
                    st.session_state.photo_inputs[f"prevention_{idx}"]["detail_dp_out"] = save_uploaded_file(f, pdir)

            elif method == "세정집진시설":
                f = st.file_uploader(
                    "펌프전류계 제어판넬 외함",
                    type=["png", "jpg", "jpeg"],
                    key=f"p{idx}_detail_pump_out",
                )
                if f:
                    st.session_state.photo_inputs[f"prevention_{idx}"]["detail_pump_out"] = save_uploaded_file(f, pdir)

                f = st.file_uploader(
                    "펌프전류계 제어판넬 내부",
                    type=["png", "jpg", "jpeg"],
                    key=f"p{idx}_detail_pump_in",
                )
                if f:
                    st.session_state.photo_inputs[f"prevention_{idx}"]["detail_pump_in"] = save_uploaded_file(f, pdir)

            elif method == "전기집진시설":
                f = st.file_uploader(
                    "고압전류계 제어판넬 외함",
                    type=["png", "jpg", "jpeg"],
                    key=f"p{idx}_detail_hv_out",
                )
                if f:
                    st.session_state.photo_inputs[f"prevention_{idx}"]["detail_hv_out"] = save_uploaded_file(f, pdir)

                f = st.file_uploader(
                    "고압전류계 제어판넬 내부",
                    type=["png", "jpg", "jpeg"],
                    key=f"p{idx}_detail_hv_in",
                )
                if f:
                    st.session_state.photo_inputs[f"prevention_{idx}"]["detail_hv_in"] = save_uploaded_file(f, pdir)

            elif method == "흡수에 의한 시설":
                f = st.file_uploader(
                    "pH계 설치 위치",
                    type=["png", "jpg", "jpeg"],
                    key=f"p{idx}_detail_ph",
                )
                if f:
                    st.session_state.photo_inputs[f"prevention_{idx}"]["detail_ph"] = save_uploaded_file(f, pdir)

                f = st.file_uploader(
                    "펌프전류계 제어판넬 외함",
                    type=["png", "jpg", "jpeg"],
                    key=f"p{idx}_detail_pump_out",
                )
                if f:
                    st.session_state.photo_inputs[f"prevention_{idx}"]["detail_pump_out"] = save_uploaded_file(f, pdir)

                f = st.file_uploader(
                    "펌프전류계 제어판넬 내부",
                    type=["png", "jpg", "jpeg"],
                    key=f"p{idx}_detail_pump_in",
                )
                if f:
                    st.session_state.photo_inputs[f"prevention_{idx}"]["detail_pump_in"] = save_uploaded_file(f, pdir)

        # -------------------------
        # 3열: ○ 배출시설 ○
        # -------------------------
        with col3:
            st.markdown("##### ○ 배출시설 ○")

            emissions = find_emissions_by_outlet(outlet_no)

            for em_idx, e in enumerate(emissions, start=1):
                em_facility_no = e.get("facility_no", "")
                em_facility_name = e.get("facility_name", "")

                st.session_state.photo_inputs[f"prevention_{idx}"].setdefault(f"emission_{em_idx}", {})
                edir = pdir / f"emission_{em_idx}"

                f = st.file_uploader(
                    f"배출시설 전경 ({em_facility_no} / {em_facility_name})",
                    type=["png", "jpg", "jpeg"],
                    key=f"p{idx}_e{em_idx}_overview",
                )
                if f:
                    st.session_state.photo_inputs[f"prevention_{idx}"][f"emission_{em_idx}"]["overview"] = save_uploaded_file(f, edir)

            if emissions:
                f = st.file_uploader(
                    "배출 제어판넬 외함",
                    type=["png", "jpg", "jpeg"],
                    key=f"p{idx}_emission_ctrl_out",
                )
                if f:
                    st.session_state.photo_inputs[f"prevention_{idx}"]["emission_ctrl_panel_out"] = save_uploaded_file(f, pdir)

                f = st.file_uploader(
                    "배출 제어판넬 내부",
                    type=["png", "jpg", "jpeg"],
                    key=f"p{idx}_emission_ctrl_in",
                )
                if f:
                    st.session_state.photo_inputs[f"prevention_{idx}"]["emission_ctrl_panel_in"] = save_uploaded_file(f, pdir)

        st.divider()


def render_facility_tab():
    st.subheader("시설 정보")
    render_emission_section()
    st.markdown("---")
    render_prevention_section()
    st.markdown("---")
    render_site_facility_status_section()
    st.markdown("---")
    render_photo_upload_section()


# =========================
# 지원사업 신청 정보 탭
# =========================
def render_amount_section(total_cost: int):
    st.markdown("### Section 1. 지원사업 금액")

    if "subsidy_ratio" not in st.session_state:
        st.session_state["subsidy_ratio"] = 60
    if "self_ratio" not in st.session_state:
        st.session_state["self_ratio"] = 40

    total_cost = int(st.session_state.get("TOTAL_COST", total_cost))

    national, self_burden = calc_subsidy(
        total_cost,
        int(st.session_state.get("subsidy_ratio", 60)),
        int(st.session_state.get("self_ratio", 40)),
    )

    c1, c2, c3, c4, c5 = st.columns([1.4, 1, 1.2, 1, 1.2])

    with c1:
        st.text_input("사업비 총 금액", value=f"{total_cost:,}", disabled=True)

    with c2:
        st.number_input(
            "지원금 비율(%)",
            min_value=0,
            max_value=100,
            step=1,
            value=int(st.session_state.get("subsidy_ratio", 60)),
            key="subsidy_ratio",
        )

    with c3:
        st.text_input("지원금 금액", value=f"{national:,}", disabled=True)

    with c4:
        st.number_input(
            "자부담 비율(%)",
            min_value=0,
            max_value=100,
            step=1,
            value=int(st.session_state.get("self_ratio", 40)),
            key="self_ratio",
        )

    with c5:
        st.text_input("자부담 금액", value=f"{self_burden:,}", disabled=True)


def render_sensor_section(per_prevention_rows, sensor_rows):
    st.markdown("### Section 2. 센서 종류 및 수량")

    prevention_headers = [x["prevention_label"] for x in per_prevention_rows]
    header_cols = ["센서명", "센서단가", "총 수량"] + prevention_headers + ["측정기기 부착근거"]

    widths = [1.6, 1.0, 0.9] + [0.8] * len(prevention_headers) + [3.2]

    cols = st.columns(widths)
    for c, h in zip(cols, header_cols):
        c.markdown(f"**{h}**")

    st.session_state.setdefault("sensor_qty_overrides", {})

    for row_idx, row in enumerate(sensor_rows):
        row_cols = st.columns(widths)
        row_cols[0].write(row["ITEM_NAME"])
        row_cols[1].write(f"{row['ITEM_UNIT_PRICE']:,}")

        qty_values = []
        for idx, default_qty in enumerate(row["prevention_qtys"]):
            qty_key = f"{row['ITEM_NAME']}_{idx}"
            saved_qty = st.session_state["sensor_qty_overrides"].get(qty_key, default_qty)

            qty = row_cols[3 + idx].number_input(
                f"{qty_key}",
                min_value=0,
                step=1,
                value=int(saved_qty),
                label_visibility="collapsed",
                key=f"sensor_qty_{qty_key}",
            )
            st.session_state["sensor_qty_overrides"][qty_key] = qty
            qty_values.append(qty)

        total_qty = sum(qty_values)
        row_cols[2].write(str(total_qty))

        basis_key = f"basis_{row['ITEM_NAME']}"
        st.session_state.sensor_basis[row["ITEM_NAME"]] = row_cols[-1].text_input(
            basis_key,
            value=st.session_state.sensor_basis.get(row["ITEM_NAME"], ""),
            label_visibility="collapsed",
            placeholder="부착근거",
        )

        row["prevention_qtys"] = qty_values
        row["ITEM_QTY"] = total_qty
        row["ITEM_AMOUNT"] = row["ITEM_UNIT_PRICE"] * total_qty


def render_document_option_section():
    st.markdown("### Section 3. 문서 생성")

    if "daejin_generated_file" not in st.session_state:
        st.session_state["daejin_generated_file"] = None
    if "energy_generated_file" not in st.session_state:
        st.session_state["energy_generated_file"] = None
    if "certificate_generated_file" not in st.session_state:
        st.session_state["certificate_generated_file"] = None

    c1, c2, c3, c4, c5, c6 = st.columns([1.4, 1, 1.4, 1, 1.2, 1])

    with c1:
        if st.button("대진테크노파크", type="primary", use_container_width=True):
            project_data = collect_project_data()

            temp_dir = Path(tempfile.mkdtemp(prefix="dxg_merge_"))
            try:
                result = generate_documents(project_data, DAEJIN_ORDER, output_dir=temp_dir)

                patch_docxcompose_sha1()

                merged_filename = build_submission_filename("daejin")
                merged_file = generate_merged_document(result, merged_filename)

                if merged_file and Path(merged_file).exists():
                    st.session_state["daejin_generated_file"] = merged_file
                else:
                    st.session_state["daejin_generated_file"] = None
                    st.error("대진테크노파크 합본 생성 실패")
            finally:
                shutil.rmtree(temp_dir, ignore_errors=True)

    with c2:
        if st.session_state.get("daejin_generated_file") and Path(st.session_state["daejin_generated_file"]).exists():
            with open(st.session_state["daejin_generated_file"], "rb") as f:
                st.download_button(
                    label="다운로드",
                    data=f,
                    file_name=Path(st.session_state["daejin_generated_file"]).name,
                    mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    key="download_daejin_merged",
                    use_container_width=True,
                )
            st.success("생성완료")
        else:
            st.button("생성대기", key="daejin_pending", disabled=True, use_container_width=True)

    with c3:
        if st.button("에너지진흥원", type="primary", use_container_width=True):
            project_data = collect_project_data()

            temp_dir = Path(tempfile.mkdtemp(prefix="dxg_merge_"))
            try:
                result = generate_documents(project_data, ENERGY_ORDER, output_dir=temp_dir)

                patch_docxcompose_sha1()

                merged_filename = build_submission_filename("energy")
                merged_file = generate_merged_document(result, merged_filename)

                if merged_file and Path(merged_file).exists():
                    st.session_state["energy_generated_file"] = merged_file
                else:
                    st.session_state["energy_generated_file"] = None
                    st.error("에너지진흥원 합본 생성 실패")
            finally:
                shutil.rmtree(temp_dir, ignore_errors=True)

    with c4:
        if st.session_state.get("energy_generated_file") and Path(st.session_state["energy_generated_file"]).exists():
            with open(st.session_state["energy_generated_file"], "rb") as f:
                st.download_button(
                    label="다운로드",
                    data=f,
                    file_name=Path(st.session_state["energy_generated_file"]).name,
                    mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    key="download_energy_merged",
                    use_container_width=True,
                )
            st.success("생성완료")
        else:
            st.button("생성대기", key="energy_pending", disabled=True, use_container_width=True)

    with c5:
        if st.button("성적서 PDF", type="primary", use_container_width=True):
            project_data = collect_project_data()
            output_path = Path("outputs") / build_certificate_filename()

            result = generate_certificate_pdf(project_data, output_path)

            missing = result.get("missing_files", [])
            if missing:
                st.warning(f"일부 성적서를 찾지 못함: {', '.join(missing)}")

            if output_path.exists():
                st.session_state["certificate_generated_file"] = str(output_path)
            else:
                st.session_state["certificate_generated_file"] = None
                st.error("성적서 PDF 생성 실패")

    with c6:
        if st.session_state.get("certificate_generated_file") and Path(st.session_state["certificate_generated_file"]).exists():
            with open(st.session_state["certificate_generated_file"], "rb") as f:
                st.download_button(
                    label="다운로드",
                    data=f,
                    file_name=Path(st.session_state["certificate_generated_file"]).name,
                    mime="application/pdf",
                    key="download_certificate_pdf",
                    use_container_width=True,
                )
            st.success("생성완료")
        else:
            st.button("생성대기", key="certificate_pending", disabled=True, use_container_width=True)


from core.calculator import calculate_application

def render_application_tab():
    st.subheader("지원사업 신청정보")

    amount_placeholder = st.container()
    st.markdown("---")

    project_data = collect_project_data()
    calc_result = calculate_application(project_data)

    per_prevention_rows = calc_result["prevention_subtotals"]
    sensor_rows = calc_result["sensor_rows"]
    recalculated_total_cost = int(calc_result["total_cost"])

    render_sensor_section(per_prevention_rows, sensor_rows)

    st.session_state["TOTAL_COST"] = recalculated_total_cost

    st.markdown("---")

    with amount_placeholder:
        render_amount_section(recalculated_total_cost)

    st.markdown("---")
    render_document_option_section()


# =========================
# 데이터 수집
# =========================
def collect_project_data():
    project_key = build_project_name(
        str(st.session_state.get("DOCUMENT_DATE", ""))[:4][-2:] if st.session_state.get("DOCUMENT_DATE", "") else "YY",
        st.session_state.get("BUSINESS_NAME", ""),
        st.session_state.get("BUSINESS_LOCATION", ""),
    )

    raw_data = {
        "business_name": st.session_state.get("BUSINESS_NAME", ""),
        "document_date": st.session_state.get("DOCUMENT_DATE", ""),
        "subsidy_ratio": int(st.session_state.get("subsidy_ratio", 60)),
        "self_ratio": int(st.session_state.get("self_ratio", 40)),
        "sensor_qty_overrides": st.session_state.get("sensor_qty_overrides", {}),
        "sensor_basis": dict(st.session_state.get("sensor_basis", {})),
        "pollutants": st.session_state.get("pollutants", []),
        "emission_facilities": st.session_state.get("emission_facilities", []),
        "prevention_facilities": st.session_state.get("prevention_facilities", []),
    }

    calc_result = calculate_application(raw_data)

    total_cost = int(st.session_state.get("TOTAL_COST", calc_result["total_cost"]))
    subsidy_ratio = int(st.session_state.get("subsidy_ratio", 60))
    self_ratio = int(st.session_state.get("self_ratio", 40))
    national, self_burden = calc_subsidy(total_cost, subsidy_ratio, self_ratio)

    prevention_facility_text = build_prevention_facility_text()
    project_device_text_simple = build_project_device_text_simple(calc_result["install_items"])
    prevention_sections = build_prevention_sections(project_key)

    project_data = {
        "fields": {
            "BUSINESS_NAME": st.session_state.get("BUSINESS_NAME", ""),
            "BUSINESS_LICENSE_NUMBER": format_business_license(
                st.session_state.get("BUSINESS_LICENSE_NUMBER", "")
            ),
            "BUSINESS_ADDRESS": st.session_state.get("BUSINESS_ADDRESS", ""),
            "BUSINESS_LOCATION": st.session_state.get("BUSINESS_LOCATION", ""),
            "BUSINESS_TYPE": st.session_state.get("BUSINESS_TYPE", ""),
            "BUSINESS_TYPE_NUMBER": st.session_state.get("BUSINESS_TYPE_NUMBER", ""),
            "BUSINESS_MAIN_PRODUCT": st.session_state.get("BUSINESS_MAIN_PRODUCT", ""),
            "BUSINESS_PHONE": st.session_state.get("BUSINESS_PHONE", ""),
            "BUSINESS_FAX": st.session_state.get("BUSINESS_FAX", ""),
            "BUSINESS_MAIL_ADDRESS": st.session_state.get("BUSINESS_MAIL_ADDRESS", ""),
            "BUSINESS_CEO_NAME": st.session_state.get("BUSINESS_CEO_NAME", ""),
            "CEO_BIRTHDAY_DATE": format_birth_date(
                st.session_state.get("CEO_BIRTHDAY_DATE", "")
            ),
            "BUSINESS_CONTACT_NAME": st.session_state.get("BUSINESS_CONTACT_NAME", ""),
            "BUSINESS_CONTACT_PHONE": st.session_state.get("BUSINESS_CONTACT_PHONE", ""),
            "MEASURE_DATE": st.session_state.get("MEASURE_DATE", ""),
            "DOCUMENT_DATE": format_korean_date(
                st.session_state.get("DOCUMENT_DATE", "")
            ),
            "MUNICIPALITY_OFFICE_NAME": st.session_state.get("MUNICIPALITY_OFFICE_NAME", ""),
            "CONSTRUCTION_START_DATE": st.session_state.get("CONSTRUCTION_START_DATE", ""),
            "CONSTRUCTION_END_DATE": st.session_state.get("CONSTRUCTION_END_DATE", ""),
            "TOTAL_COST": f"{total_cost:,}",
            "NATIONAL_SUBSIDY": f"{national:,}",
            "SELF_BURDEN": f"{self_burden:,}",
            "TOTAL_COST_KR": number_to_korean_money(total_cost),
            "NATIONAL_SUBSIDY_KR": number_to_korean_money(national),
            "SELF_BURDEN_KR": number_to_korean_money(self_burden),
            "PROJECT_DEVICE": calc_result["project_device_text"],
            "CONTRACTOR_NAME": "(주)디엑스지",
            "CONTRACTOR_CONTACT_NAME": USER_NAME,
            "CONTRACTOR_CONTACT_PHONE": "010-0000-0000",
            "DUPLICATE_SUPPORT_YN": "해당없음",
            "BLOCK_PREVENTION_FACILITY": prevention_facility_text,
            "BLOCK_PROJECT_DEVICE": project_device_text_simple,
        },
        "images": {
            "BUSINESS_LOCATION_MAP_FILE": st.session_state.get("BUSINESS_LOCATION_MAP_FILE"),
            "INSTALL_LAYOUT_FILE": st.session_state.get("INSTALL_LAYOUT_FILE"),
        },
        "pollutants": [
            {
                "ITEM_POLLUTANT_TYPE": x.get("type", ""),
                "ITEM_POLLUTANT_AMOUNT": x.get("amount", ""),
            }
            for x in st.session_state.pollutants
            if x.get("type") or x.get("amount")
        ],
        "emission_facilities": st.session_state.emission_facilities,
        "prevention_facilities": [
            {
                "prevention_name": f"{p.get('facility_no', '')} {normalize_prevention_name(p.get('facility_name', ''))}",
                "prevention_method": normalize_prevention_name(p.get("facility_name", "")),
                "prevention_capacity": f'{p.get("capacity", "")}{p.get("unit", "")}',
                "gw_item": None,
                "vpn_item": None,
                "sensors": [],
                **p,
            }
            for p in st.session_state.prevention_facilities
            if p.get("is_supported")
        ],
        "site_facility_status": calc_result["site_facility_status"],
        "install_items": calc_result["install_items"],
        "sensor_basis_items": [
            {
                "ITEM_NAME": row["ITEM_NAME"],
                "BASIS_TEXT": row.get("basis_text", ""),
            }
            for row in calc_result["sensor_rows"]
            if row.get("ITEM_QTY", 0) > 0
        ],
        "prevention_sections": prevention_sections,
    }

    prevention_list = project_data["prevention_facilities"]

    for p_idx, p in enumerate(prevention_list):
        sensors = []

        if len(prevention_list) == 1 and p_idx == 0:
            p["gw_item"] = {
                "ITEM_NAME": "IoT게이트웨이",
                "ITEM_UNIT_PRICE": SENSOR_UNIT_PRICE["IoT게이트웨이"],
                "ITEM_QTY": 1,
                "ITEM_AMOUNT": SENSOR_UNIT_PRICE["IoT게이트웨이"],
            }
            p["vpn_item"] = {
                "ITEM_NAME": "VPN",
                "ITEM_UNIT_PRICE": SENSOR_UNIT_PRICE["VPN"],
                "ITEM_QTY": 1,
                "ITEM_AMOUNT": SENSOR_UNIT_PRICE["VPN"],
            }

        elif len(prevention_list) >= 2 and p_idx == 0:
            p["gw_item"] = {
                "ITEM_NAME": "IoT게이트웨이(복수형)",
                "ITEM_UNIT_PRICE": SENSOR_UNIT_PRICE["IoT게이트웨이(복수형)"],
                "ITEM_QTY": 1,
                "ITEM_AMOUNT": SENSOR_UNIT_PRICE["IoT게이트웨이(복수형)"],
            }
            p["vpn_item"] = {
                "ITEM_NAME": "VPN",
                "ITEM_UNIT_PRICE": SENSOR_UNIT_PRICE["VPN"],
                "ITEM_QTY": 1,
                "ITEM_AMOUNT": SENSOR_UNIT_PRICE["VPN"],
            }

        for sensor_row in calc_result["sensor_rows"]:
            if p_idx < len(sensor_row["prevention_qtys"]):
                qty = sensor_row["prevention_qtys"][p_idx]
                if qty > 0 and sensor_row["ITEM_NAME"] not in ["IoT게이트웨이", "IoT게이트웨이(복수형)", "VPN"]:
                    sensors.append(
                        {
                            "ITEM_NAME": sensor_row["ITEM_NAME"],
                            "ITEM_UNIT_PRICE": sensor_row["ITEM_UNIT_PRICE"],
                            "ITEM_QTY": qty,
                            "ITEM_AMOUNT": sensor_row["ITEM_UNIT_PRICE"] * qty,
                        }
                    )

        p["sensors"] = sensors

    print("DOC_10022 IMAGE PATH =", project_data["images"].get("INSTALL_LAYOUT_FILE"))
    print("DOC_10022 IMAGE TYPE =", type(project_data["images"].get("INSTALL_LAYOUT_FILE")))
    print("DOC_10022 IMAGE EXISTS =", Path(str(project_data["images"].get("INSTALL_LAYOUT_FILE"))).exists() if project_data["images"].get("INSTALL_LAYOUT_FILE") else False)
    return project_data


# =========================
# 공통 UI
# =========================
def render_sidebar():
    st.sidebar.title("DXG IoT 문서 자동화")

    st.sidebar.text_input("🔍 사업장명 / 지역 / 연도 검색", key="project_search")

    st.sidebar.markdown("### 메뉴")
    st.session_state.menu = st.sidebar.radio(
        "",
        ["사업장 정보", "시설 정보", "지원사업 신청 정보"],
        index=["사업장 정보", "시설 정보", "지원사업 신청 정보"].index(st.session_state.menu),
    )

    st.sidebar.markdown("---")

    # =========================
    # 📄 저장 프로젝트 목록 (위로 이동)
    # =========================
    st.sidebar.markdown("### 📄 저장 프로젝트 목록")

    projects = list_saved_projects()

    if projects:
        options = [
            f"[{item['save_status']}] {item['project_key']} / {item['saved_at']}"
            for item in projects
        ]

        selected_label = st.sidebar.selectbox(
            "불러올 프로젝트 선택",
            options,
            key="saved_project_select",
        )

        selected_idx = options.index(selected_label)
        selected_project = projects[selected_idx]

        c1, c2 = st.sidebar.columns(2)

        with c1:
            if st.button("불러오기", key="load_project_btn"):
                load_project(selected_project["file_path"])
                st.sidebar.success(f"불러오기 완료: {selected_project['project_key']}")
                st.rerun()

        with c2:
            if st.button("삭제", key="delete_project_btn"):
                delete_project(selected_project["file_path"])
                st.sidebar.success(f"삭제 완료: {selected_project['project_key']}")
                st.rerun()
    else:
        st.sidebar.info("저장된 프로젝트가 없습니다.")

    st.sidebar.markdown("---")

    # =========================
    # 💾 프로젝트 저장 (버튼 가로 배치)
    # =========================
    st.sidebar.markdown("### 💾 프로젝트 저장")

    c1, c2 = st.sidebar.columns(2)

    with c1:
        if st.button("임시저장"):
            path = save_project("draft")
            st.sidebar.success(f"임시저장 완료\n{path.stem}")

    with c2:
        if st.button("최종저장"):
            path = save_project("final")
            st.sidebar.success(f"최종저장 완료\n{path.stem}")


def render_topbar():
    c1, c2 = st.columns([7, 3])
    yy = str(st.session_state.get("DOCUMENT_DATE", ""))[:4][-2:] if st.session_state.get("DOCUMENT_DATE", "") else "YY"
    location = st.session_state.get("BUSINESS_LOCATION", safe_location_from_address(st.session_state.get("BUSINESS_ADDRESS", "")))
    project_name = build_project_name(yy, st.session_state.get("BUSINESS_NAME", ""), location)

    with c1:
        st.markdown(f"**저장 프로젝트 : {project_name}**")
    with c2:
        st.markdown(f"**사용자 : {USER_NAME}**")


# =========================
# 메인
# =========================
def main():
    init_state()
    render_sidebar()
    render_topbar()
    st.markdown("---")

    if st.session_state.menu == "사업장 정보":
        render_business_tab()
    elif st.session_state.menu == "시설 정보":
        render_facility_tab()
    elif st.session_state.menu == "지원사업 신청 정보":
        render_application_tab()


if __name__ == "__main__":
    main()