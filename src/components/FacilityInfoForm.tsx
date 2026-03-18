import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface EmissionFacility {
  id: number;
  outletNo: number;
  facilityNo: string;
  name: string;
  capacity: string;
  unit: string;
  supported: boolean;
  exempt: boolean;
}

interface PreventionFacility {
  id: number;
  outletNo: number;
  facilityNo: string;
  type: string;
  capacity: string;
  unit: string;
  installDate: string;
  supported: boolean;
}

const unitOptions = ["HP", "㎥", "㎥/분", "KW", "ton"];

const preventionTypes = [
  "여과집진시설",
  "흡착에 의한 시설",
  "원심력 집진시설",
  "세정집진시설",
  "전기집진시설",
  "흡수에 의한 시설",
  "여과 및 흡착에 의한 시설",
];

const thClass = "px-3 py-2 text-xs font-medium text-muted-foreground text-left bg-muted/50 border-b border-border whitespace-nowrap";
const tdClass = "px-2 py-1.5 border-b border-border";

const getDetailLabels = (type: string): string[] => {
  if (["여과집진시설", "흡착에 의한 시설", "여과 및 흡착에 의한 시설"].includes(type)) {
    return ["온도계 설치 위치", "차압계 IN 설치 위치", "차압계 OUT 설치 위치"];
  }
  if (type === "세정집진시설") {
    return ["펌프전류계 제어판넬 외함", "펌프전류계 제어판넬 내부"];
  }
  if (type === "전기집진시설") {
    return ["고압전류계 제어판넬 외함", "고압전류계 제어판넬 내부"];
  }
  if (type === "흡수에 의한 시설") {
    return ["pH계 설치 위치", "펌프전류계 제어판넬 외함", "펌프전류계 제어판넬 내부"];
  }
  return [];
};

