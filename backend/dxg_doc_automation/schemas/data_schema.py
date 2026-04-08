from dataclasses import dataclass, field
from typing import List, Dict, Optional


@dataclass
class ProjectInfo:
    company_name: str = ""
    business_no: str = ""
    site_name: str = ""
    representative_name: str = ""
    address: str = ""
    contact_name: str = ""
    contact_phone: str = ""


@dataclass
class DeviceItem:
    device_type: str = ""   # GW, VPN, SENSOR
    device_name: str = ""
    quantity: int = 1
    location: str = ""
    spec: str = ""
    note: str = ""


@dataclass
class SensorItem:
    sensor_name: str = ""
    sensor_type: str = ""
    unit: str = ""
    quantity: int = 1
    install_position: str = ""
    note: str = ""


@dataclass
class PreventionSection:
    prevention_name: str = ""
    prevention_method: str = ""
    prevention_capacity: str = ""
    common_images: Dict[str, str] = field(default_factory=dict)
    note: str = ""


@dataclass
class DocumentRequest:
    document_code: str = ""
    project_info: ProjectInfo = field(default_factory=ProjectInfo)
    device_list: List[DeviceItem] = field(default_factory=list)
    sensor_list: List[SensorItem] = field(default_factory=list)
    prevention_sections: List[PreventionSection] = field(default_factory=list)
    extra_fields: Dict[str, str] = field(default_factory=dict)