# backend/dxg_doc_automation/config/settings.py
import os
from enum import Enum

class Environment(str, Enum):
    PROD = "prod"
    NGROK = "ngrok"
    LOCAL = "local"

class Settings:
    ENV = os.getenv("DXG_DOC_API_ENV", "ngrok").lower()

    HOSTS = {
        "prod": "doc.dxg.kr",
        "ngrok": "essentially-unweldable-faustino.ngrok-free.dev",
        "local": "localhost:8000",
    }

    ALLOWED_ORIGINS = {
        "prod": [
            "https://doc.dxg.kr",
            "https://www.dxg.kr",
        ],
        "ngrok": [
            "https://essentially-unweldable-faustino.ngrok-free.dev",
            "http://localhost:3000",
            "http://localhost:5173",
        ],
        "local": [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8000",
        ]
    }

    HOST = HOSTS[ENV]
    ORIGINS = ALLOWED_ORIGINS[ENV]

    # Certificate paths - only available in development environments
    CERT_BASE_PATH = r"Z:\환경영업팀\! IOT !\@ IoT 계약(예정)사업장\IoT 센서 시험성적서_240620" if ENV in ["ngrok", "local"] else ""
    CERT_VPN_PATH = r"Z:\환경영업팀\! IOT !\1_0. 기본자료\3. VPN 관련정보\LG VPN 인증서" if ENV in ["ngrok", "local"] else ""

settings = Settings()