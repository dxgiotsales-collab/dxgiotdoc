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

settings = Settings()