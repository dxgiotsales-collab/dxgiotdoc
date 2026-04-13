from pydantic import BaseModel
from typing import Any, Dict
from pathlib import Path
from datetime import datetime
import re
import urllib.parse

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, StreamingResponse

from core.auth import authenticate
from core.project_store import list_saved_projects, save_project, load_project
from core.calculator import calculate_application

from engines.doc_10010_a_engine import generate_doc_10010_a
from engines.doc_10010_b_engine import generate_doc_10010_b
from services.certificate_pdf import generate_certificate_pdf

from fastapi.responses import FileResponse
from pathlib import Path
import tempfile
import shutil
# test

from services.doc_generator import generate_documents, generate_merged_document
from config.merge_orders import DAEJIN_ORDER, ENERGY_ORDER
from config.settings import settings

from fastapi import UploadFile, File, Form
import shutil
import os

from services.certificate_pdf import CERTIFICATES_DIR, save_cert_rules, CERT_RULES, add_certificate, remove_certificate, get_certificates_list


# -------------------------
# Environment / Host selection
# -------------------------
# Set DXG_DOC_API_ENV to "prod" or "ngrok" to choose the allowed host/origin.
# DXG_DOC_API_ENV = os.getenv("DXG_DOC_API_ENV", "ngrok").lower()
# DOC_HOST_OPTIONS = {
#     "ngrok": "essentially-unweldable-faustino.ngrok-free.dev",
#     "prod": "doc.dxg.kr",
# }
# DOC_HOST = DOC_HOST_OPTIONS.get(DXG_DOC_API_ENV, DOC_HOST_OPTIONS["ngrok"])

app = FastAPI(title="DXG DocMaster API")

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        settings.HOST,
        "localhost",
        "127.0.0.1",
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ORIGINS + [
        "https://lovable.dev",
        "https://preview.lovable.dev",
    ],
    allow_origin_regex=r"https://.*\.(lovable\.app|lovableproject\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Type", "Content-Length"],
)


# -------------------------
# Models
# -------------------------
class LoginRequest(BaseModel):
    username: str
    password: str


class SaveProjectRequest(BaseModel):
    project_key: str
    save_status: str
    data: Dict[str, Any]


class CalculateRequest(BaseModel):
    data: Dict[str, Any]


# -------------------------
# Paths
# -------------------------
OUTPUT_DIR = Path("app_data/generated")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TEMPLATE_PATH_10010_A = Path("templates/DOC_10010_A.docx")
TEMPLATE_PATH_10010_B = Path("templates/DOC_10010_B.docx")


# -------------------------
# Helpers
# -------------------------
def _get_base_url(request: Request) -> str:
    """X-Forwarded-* 헤더를 고려한 올바른 base_url 생성"""
    # X-Forwarded-Proto에서 프로토콜 읽기 (기본값: 요청의 scheme)
    proto = request.headers.get("X-Forwarded-Proto", request.url.scheme)
    
    # X-Forwarded-Host에서 호스트 읽기 (기본값: 요청의 host)
    host = request.headers.get("X-Forwarded-Host", request.url.netloc)
    
    # base_url 구성
    base_url = f"{proto}://{host}".rstrip("/")
    return base_url


def _safe_int(value, default=0):
    try:
        if value in (None, "", "-"):
            return default
        if isinstance(value, bool):
            return default
        return int(float(str(value).replace(",", "").strip()))
    except Exception:
        return default


def _safe_str(value):
    if value is None:
        return ""
    return str(value).strip()


def _pick(row: dict, *keys, default=""):
    for key in keys:
        if key in row and row.get(key) not in (None, ""):
            return row.get(key)
    return default


def _format_capacity(capacity, unit):
    cap = _safe_str(capacity)
    unt = _safe_str(unit)
    if cap and unt:
        return f"{cap} {unt}"
    if cap:
        return cap
    return ""


def _parse_date(value):
    if value in (None, ""):
        return None

    if isinstance(value, datetime):
        return value

    text = str(value).strip()
    if not text:
        return None

    candidates = [
        "%Y-%m-%d",
        "%Y.%m.%d",
        "%Y/%m/%d",
        "%Y-%m-%d %H:%M:%S",
        "%Y.%m.%d %H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
    ]

    for fmt in candidates:
        try:
            return datetime.strptime(text, fmt)
        except Exception:
            pass

    digits = re.findall(r"\d+", text)
    if len(digits) >= 3:
        try:
            y, m, d = int(digits[0]), int(digits[1]), int(digits[2])
            return datetime(y, m, d)
        except Exception:
            return None

    return None


def _format_korean_date(value):
    dt = _parse_date(value)
    if not dt:
        return _safe_str(value)
    return f"{dt.year}년 {dt.month}월 {dt.day}일"


_NUM_KOR_DIGITS = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"]
_SMALL_UNITS = ["", "십", "백", "천"]
_LARGE_UNITS = ["", "만", "억", "조", "경"]


def _int_to_korean(num: int) -> str:
    if num == 0:
        return "영"

    result_parts = []
    group_index = 0

    while num > 0:
        group = num % 10000
        num //= 10000

        if group:
            group_text = ""
            for i in range(4):
                digit = group % 10
                group //= 10
                if digit:
                    digit_text = _NUM_KOR_DIGITS[digit]
                    unit_text = _SMALL_UNITS[i]
                    if digit == 1 and i > 0:
                        digit_text = ""
                    group_text = f"{digit_text}{unit_text}{group_text}"
            group_text += _LARGE_UNITS[group_index]
            result_parts.insert(0, group_text)

        group_index += 1

    return "".join(result_parts)


