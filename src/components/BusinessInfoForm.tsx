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
  date,
  onSelect,
}: {
  label: string;
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
          {date ? format(date, "yyyy-MM-dd") : "날짜 선택"}
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

  const updatePollutant = (
    id: number,
    field: "type" | "amount",
    value: string
  ) => {
    setPollutants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  return (
    <div className="max-w-5xl space-y-10">
      {/* Section 1 */}
      <section>
        <h2 className="dxg-section-title mb-6">1. 사업장 기본정보</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div className="space-y-1.5">
            <label className="dxg-label">사업장 명</label>
            <input type="text" className="dxg-input" placeholder="사업장명을 입력하세요" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">사업자 등록번호</label>
            <input type="text" className="dxg-input" placeholder="000-00-00000" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="dxg-label">사업장 주소</label>
            <input type="text" className="dxg-input" placeholder="주소를 입력하세요" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">사업장 소재지</label>
            <input
              type="text"
              className="dxg-input bg-muted"
              placeholder="주소 입력 시 자동 반영"
              readOnly
            />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">업종</label>
            <input type="text" className="dxg-input" placeholder="업종을 입력하세요" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">종 수</label>
            <input type="text" className="dxg-input" placeholder="5종" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">주 생산품</label>
            <input type="text" className="dxg-input" placeholder="주 생산품을 입력하세요" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">대표번호</label>
            <input type="text" className="dxg-input" placeholder="02-564-3772" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">팩스번호</label>
            <input type="text" className="dxg-input" placeholder="02-564-0222" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">대표 메일주소</label>
            <input type="email" className="dxg-input" placeholder="email@example.com" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">대표자명</label>
            <input type="text" className="dxg-input" placeholder="대표자명을 입력하세요" />
          </div>
          <DateInput label="대표자 생년월일" date={birthDate} onSelect={setBirthDate} />
          <div className="space-y-1.5">
            <label className="dxg-label">담당자명</label>
            <input type="text" className="dxg-input" placeholder="담당자명을 입력하세요" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">담당자 연락처</label>
            <input type="text" className="dxg-input" placeholder="010-0000-0000" />
          </div>
        </div>
      </section>

      {/* 오염물질 */}
      <section>
        <h2 className="dxg-section-title mb-4">오염물질 정보</h2>
        <div className="space-y-3">
          {pollutants.map((p, idx) => (
            <div key={p.id} className="grid grid-cols-2 gap-x-8 gap-y-2">
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPollutant}
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-1" />
            오염물질 추가
          </Button>
        </div>
      </section>

      {/* Section 2 */}
      <section>
        <h2 className="dxg-section-title mb-6">2. 사업장 부가정보</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <DateInput
            label="최근 자가측정일"
            date={selfMeasureDate}
            onSelect={setSelfMeasureDate}
          />
          <FileInput label="사업장 위치도" />
          <DateInput
            label="지원사업 신청일자"
            date={applyDate}
            onSelect={setApplyDate}
          />
          <div className="space-y-1.5">
            <label className="dxg-label">관할기관</label>
            <input type="text" className="dxg-input" placeholder="관할기관을 입력하세요" />
          </div>
          <FileInput label="설치 배치도" />
          <div className="space-y-1.5">
            <label className="dxg-label">착공 예정일</label>
            <input type="text" className="dxg-input" placeholder="YYYY-MM-DD" />
          </div>
          <div className="space-y-1.5">
            <label className="dxg-label">준공 예정일</label>
            <input type="text" className="dxg-input" placeholder="YYYY-MM-DD" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default BusinessInfoForm;
