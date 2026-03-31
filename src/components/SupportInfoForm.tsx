import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { toast } from "@/hooks/use-toast";

type EmissionRow = {
  id: number;
  outletNo: number;
  facilityNo: string;
  name: string;
  capacity: string;
  unit: string;
  supported: boolean;
  exempt: boolean;
};

type PreventionRow = {
  id: number;
  outletNo: number;
  facilityNo: string;
  type: string;
  capacity: string;
  unit: string;
  installDate: string;
  supported: boolean;
};

type Props = {
  emissions: EmissionRow[];
  preventions: PreventionRow[];
};

type SensorRow = {
  name: string;
  unitPrice: number;
  quantities: Record<string, number>;
  basis: string;
};

type CalcResponse = {
  success?: boolean;
  subsidy_ratio?: number;
  self_ratio?: number;
  sensor_rows?: Array<{
    ITEM_NAME: string;
    ITEM_UNIT_PRICE: number;
    prevention_qtys?: number[];
    basis_text?: string;
  }>;
};

const thClass =
  "px-3 py-2 text-xs font-medium text-muted-foreground text-left bg-muted/50 border-b border-border whitespace-nowrap";
const tdClass = "px-2 py-1.5 border-b border-border";

const commaFormat = (value: number | string | undefined | null) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0";
  return num.toLocaleString("ko-KR");
};

const SupportInfoForm = ({ emissions, preventions }: Props) => {
  const { token } = useAuth();
  const { runCalculation, generateDoc, project, updateSupport } = useProject();

  const [initialized, setInitialized] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const [sensors, setSensors] = useState<SensorRow[]>(project?.support?.sensors || []);
  const [subsidyRatio, setSubsidyRatio] = useState(project?.support?.subsidyRatio || 60);
  const [selfRatio, setSelfRatio] = useState(project?.support?.selfRatio || 40);
  const [docStatus, setDocStatus] = useState(
    project?.support?.docStatus || { daejin: false, energy: false, report: false },
  );
  const [docUrls, setDocUrls] = useState(project?.support?.docUrls || { daejin: "", energy: "", report: "" });

  const calcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supportedPreventions = useMemo(() => {
    return (preventions || [])
      .filter((p) => p.supported)
      .map((p) => ({
        facilityNo: p.facilityNo,
        type: p.type,
        outletNo: p.outletNo,
      }));
  }, [preventions]);

  useEffect(() => {
    setInitialized(true);
  }, []);

  /*
  useEffect(() => {
    if (!initialized) return;
  
    updateSupport({
      sensors,
      subsidyRatio,
      selfRatio,
      docStatus,
      docUrls,
    });
  }, [sensors, subsidyRatio, selfRatio, docStatus, docUrls, initialized, updateSupport]);
  */

  const triggerCalc = useCallback(async () => {
    if (!token) return;

    setCalculating(true);

    try {
      const res = (await runCalculation(token)) as CalcResponse | null;

      if (res?.sensor_rows && Array.isArray(res.sensor_rows)) {
        const mappedSensors: SensorRow[] = res.sensor_rows.map((row) => {
          const quantities: Record<string, number> = {};

          supportedPreventions.forEach((p, idx) => {
            quantities[p.facilityNo] = row.prevention_qtys?.[idx] ?? 0;
          });
          return {
            name: row.ITEM_NAME,
            unitPrice: row.ITEM_UNIT_PRICE || 0,
            quantities,
            basis: row.basis_text ?? "",
          };
        });

        setSensors(mappedSensors);
      } else {
        setSensors([]);
      }

      if (res) {
        setSubsidyRatio(res.subsidy_ratio ?? 60);
        setSelfRatio(res.self_ratio ?? 40);
      }
    } finally {
      setCalculating(false);
    }
  }, [runCalculation, token, supportedPreventions]); // 🔥 sensors 제거

  useEffect(() => {
    if (!initialized) return;

    if (supportedPreventions.length === 0) {
      setSensors([]);
      return;
    }

    triggerCalc();
  }, [initialized, emissions, preventions, supportedPreventions, triggerCalc]);

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

      return {
        facilityNo: p.facilityNo,
        type: p.type,
        subtotal,
      };
    });
  }, [sensors, supportedPreventions]);

  const subsidyAmount = Math.floor(totalCost * (subsidyRatio / 100));
  const selfAmount = Math.floor(totalCost * (selfRatio / 100));

  const handleGenerate = async (type: "daejin" | "energy" | "certificate") => {
    const res = await generateDoc(type, token);

    if (res?.success) {
      const key = type === "certificate" ? "report" : type;
      setDocStatus((prev) => ({ ...prev, [key]: true }));
      setDocUrls((prev) => ({ ...prev, [key]: res.download_url || "" }));

      toast({
        title: `${type === "daejin" ? "대진테크노파크" : type === "energy" ? "에너지진흥원" : "성적서 PDF"} 문서 생성 완료`,
        className: "bg-primary text-primary-foreground border-primary",
      });
    }
  };

  if (!initialized) return null;

  return (
    <div className="space-y-6 max-w-full">
      {calculating && <div className="text-xs text-muted-foreground animate-pulse">백엔드 계산 중...</div>}

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
                    <td className={tdClass + " font-medium text-foreground"}>{totals?.totalQty || 0}</td>

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
                  {sensorTotals.reduce((sum, t) => sum + t.totalQty, 0)}
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

      <div className="rounded-lg border border-border bg-card shadow-sm p-5 space-y-3">
        <h2 className="dxg-section-title">3. 문서 생성</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: "daejin" as const, type: "daejin" as const, label: "대진테크노파크" },
            { key: "energy" as const, type: "energy" as const, label: "에너지진흥원" },
            { key: "report" as const, type: "certificate" as const, label: "성적서 PDF" },
          ].map(({ key, type, label }) => (
            <div key={key} className="flex flex-col gap-2">
              <Button
                className="w-full h-10 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => handleGenerate(type)}
              >
                {label} 생성
              </Button>
              <Button
                variant="outline"
                className={`w-full h-10 text-sm ${
                  docStatus[key] && docUrls[key]
                    ? "border-primary text-primary bg-background hover:bg-primary/5"
                    : "border-muted text-muted-foreground bg-muted cursor-not-allowed"
                }`}
                disabled={!docStatus[key] || !docUrls[key]}
                onClick={() => {
                  if (docUrls[key]) window.open(docUrls[key], "_blank");
                }}
              >
                <Download className="h-4 w-4 mr-1.5" />
                다운로드
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SupportInfoForm;
