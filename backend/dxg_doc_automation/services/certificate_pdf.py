from pathlib import Path
from PyPDF2 import PdfMerger
from config.settings import settings
import json


CERTIFICATES_DIR = Path("app_data/certificates")
CERTIFICATES_FILE = CERTIFICATES_DIR / "rules.json"
CERTIFICATES_DIR.mkdir(parents=True, exist_ok=True)

# Load CERT_RULES from file if exists, otherwise use defaults
if CERTIFICATES_FILE.exists():
    with open(CERTIFICATES_FILE, 'r', encoding='utf-8') as f:
        loaded_rules = json.load(f)
    
    # 기존 파일의 규칙을 유지하되, 기본 규칙과 병합
    CERT_RULES = loaded_rules.copy()
    
    # 기본 규칙이 없는 경우에만 추가
    if settings.ENV in ["ngrok", "local"] and settings.CERT_BASE_PATH:
        default_rules = {
            "전류계": {
                "dir": Path(settings.CERT_BASE_PATH),
                "filename": "@ [CT계] AI_XA-250_250610.pdf",
                "prefixes": ["@ [CT계] AI_XA-250", "[CT계] AI_XA-250", "AI_XA-250", "CT계"],
            },
            "온도계": {
                "dir": Path(settings.CERT_BASE_PATH),
                "filename": "@ [온도계_일반용] XTT-100-001_20251111.pdf",
                "prefixes": ["@ [온도계_일반용] XTT-100", "[온도계_일반용] XTT-100", "XTT-100", "온도계"],
            },
            "차압계": {
                "dir": Path(settings.CERT_BASE_PATH),
                "filename": "@ [차압계] DPI_250723.PDF",
                "prefixes": ["@ [차압계] DPI", "[차압계] DPI", "DPI", "차압계"],
            },
            "ph계": {
                "dir": Path(settings.CERT_BASE_PATH),
                "filename": "@ [PH계_일반용] KEC-1000_20250728-복사.PDF",
                "prefixes": ["@ [PH계_일반용] KEC-1000", "[PH계_일반용] KEC-1000", "KEC-1000", "PH계", "ph계"],
            },
            "gateway": {
                "dir": Path(settings.CERT_BASE_PATH),
                "filename": "@ [XGATE] 방수 성적서(IP66)_20250207.pdf",
                "prefixes": ["@ [XGATE] 방수", "[XGATE] 방수", "XGATE", "gateway"],
            },
            "vpn": {
                "dir": Path(settings.CERT_VPN_PATH) if settings.CERT_VPN_PATH else Path(settings.CERT_BASE_PATH),
                "filename": "00. CC인증서_AXGATE_V2_1_SP3.pdf",
                "prefixes": ["00. CC인증서_AXGATE", "CC인증서_AXGATE", "AXGATE_V2", "vpn"],
            },
        }
        
        # 기본 규칙 중 없는 것만 추가
        for sensor_type, rule in default_rules.items():
            if sensor_type not in CERT_RULES:
                CERT_RULES[sensor_type] = rule
    elif settings.ENV == "prod":
        # 프로덕션 환경에서는 data 폴더에서 찾음
        default_rules = {
            "전류계": {
                "dir": Path("data"), 
                "filename": "@ [CT계] AI_XA-250_250610.pdf",  # 알려주신 실제 파일명
                "prefixes": ["@ [CT계]", "AI_XA-250", "전류계", "CT계"] # 더 구체적인 접두어 추가
            },
            "온도계": {"dir": Path("data"), "filename": "온도계.pdf", "prefixes": ["온도계"]},
            "차압계": {"dir": Path("data"), "filename": "차압계.pdf", "prefixes": ["차압계"]},
            "ph계": {"dir": Path("data"), "filename": "ph계.pdf", "prefixes": ["ph계", "PH계"]},
            "gateway": {"dir": Path("data"), "filename": "gateway.pdf", "prefixes": ["gateway", "XGATE"]},
            "vpn": {
                "dir": Path("data"), 
                "filename": "CC인증서_AXGATE_V2_1_SP3.pdf", # 실제 파일명으로 수정
                "prefixes": ["CC인증서", "AXGATE", "vpn", "VPN"] # 찾기 쉬운 키워드 추가
            },
        }
        
        # 기본 규칙 중 없는 것만 추가
        for sensor_type, rule in default_rules.items():
            if sensor_type not in CERT_RULES:
                CERT_RULES[sensor_type] = rule
