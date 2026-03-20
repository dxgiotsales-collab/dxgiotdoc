import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { EmissionFacility, PreventionFacility } from "@/types/facility";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { apiCalculate } from "@/lib/api";

const thClass =
  "px-3 py-2 text-xs font-medium text-muted-foreground text-center bg-muted/50 border-b border-border whitespace-nowrap";
const tdClass = "px-2 py-1.5 border-b border-border text-center text-sm";

const commaFormat = (n: number) => n.toLocaleString("ko-KR");

const handleCalculate = async () => {
  console.log("계산 버튼 클릭됨");
  try {
    const res = await apiCalculate({
      data: {
        emission_facilities,
        prevention_facilities,
        pollutants,
      },
    });
    console.log("계산 결과:", res);
  } catch (e) {
    console.error(e);
  }
};

<Button onClick={handleCalculate}>계산하기</Button>;

// Sensor master data
const sensorMaster = [
  { name: "전류계(세정/전기시설)", unitPrice: 300000 },
  { name: "차압계(압력계)", unitPrice: 400000 },
  { name: "온도계", unitPrice: 500000 },
  { name: "ph계", unitPrice: 1000000 },
  { name: "전류계(배출시설)", unitPrice: 300000 },
  { name: "전류계(방지시설)", unitPrice: 300000 },
  { name: "IoT게이트웨이", unitPrice: 1600000 },
  { name: "IoT게이트웨이(복수형)", unitPrice: 2080000 },
  { name: "VPN", unitPrice: 400000 },
];

const defaultBasisPlaceholder: Record<string, string> = {
  "전류계(배출시설)": "(예시) 배출구 1번 (흡수에의한시설)의 경우 배출시설 2기를 포함함",
  "전류계(방지시설)":
    "(예시) 배출구 1번 (1차)여과에의한시설 + (2차)흡착에의한시설로 송풍기 1기 현장설치 확인. 송풍기 가동 확인을 위해 전류계 1기를 설치하고자 함",
  "차압계(압력계)":
    "(예시) (1차)여과에의한시설+(2차)흡착에의한시설로 (1차)여과에의한시설은 집진시설 본체가 분리되어 있고, 내부 확인 결과 각각 차압 확인이 필요하다고 판단되어 2기를 설치하고자 함",
  온도계: "(예시) 방지시설 전단 인입배관이 두 개로 현장 확인되어 각 배관에 1기씩 총 2기를 설치하고자 함",
  ph계: "",
  IoT게이트웨이: "(예시) 외부요인(직사광선, 비 등), 눈높이, 접근성 등을 고려하여 위치를 선정함(도면 참조)",
  "IoT게이트웨이(복수형)": "(예시) 외부요인(직사광선, 비 등), 눈높이, 접근성 등을 고려하여 위치를 선정함(도면 참조)",
  VPN: "(예시) 게이트웨이(단수형) 1기 설치로, VPN 1기를 설치하고자 함.",
  "전류계(세정/전기시설)": "",
};

const prevTypeSensorMap: Record<string, Record<string, number>> = {
  여과집진시설: { "차압계(압력계)": 1, 온도계: 1, "전류계(방지시설)": 1 },
  "흡착에 의한 시설": { "차압계(압력계)": 1, 온도계: 1, "전류계(방지시설)": 1 },
  "원심력 집진시설": { "전류계(방지시설)": 1 },
  세정집진시설: { "전류계(세정/전기시설)": 1, "전류계(방지시설)": 1 },
  전기집진시설: { "전류계(세정/전기시설)": 1, "전류계(방지시설)": 1 },
  "흡수에 의한 시설": { "전류계(세정/전기시설)": 1, "전류계(방지시설)": 1, ph계: 1 },
  "여과 및 흡착에 의한 시설": { "차압계(압력계)": 1, 온도계: 1, "전류계(방지시설)": 1 },
};

interface SensorRow {
  name: string;
  unitPrice: number;
  quantities: Record<string, number>;
  basis: string;
}

interface Props {
  emissions: EmissionFacility[];
  preventions: PreventionFacility[];
}

