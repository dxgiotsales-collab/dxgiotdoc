from typing import Dict, Any

USERS = {
    "9017091": {
        "password": "9017091",
        "id": "eric",
        "user_name": "김현성",
        "phone": "070-4673-4741",
        "role": "admin",
    },
    "90250513": { 
        "password": "90250513",
        "id": "jeongeunhee",
        "user_name": "정은희",
        "phone": "010-4223-4712",
        "role": "admin",
    },
    "9024025": {
        "password": "9024025",
        "id": "kimwoori",
        "user_name": "김우리",
        "phone": "010-8316-4039",
        "role": "admin",
    },
    "231003": {
        "password": "231003",
        "id": "hanjisoo",
        "user_name": "한지수",
        "phone": "010-8327-4036",
        "role": "user",
    },
    "90241211": {
        "password": "90241211",
        "id": "choibyunghwan",
        "user_name": "최병환",
        "phone": "010-7402-3772",
        "role": "user",
    },
    "9025026": {
        "password": "9025026",
        "id": "kanghyerim",
        "user_name": "강혜림",
        "phone": "010-5712-4037",
        "role": "user",
    },
    "9025065": {
        "password": "9025065",
        "id": "byunseungyeob",
        "user_name": "변승엽",
        "phone": "010-5180-4712",
        "role": "user",
    },
}


def authenticate(username: str, password: str):
    user = USERS.get(username)
    if not user:
        return None
    if user["password"] != password:
        return None

    return user   # 🔥 핵심 (가공하지 말고 그대로 반환)