def _amount_to_korean_text(amount: int) -> str:
    amount = _safe_int(amount, 0)
    if amount == 0:
        return "영원"
    return f"{_int_to_korean(amount)}원"


def _normalize_prevention_name(name: str) -> str:
    text = _safe_str(name)
    if text == "여과집진시설 및 흡착에 의한 시설(일체형)":
        return "여과 및 흡착에 의한 시설"
    return text


def _get_outlet_no(row: dict) -> str:
    return _safe_str(_pick(row, "outletNo", "outlet_no", "OUTLET_NO", default=""))


def _get_emission_name(row: dict) -> str:
    return _safe_str(_pick(row, "name", "facility_name", "facilityName", default=""))


def _get_prevention_name(row: dict) -> str:
    raw = _pick(row, "type", "name", "facility_name", "facilityName", default="")
    return _normalize_prevention_name(raw)


def _build_site_facility_status_all(emissions: list[dict], preventions: list[dict]) -> list[dict]:
    rows = []

    for p in preventions:
        outlet_no = _get_outlet_no(p)

        linked_emissions = [
            e for e in emissions
            if _get_outlet_no(e) == outlet_no
        ]

        if not linked_emissions:
            continue

        for e in linked_emissions:
            rows.append(
                {
                    "EMISSION_FACILITY_NAME": _get_emission_name(e),
                    "EMISSION_CAPACITY": _format_capacity(
                        _pick(e, "capacity", default=""),
                        _pick(e, "unit", default=""),
                    ),
                    "EMISSION_QTY": 1,
                    "PREVENTION_METHOD": _get_prevention_name(p),
                    "PREVENTION_CAPACITY": _format_capacity(
                        _pick(p, "capacity", default=""),
                        _pick(p, "unit", default=""),
                    ),
                    "PREVENTION_QTY": 1,
                }
            )

    return rows


def _build_site_facility_status_emissions_only(emissions: list[dict]) -> list[dict]:
    rows = []

    for e in emissions:
        rows.append(
            {
                "EMISSION_FACILITY_NAME": _get_emission_name(e),
                "EMISSION_CAPACITY": _format_capacity(
                    _pick(e, "capacity", default=""),
                    _pick(e, "unit", default=""),
                ),
                "EMISSION_QTY": 1,
            }
        )

    return rows


def _build_pollutants(req: dict) -> list[dict]:
    business = req.get("business", {}) or {}
    pollutants = (
        req.get("pollutants")
        or business.get("pollutants")
        or req.get("project_data", {}).get("pollutants")
        or []
    )

    result = []

    for item in pollutants:
        if isinstance(item, dict):
            pollutant_type = _pick(
                item,
                "type",
                "name",
                "pollutantType",
                "pollutant_type",
                default="",
            )
            pollutant_amount = _pick(
                item,
                "amount",
                "value",
                "pollutantAmount",
                "pollutant_amount",
                default="",
            )
        else:
            pollutant_type = _safe_str(item)
            pollutant_amount = ""

        if not pollutant_type and pollutant_amount in ("", None):
            continue

        result.append(
            {
                "ITEM_POLLUTANT_TYPE": _safe_str(pollutant_type),
                "ITEM_POLLUTANT_AMOUNT": _safe_str(pollutant_amount),
            }
        )

    if not result:
        pollutant_type_text = _pick(
            business,
            "pollutantType",
            "pollutant_type",
            "airPollutantType",
            default="",
        )
        pollutant_amount_text = _pick(
            business,
            "pollutantAmount",
            "pollutant_amount",
            "airPollutantAmount",
            default="",
        )

        if pollutant_type_text or pollutant_amount_text:
            type_parts = [x.strip() for x in str(pollutant_type_text).split(",") if x.strip()]
            amount_parts = [x.strip() for x in str(pollutant_amount_text).split(",") if x.strip()]
            row_count = max(len(type_parts), len(amount_parts))

            for i in range(row_count):
                result.append(
                    {
                        "ITEM_POLLUTANT_TYPE": type_parts[i] if i < len(type_parts) else "",
                        "ITEM_POLLUTANT_AMOUNT": amount_parts[i] if i < len(amount_parts) else "",
                    }
                )

    return result


def _build_install_items(support: dict, emissions: list[dict]) -> tuple[list[dict], int]:
    total_cost = 0
    install_items = []

    for sensor in support.get("sensors", []):
        sensor_name = sensor.get("name", "")

        if sensor_name == "전류계(배출시설)":
            total_qty = sum(
                1 for e in emissions
                if (e.get("is_supported") or e.get("supported"))
                and not (e.get("is_exempt") or e.get("exempt"))
            )
        else:
            quantities = sensor.get("quantities", {}) or {}
            total_qty = sum(_safe_int(v, 0) for v in quantities.values())

        if total_qty == 0:
            continue

        unit_price = _safe_int(sensor.get("unitPrice"), 0)
        item_amount = total_qty * unit_price
        total_cost += item_amount

        install_items.append(
            {
                "ITEM_NAME": sensor_name,
                "ITEM_UNIT_PRICE": unit_price,
                "ITEM_QTY": total_qty,
                "ITEM_AMOUNT": item_amount,
            }
        )

    return install_items, total_cost

