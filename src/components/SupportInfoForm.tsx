import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { EmissionFacility, PreventionFacility } from "@/types/facility";

const thClass = "px-3 py-2 text-xs font-medium text-muted-foreground text-center bg-muted/50 border-b border-border whitespace-nowrap";
const tdClass = "px-2 py-1.5 border-b border-border text-center text-sm";

interface SensorRow {
  name: string;
  unitPrice: number;
  quantities: Record<string, number>; // key = facilityNo (방1, 방2...)
  basis: string;
}

const defaultSensors: Omit<SensorRow, "quantities">[] = [
  { name: "온도센서", unitPrice: 150000, basis: "대기환경보전법 시행규칙 별표8" },
  { name: "차압센서", unitPrice: 200000, basis: "대기환경보전법 시행규칙 별표8" },
  { name: "압력센서", unitPrice: 180000, basis: "대기환경보전법 시행규칙 별표8" },
  { name: "유량센서", unitPrice: 250000, basis: "대기환경보전법 시행규칙 별표8" },
  { name: "전류센서", unitPrice: 120000, basis: "대기환경보전법 시행규칙 별표8" },
  { name: "pH센서", unitPrice: 300000, basis: "대기환경보전법 시행규칙 별표8" },
  { name: "GATEWAY", unitPrice: 500000, basis: "IoT 데이터 수집" },
];

const commaFormat = (n: number) => n.toLocaleString("ko-KR");

interface Props {
  emissions: EmissionFacility[];
  preventions: PreventionFacility[];
}