else:
    # 파일이 없는 경우 기본 규칙 생성
    if settings.ENV in ["ngrok", "local"] and settings.CERT_BASE_PATH:
        CERT_RULES = {
            "전류계": {
                "dir": Path(settings.CERT_BASE_PATH),
                "filename": "@ [CT계] AI_XA-250_250610.pdf",
                "prefixes": ["@ [CT계] AI_XA-250", "[CT계] AI_XA-250", "AI_XA-250", "CT계"],
            },
            "온도계": {
                "dir": Path(settings.CERT_BASE_PATH),
                "filename": "@ [온도계_일반용] XTT-100-001_20251111.pdf",
                "prefixes": ["@ [온도계_일반용] XTT-100", "[온도계_일반용] XTT-100", "XTT-100", "온도계"],
            },
            "차압계": {
                "dir": Path(settings.CERT_BASE_PATH),
                "filename": "@ [차압계] DPI_250723.PDF",
                "prefixes": ["@ [차압계] DPI", "[차압계] DPI", "DPI", "차압계"],
            },
            "ph계": {
                "dir": Path(settings.CERT_BASE_PATH),
                "filename": "@ [PH계_일반용] KEC-1000_20250728-복사.PDF",
                "prefixes": ["@ [PH계_일반용] KEC-1000", "[PH계_일반용] KEC-1000", "KEC-1000", "PH계", "ph계"],
            },
            "gateway": {
                "dir": Path(settings.CERT_BASE_PATH),
                "filename": "@ [XGATE] 방수 성적서(IP66)_20250207.pdf",
                "prefixes": ["@ [XGATE] 방수", "[XGATE] 방수", "XGATE", "gateway"],
            },
            "vpn": {
                "dir": Path(settings.CERT_VPN_PATH) if settings.CERT_VPN_PATH else Path(settings.CERT_BASE_PATH),
                "filename": "00. CC인증서_AXGATE_V2_1_SP3.pdf",
                "prefixes": ["00. CC인증서_AXGATE", "CC인증서_AXGATE", "AXGATE_V2", "vpn"],
            },
        }
    elif settings.ENV == "prod":
        CERT_RULES = {
            "전류계": {
            "dir": Path("data"), 
            "filename": "@ [CT계] AI_XA-250_250610.pdf",  # 알려주신 실제 파일명
            "prefixes": ["@ [CT계]", "AI_XA-250", "전류계", "CT계"] # 더 구체적인 접두어 추가
        },
            "온도계": {"dir": Path("data"), "filename": "온도계.pdf", "prefixes": ["온도계"]},
            "차압계": {"dir": Path("data"), "filename": "차압계.pdf", "prefixes": ["차압계"]},
            "ph계": {"dir": Path("data"), "filename": "ph계.pdf", "prefixes": ["ph계", "PH계"]},
            "gateway": {"dir": Path("data"), "filename": "gateway.pdf", "prefixes": ["gateway", "XGATE"]},
            "vpn": {
                "dir": Path("data"), 
                "filename": "CC인증서_AXGATE_V2_1_SP3.pdf", # 실제 파일명으로 수정
                "prefixes": ["CC인증서", "AXGATE", "vpn", "VPN"] # 찾기 쉬운 키워드 추가
            },
        }
    else:
        CERT_RULES = {}


