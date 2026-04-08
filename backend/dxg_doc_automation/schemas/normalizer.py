from schemas.data_schema import (
    DocumentRequest,
    ProjectInfo,
    DeviceItem,
    SensorItem,
    PreventionSection,
)

def build_document_request(form_data: dict) -> DocumentRequest:
    project_info = ProjectInfo(
        company_name=form_data.get("company_name", ""),
        business_no=form_data.get("business_no", ""),
        site_name=form_data.get("site_name", ""),
        representative_name=form_data.get("representative_name", ""),
        address=form_data.get("address", ""),
        contact_name=form_data.get("contact_name", ""),
        contact_phone=form_data.get("contact_phone", ""),
    )

    device_list = [
        DeviceItem(**item) for item in form_data.get("device_list", [])
    ]
    sensor_list = [
        SensorItem(**item) for item in form_data.get("sensor_list", [])
    ]
    prevention_sections = [
        PreventionSection(**item) for item in form_data.get("prevention_sections", [])
    ]

    return DocumentRequest(
        document_code=form_data.get("document_code", ""),
        project_info=project_info,
        device_list=device_list,
        sensor_list=sensor_list,
        prevention_sections=prevention_sections,
        extra_fields=form_data.get("extra_fields", {}),
    )