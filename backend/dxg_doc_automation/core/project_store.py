from pathlib import Path
from typing import Any, Dict, List
import json
from datetime import datetime

PROJECT_DIR = Path("app_data/projects")
PROJECT_DIR.mkdir(parents=True, exist_ok=True)


def get_project_file_path(project_key: str) -> Path:
    return PROJECT_DIR / f"{project_key}.json"


def list_saved_projects() -> List[Dict[str, Any]]:
    results = []
    for file_path in sorted(PROJECT_DIR.glob("*.json"), reverse=True):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                payload = json.load(f)

            results.append(
                {
                    "project_key": payload.get("project_key", file_path.stem),
                    "save_status": payload.get("save_status", "draft"),
                    "saved_at": payload.get("saved_at", ""),
                    "file_path": str(file_path),
                }
            )
        except Exception:
            continue
    return results


def save_project(project_key: str, save_status: str, data: Dict[str, Any]) -> Path:
    payload = {
        "project_key": project_key,
        "save_status": save_status,
        "saved_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "data": data,
    }

    file_path = get_project_file_path(project_key)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    return file_path


def load_project(project_key: str) -> Dict[str, Any]:
    file_path = get_project_file_path(project_key)
    if not file_path.exists():
        raise FileNotFoundError(project_key)

    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)