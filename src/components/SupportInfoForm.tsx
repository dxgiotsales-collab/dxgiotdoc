import { useAuth } from "@/contexts/AuthContext";

const SupportInfoForm = ({ emissions, preventions }: Props) => {
  const { token } = useAuth();
  const { runCalculation, generateDoc, project, updateSupport } = useProject();

  const supportedPreventions = useMemo(() => {
    return preventions
      .filter((p) => p.supported)
      .map((p) => ({
        facilityNo: p.facilityNo,
        type: p.type,
        outletNo: p.outletNo,
      }));
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
  const [subsidyRatio, setSubsidyRatio] = useState(project.support.subsidyRatio || 60);
  const [selfRatio, setSelfRatio] = useState(project.support.selfRatio || 40);
  const [docStatus, setDocStatus] = useState(
    project.support.docStatus || { daejin: false, energy: false, report: false },
  );
  const [docUrls, setDocUrls] = useState(project.support.docUrls || { daejin: "", energy: "", report: "" });

  const calcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1) 초기 1회만 project.support.sensors 사용
  useEffect(() => {
    if (initialized) return;

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
  }, [initialized, project.support.sensors, computeDefaults]);

  // 2) 탭2 변경 시 센서 구조 즉시 재정렬
  useEffect(() => {
    if (!initialized) return;

    setSensors((prev) =>
      sensorMaster.map((masterSensor) => {
        const existing = prev.find((s) => s.name === masterSensor.name);

        const nextQuantities: Record<string, number> = {};
        for (const p of supportedPreventions) {
          nextQuantities[p.facilityNo] =
            existing?.quantities?.[p.facilityNo] ?? computeDefaults[masterSensor.name]?.[p.facilityNo] ?? 0;
        }

        return {
          name: masterSensor.name,
          unitPrice: masterSensor.unitPrice,
          quantities: nextQuantities,
          basis: existing?.basis ?? "",
        };
      }),
    );
  }, [initialized, JSON.stringify(computeDefaults), JSON.stringify(supportedPreventions)]);

  useEffect(() => {
    if (initialized) {
      updateSupport({ sensors, subsidyRatio, selfRatio });
    }
  }, [sensors, subsidyRatio, selfRatio, initialized, updateSupport]);

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

  const triggerCalc = () => {
    if (calcTimerRef.current) clearTimeout(calcTimerRef.current);

    calcTimerRef.current = setTimeout(async () => {
      setCalculating(true);

      const res = await runCalculation(token);

      if (res && res.sensor_rows && Array.isArray(res.sensor_rows)) {
        const mappedSensors = res.sensor_rows.map((row: any) => {
          const quantities: Record<string, number> = {};

          supportedPreventions.forEach((p, idx) => {
            quantities[p.facilityNo] = row.prevention_qtys?.[idx] ?? 0;
          });

          const prevSensor = sensors.find((s) => s.name === row.ITEM_NAME);

          return {
            name: row.ITEM_NAME,
            unitPrice: row.ITEM_UNIT_PRICE,
            quantities,
            basis: prevSensor?.basis ?? row.basis_text ?? "",
          };
        });

        setSensors(mappedSensors);
      }

      if (res) {
        updateSupport({
          subsidyRatio: res.subsidy_ratio ?? project.support.subsidyRatio,
          selfRatio: res.self_ratio ?? project.support.selfRatio,
        });
      }

      setCalculating(false);
    }, 800);
  };

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
                className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                  docStatus[key] ? "bg-primary/10 text-primary font-medium" : "bg-muted text-muted-foreground"
                }`}
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