def _save_runtime_upload(file_obj, save_dir: Path) -> str | None:
    if not file_obj:
        return None

    # 이미 업로드된 파일 경로 (문자열)
    if isinstance(file_obj, str):
        path = Path(file_obj)

        # 상대경로면 절대경로로 변환
        if not path.is_absolute():
            path = Path.cwd() / path

        return str(path)

    # 파일 객체일 경우 저장
    if hasattr(file_obj, "getbuffer") and hasattr(file_obj, "name"):
        save_dir.mkdir(parents=True, exist_ok=True)
        save_path = save_dir / file_obj.name
        with open(save_path, "wb") as f:
            f.write(file_obj.getbuffer())
        return str(save_path)

    return None


def _pick_photo_from_flat_inputs(photo_inputs: dict, facility_no: str, prefix: str, index: int):
    target = f"prev-{facility_no}_{prefix}_{index}"
    for key, value in photo_inputs.items():
        if target in key:
            return value
    return None

def _build_prevention_sections(
    preventions: list[dict],
    emissions: list[dict],
    photo_inputs: dict,
    runtime_dir: Path,
) -> list[dict]:

    sections = []

    for idx, p in enumerate(preventions, start=1):
        facility_no = _pick(p, "facilityNo", "facility_no", default=f"방{idx}")
        outlet_no = _pick(p, "outletNo", "outlet_no", default="")
        prevention_no = facility_no
        prevention_type = _pick(p, "type", "facility_name", default="")
        prevention_name = f"({prevention_no}) {prevention_type}" if prevention_no else prevention_type
        prevention_capacity = _format_capacity(
            _pick(p, "capacity", default=""),
            _pick(p, "unit", default=""),
        )

        linked_emissions = [
            e for e in emissions
            if str(_pick(e, "outletNo", "outlet_no", default="")) == str(outlet_no)
            and (_pick(e, "supported", "is_supported", default=False) is True)
            and (_pick(e, "exempt", "is_exempt", default=False) is not True)
        ]

        common_images = {
            "overview": _save_runtime_upload(
                _pick_photo_from_flat_inputs(photo_inputs, facility_no, "common", 0),
                runtime_dir,
            ),
            "gw_location": _save_runtime_upload(
                _pick_photo_from_flat_inputs(photo_inputs, facility_no, "common", 1),
                runtime_dir,
            ),
            "fan_ctrl_panel_out": _save_runtime_upload(
                _pick_photo_from_flat_inputs(photo_inputs, facility_no, "common", 2),
                runtime_dir,
            ),
            "fan_ctrl_panel_in": _save_runtime_upload(
                _pick_photo_from_flat_inputs(photo_inputs, facility_no, "common", 3),
                runtime_dir,
            ),
        }

        detail_images = {
            "temp_location": _save_runtime_upload(
                _pick_photo_from_flat_inputs(photo_inputs, facility_no, "detail", 0),
                runtime_dir,
            ),
            "dp_in_location": _save_runtime_upload(
                _pick_photo_from_flat_inputs(photo_inputs, facility_no, "detail", 1),
                runtime_dir,
            ),
            "dp_out_location": _save_runtime_upload(
                _pick_photo_from_flat_inputs(photo_inputs, facility_no, "detail", 2),
                runtime_dir,
            ),
            "pump_ctrl_panel_out": _save_runtime_upload(
                _pick_photo_from_flat_inputs(photo_inputs, facility_no, "detail", 0),
                runtime_dir,
            ),
            "pump_ctrl_panel_in": _save_runtime_upload(
                _pick_photo_from_flat_inputs(photo_inputs, facility_no, "detail", 1),
                runtime_dir,
            ),
            "hv_ctrl_panel_out": _save_runtime_upload(
                _pick_photo_from_flat_inputs(photo_inputs, facility_no, "detail", 0),
                runtime_dir,
            ),
            "hv_ctrl_panel_in": _save_runtime_upload(
                _pick_photo_from_flat_inputs(photo_inputs, facility_no, "detail", 1),
                runtime_dir,
            ),
            "ph_location": _save_runtime_upload(
                _pick_photo_from_flat_inputs(photo_inputs, facility_no, "detail", 0),
                runtime_dir,
            ),
        }

        emission_items = []
        for e in linked_emissions:
            emission_no = _pick(e, "facilityNo", "facility_no", default="")
            emission_base_name = _pick(e, "name", "facility_name", default="")
            emission_name = f"({emission_no}) {emission_base_name}" if emission_no else emission_base_name
            emission_capacity = _format_capacity(
                _pick(e, "capacity", default=""),
                _pick(e, "unit", default=""),
            )

            global_em_idx = None
            for idx_all, src_e in enumerate(emissions, start=1):
                src_facility_no = _pick(src_e, "facilityNo", "facility_no", default="")
                if str(src_facility_no) == str(emission_no):
                    global_em_idx = idx_all
                    break

            if global_em_idx is None:
                global_em_idx = 1

            emission_items.append(
                {
                    "emission_name": emission_name,
                    "emission_capacity": emission_capacity,
                    "overview": _save_runtime_upload(
                        photo_inputs.get(f"EMISSION_{global_em_idx}_OVERVIEW"),
                        runtime_dir,
                    ),
                    "ctrl_out": _save_runtime_upload(
                        photo_inputs.get(f"EMISSION_{global_em_idx}_CTRL_OUT"),
                        runtime_dir,
                    ),
                    "ctrl_in": _save_runtime_upload(
                        photo_inputs.get(f"EMISSION_{global_em_idx}_CTRL_IN"),
                        runtime_dir,
                    ),
                }
            )

        sections.append(
            {
                "prevention_no": facility_no,
                "outlet_no": outlet_no,
                "prevention_name": prevention_name,
                "prevention_method": prevention_type,   # 🔥 여기 수정
                "prevention_capacity": prevention_capacity,
                "common_images": common_images,
                "detail_images": detail_images,
                "emissions": emission_items,
            }
        )

    return sections