const SupportInfoForm = ({ preventions }: Props) => {
  const supportedPreventions = useMemo(
    () => preventions.filter((p) => p.supported),
    [preventions]
  );

  // Sensor table state
  const [sensors, setSensors] = useState<SensorRow[]>(() =>
    defaultSensors.map((s) => ({
      ...s,
      quantities: {},
    }))
  );

  // Subsidy ratios
  const [subsidyRatio, setSubsidyRatio] = useState(60);
  const [selfRatio, setSelfRatio] = useState(40);

  // Update sensor quantity for a specific prevention facility
  const updateQty = (sensorIdx: number, facilityNo: string, value: number) => {
    setSensors((prev) =>
      prev.map((s, i) =>
        i === sensorIdx
          ? { ...s, quantities: { ...s.quantities, [facilityNo]: value } }
          : s
      )
    );
  };

  // Update basis text
  const updateBasis = (sensorIdx: number, value: string) => {
    setSensors((prev) =>
      prev.map((s, i) => (i === sensorIdx ? { ...s, basis: value } : s))
    );
  };

  // Compute totals
  const sensorTotals = useMemo(() => {
    return sensors.map((s) => {
      const totalQty = supportedPreventions.reduce(
        (sum, p) => sum + (s.quantities[p.facilityNo] || 0),
        0
      );
      const amount = totalQty * s.unitPrice;
      return { totalQty, amount };
    });
  }, [sensors, supportedPreventions]);

  const totalCost = useMemo(
    () => sensorTotals.reduce((sum, t) => sum + t.amount, 0),
    [sensorTotals]
  );

  const subsidyAmount = Math.floor(totalCost * (subsidyRatio / 100));
  const selfAmount = Math.floor(totalCost * (selfRatio / 100));

  // Document generation status
  const [docStatus, setDocStatus] = useState({
    daejin: false,
    energy: false,
    report: false,
  });

  return (
    <div className="space-y-6 max-w-full">
      {/* Section 1: 지원사업 금액 */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-5 space-y-3">
        <h2 className="dxg-section-title">1. 지원사업 금액</h2>
        <div className="flex items-end gap-4 flex-wrap">
          {/* 총 사업비 */}
          <div className="space-y-1">
            <label className="dxg-label">총 사업비</label>
            <div className="dxg-input w-44 flex items-center bg-muted/30 text-foreground font-medium cursor-default">
              {commaFormat(totalCost)}
            </div>
          </div>
          {/* 지원금 비율 */}
          <div className="space-y-1">
            <label className="dxg-label">지원금 비율 (%)</label>
            <input
              type="number"
              className="dxg-input w-24 text-center"
              value={subsidyRatio}
              onChange={(e) => setSubsidyRatio(Number(e.target.value) || 0)}
            />
          </div>
          {/* 지원금 금액 */}
          <div className="space-y-1">
            <label className="dxg-label">지원금 금액</label>
            <div className="dxg-input w-44 flex items-center bg-muted/30 text-foreground font-medium cursor-default">
              {commaFormat(subsidyAmount)}
            </div>
          </div>
          {/* 자부담 비율 */}
          <div className="space-y-1">
            <label className="dxg-label">자부담 비율 (%)</label>
            <input
              type="number"
              className="dxg-input w-24 text-center"
              value={selfRatio}
              onChange={(e) => setSelfRatio(Number(e.target.value) || 0)}
            />
          </div>
          {/* 자부담 금액 */}
          <div className="space-y-1">
            <label className="dxg-label">자부담 금액</label>
            <div className="dxg-input w-44 flex items-center bg-muted/30 text-foreground font-medium cursor-default">
              {commaFormat(selfAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: 센서 종류 및 수량 */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-5 space-y-3">
        <h2 className="dxg-section-title">2. 센서 종류 및 수량</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className={thClass}>센서명</th>
                <th className={thClass}>센서단가</th>
                <th className={thClass}>총 수량</th>
                {supportedPreventions.map((p) => (
                  <th key={p.facilityNo} className={thClass}>
                    {p.facilityNo}
                  </th>
                ))}
                <th className={thClass + " min-w-[240px]"}>측정기기 부착근거</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map((sensor, si) => {
                const totals = sensorTotals[si];
                return (
                  <tr key={si}>
                    <td className={tdClass + " font-medium text-foreground whitespace-nowrap"}>
                      {sensor.name}
                    </td>
                    <td className={tdClass}>{commaFormat(sensor.unitPrice)}</td>
                    <td className={tdClass + " font-medium text-foreground"}>
                      {totals.totalQty}
                    </td>
                    {supportedPreventions.map((p) => (
                      <td key={p.facilityNo} className={tdClass}>
                        <input
                          type="number"
                          className="dxg-input w-16 text-center"
                          min={0}
                          value={sensor.quantities[p.facilityNo] || 0}
                          onChange={(e) =>
                            updateQty(si, p.facilityNo, Number(e.target.value) || 0)
                          }
                        />
                      </td>
                    ))}
                    <td className={tdClass}>
                      <input
                        type="text"
                        className="dxg-input w-full min-w-[200px] text-left"
                        value={sensor.basis}
                        onChange={(e) => updateBasis(si, e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
              {/* Total row */}
              <tr className="bg-muted/30">
                <td className={tdClass + " font-semibold text-foreground"}>합계</td>
                <td className={tdClass}>-</td>
                <td className={tdClass + " font-semibold text-foreground"}>
                  {sensorTotals.reduce((s, t) => s + t.totalQty, 0)}
                </td>
                {supportedPreventions.map((p) => (
                  <td key={p.facilityNo} className={tdClass + " font-medium text-foreground"}>
                    {sensors.reduce(
                      (sum, s) => sum + (s.quantities[p.facilityNo] || 0),
                      0
                    )}
                  </td>
                ))}
                <td className={tdClass + " font-semibold text-foreground"}>
                  금액 합계: {commaFormat(totalCost)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {supportedPreventions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            시설 정보 탭에서 방지시설의 지원대상을 체크해주세요.
          </p>
        )}
      </div>

      {/* Section 3: 문서 생성 */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-5 space-y-3">
        <h2 className="dxg-section-title">3. 문서 생성</h2>
        <div className="flex items-center gap-6 flex-wrap">
          {/* 대진테크노파크 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-sm"
              onClick={() => setDocStatus((s) => ({ ...s, daejin: true }))}
            >
              대진테크노파크
            </Button>
            <span
              className={`text-xs px-2 py-1 rounded ${
                docStatus.daejin
                  ? "bg-primary/10 text-primary font-medium"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {docStatus.daejin ? "생성완료" : "생성대기"}
            </span>
          </div>

          {/* 에너지진흥원 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-sm"
              onClick={() => setDocStatus((s) => ({ ...s, energy: true }))}
            >
              에너지진흥원
            </Button>
            <span
              className={`text-xs px-2 py-1 rounded ${
                docStatus.energy
                  ? "bg-primary/10 text-primary font-medium"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {docStatus.energy ? "생성완료" : "생성대기"}
            </span>
          </div>

          {/* 성적서 PDF */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-sm"
              onClick={() => setDocStatus((s) => ({ ...s, report: true }))}
            >
              성적서 PDF
            </Button>
            <span
              className={`text-xs px-2 py-1 rounded ${
                docStatus.report
                  ? "bg-primary/10 text-primary font-medium"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {docStatus.report ? "생성완료" : "생성대기"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportInfoForm;
