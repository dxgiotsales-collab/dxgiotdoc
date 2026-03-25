import { useState, useEffect, useRef } from "react";
import { Plus, Upload, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useProject } from "@/contexts/ProjectContext";

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
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  readOnly?: boolean;
  type?: string;
  value?: string;
  onChange?: (val: string) => void;
}) => (
  <div className="space-y-1">
    <label className="dxg-label">{label}</label>
    <input
      type={type}
      className={cn("dxg-input", readOnly && "bg-muted")}
      placeholder={placeholder}
      readOnly={readOnly}
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value)}
    />
  </div>
);

const FileInput = ({
  label,
  fileName,
  onFileSelect,
}: {
  label: string;
  fileName?: string;
  onFileSelect?: (file: File) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1">
      <label className="dxg-label">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          className="dxg-input flex-1"
          placeholder="파일을 선택하세요"
          readOnly
          value={fileName || ""}
        />
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onFileSelect) onFileSelect(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2.5 shrink-0 text-muted-foreground border-input"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

const BusinessInfoForm = () => {
  const { project, updateBusiness } = useProject();
  const biz = project.business;

  const [pollutants, setPollutants] = useState<Pollutant[]>(
    biz.pollutants.length > 0 ? biz.pollutants : [{ id: 1, type: "", amount: "" }],
  );

  useEffect(() => {
    setPollutants(biz.pollutants && biz.pollutants.length > 0 ? biz.pollutants : [{ id: 1, type: "", amount: "" }]);
  }, [biz.pollutants]);

  const addPollutant = () => {
    const next = [...pollutants, { id: Date.now(), type: "", amount: "" }];
    setPollutants(next);
    updateBusiness({ pollutants: next });
  };

  const removePollutant = (id: number) => {
    if (pollutants.length <= 1) return;
    const next = pollutants.filter((p) => p.id !== id);
    setPollutants(next);
    updateBusiness({ pollutants: next });
  };

  const updatePollutant = (id: number, field: "type" | "amount", value: string) => {
    const next = pollutants.map((p) => (p.id === id ? { ...p, [field]: value } : p));
    setPollutants(next);
    updateBusiness({ pollutants: next });
  };

  const set = (key: keyof typeof biz, val: string) => updateBusiness({ [key]: val });

  return (
    <div className="flex gap-6 max-w-full">
      {/* Section 1 */}
      <div className="flex-1 min-w-0 rounded-lg border border-border bg-card shadow-sm p-6 space-y-4">
        <h2 className="dxg-section-title">1. 사업장 기본정보</h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
          <Field
            label="사업장 명"
            placeholder="사업장명을 입력하세요"
            value={biz.name}
            onChange={(v) => set("name", v)}
          />
          <Field label="대표번호(전화)" placeholder="02-564-3772" value={biz.phone} onChange={(v) => set("phone", v)} />

          <Field
            label="사업자 등록번호"
            placeholder="000-00-00000"
            value={biz.bizNo}
            onChange={(v) => set("bizNo", v)}
          />
          <Field label="대표번호(팩스)" placeholder="02-564-0222" value={biz.fax} onChange={(v) => set("fax", v)} />

          <Field
            label="사업장 주소"
            placeholder="주소를 입력하세요"
            value={biz.address}
            onChange={(v) => set("address", v)}
          />
          <Field
            label="대표 메일주소"
            placeholder="email@example.com"
            type="email"
            value={biz.email}
            onChange={(v) => set("email", v)}
          />

          <Field label="사업장 소재지" placeholder="주소 입력 시 자동 반영" readOnly value={biz.location} />
          <Field label="대표자명" placeholder="대표자명을 입력하세요" value={biz.ceo} onChange={(v) => set("ceo", v)} />

          <Field
            label="업종"
            placeholder="업종을 입력하세요"
            value={biz.industry}
            onChange={(v) => set("industry", v)}
          />
          <Field
            label="대표자 생년월일"
            placeholder="1999-05-10"
            value={biz.ceoBirth}
            onChange={(v) => set("ceoBirth", v)}
          />

          <Field label="종 수" placeholder="5종" value={biz.grade} onChange={(v) => set("grade", v)} />
          <Field
            label="담당자명"
            placeholder="담당자명을 입력하세요"
            value={biz.managerName}
            onChange={(v) => set("managerName", v)}
          />

          <Field
            label="주 생산품"
            placeholder="주 생산품을 입력하세요"
            value={biz.mainProduct}
            onChange={(v) => set("mainProduct", v)}
          />
          <Field
            label="담당자 연락처"
            placeholder="010-7402-3772"
            value={biz.managerPhone}
            onChange={(v) => set("managerPhone", v)}
          />

          <div />
          <div className="space-y-2">
            {pollutants.map((p, idx) => (
              <div key={p.id} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <label className="dxg-label">오염물질 종류 {idx + 1}</label>
                  <input
                    type="text"
                    className="dxg-input"
                    placeholder="종류 입력"
                    value={p.type}
                    onChange={(e) => updatePollutant(p.id, "type", e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="dxg-label">발생양 {idx + 1}</label>
                  <input
                    type="text"
                    className="dxg-input"
                    placeholder="발생양 입력"
                    value={p.amount}
                    onChange={(e) => updatePollutant(p.id, "amount", e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removePollutant(p.id)}
                  disabled={pollutants.length === 1}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
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
          <Field
            label="최근 자가측정일"
            placeholder="2026-01-15"
            value={biz.lastMeasureDate}
            onChange={(v) => set("lastMeasureDate", v)}
          />
          <Field
            label="착공 예정일"
            placeholder="2026-04"
            value={biz.startDate}
            onChange={(v) => set("startDate", v)}
          />

          <Field
            label="지원사업 신청일자"
            placeholder="2026-03-01"
            value={biz.applyDate}
            onChange={(v) => set("applyDate", v)}
          />
          <Field label="준공 예정일" placeholder="2026-12" value={biz.endDate} onChange={(v) => set("endDate", v)} />

          <Field
            label="지원사업 관할기관"
            placeholder="(재)경기환경에너지진흥원"
            value={biz.authority}
            onChange={(v) => set("authority", v)}
          />
          <FileInput
            label="사업장 위치도"
            fileName={biz.locationFile instanceof File ? biz.locationFile.name : biz.locationFile}
            onFileSelect={(file) => updateBusiness({ locationFile: file })}
          />

          <div />
          <FileInput
            label="설치 배치도"
            fileName={biz.layoutFile instanceof File ? biz.layoutFile.name : biz.layoutFile}
            onFileSelect={(file) => updateBusiness({ layoutFile: file })}
          />
        </div>
      </div>
    </div>
  );
};

export default BusinessInfoForm;
