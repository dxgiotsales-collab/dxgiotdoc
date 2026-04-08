from typing import Any, Dict, List


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


def normalize_prevention_name(name: str) -> str:
    if name == "여과집진시설 및 흡착에 의한 시설(일체형)":
        return "여과 및 흡착에 의한 시설"
    return name


def get_supported_preventions(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        x for x in data.get("prevention_facilities", [])
        if x.get("is_supported")
    ]


def get_supported_emissions(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        x for x in data.get("emission_facilities", [])
        if x.get("is_supported") and not x.get("is_exempt")
    ]


def find_emissions_by_outlet(data: Dict[str, Any], outlet_no: str) -> List[Dict[str, Any]]:
    return [
        x for x in get_supported_emissions(data)
        if str(x.get("outlet_no", "")).strip() == str(outlet_no).strip()
    ]


def compute_install_items(data: Dict[str, Any]) -> Dict[str, Any]:
    preventions = get_supported_preventions(data)

    per_prevention_rows = []
    install_items_map = {}

    overrides = data.get("sensor_qty_overrides", {})
    sensor_basis = data.get("sensor_basis", {})

    for idx, p in enumerate(preventions, start=1):
        method = p.get("facility_name", "")
        outlet_no = p.get("outlet_no", "")
        linked_emissions = find_emissions_by_outlet(data, outlet_no)
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
                "basis_text": sensor_basis.get(sensor_name, ""),
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

    return {
        "per_prevention_rows": per_prevention_rows,
        "sensor_rows": sensor_rows,
        "install_items": install_items,
        "total_cost": total_cost,
    }


def build_site_facility_status(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows = []
    prevention_facilities = data.get("prevention_facilities", [])
    emission_facilities = data.get("emission_facilities", [])

    prevention_no_map = {}
    prevention_seq = 1

    for p in prevention_facilities:
        if not p.get("is_supported"):
            continue

        outlet_no = str(p.get("outlet_no", "")).strip()
        prevention_no_map[outlet_no] = prevention_seq
        prevention_seq += 1

    emission_no_map = {}
    emission_seq = 1

    for e in emission_facilities:
        if e.get("is_exempt"):
            continue

        emission_key = (
            str(e.get("outlet_no", "")).strip(),
            e.get("facility_name", ""),
            str(e.get("capacity", "")),
            e.get("unit", ""),
        )
        if emission_key not in emission_no_map:
            emission_no_map[emission_key] = emission_seq
            emission_seq += 1

    for p in prevention_facilities:
        if not p.get("is_supported"):
            continue

        outlet_no = str(p.get("outlet_no", "")).strip()

        linked_emissions = [
            x for x in emission_facilities
            if str(x.get("outlet_no", "")).strip() == outlet_no
            and not x.get("is_exempt")
        ]

        if not linked_emissions:
            continue

        for e in linked_emissions:
            emission_key = (
                str(e.get("outlet_no", "")).strip(),
                e.get("facility_name", ""),
                str(e.get("capacity", "")),
                e.get("unit", ""),
            )

            rows.append(
                {
                    "EMISSION_FACILITY_NO": str(emission_no_map[emission_key]),
                    "EMISSION_FACILITY_NAME": e.get("facility_name", ""),
                    "EMISSION_CAPACITY": f'{e.get("capacity", "")}{e.get("unit", "")}',
                    "EMISSION_QTY": 1,
                    "PREVENTION_FACILITY_NO": str(prevention_no_map.get(outlet_no, "")),
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
        emission_no = str(row.get("EMISSION_FACILITY_NO", "")).strip()
        emission_name = str(row.get("EMISSION_FACILITY_NAME", "")).strip()
        emission_capacity = str(row.get("EMISSION_CAPACITY", "")).strip()

        emission_key = (emission_no, emission_name, emission_capacity)
        if emission_key not in seen_emissions:
            seen_emissions.add(emission_key)
            emission_parts.append(
                f"({emission_no}) {emission_name}({emission_capacity})*1"
            )

        prevention_no = str(row.get("PREVENTION_FACILITY_NO", "")).strip()
        prevention_name = str(row.get("PREVENTION_METHOD", "")).strip()
        prevention_capacity = str(row.get("PREVENTION_CAPACITY", "")).strip()

        prevention_key = (prevention_no, prevention_name, prevention_capacity)
        if prevention_key not in seen_preventions:
            seen_preventions.add(prevention_key)
            prevention_parts.append(
                f"({prevention_no}) {prevention_name}({prevention_capacity})*1"
            )

    return ", ".join(emission_parts + prevention_parts)


def calculate_application(data: Dict[str, Any]) -> Dict[str, Any]:
    install_result = compute_install_items(data)
    total_cost = install_result["total_cost"]

    subsidy_ratio = 60
    self_ratio = 40

    site_facility_status = build_site_facility_status(data)
    project_device_text = build_project_device_text(site_facility_status)

    return {
        "success": True,
        "total_cost": total_cost,
        "subsidy_ratio": subsidy_ratio,
        "self_ratio": self_ratio,
        "national_subsidy": round(total_cost * subsidy_ratio / 100),
        "self_burden": round(total_cost * self_ratio / 100),
        "sensor_rows": install_result["sensor_rows"],
        "prevention_subtotals": install_result["per_prevention_rows"],
        "install_items": install_result["install_items"],
        "site_facility_status": site_facility_status,
        "project_device_text": project_device_text,
    }