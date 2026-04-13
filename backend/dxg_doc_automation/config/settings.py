# backend/dxg_doc_automation/config/settings.py
import os
from enum import Enum

# ===== 전역 환경 변수 오버라이드 (코드에서 직접 설정 가능) =====
# 사용법: settings.py 임포트 후, GLOBAL_ENV_OVERRIDE = "prod" 또는 "ngrok" 또는 "local"로 설정
GLOBAL_ENV_OVERRIDE = "ngrok"

class Environment(str, Enum):
    PROD = "prod"
    NGROK = "ngrok"
    LOCAL = "local"

class Settings:
    # 호스트 설정
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

    @property
    def ENV(self):
        """동적으로 환경을 결정 (우선순위: GLOBAL_ENV_OVERRIDE > 환경변수 > 기본값)"""
        return (
            GLOBAL_ENV_OVERRIDE or 
            os.getenv("DXG_DOC_API_ENV", "ngrok")
        ).lower()

    @property
    def HOST(self):
        """현재 환경의 호스트"""
        return self.HOSTS[self.ENV]

    @property
    def ORIGINS(self):
        """현재 환경의 CORS 허용 출처"""
        return self.ALLOWED_ORIGINS[self.ENV]

    @property
    def CERT_BASE_PATH(self):
        """인증서 기본 경로"""
        return (
            r"Z:\환경영업팀\! IOT !\@ IoT 계약(예정)사업장\IoT 센서 시험성적서_240620" 
            if self.ENV in ["ngrok", "local"] else ""
        )

    @property
    def CERT_VPN_PATH(self):
        """VPN 인증서 경로"""
        return (
            r"Z:\환경영업팀\! IOT !\1_0. 기본자료\3. VPN 관련정보\LG VPN 인증서" 
            if self.ENV in ["ngrok", "local"] else ""
        )

settings = Settings()