def _is_supported(row: dict) -> bool:
    candidate_keys = [
        "supported",
        "isSupported",
        "is_supported",
        "selected",
        "isSelected",
        "apply",
        "checked",
    ]

    found = False
    for key in candidate_keys:
        if key in row:
            found = True
            if bool(row.get(key)):
                return True

    return not found


def build_certificate_data(req: dict):
    support = req.get("support", {}) or {}
    preventions = req.get("preventions", []) or []
    emissions = req.get("emissions", []) or []   # 🔥 추가

    install_items, _ = _build_install_items(support, emissions)  # 🔥 수정

    return {
        "preventions": preventions,
        "install_items": install_items,
    }

def build_merged_filename(project_data, org_type):
    fields = project_data.get("fields", {})

    business_name = fields.get("BUSINESS_NAME", "사업장")
    address = fields.get("BUSINESS_ADDRESS", "")

    tokens = address.split()
    city = tokens[0] if len(tokens) >= 1 else "지역"
    district = tokens[1] if len(tokens) >= 2 else ""

    year = "2026"
    suffix = "DT" if org_type == "daejin" else "EN"

    if district:
        return f"{year}_{business_name}_{city}_{district}_{suffix}.docx"
    return f"{year}_{business_name}_{city}_{suffix}.docx"

import hashlib
from docx.opc.part import Part


def patch_docxcompose_sha1():
    if not hasattr(Part, "sha1"):
        Part.sha1 = property(
            lambda self: hashlib.sha1(
                getattr(self, "blob", b"") if getattr(self, "blob", b"") else b""
            ).hexdigest()
        )

def _format_measurement_items_text(business: dict) -> str:
    items = business.get("measurementItems", []) or []
    if not items:
        return _safe_str(business.get("lastMeasureDate", ""))

    lines = []

    for item in items:
        pollutant = _safe_str(item.get("pollutant", ""))
        amount = _safe_str(item.get("amount", ""))
        unit = _safe_str(item.get("unit", ""))
        date = _safe_str(item.get("date", ""))

        if pollutant or amount or unit:
            lines.append(f"{pollutant} {amount}{unit}".strip())

        if date:
            try:
                yyyy, mm, dd = date.split("-")
                lines.append(f"({yyyy[2:]}.{mm}.{dd})")
            except Exception:
                lines.append(f"({date})")

    if lines:
        return "\n".join(lines)

    return _safe_str(business.get("lastMeasureDate", ""))


def _get_calc_results(req: dict) -> dict:
    return req.get("calc_results", {}) or {}


