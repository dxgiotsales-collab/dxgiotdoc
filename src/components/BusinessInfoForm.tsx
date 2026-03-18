import { useState } from "react";
import { Plus, Upload, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Pollutant {
  id: number;
  type: string;
  amount: string;
}

const Field = ({
  label,
  placeholder,
  readOnly,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  readOnly?: boolean;
  type?: string;
}) => (
  <div className="space-y-1">
    <label className="dxg-label">{label}</label>
    <input
      type={type}
      className={cn("dxg-input", readOnly && "bg-muted")}
      placeholder={placeholder}
      readOnly={readOnly}
    />
  </div>
);

const FileInput = ({ label }: { label: string }) => (
  <div className="space-y-1">
    <label className="dxg-label">{label}</label>
    <Button
      variant="secondary"
      size="sm"
      className="h-7 px-2.5 text-xs font-normal gap-1"
    >
      <Upload className="h-3 w-3" />
      첨부파일
    </Button>
  </div>
);

const BusinessInfoForm = () => {
  const [pollutants, setPollutants] = useState<Pollutant[]>([
    { id: 1, type: "", amount: "" },
  ]);

  const addPollutant = () => {
    setPollutants((prev) => [
      ...prev,
      { id: Date.now(), type: "", amount: "" },
    ]);
  };

  const removePollutant = (id: number) => {
    setPollutants((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  };

  const updatePollutant = (id: number, field: "type" | "amount", value: string) => {
    setPollutants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  return (
    <div className="flex gap-6 max-w-full">
      {/* Section 1 */}
      <div className="flex-1 min-w-0 rounded-lg border border-border bg-card shadow-sm p-6 space-y-4">
        <h2 className="dxg-section-title">1. 사업장 기본정보</h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
          {/* Left column */}
          <Field label="사업장 명" placeholder="사업장명을 입력하세요" />
          {/* Right column */}
          <Field label="대표번호(전화)" placeholder="02-564-3772" />

          <Field label="사업자 등록번호" placeholder="000-00-00000" />
          <Field label="대표번호(팩스)" placeholder="02-564-0222" />

          <Field label="사업장 주소" placeholder="주소를 입력하세요" />
          <Field label="대표 메일주소" placeholder="email@example.com" type="email" />

          <Field label="사업장 소재지" placeholder="주소 입력 시 자동 반영" readOnly />
          <Field label="대표자명" placeholder="대표자명을 입력하세요" />

          <Field label="업종" placeholder="업종을 입력하세요" />
          <Field label="대표자 생년월일" placeholder="1999-05-10" />

          <Field label="종 수" placeholder="5종" />
          <Field label="담당자명" placeholder="담당자명을 입력하세요" />

          <Field label="주 생산품" placeholder="주 생산품을 입력하세요" />
          <Field label="담당자 연락처" placeholder="010-7402-3772" />

          {/* Empty left cell to keep pollutants in right column area */}
          <div />
          <div className="space-y-2">
            {pollutants.map((p, idx) => (
              <div key={p.id} className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="dxg-label">오염물질 종류 {idx + 1}</label>
                  <input
                    type="text"
                    className="dxg-input"
                    placeholder="종류 입력"
                    value={p.type}
                    onChange={(e) => updatePollutant(p.id, "type", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="dxg-label">발생양 {idx + 1}</label>
                  <input
                    type="text"
                    className="dxg-input"
                    placeholder="발생양 입력"
                    value={p.amount}
                    onChange={(e) => updatePollutant(p.id, "amount", e.target.value)}
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addPollutant}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              오염물질 추가
            </Button>
          </div>
        </div>
      </div>

      {/* Section 2 */}
      <div className="flex-1 min-w-0 rounded-lg border border-border bg-card shadow-sm p-6 space-y-4">
        <h2 className="dxg-section-title">2. 사업장 부가정보</h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
          <Field label="최근 자가측정일" placeholder="2026-01-15" />
          <Field label="착공 예정일" placeholder="2026-04" />

          <Field label="지원사업 신청일자" placeholder="2026-03-01" />
          <Field label="준공 예정일" placeholder="2026-12" />

          <Field label="지원사업 관할기관" placeholder="(재)경기환경에너지진흥원" />
          <FileInput label="사업장 위치도" />

          <div />
          <FileInput label="설치 배치도" />
        </div>
      </div>
    </div>
  );
};

export default BusinessInfoForm;