def save_cert_rules():
    with open(CERTIFICATES_FILE, 'w', encoding='utf-8') as f:
        json.dump(CERT_RULES, f, ensure_ascii=False, indent=2)


def get_cert_key(sensor_type, model, spec):
    """Generate unique key for certificate rules"""
    return f"{sensor_type}_{model}_{spec}"


def add_certificate(sensor_type, model, spec, filename, file_path):
    """Add or update certificate rule"""
    key = get_cert_key(sensor_type, model, spec)
    
    # Remove old file if exists
    if key in CERT_RULES:
        old_file = CERTIFICATES_DIR / CERT_RULES[key]["filename"]
        if old_file.exists():
            old_file.unlink()
    
    CERT_RULES[key] = {
        "sensor_type": sensor_type,
        "model": model,
        "spec": spec,
        "dir": str(CERTIFICATES_DIR),
        "filename": filename,
        "prefixes": []  # Can be extended later
    }
    save_cert_rules()


def remove_certificate(sensor_type, model, spec):
    """Remove certificate rule and file"""
    key = get_cert_key(sensor_type, model, spec)
    
    if key in CERT_RULES:
        # Remove file
        file_path = CERTIFICATES_DIR / CERT_RULES[key]["filename"]
        if file_path.exists():
            file_path.unlink()
        
        # Remove from rules
        del CERT_RULES[key]
        save_cert_rules()
        return True
    return False


def get_certificates_list():
    """Get list of all registered certificates"""
    return list(CERT_RULES.values())


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
    # 1. 경로를 Path 객체로 변환
    folder = Path(rule.get("dir", "data"))
    filename = str(rule.get("filename", ""))
    prefixes = rule.get("prefixes", [])

    if not folder.exists():
        return None

    # 2. 폴더 내 모든 PDF 파일 목록을 'Path 객체'로 가져오기
    pdf_files = [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() == ".pdf"]

    # 3. 1순위: 정확한 파일명 매칭
    if filename:
        exact_path = folder / filename # Path / str 은 허용됨
        if exact_path.exists():
            return exact_path

    # 4. 2순위 & 3순위: 접두어(Prefix) 매칭 (여기서 에러가 많이 남)
    for prefix in prefixes:
        prefix_str = str(prefix) # 확실하게 문자열 변환
        for pdf_path in pdf_files:
            # pdf_path.name은 문자열이므로 문자열끼리 비교하게 함
            pdf_name = str(pdf_path.name) 
            
            if pdf_name.startswith(prefix_str) or prefix_str.lower() in pdf_name.lower():
                return pdf_path

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

    # gateway와 vpn 추가
    sensors.add("gateway")
    sensors.add("vpn")

    return sensors


def generate_certificate_pdf(project_data: dict, output_path: Path):
    sensors = detect_required_certificates(project_data)
    ordered_keys = ["전류계", "온도계", "차압계", "ph계", "gateway", "vpn"]

    found_files = []
    missing_files = []
    merger = PdfMerger()

    try:
        # --- 1. 파일 수집 단계 (반복문) ---
        for sensor in ordered_keys:
            if sensor not in sensors:
                continue

            rule = CERT_RULES.get(sensor)
            if not rule:
                continue

            # 중요: _find_pdf 호출 결과를 루프 안에서만 사용
            current_pdf_path = _find_pdf(rule) 
            
            if current_pdf_path:
                merger.append(str(current_pdf_path))
                found_files.append(str(current_pdf_path))
            else:
                missing_files.append(sensor)

        # --- 2. 병합 및 저장 단계 (반복문 밖) ---
        # pdf_path 대신 found_files 리스트가 비어있지 않은지 확인
        if found_files:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(str(output_path), "wb") as fileobj:
                merger.write(fileobj)

    except Exception as e:
        raise e
    finally:
        merger.close()

    return {
        "output_path": output_path,
        "found_files": found_files,
        "missing_files": missing_files,
    }