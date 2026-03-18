import { useState } from "react";
import { Plus, Upload, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Pollutant {
  id: number;
  type: string;
  amount: string;
}

const DateInput = ({
  label,
  placeholder,
  date,
  onSelect,
}: {
  label: string;
  placeholder?: string;
  date?: Date;
  onSelect: (d: Date | undefined) => void;
}) => (
  <div className="space-y-1.5">
    <label className="dxg-label">{label}</label>
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-9 border-input bg-background text-sm",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
          {date ? format(date, "yyyy-MM-dd") : (placeholder || "날짜 선택")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  </div>
);

const FileInput = ({ label }: { label: string }) => (
  <div className="space-y-1.5">
    <label className="dxg-label">{label}</label>
    <Button
      variant="outline"
      className="w-full justify-start text-left font-normal h-9 border-input bg-background text-sm text-muted-foreground"
    >
      <Upload className="mr-2 h-4 w-4 opacity-50" />
      파일 선택
    </Button>
  </div>
);

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
  <div className="space-y-1.5">
    <label className="dxg-label">{label}</label>
    <input
      type={type}
      className={cn("dxg-input", readOnly && "bg-muted")}
      placeholder={placeholder}
      readOnly={readOnly}
    />
  </div>
);

const BusinessInfoForm = () => {
  const [pollutants, setPollutants] = useState<Pollutant[]>([
    { id: 1, type: "", amount: "" },
  ]);
  const [birthDate, setBirthDate] = useState<Date>();
  const [selfMeasureDate, setSelfMeasureDate] = useState<Date>();
  const [applyDate, setApplyDate] = useState<Date>();

  const addPollutant = () => {
    setPollutants((prev) => [
      ...prev,
      { id: Date.now(), type: "", amount: "" },
    ]);
  };

  const updatePollutant = (id: number, field: "type" | "amount", value: string) => {
    setPollutants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  return (
    <div className="flex gap-8 max-w-full">
      {/* Left: Section 1 */}
      <div className="flex-1 min-w-0 space-y-6">
        <h2 className="dxg-section-title">1. 사업장 기본정보</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {/* Left column */}
          <Field label="사업장 명" placeholder="사업장명을 입력하세요" />
          <Field label="사업자 등록번호" placeholder="000-00-00000" />

          <Field label="사업장 주소" placeholder="주소를 입력하세요" />
          <Field label="업종" placeholder="업종을 입력하세요" />

          <Field label="사업장 소재지" placeholder="주소 입력 시 자동 반영" readOnly />
          <Field label="주 생산품" placeholder="주 생산품을 입력하세요" />

          <Field label="종 수" placeholder="5종" />
          <Field label="팩스번호" placeholder="02-564-0222" />

          <Field label="대표번호(전화)" placeholder="02-564-3772" />
          <Field label="대표자명" placeholder="대표자명을 입력하세요" />

          <Field label="대표 메일주소" placeholder="email@example.com" type="email" />
          <Field label="담당자명" placeholder="담당자명을 입력하세요" />

          <DateInput label="대표자 생년월일" placeholder="1999-05-10" date={birthDate} onSelect={setBirthDate} />
          <Field label="담당자 연락처" placeholder="010-7402-3772" />
        </div>

        {/* Pollutants */}
        <div className="space-y-3 pt-2">
          {pollutants.map((p, idx) => (
            <div key={p.id} className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div className="space-y-1.5">
                <label className="dxg-label">오염물질 종류 {idx + 1}</label>
                <input
                  type="text"
                  className="dxg-input"
                  placeholder="오염물질 종류"
                  value={p.type}
                  onChange={(e) => updatePollutant(p.id, "type", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="dxg-label">오염물질 발생양 {idx + 1}</label>
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
          <Button type="button" variant="outline" size="sm" onClick={addPollutant}>
            <Plus className="h-4 w-4 mr-1" />
            오염물질 추가
          </Button>
        </div>
      </div>

      {/* Right: Section 2 */}
      <div className="flex-1 min-w-0 space-y-6">
        <h2 className="dxg-section-title">2. 사업장 부가정보</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <DateInput label="최근 자가측정일" date={selfMeasureDate} onSelect={setSelfMeasureDate} />
          <FileInput label="사업장 위치도" />

          <DateInput label="지원사업 신청일자" date={applyDate} onSelect={setApplyDate} />
          <Field label="관할기관" placeholder="(재)경기환경에너지진흥원" />

          <FileInput label="설치 배치도" />
          <Field label="착공 예정일" placeholder="2026-04" />

          <Field label="준공 예정일" placeholder="2026-12" />
        </div>
      </div>
    </div>
  );
};

export default BusinessInfoForm;
