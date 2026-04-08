from pathlib import Path
from PyPDF2 import PdfMerger
from config.settings import settings


if settings.CERT_BASE_PATH:
    CERT_RULES = {
        "전류계": {
            "dir": Path(settings.CERT_BASE_PATH),
            "filename": "@ [CT계] AI_XA-250_250610.pdf",
            "prefixes": [
                "@ [CT계] AI_XA-250_250610",
                "[CT계] AI_XA-250_250610",
                "AI_XA-250_250610",
                "CT계",
            ],
        },
        "온도계": {
            "dir": Path(settings.CERT_BASE_PATH),
            "filename": "@ [온도계_일반용] XTT-100-001_20251111.pdf",
        },
        "차압계": {
            "dir": Path(settings.CERT_BASE_PATH),
            "filename": "@ [차압계_일반용] XTP-WP-001_20250610.pdf",
        },
        "ph계": {
            "dir": Path(settings.CERT_BASE_PATH),
            "filename": "@ [PH계_일반용] KEC-1000_20250728-복사.PDF",
        },
        "gateway": {
            "dir": Path(settings.CERT_BASE_PATH),
            "filename": "@ [XGATE] 방수 성적서(IP66)_20250207.pdf",
        },
        "vpn": {
            "dir": Path(settings.CERT_VPN_PATH),
            "filename": "00. CC인증서_AXGATE_V2_1_SP3.pdf",
        },
    }
else:
    CERT_RULES = {}


PREVENTION_CERTIFICATE_RULES = {
    "여과집진시설": {"전류계", "차압계", "온도계"},
    "흡착에 의한 시설": {"전류계", "차압계", "온도계"},
    "원심력 집진시설": {"전류계"},
    "세정집진시설": {"전류계"},
    "전기집진시설": {"전류계"},
    "흡수에 의한 시설": {"전류계", "ph계"},
    "여과집진시설 및 흡착에 의한 시설(일체형)": {"전류계", "차압계", "온도계"},
    "여과 및 흡착에 의한 시설": {"전류계", "차압계", "온도계"},
}


def _safe_str(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _normalize_prevention_name(name: str) -> str:
    text = _safe_str(name)
    if text == "여과집진시설 및 흡착에 의한 시설(일체형)":
        return "여과 및 흡착에 의한 시설"
    return text


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


def _find_pdf(rule: dict) -> Path | None:
    folder = rule["dir"]
    filename = rule.get("filename", "")
    prefixes = rule.get("prefixes", [])

    if not folder.exists():
        return None

    pdf_files = [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() == ".pdf"]

    # 1순위: exact filename
    if filename:
        exact_path = folder / filename
        if exact_path.exists():
            return exact_path

        target_lower = filename.lower()
        for path in pdf_files:
            if path.name.lower() == target_lower:
                return path

    # 2순위: startswith
    for prefix in prefixes:
        for path in pdf_files:
            if path.name.startswith(prefix):
                return path

    # 3순위: contains
    for prefix in prefixes:
        prefix_lower = prefix.lower()
        for path in pdf_files:
            if prefix_lower in path.name.lower():
                return path

    return None


def detect_required_certificates(project_data: dict):
    sensors = set()

    for prevention in project_data.get("preventions", []):
        if not _is_supported(prevention):
            continue

        prevention_type = _normalize_prevention_name(
            prevention.get("type", "") or prevention.get("name", "") or prevention.get("facility_name", "")
        )

        rule_sensors = PREVENTION_CERTIFICATE_RULES.get(prevention_type, set())
        sensors.update(rule_sensors)

    if not sensors:
        for item in project_data.get("install_items", []):
            name = _safe_str(item.get("ITEM_NAME", ""))

            if "전류계" in name:
                sensors.add("전류계")
            if "온도계" in name:
                sensors.add("온도계")
            if "차압계" in name:
                sensors.add("차압계")
            if "ph" in name.lower():
                sensors.add("ph계")

    # gateway와 vpn은 선택사항 (Windows 공유폴더 접근 불가)
    # sensors.add("gateway")
    # sensors.add("vpn")

    return sensors


def generate_certificate_pdf(project_data: dict, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)

    sensors = detect_required_certificates(project_data)
    ordered_keys = ["전류계", "온도계", "차압계", "ph계"]  # gateway, vpn은 선택사항

    found_files = []
    missing_files = []

    merger = PdfMerger()

    try:
        for sensor in ordered_keys:
            if sensor not in sensors:
                continue

            pdf_path = _find_pdf(CERT_RULES[sensor])
            if pdf_path:
                merger.append(str(pdf_path))
                found_files.append(str(pdf_path))
            else:
                missing_files.append(sensor)

        if missing_files:
            raise FileNotFoundError(f"누락된 성적서: {', '.join(missing_files)}")

        merger.write(str(output_path))

    finally:
        merger.close()

    return {
        "output_path": output_path,
        "found_files": found_files,
        "missing_files": missing_files,
        "required_sensors": sorted(list(sensors)),
    }