from config.document_router import generate_document_by_code

data = {
    "prevention_sections": [
        {
            "prevention_name": "세정집진시설",
            "prevention_method": "세정집진시설",
            "prevention_capacity": "100 ㎥/분",
            "common_images": {
                "overview": r"C:\Users\DXG\Desktop\정은희\6. 프로젝트\(ING) 2602 app 생성을 위한 프롬포트 작성\(2차) project\sample_images\방1 여과 및 흡착에 의한 시설.png",
                "gw_location": r"C:\Users\DXG\Desktop\정은희\6. 프로젝트\(ING) 2602 app 생성을 위한 프롬포트 작성\(2차) project\sample_images\방1 여과 및 흡착에 의한 시설_gw설치위치.png",
                "fan_ctrl_panel_out": r"C:\Users\DXG\Desktop\정은희\6. 프로젝트\(ING) 2602 app 생성을 위한 프롬포트 작성\(2차) project\sample_images\송풍 제어판넬 외함.png",
                "fan_ctrl_panel_in": r"C:\Users\DXG\Desktop\정은희\6. 프로젝트\(ING) 2602 app 생성을 위한 프롬포트 작성\(2차) project\sample_images\송풍 제어판넬 내부.png",
            },
            "detail_images": {
                "pump_ctrl_panel_out": r"C:\Users\DXG\Desktop\정은희\6. 프로젝트\(ING) 2602 app 생성을 위한 프롬포트 작성\(2차) project\sample_images\방1 여과 및 흡착에 의한 시설.png",
                "pump_ctrl_panel_in": r"C:\Users\DXG\Desktop\정은희\6. 프로젝트\(ING) 2602 app 생성을 위한 프롬포트 작성\(2차) project\sample_images\방1 여과 및 흡착에 의한 시설.png",
            },
            "emissions": [
                {
                    "emission_name": "도장시설",
                    "emission_capacity": "50 ㎥/분",
                    "overview": r"C:\Users\DXG\Desktop\정은희\6. 프로젝트\(ING) 2602 app 생성을 위한 프롬포트 작성\(2차) project\sample_images\배출 분리 및 도장, 건조시설.png",
                    "ctrl_panel_out": r"C:\Users\DXG\Desktop\정은희\6. 프로젝트\(ING) 2602 app 생성을 위한 프롬포트 작성\(2차) project\sample_images\배출 제어판넬 외함.png",
                    "ctrl_panel_in": r"C:\Users\DXG\Desktop\정은희\6. 프로젝트\(ING) 2602 app 생성을 위한 프롬포트 작성\(2차) project\sample_images\배출 제어판넬 내부.png",
                }
            ],
        }
    ]
}

result = generate_document_by_code(
    doc_code="DOC_10024",
    data=data,
    template_dir=r"C:\Users\DXG\Desktop\정은희\6. 프로젝트\(ING) 2602 app 생성을 위한 프롬포트 작성\dxg_doc_automation\templates",
    output_dir=r"C:\Users\DXG\Desktop\정은희\6. 프로젝트\(ING) 2602 app 생성을 위한 프롬포트 작성\dxg_doc_automation\output",
)

print("생성 결과:", result)