const SupportInfoForm = ({ emissions, preventions }: Props) => {
  const { token } = useAuth();
  const { runCalculation, generateDoc, project, updateSupport } = useProject();

  const supportedPreventions = useMemo(() => {
    return preventions
      .filter((p) => p.supported)
      .map((p) => ({ facilityNo: p.facilityNo, type: p.type, outletNo: p.outletNo }));
  }, [preventions]);

  const uniqueOutletCount = useMemo(() => {
    const outlets = new Set<number>();
    for (const p of supportedPreventions) outlets.add(p.outletNo);
    return outlets.size;
  }, [supportedPreventions]);

  const emissionCountByPrev = useMemo(() => {
    const eligibleEmissions = emissions.filter((e) => e.supported && !e.exempt);
    const counts: Record<string, number> = {};
    for (const p of supportedPreventions) {
      counts[p.facilityNo] = eligibleEmissions.filter((e) => e.outletNo === p.outletNo).length;
    }
    return counts;
  }, [emissions, supportedPreventions]);

  const computeDefaults = useMemo(() => {
    const defaults: Record<string, Record<string, number>> = {};
    for (const sensor of sensorMaster) {
      defaults[sensor.name] = {};
      for (let pi = 0; pi < supportedPreventions.length; pi++) {
        const p = supportedPreventions[pi];
        let qty = 0;
        const mapping = prevTypeSensorMap[p.type];
        if (mapping && mapping[sensor.name] !== undefined) qty = mapping[sensor.name];
        if (sensor.name === "전류계(배출시설)") qty = emissionCountByPrev[p.facilityNo] || 0;
        if (sensor.name === "IoT게이트웨이") qty = pi === 0 && uniqueOutletCount === 1 ? 1 : 0;
        if (sensor.name === "IoT게이트웨이(복수형)") qty = pi === 0 && uniqueOutletCount >= 2 ? 1 : 0;
        if (sensor.name === "VPN") qty = pi === 0 ? 1 : 0;
        defaults[sensor.name][p.facilityNo] = qty;
      }
    }
    return defaults;
  }, [supportedPreventions, emissionCountByPrev, uniqueOutletCount]);

  const [sensors, setSensors] = useState<SensorRow[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    // If project context has loaded sensors from backend, use those
    if (project.support.sensors && project.support.sensors.length > 0) {
      setSensors(project.support.sensors);
    } else {
      setSensors(
        sensorMaster.map((s) => ({
          name: s.name,
          unitPrice: s.unitPrice,
          quantities: { ...(computeDefaults[s.name] || {}) },
          basis: "",
        })),
      );
    }
    setInitialized(true);
  }, [computeDefaults, project.support.sensors]);

  const [subsidyRatio, setSubsidyRatio] = useState(project.support.subsidyRatio || 60);
  const [selfRatio, setSelfRatio] = useState(project.support.selfRatio || 40);

  // Sync support state back to context
  useEffect(() => {
    if (initialized) {
      updateSupport({ sensors, subsidyRatio, selfRatio });
    }
  }, [sensors, subsidyRatio, selfRatio, initialized]);

  const updateQty = (sensorIdx: number, facilityNo: string, value: number) => {
    setSensors((prev) =>
      prev.map((s, i) => (i === sensorIdx ? { ...s, quantities: { ...s.quantities, [facilityNo]: value } } : s)),
    );
  };

  const updateBasis = (sensorIdx: number, value: string) => {
    setSensors((prev) => prev.map((s, i) => (i === sensorIdx ? { ...s, basis: value } : s)));
  };

  const sensorTotals = useMemo(() => {
    return sensors.map((s) => {
      const totalQty = supportedPreventions.reduce((sum, p) => sum + (s.quantities[p.facilityNo] || 0), 0);
      return { totalQty, amount: totalQty * s.unitPrice };
    });
  }, [sensors, supportedPreventions]);

  const totalCost = useMemo(() => sensorTotals.reduce((sum, t) => sum + t.amount, 0), [sensorTotals]);

  const prevSubtotals = useMemo(() => {
    return supportedPreventions.map((p) => {
      const subtotal = sensors.reduce((sum, s) => {
        const qty = s.quantities[p.facilityNo] || 0;
        return sum + qty * s.unitPrice;
      }, 0);
      return { facilityNo: p.facilityNo, type: p.type, subtotal };
    });
  }, [sensors, supportedPreventions]);

  const subsidyAmount = Math.floor(totalCost * (subsidyRatio / 100));
  const selfAmount = Math.floor(totalCost * (selfRatio / 100));

  const [docStatus, setDocStatus] = useState(
    project.support.docStatus || { daejin: false, energy: false, report: false },
  );
  const [docUrls, setDocUrls] = useState(project.support.docUrls || { daejin: "", energy: "", report: "" });

  // Backend calculation
  const calcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCalc = () => {
    if (calcTimerRef.current) clearTimeout(calcTimerRef.current);

    calcTimerRef.current = setTimeout(async () => {
      setCalculating(true);

      const res = await runCalculation(token);

        if (res.sensor_rows && Array.isArray(res.sensor_rows)) {
          const mappedSensors = res.sensor_rows.map((row: any) => {
            const quantities: Record<string, number> = {};
        
            supportedPreventions.forEach((p, idx) => {
              quantities[p.facilityNo] = row.prevention_qtys?.[idx] ?? 0;
            });
        
            return {
              name: row.ITEM_NAME,
              unitPrice: row.ITEM_UNIT_PRICE,
              quantities,
              basis: row.basis_text ?? "",
            };
          });
        
          setSensors(mappedSensors);
        }

        
        if (res.prevention_subtotals && Array.isArray(res.prevention_subtotals)) {
          setPrevSubtotals(res.prevention_subtotals as PrevSubtotal[]);
        }

        if (res.total_cost !== undefined) {
          setTotalCost(res.total_cost);
        }

        if (res.subsidy_ratio !== undefined) {
          setSubsidyRatio(res.subsidy_ratio);
        }

        if (res.self_ratio !== undefined) {
          setSelfRatio(res.self_ratio);
        }

        if (res.national_subsidy !== undefined) {
          setSubsidyAmount(res.national_subsidy);
        }

        if (res.self_burden !== undefined) {
          setSelfAmount(res.self_burden);
        }

        updateSupport({
          subsidyRatio: res.subsidy_ratio ?? project.support.subsidyRatio,
          selfRatio: res.self_ratio ?? project.support.selfRatio,
        });
      }

      setCalculating(false);
    }, 800);
  };

  // Trigger calculation when facility data changes
  useEffect(() => {
    if (initialized && supportedPreventions.length > 0) {
      triggerCalc();
    }
    return () => {
      if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    };
  }, [emissions, preventions, initialized]);

  const handleGenerate = async (type: "daejin" | "energy" | "certificate") => {
    const res = await generateDoc(type, token);
    if (res?.success) {
      const key = type === "certificate" ? "report" : type;
      setDocStatus((s) => ({ ...s, [key]: true }));
      setDocUrls((u) => ({ ...u, [key]: res.download_url || "" }));
    }
  };

  if (!initialized) return null;

  return (
    <div className="space-y-6 max-w-full">
      {calculating && <div className="text-xs text-muted-foreground animate-pulse">백엔드 계산 중...</div>}

      {/* Section 1: 지원사업 금액 */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-5 space-y-3">
        <h2 className="dxg-section-title">1. 지원사업 금액</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className={thClass}>구분</th>
                <th className={thClass}>사업비 금액</th>
                <th className={thClass}>지원금 비율 (%)</th>
                <th className={thClass}>지원금 금액</th>
                <th className={thClass}>자부담 비율 (%)</th>
                <th className={thClass}>자부담 금액</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-muted/30">
                <td className={tdClass + " font-semibold text-foreground whitespace-nowrap"}>총 사업비 금액</td>
                <td className={tdClass + " font-semibold text-foreground"}>{commaFormat(totalCost)}</td>
                <td className={tdClass}>
                  <input
                    type="number"
                    className="dxg-input w-20 text-center"
                    value={subsidyRatio}
                    onChange={(e) => setSubsidyRatio(Number(e.target.value) || 0)}
                  />
                </td>
                <td className={tdClass + " font-semibold text-foreground"}>{commaFormat(subsidyAmount)}</td>
                <td className={tdClass}>
                  <input
                    type="number"
                    className="dxg-input w-20 text-center"
                    value={selfRatio}
                    onChange={(e) => setSelfRatio(Number(e.target.value) || 0)}
                  />
                </td>
                <td className={tdClass + " font-semibold text-foreground"}>{commaFormat(selfAmount)}</td>
              </tr>
              {prevSubtotals.map((ps) => {
                const subSubsidy = Math.floor(ps.subtotal * (subsidyRatio / 100));
                const subSelf = Math.floor(ps.subtotal * (selfRatio / 100));
                return (
                  <tr key={ps.facilityNo}>
                    <td className={tdClass + " text-foreground whitespace-nowrap"}>
                      {ps.facilityNo} {ps.type}
                    </td>
                    <td className={tdClass + " text-foreground"}>{commaFormat(ps.subtotal)}</td>
                    <td className={tdClass + " text-muted-foreground"}>{subsidyRatio}</td>
                    <td className={tdClass + " text-foreground"}>{commaFormat(subSubsidy)}</td>
                    <td className={tdClass + " text-muted-foreground"}>{selfRatio}</td>
                    <td className={tdClass + " text-foreground"}>{commaFormat(subSelf)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                    {p.facilityNo} {p.type}
                  </th>
                ))}
                <th className={thClass + " min-w-[300px]"}>측정기기 부착근거</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map((sensor, si) => {
                const totals = sensorTotals[si];
                return (
                  <tr key={si}>
                    <td className={tdClass + " font-medium text-foreground whitespace-nowrap"}>{sensor.name}</td>
                    <td className={tdClass}>{commaFormat(sensor.unitPrice)}</td>
                    <td className={tdClass + " font-medium text-foreground"}>{totals.totalQty}</td>
                    {supportedPreventions.map((p) => (
                      <td key={p.facilityNo} className={tdClass}>
                        <input
                          type="number"
                          className="dxg-input w-16 text-center"
                          min={0}
                          value={sensor.quantities[p.facilityNo] || 0}
                          onChange={(e) => updateQty(si, p.facilityNo, Number(e.target.value) || 0)}
                        />
                      </td>
                    ))}
                    <td className={tdClass}>
                      <input
                        type="text"
                        className="dxg-input w-full min-w-[280px] text-left"
                        placeholder={defaultBasisPlaceholder[sensor.name] || ""}
                        value={sensor.basis}
                        onChange={(e) => updateBasis(si, e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-muted/30">
                <td className={tdClass + " font-semibold text-foreground"}>합계</td>
                <td className={tdClass}>-</td>
                <td className={tdClass + " font-semibold text-foreground"}>
                  {sensorTotals.reduce((s, t) => s + t.totalQty, 0)}
                </td>
                {supportedPreventions.map((p) => (
                  <td key={p.facilityNo} className={tdClass + " font-medium text-foreground"}>
                    {sensors.reduce((sum, s) => sum + (s.quantities[p.facilityNo] || 0), 0)}
                  </td>
                ))}
                <td className={tdClass + " font-semibold text-foreground"}>금액합계: {commaFormat(totalCost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {supportedPreventions.length === 0 && (
          <p className="text-sm text-muted-foreground">시설 정보 탭에서 방지시설의 지원대상을 체크해주세요.</p>
        )}
      </div>

      {/* Section 3: 문서 생성 */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-5 space-y-3">
        <h2 className="dxg-section-title">3. 문서 생성</h2>
        <div className="flex items-center gap-4">
          {[
            { key: "daejin" as const, type: "daejin" as const, label: "대진테크노파크" },
            { key: "energy" as const, type: "energy" as const, label: "에너지진흥원" },
            { key: "report" as const, type: "certificate" as const, label: "성적서 PDF" },
          ].map(({ key, type, label }) => (
            <div key={key} className="flex-1 flex items-center gap-2">
              <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => handleGenerate(type)}>
                {label}
              </Button>
              <span
                className={`text-xs px-2 py-1 rounded whitespace-nowrap ${docStatus[key] ? "bg-primary/10 text-primary font-medium" : "bg-muted text-muted-foreground"}`}
              >
                {docStatus[key] ? "생성완료" : "생성대기"}
              </span>
              {docStatus[key] && docUrls[key] && (
                <a
                  href={docUrls[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline whitespace-nowrap"
                >
                  다운로드
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SupportInfoForm;