# -------------------------
# API
# -------------------------
@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/login")
def login(req: LoginRequest):
    user = authenticate(req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    # 👉 임시 토큰 (일단 이걸로 충분)
    token = f"token-{user['id']}"

    return {
        "success": True,
        "user": {
            "id": user["id"],
            "name": user["user_name"],
            "phone": user["phone"],
            "role": user["role"],
        },
        "token": token  # 🔥 이 한 줄이 핵심
    }


@app.get("/api/projects")
def get_projects():
    return {"items": list_saved_projects()}


@app.get("/api/projects/{project_key}")
def get_project(project_key: str):
    try:
        payload = load_project(project_key)
        return {"success": True, "project": payload}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")


@app.post("/api/projects/save-draft")
def save_draft(req: SaveProjectRequest):
    path = save_project(req.project_key, "draft", req.data)
    return {"success": True, "project_key": req.project_key, "path": str(path)}


@app.post("/api/projects/save-final")
def save_final(req: SaveProjectRequest):
    path = save_project(req.project_key, "final", req.data)
    return {"success": True, "project_key": req.project_key, "path": str(path)}


@app.post("/api/calculate/application")
def calculate_application_api(req: CalculateRequest):
    return calculate_application(req.data)

@app.delete("/api/projects/{project_key}")
def delete_project(project_key: str):
    from pathlib import Path

    project_dir = Path("app_data/projects")
    file_path = project_dir / f"{project_key}.json"

    if not file_path.exists():
        return {"success": False, "message": "프로젝트 없음"}

    file_path.unlink()
    return {"success": True}


# =========================
# 통합 project_data 생성
# =========================
def build_project_data(req: dict, user: dict):
    business = req.get("business", {}) or {}
    emissions = req.get("emissions", []) or []
    preventions = req.get("preventions", []) or []
    support = req.get("support", {}) or {}
    calc_results = _get_calc_results(req)

    install_items = calc_results.get("install_items")
    if install_items is None:
        install_items, total_cost = _build_install_items(support, emissions)
    else:
        total_cost = _safe_int(calc_results.get("total_cost", 0), 0)

    national_subsidy = _safe_int(
        calc_results.get("national_subsidy", int(total_cost * 0.6)),
        int(total_cost * 0.6),
    )
    self_burden = _safe_int(
        calc_results.get("self_burden", total_cost - national_subsidy),
        total_cost - national_subsidy,
    )

    site_facility_status = _build_site_facility_status_all(emissions, preventions)

    fields = {
        # 사업장
        "BUSINESS_NAME": business.get("name", ""),
        "BUSINESS_LICENSE_NUMBER": business.get("bizNo", ""),
        "BUSINESS_CEO_NAME": business.get("ceo", ""),
        "CEO_BIRTHDAY_DATE": business.get("ceoBirth", ""),
        "BUSINESS_CONTACT_NAME": business.get("managerName", ""),
        "BUSINESS_CONTACT_PHONE": business.get("managerPhone", ""),
        "BUSINESS_MAIL_ADDRESS": business.get("email", ""),
        "BUSINESS_ADDRESS": business.get("address", ""),
        "BUSINESS_PHONE": business.get("phone", ""),
        "BUSINESS_FAX": business.get("fax", ""),
        "BUSINESS_TYPE": business.get("industry", ""),
        "BUSINESS_TYPE_NUMBER": business.get("grade", ""),
        "BUSINESS_MAIN_PRODUCT": business.get("mainProduct", ""),

        # 🔥 추가 (핵심)
        "CONTRACTOR_CONTACT_NAME": user.get("name", ""),
        "CONTRACTOR_CONTACT_PHONE": user.get("phone", ""),

        # 날짜
        "MEASURE_DATE": _format_measurement_items_text(business),
        "DOCUMENT_DATE": _format_korean_date(business.get("applyDate", "")),
        "CONSTRUCTION_START_DATE": business.get("startDate", ""),
        "CONSTRUCTION_END_DATE": business.get("endDate", ""),
        "PROJECT_PERIOD": f"{business.get('startDate','')} ~ {business.get('endDate','')}",

        # 금액
        "TOTAL_COST": f"{total_cost:,}",
        "NATIONAL_SUBSIDY": f"{national_subsidy:,}",
        "SELF_BURDEN": f"{self_burden:,}",
        "TOTAL_COST_KR": _amount_to_korean_text(total_cost),
        "NATIONAL_SUBSIDY_KR": _amount_to_korean_text(national_subsidy),
        "SELF_BURDEN_KR": _amount_to_korean_text(self_burden),

        # 기타
        "MUNICIPALITY_OFFICE_NAME": business.get("authority", ""),
        "DUPLICATE_SUPPORT_YN": "해당없음",
    }

    block_project_device_list = []
    for item in install_items:
        block_project_device_list.append(
            f"{item.get('ITEM_NAME','')}*{item.get('ITEM_QTY',0)}EA"
        )

    fields["BLOCK_PROJECT_DEVICE"] = ", ".join(block_project_device_list)
    fields["INSTALLED_SENSORS"] = fields["BLOCK_PROJECT_DEVICE"]

    # -------------------------
    # PROJECT_DEVICE (DOC_10020)
    # -------------------------
    project_device_list = []
    seen_devices = set()

    for e in emissions:
        if e.get("supported") and not e.get("exempt"):
            text = f"({e.get('facilityNo','')}) {e.get('name','')}({_format_capacity(e.get('capacity',''), e.get('unit',''))})*1"
            if text not in seen_devices:
                seen_devices.add(text)
                project_device_list.append(text)

    for p in preventions:
        if p.get("supported"):
            text = f"({p.get('facilityNo','')}) {p.get('type','')}({_format_capacity(p.get('capacity',''), p.get('unit',''))})*1"
            if text not in seen_devices:
                seen_devices.add(text)
                project_device_list.append(text)

    fields["PROJECT_DEVICE"] = ", ".join(project_device_list)
    fields["PREVENTION_TYPES"] = fields["PROJECT_DEVICE"]

    # -------------------------
    # 측정기기 부착근거 (DOC_10021)
    # -------------------------
    sensor_basis_items = []
    seen_sensor_names = set()

    for item in install_items or []:
        name = _pick(item, "ITEM_NAME", "name", default="")
        qty = _safe_int(_pick(item, "ITEM_QTY", "qty", "quantity", default=0), 0)

        name = _safe_str(name)

        if not name or qty <= 0:
            continue

        if name not in seen_sensor_names:
            seen_sensor_names.add(name)
            sensor_basis_items.append({
                "ITEM_NAME": name,
                "BASIS_TEXT": "",   # 항상 공란
            })

    fields["BLOCK_SENSOR_BASIS"] = ""
    fields["MEASURE_BASIS"] = ""

    # -------------------------
    # 방지시설 종류 (DOC_10160)
    # -------------------------
    fields["PREVENTION_TYPES"] = ", ".join(
        [
            _pick(p, "type", "facility_name", "name", default="")
            for p in preventions
            if _pick(p, "supported", "is_supported", default=False)
        ]
    )

    # -------------------------
    # 센서 정보 (DOC_10160)
    # -------------------------
    sensor_texts = []
    for item in install_items:
        sensor_texts.append(f"{item.get('ITEM_NAME','')} {item.get('ITEM_QTY',0)}개")
    fields["INSTALLED_SENSORS"] = ", ".join(sensor_texts)


    # -------------------------
    # 설치 정보 (DOC_10040)
    # -------------------------
    prevention_facilities = []
    print("DOC_10040 install_items =", install_items)
    raw_preventions = [
        p for p in (req.get("prevention_facilities") or req.get("preventions") or [])
        if _pick(p, "is_supported", "supported", default=False)
    ]

    for idx, p in enumerate(raw_preventions, start=1):
        facility_no = _pick(p, "facility_no", "facilityNo", default=f"방{idx}")
        facility_name = _normalize_prevention_name(
            _pick(p, "facility_name", "type", "name", default="")
        )
        facility_capacity = _format_capacity(
            _pick(p, "capacity", default=""),
            _pick(p, "unit", default=""),
        )

        prevention_facilities.append({
            "facility_no": facility_no,
            "prevention_name": f"{facility_no} {facility_name}".strip(),
            "prevention_method": facility_name,
            "prevention_capacity": facility_capacity,
            "gw_item": None,
            "vpn_item": None,
            "sensors": [],
            **p,
        })

    for p_idx, p in enumerate(prevention_facilities):
        sensors = []
        facility_no = p.get("facility_no", f"방{p_idx + 1}")

        print("DOC_10040 facility_no =", facility_no)
        print("DOC_10040 support.sensors =", support.get("sensors", []))

        if len(prevention_facilities) == 1 and p_idx == 0:
            p["gw_item"] = {
                "ITEM_NAME": "IoT게이트웨이",
                "ITEM_UNIT_PRICE": 1600000,
                "ITEM_QTY": 1,
                "ITEM_AMOUNT": 1600000,
            }
            p["vpn_item"] = {
                "ITEM_NAME": "VPN",
                "ITEM_UNIT_PRICE": 400000,
                "ITEM_QTY": 1,
                "ITEM_AMOUNT": 400000,
            }

        elif len(prevention_facilities) >= 2 and p_idx == 0:
            p["gw_item"] = {
                "ITEM_NAME": "IoT게이트웨이(복수형)",
                "ITEM_UNIT_PRICE": 2080000,
                "ITEM_QTY": 1,
                "ITEM_AMOUNT": 2080000,
            }
            p["vpn_item"] = {
                "ITEM_NAME": "VPN",
                "ITEM_UNIT_PRICE": 400000,
                "ITEM_QTY": 1,
                "ITEM_AMOUNT": 400000,
            }

        sensor_rows = calc_results.get("sensor_rows", []) or []

        for row in sensor_rows:
            sensor_name = _pick(row, "ITEM_NAME", "name", default="")
            unit_price = _safe_int(_pick(row, "ITEM_UNIT_PRICE", "unitPrice", default=0), 0)

            prevention_qtys = row.get("prevention_qtys", []) or []
            qty = 0

            if p_idx < len(prevention_qtys):
                qty = _safe_int(prevention_qtys[p_idx], 0)

            if qty > 0 and sensor_name not in ["IoT게이트웨이", "IoT게이트웨이(복수형)", "VPN"]:
                sensors.append({
                    "ITEM_NAME": sensor_name,
                    "ITEM_UNIT_PRICE": unit_price,
                    "ITEM_QTY": qty,
                    "ITEM_AMOUNT": unit_price * qty,
                })

        p["sensors"] = sensors

    preventions = [
        p for p in (req.get("preventions") or req.get("prevention_facilities") or [])
        if _pick(p, "is_supported", "supported", default=False)
    ]
    emissions = req.get("emissions") or req.get("emission_facilities") or []
    photo_inputs = req.get("photo_inputs") or req.get("photoInputs") or {}

    runtime_dir = Path("app_data/uploads/runtime_10024")
    runtime_dir.mkdir(parents=True, exist_ok=True)

    prevention_sections = _build_prevention_sections(
        preventions,
        emissions,
        photo_inputs,
        runtime_dir,
    )


    return {
        "fields": fields,
        "business": business,
        "site_facility_status": site_facility_status,
        "install_items": install_items,
        "sensor_basis_items": sensor_basis_items,
            # 🔥 이거 추가
        "pollutants": req.get("pollutants", []),
        "prevention_facilities": prevention_facilities,
        "prevention_sections": prevention_sections,
        "images": {
            "BUSINESS_LOCATION_MAP_FILE": (
                req.get("images", {}).get("BUSINESS_LOCATION_MAP_FILE")
                or business.get("siteMapImage", "")
            ),
            "INSTALL_LAYOUT_FILE": (
                req.get("images", {}).get("INSTALL_LAYOUT_FILE")
                or req.get("INSTALL_LAYOUT_FILE", "")
                or business.get("installLayoutImage", "")
            ),
        },
    }


# -------------------------
# DOC_10010_A Builder
# -------------------------
def build_doc_10010_a_data(req: dict):
    business = req.get("business", {}) or {}
    emissions = req.get("emissions", []) or []
    preventions = req.get("preventions", []) or []
    support = req.get("support", {}) or {}

    install_items, total_cost = _build_install_items(support, emissions)
    national_subsidy = int(total_cost * 0.6)
    self_burden = total_cost - national_subsidy

    site_facility_status = _build_site_facility_status_all(emissions, preventions)

    fields = {
        "BUSINESS_NAME": business.get("name", ""),
        "BUSINESS_LICENSE_NUMBER": business.get("bizNo", ""),
        "BUSINESS_CEO_NAME": business.get("ceo", ""),
        "BUSINESS_CONTACT_NAME": business.get("managerName", ""),
        "BUSINESS_CONTACT_PHONE": business.get("managerPhone", ""),
        "BUSINESS_MAIL_ADDRESS": business.get("email", ""),
        "BUSINESS_ADDRESS": business.get("address", ""),
        "BUSINESS_PHONE": business.get("phone", ""),
        "BUSINESS_FAX": business.get("fax", ""),
        "BUSINESS_TYPE": business.get("industry", ""),
        "BUSINESS_TYPE_NUMBER": business.get("grade", ""),
        "BUSINESS_MAIN_PRODUCT": business.get("mainProduct", ""),
        "MEASURE_DATE": _safe_str(business.get("lastMeasureDate", "")),
        "DUPLICATE_SUPPORT_YN": "해당없음",
        "TOTAL_COST": f"{total_cost:,}",
        "NATIONAL_SUBSIDY": f"{national_subsidy:,}",
        "SELF_BURDEN": f"{self_burden:,}",
        "TOTAL_COST_KR": _amount_to_korean_text(total_cost),
        "NATIONAL_SUBSIDY_KR": _amount_to_korean_text(national_subsidy),
        "SELF_BURDEN_KR": _amount_to_korean_text(self_burden),
        "CONTRACTOR_CONTACT_NAME": user.get("name", ""),
        "CONTRACTOR_CONTACT_PHONE": user.get("phone", ""),
        "CEO_BIRTHDAY_DATE": business.get("ceoBirthday", ""),
        "CONSTRUCTION_START_DATE": business.get("startDate", ""),
        "CONSTRUCTION_END_DATE": business.get("endDate", ""),
        "DOCUMENT_DATE": _format_korean_date(business.get("applyDate", "")),
        "MUNICIPALITY_OFFICE_NAME": business.get("authority", ""),
        "SITE_LAYOUT_IMAGE": business.get("layoutImage", ""),
        "SITE_MAP_IMAGE": business.get("siteMapImage", ""),
    }

    project_device_list = []
    for row in site_facility_status:
        project_device_list.append(
            f"{row.get('EMISSION_FACILITY_NAME', '')} / {row.get('PREVENTION_METHOD', '')}"
        )
    fields["PROJECT_DEVICE"] = ", ".join(project_device_list)

    fields["MEASURE_BASIS"] = support.get("measureBasis", "")

    fields["PREVENTION_TYPES"] = ", ".join(
        [p.get("type", "") for p in preventions if p.get("supported")]
    )

    sensor_texts = []
    for item in install_items:
        sensor_texts.append(f"{item.get('ITEM_NAME', '')} {item.get('ITEM_QTY', 0)}개")
    fields["INSTALLED_SENSORS"] = ", ".join(sensor_texts)

    fields["PROJECT_PERIOD"] = f"{fields['CONSTRUCTION_START_DATE']} ~ {fields['CONSTRUCTION_END_DATE']}"

    return {
        "fields": fields,
        "site_facility_status": site_facility_status,
        "install_items": install_items,
    }


# -------------------------
# DOC_10010_B Builder
# -------------------------
def build_doc_10010_b_data(req: dict, user: dict):
    
    business = req.get("business", {}) or {}
    emissions = req.get("emissions", []) or []
    support = req.get("support", {}) or {}

    install_items, total_cost = _build_install_items(support, emissions)
    national_subsidy = int(total_cost * 0.6)
    self_burden = total_cost - national_subsidy

    site_facility_status = _build_site_facility_status_emissions_only(emissions)
    pollutants = req.get("pollutants") or _build_pollutants(req)

    fields = {
        "BUSINESS_NAME": business.get("name", ""),
        "BUSINESS_LICENSE_NUMBER": business.get("bizNo", ""),
        "BUSINESS_CEO_NAME": business.get("ceo", ""),
        "BUSINESS_CONTACT_NAME": business.get("managerName", ""),
        "BUSINESS_CONTACT_PHONE": business.get("managerPhone", ""),
        "BUSINESS_MAIL_ADDRESS": business.get("email", ""),
        "BUSINESS_ADDRESS": business.get("address", ""),
        "BUSINESS_PHONE": business.get("phone", ""),
        "BUSINESS_TYPE": business.get("industry", ""),
        "BUSINESS_TYPE_NUMBER": business.get("grade", ""),
        "BUSINESS_MAIN_PRODUCT": business.get("mainProduct", ""),
        "MEASURE_DATE": _safe_str(business.get("lastMeasureDate", "")),
        "DUPLICATE_SUPPORT_YN": "해당없음",
        "TOTAL_COST": f"{total_cost:,}",
        "NATIONAL_SUBSIDY": f"{national_subsidy:,}",
        "SELF_BURDEN": f"{self_burden:,}",
        "TOTAL_COST_KR": _amount_to_korean_text(total_cost),
        "NATIONAL_SUBSIDY_KR": _amount_to_korean_text(national_subsidy),
        "SELF_BURDEN_KR": _amount_to_korean_text(self_burden),
        "CONTRACTOR_CONTACT_NAME": user.get("name", ""),
        "CONTRACTOR_CONTACT_PHONE": user.get("phone", ""),
        "DOCUMENT_DATE": _format_korean_date(business.get("applyDate", "")),
        "MUNICIPALITY_OFFICE_NAME": business.get("authority", ""),
    }

    return {
        "fields": fields,
        "site_facility_status": site_facility_status,
        "pollutants": pollutants,
        "install_items": install_items,
        "sensor_basis_items": sensor_basis_items,   # ⭐ 이거 추가
    }


# -------------------------
# Generate / Download
# -------------------------
@app.post("/api/generate/{doc_type}")
def generate_document(doc_type: str, req: Dict[str, Any], request: Request):
    allowed = {"daejin", "energy", "certificate"}
    if doc_type not in allowed:
        raise HTTPException(status_code=400, detail="지원하지 않는 문서 타입입니다.")

    user = req.get("user") or {}

    project_key = req.get("projectKey") or req.get("project_key") or "untitled_project"

    if doc_type == "certificate":
        output_filename = f"{project_key}_004_성적서.pdf"
    else:
        output_filename = f"{project_key}_{doc_type}.docx"

    output_path = OUTPUT_DIR / output_filename

    if doc_type == "daejin":
        project_data = build_project_data(req, user)
        generate_doc_10010_a(
            template_path=TEMPLATE_PATH_10010_A,
            output_path=output_path,
            project_data=project_data,
        )

    elif doc_type == "energy":
        project_data = build_project_data(req, user)
        generate_doc_10010_b(
            template_path=TEMPLATE_PATH_10010_B,
            output_path=output_path,
            project_data=project_data,
        )

    elif doc_type == "certificate":
        try:
            project_data = build_certificate_data(req)
            result = generate_certificate_pdf(
                project_data=project_data,
                output_path=output_path,
            )

            base_url = _get_base_url(request)

            return {
                "success": True,
                "output_filename": output_filename,
                "download_url": f"{base_url}/api/download/{output_filename}",
                "missing_files": result.get("missing_files", []),
                "required_sensors": result.get("required_sensors", []),
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"성적서 PDF 생성 실패: {str(e)}")

    base_url = _get_base_url(request)

    return {
        "success": True,
        "output_filename": output_filename,
        "download_url": f"{base_url}/api/download/{output_filename}",
    }


@app.get("/api/download/{filename}")
def download_generated_file(filename: str):
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")

    # 한글 파일명을 위한 URL 인코딩
    encoded_filename = urllib.parse.quote(filename.encode('utf-8'))

    def file_generator():
        with open(file_path, "rb") as f:
            while chunk := f.read(8192):  # 8KB씩 읽기
                yield chunk

    return StreamingResponse(
        file_generator(),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
            "Accept-Ranges": "none",
        },
    )

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    save_dir = "app_data/uploads/runtime_10024"
    os.makedirs(save_dir, exist_ok=True)

    save_path = os.path.join(save_dir, file.filename)

    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"file_path": save_path}

