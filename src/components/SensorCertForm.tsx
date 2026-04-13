import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE = "https://doc.dxg.kr";

const SENSOR_TYPES = [
  "전류계",
  "온도계",
  "차압계",
  "ph계",
  "gateway",
  "vpn",
] as const;

export type SensorRecord = {
  id: number;
  sensorType: string;
  modelName: string;
  spec: string;
  fileName: string;
};

type SensorCertFormProps = {
  records: SensorRecord[];
  setRecords: React.Dispatch<React.SetStateAction<SensorRecord[]>>;
};

const thClass =
  "px-3 py-2 text-xs font-medium text-muted-foreground text-left bg-muted/50 border-b border-border whitespace-nowrap";
const tdClass = "px-3 py-2 border-b border-border text-sm text-foreground";

const SensorCertForm = ({ records, setRecords }: SensorCertFormProps) => {
  const { token } = useAuth();

  const [sensorType, setSensorType] = useState("");
  const [modelName, setModelName] = useState("");
  const [spec, setSpec] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // 탭 진입 시 목록 조회
  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/certificates/list`, { headers });
      if (!res.ok) {
        const text = await res.text().catch(() => "Unknown error");
        throw new Error(`목록 조회 실패 (${res.status}): ${text}`);
      }
      const data = await res.json();
      const certs = (data.certificates ?? []) as Array<{
        sensor_type?: string;
        model?: string;
        spec?: string;
        file_name?: string;
      }>;
      setRecords(
        certs.map((c, i) => ({
          id: i,
          sensorType: c.sensor_type ?? "",
          modelName: c.model ?? "",
          spec: c.spec ?? "",
          fileName: c.file_name ?? "",
        })),
      );
    } catch (error) {
      toast({
        title: "목록 조회 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type !== "application/pdf") {
      toast({
        title: "파일 형식 오류",
        description: "PDF 파일만 업로드 가능합니다.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setFile(selected);
  };

  const handleUpload = async () => {
    if (!sensorType) {
      toast({ title: "센서 타입을 선택해주세요.", variant: "destructive" });
      return;
    }
    if (!modelName.trim()) {
      toast({ title: "모델명을 입력해주세요.", variant: "destructive" });
      return;
    }
    if (!file) {
      toast({ title: "PDF 파일을 선택해주세요.", variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("sensor_type", sensorType);
      formData.append("model", modelName);
      formData.append("spec", spec);
      formData.append("file", file);

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/certificates/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "Unknown error");
        throw new Error(`업로드 실패 (${res.status}): ${text}`);
      }

      toast({
        title: "업로드 성공",
        description: `${file.name} 파일이 등록되었습니다.`,
        className: "bg-primary text-primary-foreground border-primary",
      });

      // 입력 초기화
      setSensorType("");
      setModelName("");
      setSpec("");
      setFile(null);
      const fileInput = document.getElementById("sensor-pdf-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // 목록 새로고침
      await fetchRecords();
    } catch (error) {
      toast({
        title: "업로드 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (record: SensorRecord) => {
    setDeletingId(record.id);
    try {
      const formData = new FormData();
      formData.append("sensor_type", record.sensorType);
      formData.append("model", record.modelName);
      formData.append("spec", record.spec);

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/certificates/delete`, {
        method: "DELETE",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "Unknown error");
        throw new Error(`삭제 실패 (${res.status}): ${text}`);
      }

      toast({
        title: "삭제 완료",
        description: `${record.sensorType} - ${record.modelName} 항목이 삭제되었습니다.`,
      });

      // 목록 새로고침
      await fetchRecords();
    } catch (error) {
      toast({
        title: "삭제 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* 섹션 1: 센서 등록 */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-5 space-y-4">
        <h2 className="dxg-section-title">1. 센서 등록</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 센서 타입 */}
          <div className="space-y-1.5">
            <label className="dxg-label">센서 타입</label>
            <Select value={sensorType} onValueChange={setSensorType}>
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue placeholder="센서 타입 선택" />
              </SelectTrigger>
              <SelectContent>
                {SENSOR_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 모델명 */}
          <div className="space-y-1.5">
            <label className="dxg-label">모델명</label>
            <input
              type="text"
              className="dxg-input w-full"
              placeholder="모델명 입력"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
          </div>

          {/* 사양 */}
          <div className="space-y-1.5">
            <label className="dxg-label">사양</label>
            <input
              type="text"
              className="dxg-input w-full"
              placeholder="사양 입력"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
            />
          </div>

          {/* 파일 업로드 */}
          <div className="space-y-1.5">
            <label className="dxg-label">성적서 파일 (PDF)</label>
            <input
              id="sensor-pdf-input"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="dxg-input w-full text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            className="h-9 px-6 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleUpload}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            {uploading ? "업로드 중..." : "업로드"}
          </Button>
        </div>
      </div>

      {/* 섹션 2: 센서 등록사항 */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-5 space-y-3">
        <h2 className="dxg-section-title">2. 센서 등록사항</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className={thClass}>센서명</th>
                <th className={thClass}>모델명</th>
                <th className={thClass}>사양</th>
                <th className={thClass}>등록된 성적서 파일명</th>
                <th className={thClass + " text-center"}>삭제</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    목록을 불러오는 중...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    등록된 센서가 없습니다.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id}>
                    <td className={tdClass + " font-medium whitespace-nowrap"}>{r.sensorType}</td>
                    <td className={tdClass}>{r.modelName}</td>
                    <td className={tdClass}>{r.spec}</td>
                    <td className={tdClass + " text-primary"}>{r.fileName}</td>
                    <td className={tdClass + " text-center"}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(r)}
                        disabled={deletingId === r.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SensorCertForm;