const FacilityInfoForm = () => {
  const [emissions, setEmissions] = useState<EmissionFacility[]>([
    { id: 1, outletNo: 1, facilityNo: "배1", name: "", capacity: "", unit: "", supported: false, exempt: false },
  ]);
  const [preventions, setPreventions] = useState<PreventionFacility[]>([
    { id: 1, outletNo: 1, facilityNo: "방1", type: "", capacity: "", unit: "", installDate: "", supported: false },
  ]);

  let emissionCounter = emissions.length;
  let preventionCounter = preventions.length;

  const addEmission = () => {
    emissionCounter++;
    setEmissions((prev) => [
      ...prev,
      { id: Date.now(), outletNo: prev.length + 1, facilityNo: `배${prev.length + 1}`, name: "", capacity: "", unit: "", supported: false, exempt: false },
    ]);
  };

  const removeEmission = (id: number) => {
    setEmissions((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  };

  const updateEmission = (id: number, field: keyof EmissionFacility, value: string | boolean | number) => {
    setEmissions((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const addPrevention = () => {
    preventionCounter++;
    setPreventions((prev) => [
      ...prev,
      { id: Date.now(), outletNo: prev.length + 1, facilityNo: `방${prev.length + 1}`, type: "", capacity: "", unit: "", installDate: "", supported: false },
    ]);
  };

  const removePrevention = (id: number) => {
    setPreventions((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  };

  const updatePrevention = (id: number, field: keyof PreventionFacility, value: string | boolean | number) => {
    setPreventions((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const prevCommonLabels = [
    "방지시설 전경",
    "GATE WAY 설치 위치",
    "송풍전류계 제어판넬 외함",
    "송풍전류계 제어판넬 내부",
  ];

  const emLabels = [
    "배출시설 전경",
    "배출 제어판넬 외함",
    "배출 제어판넬 내부",
  ];

  const renderAttachRow = (label: string, key: string) => (
    <div key={key} className="flex items-center justify-between gap-2">
      <span className="text-xs truncate">{label}</span>
      <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs shrink-0">첨부파일</Button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-full">
      {/* Section 1 */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-5 space-y-3">
        <h2 className="dxg-section-title">1. 배출시설</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className={thClass}>배출구 번호</th>
                <th className={thClass}>배출시설 번호</th>
                <th className={thClass}>시설명</th>
                <th className={thClass}>용량</th>
                <th className={thClass}>단위</th>
                <th className={thClass}>지원대상</th>
                <th className={thClass}>면제</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {emissions.map((row) => (
                <tr key={row.id}>
                  <td className={tdClass}>
                    <input type="number" className="dxg-input w-16 text-center" value={row.outletNo} onChange={(e) => updateEmission(row.id, "outletNo", Number(e.target.value))} />
                  </td>
                  <td className={tdClass}>
                    <input type="text" className="dxg-input w-16 text-center" value={row.facilityNo} readOnly />
                  </td>
                  <td className={tdClass}>
                    <input type="text" className="dxg-input w-full min-w-[120px]" placeholder="시설명" value={row.name} onChange={(e) => updateEmission(row.id, "name", e.target.value)} />
                  </td>
                  <td className={tdClass}>
                    <input type="text" className="dxg-input w-20" placeholder="용량" value={row.capacity} onChange={(e) => updateEmission(row.id, "capacity", e.target.value)} />
                  </td>
                  <td className={tdClass}>
                    <select className="dxg-input w-20" value={row.unit} onChange={(e) => updateEmission(row.id, "unit", e.target.value)}>
                      <option value="">선택</option>
                      {unitOptions.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </td>
                  <td className={tdClass + " text-center"}>
                    <Checkbox checked={row.supported} onCheckedChange={(v) => updateEmission(row.id, "supported", !!v)} />
                  </td>
                  <td className={tdClass + " text-center"}>
                    <Checkbox checked={row.exempt} onCheckedChange={(v) => updateEmission(row.id, "exempt", !!v)} />
                  </td>
                  <td className={tdClass}>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeEmission(row.id)} disabled={emissions.length === 1}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addEmission}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          배출시설 추가
        </Button>
      </div>

      {/* Section 2 */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-5 space-y-3">
        <h2 className="dxg-section-title">2. 방지시설</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className={thClass}>배출구 번호</th>
                <th className={thClass}>방지시설 번호</th>
                <th className={thClass}>시설종류</th>
                <th className={thClass}>용량</th>
                <th className={thClass}>단위</th>
                <th className={thClass}>설치일자</th>
                <th className={thClass}>지원대상</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {preventions.map((row) => (
                <tr key={row.id}>
                  <td className={tdClass}>
                    <input type="number" className="dxg-input w-16 text-center" value={row.outletNo} onChange={(e) => updatePrevention(row.id, "outletNo", Number(e.target.value))} />
                  </td>
                  <td className={tdClass}>
                    <input type="text" className="dxg-input w-16 text-center" value={row.facilityNo} readOnly />
                  </td>
                  <td className={tdClass}>
                    <select className="dxg-input min-w-[180px]" value={row.type} onChange={(e) => updatePrevention(row.id, "type", e.target.value)}>
                      <option value="">선택하세요</option>
                      {preventionTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td className={tdClass}>
                    <input type="text" className="dxg-input w-20" placeholder="용량" value={row.capacity} onChange={(e) => updatePrevention(row.id, "capacity", e.target.value)} />
                  </td>
                  <td className={tdClass}>
                    <select className="dxg-input w-20" value={row.unit} onChange={(e) => updatePrevention(row.id, "unit", e.target.value)}>
                      <option value="">선택</option>
                      {unitOptions.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </td>
                  <td className={tdClass}>
                    <input type="text" className="dxg-input w-28" placeholder="2026-01-01" value={row.installDate} onChange={(e) => updatePrevention(row.id, "installDate", e.target.value)} />
                  </td>
                  <td className={tdClass + " text-center"}>
                    <Checkbox checked={row.supported} onCheckedChange={(v) => updatePrevention(row.id, "supported", !!v)} />
                  </td>
                  <td className={tdClass}>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removePrevention(row.id)} disabled={preventions.length === 1}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addPrevention}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          방지시설 추가
        </Button>
      </div>

      {/* Section 3 */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-5 space-y-3">
        <h2 className="dxg-section-title">3. 지원사업 신청대상 시설정보</h2>
        {(() => {
          const eligibleEmissions = emissions.filter((e) => e.supported && !e.exempt);
          const eligiblePreventions = preventions.filter((p) => p.supported);

          const rows = eligibleEmissions
            .map((e) => {
              const matchedPrev = eligiblePreventions.find((p) => p.outletNo === e.outletNo);
              return {
                outletNo: e.outletNo,
                emissionFacilityNo: e.facilityNo,
                emissionName: e.name || "-",
                emissionCapacity: e.capacity || "-",
                emissionQty: 1,
                prevNo: matchedPrev?.facilityNo || "-",
                prevType: matchedPrev?.type || "-",
                prevCapacity: matchedPrev?.capacity || "-",
                prevQty: matchedPrev ? 1 : 0,
              };
            })
            .sort((a, b) => a.outletNo - b.outletNo || a.emissionFacilityNo.localeCompare(b.emissionFacilityNo));

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className={thClass + " text-center"}>배출구</th>
                    <th className={thClass + " text-center"}>배출시설 번호</th>
                    <th className={thClass + " text-center"}>배출시설명</th>
                    <th className={thClass + " text-center"}>배출시설 용량</th>
                    <th className={thClass + " text-center"}>배출시설 수량</th>
                    <th className={thClass + " text-center"}>방지시설 번호</th>
                    <th className={thClass + " text-center"}>방지시설 종류</th>
                    <th className={thClass + " text-center"}>방지시설 용량</th>
                    <th className={thClass + " text-center"}>방지시설 수량</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? rows.map((r, i) => (
                    <tr key={i}>
                      <td className={tdClass + " text-center"}>{r.outletNo}</td>
                      <td className={tdClass + " text-center"}>{r.emissionFacilityNo}</td>
                      <td className={tdClass + " text-center"}>{r.emissionName}</td>
                      <td className={tdClass + " text-center"}>{r.emissionCapacity}</td>
                      <td className={tdClass + " text-center"}>{r.emissionQty}</td>
                      <td className={tdClass + " text-center"}>{r.prevNo}</td>
                      <td className={tdClass + " text-center"}>{r.prevType}</td>
                      <td className={tdClass + " text-center"}>{r.prevCapacity}</td>
                      <td className={tdClass + " text-center"}>{r.prevQty || "-"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={9} className={tdClass + " text-center text-muted-foreground"}>지원대상이 선택되고 면제가 아닌 시설이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Section 4 */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-5 space-y-3">
        <h2 className="dxg-section-title">4. 사진 첨부</h2>
        {(() => {
          const eligiblePreventions = preventions.filter((p) => p.supported);

          if (eligiblePreventions.length === 0) {
            return <p className="text-sm text-muted-foreground">지원대상 방지시설이 없습니다.</p>;
          }

          return eligiblePreventions.map((prev, bi) => {
            const detailLabels = getDetailLabels(prev.type);
            const maxRows = Math.max(prevCommonLabels.length, detailLabels.length, emLabels.length);
            return (
              <div key={bi} className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  배출구 {prev.outletNo} / {prev.facilityNo} / {prev.type || "-"}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className={thClass + " text-center"}>○ 방지시설 ○</th>
                        <th className={thClass + " text-center"}>○ 방지시설 상세 ○</th>
                        <th className={thClass + " text-center"}>○ 배출시설 ○</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: maxRows }).map((_, i) => (
                        <tr key={i}>
                          <td className={tdClass}>
                            {prevCommonLabels[i] ? renderAttachRow(prevCommonLabels[i], `prev-${bi}-${i}`) : null}
                          </td>
                          <td className={tdClass}>
                            {detailLabels[i] ? renderAttachRow(detailLabels[i], `detail-${bi}-${i}`) : null}
                          </td>
                          <td className={tdClass}>
                            {emLabels[i] ? renderAttachRow(emLabels[i], `em-${bi}-${i}`) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
};

export default FacilityInfoForm;