@app.post("/api/merged/generate")
def generate_merged(data: dict, request: Request):
    try:
        org_type = data.get("org_type")
        project_data = data.get("project_data")

        if not org_type or not project_data:
            raise HTTPException(status_code=400, detail="org_type or project_data missing")

        if "calc_results" in data and "calc_results" not in project_data:
            project_data["calc_results"] = data.get("calc_results") or {}

        project_data = build_project_data(project_data, data.get("user") or {})

        if org_type not in {"daejin", "energy"}:
            raise HTTPException(status_code=400, detail="invalid org_type")

        order = DAEJIN_ORDER if org_type == "daejin" else ENERGY_ORDER

        temp_dir = Path(tempfile.mkdtemp(prefix="dxg_merge_"))

        try:
            result = generate_documents(project_data, order, output_dir=temp_dir)

            patch_docxcompose_sha1()

            filename = build_merged_filename(project_data, org_type)

            merged_file = generate_merged_document(result, filename)

            merged_file_path = Path(merged_file)
            if not merged_file_path.exists():
                raise FileNotFoundError(f"합본 파일을 찾을 수 없습니다: {merged_file_path}")

            final_path = OUTPUT_DIR / filename
            shutil.copyfile(merged_file_path, final_path)

            base_url = _get_base_url(request)

            return {
                "success": True,
                "output_filename": filename,
                "download_url": f"{base_url}/api/download/{final_path.name}",
            }

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/certificates/upload")
async def upload_certificate(sensor_type: str = Form(...), model: str = Form(...), spec: str = Form(...), file: UploadFile = File(...)):
    try:
        filename = f"{sensor_type}_{model}_{spec}.pdf"
        file_path = CERTIFICATES_DIR / filename
        
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        add_certificate(sensor_type, model, spec, filename, file_path)
        
        return {"message": f"{sensor_type} ({model}/{spec}) certificate uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/certificates/list")
async def get_certificates():
    try:
        certificates = get_certificates_list()
        return {"certificates": certificates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/certificates/delete")
async def delete_certificate(sensor_type: str = Form(...), model: str = Form(...), spec: str = Form(...)):
    try:
        success = remove_certificate(sensor_type, model, spec)
        if success:
            return {"message": f"{sensor_type} ({model}/{spec}) certificate deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Certificate not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/certificates")
async def get_certificates():
    try:
        certificates = {}
        for sensor_type, rule in CERT_RULES.items():
            file_path = rule["dir"] / rule["filename"]
            if file_path.exists():
                certificates[sensor_type] = {
                    "filename": rule["filename"],
                    "exists": True
                }
            else:
                certificates[sensor_type] = {
                    "filename": None,
                    "exists": False
                }
        return certificates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))