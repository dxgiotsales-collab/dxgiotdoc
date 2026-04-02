import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { EmissionFacility, PreventionFacility } from "@/types/facility";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  apiCalculate,
  apiGenerateDoc,
  apiGenerateMergedDoc,
  apiGetProject,
  apiGetProjects,
  apiSaveDraft,
  apiSaveFinal,
  type CalcResponse,
  type DocGenResponse,
  type ProjectListItem,
} from "@/lib/api";

// ---- Business info shape ----
export interface BusinessInfo {
  name: string;
  phone: string;
  bizNo: string;
  fax: string;
  address: string;
  email: string;
  location: string;
  ceo: string;
  industry: string;
  ceoBirth: string;
  grade: string;
  managerName: string;
  mainProduct: string;
  managerPhone: string;
  pollutants: { id: number; type: string; amount: string }[];
  lastMeasureDate: string;
  measurementItems: { id: number; pollutant: string; amount: string; unit: string; date: string }[];
  startDate: string;
  applyDate: string;
  endDate: string;
  authority: string;
  locationFile: string | File;
  layoutFile: string | File;
}

const defaultBusiness: BusinessInfo = {
  name: "",
  phone: "",
  bizNo: "",
  fax: "",
  address: "",
  email: "",
  location: "",
  ceo: "",
  industry: "",
  ceoBirth: "",
  grade: "",
  managerName: "",
  mainProduct: "",
  managerPhone: "",
  pollutants: [{ id: 1, type: "", amount: "" }],
  lastMeasureDate: "",
  measurementItems: [],
  startDate: "",
  applyDate: "",
  endDate: "",
  authority: "",
  locationFile: "",
  layoutFile: "",
};

// ---- Support info shape ----
export interface SupportInfo {
  subsidyRatio: number;
  selfRatio: number;
  sensors: {
    name: string;
    unitPrice: number;
    quantities: Record<string, number>;
    basis: string;
  }[];
  docStatus: { daejin: boolean; energy: boolean; report: boolean };
  docUrls: { daejin: string; energy: string; report: string };
}

const defaultSupport: SupportInfo = {
  subsidyRatio: 60,
  selfRatio: 40,
  sensors: [],
  docStatus: { daejin: false, energy: false, report: false },
  docUrls: { daejin: "", energy: "", report: "" },
};

// ---- Photo info ----
export interface PhotoInputs {
  [key: string]: File | null;
}

export interface ProjectState {
  projectKey: string;
  business: BusinessInfo;
  emissions: EmissionFacility[];
  preventions: PreventionFacility[];
  support: SupportInfo;
  photoInputs: PhotoInputs;
}

const defaultProject: ProjectState = {
  projectKey: "",
  business: { ...defaultBusiness },
  emissions: [
    { id: 1, outletNo: 1, facilityNo: "배1", name: "", capacity: "", unit: "", supported: false, exempt: false },
  ],
  preventions: [
    { id: 1, outletNo: 1, facilityNo: "방1", type: "", capacity: "", unit: "", installDate: "", supported: false },
  ],
  support: { ...defaultSupport },
  photoInputs: {},
};

interface ProjectContextValue {
  project: ProjectState;
  setProject: React.Dispatch<React.SetStateAction<ProjectState>>;
  updateBusiness: (partial: Partial<BusinessInfo>) => void;
  setEmissions: React.Dispatch<React.SetStateAction<EmissionFacility[]>>;
  setPreventions: React.Dispatch<React.SetStateAction<PreventionFacility[]>>;
  updateSupport: (partial: Partial<SupportInfo>) => void;
  setPhotoInputs: React.Dispatch<React.SetStateAction<PhotoInputs>>;
  resetProject: () => void;

  projectList: ProjectListItem[];
  loadProjectList: (token: string) => Promise<void>;
  loadProject: (key: string, token: string) => Promise<void>;
  saveDraft: (token: string) => Promise<void>;
  saveFinal: (token: string) => Promise<void>;
  runCalculation: (token: string) => Promise<CalcResponse | null>;
  generateDoc: (type: "daejin" | "energy" | "certificate", token: string) => Promise<DocGenResponse | null>;
  saving: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be inside ProjectProvider");
  return ctx;
};

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectState>({ ...defaultProject });
  const [projectList, setProjectList] = useState<ProjectListItem[]>([]);
  const [saving, setSaving] = useState(false);

  const updateBusiness = useCallback((partial: Partial<BusinessInfo>) => {
    setProject((p) => ({ ...p, business: { ...p.business, ...partial } }));
  }, []);

  const setEmissions: React.Dispatch<React.SetStateAction<EmissionFacility[]>> = useCallback((action) => {
    setProject((p) => ({
      ...p,
      emissions: typeof action === "function" ? action(p.emissions) : action,
    }));
  }, []);

  const setPreventions: React.Dispatch<React.SetStateAction<PreventionFacility[]>> = useCallback((action) => {
    setProject((p) => ({
      ...p,
      preventions: typeof action === "function" ? action(p.preventions) : action,
    }));
  }, []);

  const updateSupport = useCallback((partial: Partial<SupportInfo>) => {
    setProject((p) => ({ ...p, support: { ...p.support, ...partial } }));
  }, []);

  const setPhotoInputs: React.Dispatch<React.SetStateAction<PhotoInputs>> = useCallback((action) => {
    setProject((p) => ({
      ...p,
      photoInputs: typeof action === "function" ? action(p.photoInputs || {}) : action,
    }));
  }, []);

  const resetProject = useCallback(() => {
    setProject({
      projectKey: "",
      business: { ...defaultBusiness },
      emissions: [
        { id: 1, outletNo: 1, facilityNo: "배1", name: "", capacity: "", unit: "", supported: false, exempt: false },
      ],
      preventions: [
        { id: 1, outletNo: 1, facilityNo: "방1", type: "", capacity: "", unit: "", installDate: "", supported: false },
      ],
      support: { ...defaultSupport },
      photoInputs: {},
    });
  }, []);

  const getPayload = () => project;

  const getSavePayload = (saveStatus: "draft" | "final") => {
    const date = project.business?.applicationDate || "";
    const year = date ? date.slice(2, 4) : "00";

    const name = project.business?.name || "프로젝트";

    const address = project.business?.address || "";
    const districtMatch = address.match(/([가-힣]+구)/);
    const district = districtMatch ? districtMatch[1] : "미정";

    return {
      project_key: `${year}_${name}_${district}`,
      save_status: saveStatus,
      data: project,
    };
  };

  const loadProjectList = useCallback(async (token: string) => {
    try {
      const res = await apiGetProjects(token);
      setProjectList(res.items || []);
    } catch (e: unknown) {
      toast({ title: "프로젝트 목록 불러오기 실패", description: String(e), variant: "destructive" });
    }
  }, []);

  const getCalculatePayload = () => {
    const sensor_qty_overrides: Record<string, number> = {};
    const sensor_basis: Record<string, string> = {};

    for (const sensor of project.support.sensors || []) {
      if (sensor.basis) {
        sensor_basis[sensor.name] = sensor.basis;
      }

      for (const [facilityNo, qty] of Object.entries(sensor.quantities || {})) {
        const preventionIndex = project.preventions.findIndex((p) => p.facilityNo === facilityNo && p.supported);
        if (preventionIndex >= 0) {
          sensor_qty_overrides[`${sensor.name}_${preventionIndex}`] = Number(qty) || 0;
        }
      }
    }

    return {
      emission_facilities: project.emissions.map((e) => ({
        facility_no: e.facilityNo,
        facility_name: e.name,
        outlet_no: e.outletNo,
        capacity: e.capacity,
        unit: e.unit,
        is_supported: !!e.supported,
        is_exempt: !!e.exempt,
      })),
      prevention_facilities: project.preventions.map((p) => ({
        facility_no: p.facilityNo,
        facility_name: p.type === "여과 및 흡착에 의한 시설" ? "여과집진시설 및 흡착에 의한 시설(일체형)" : p.type,
        outlet_no: p.outletNo,
        capacity: p.capacity,
        unit: p.unit,
        install_date: p.installDate,
        is_supported: !!p.supported,
      })),
      pollutants: (project.business.pollutants || []).map((x) => ({
        type: x.type,
        amount: x.amount,
      })),
      sensor_qty_overrides,
      sensor_basis,
      subsidy_ratio: project.support.subsidyRatio,
      self_ratio: project.support.selfRatio,
    };
  };

  const loadProject = useCallback(async (key: string, token: string) => {
    try {
      const res = await apiGetProject(key, token);
      const proj = res.project as Record<string, unknown> | undefined;
      const data = (proj?.data as Record<string, unknown>) || {};

      const rawBusiness = (data.business as BusinessInfo) || { ...defaultBusiness };
      const { locationFile: _lf, layoutFile: _ly, ...restBusiness } = rawBusiness;
      const safeBusiness: BusinessInfo = {
        ...defaultBusiness,
        ...restBusiness,
        locationFile: "",
        layoutFile: "",
      };

      setProject({
        projectKey: (proj?.project_key as string) || key,
        business: safeBusiness,
        emissions: (data.emissions as EmissionFacility[]) || defaultProject.emissions,
        preventions: (data.preventions as PreventionFacility[]) || defaultProject.preventions,
        support: (data.support as SupportInfo) || { ...defaultSupport },
        photoInputs: (data.photoInputs as PhotoInputs) || {},
      });

      toast({ title: "프로젝트 불러오기 완료" });
    } catch (e: unknown) {
      toast({ title: "프로젝트 불러오기 실패", description: String(e), variant: "destructive" });
    }
  }, []);

  const saveDraft = useCallback(
    async (token: string) => {
      setSaving(true);
      try {
        await apiSaveDraft(getSavePayload("draft"), token);
        await loadProjectList(token);
        toast({ title: "임시저장 완료" });
      } catch (e: unknown) {
        toast({ title: "임시저장 실패", description: String(e), variant: "destructive" });
      } finally {
        setSaving(false);
      }
    },
    [project, loadProjectList],
  );

  const saveFinal = useCallback(
    async (token: string) => {
      setSaving(true);
      try {
        await apiSaveFinal(getSavePayload("final"), token);
        await loadProjectList(token);
        toast({ title: "최종저장 완료" });
      } catch (e: unknown) {
        toast({ title: "최종저장 실패", description: String(e), variant: "destructive" });
      } finally {
        setSaving(false);
      }
    },
    [project, loadProjectList],
  );

  const runCalculation = useCallback(
    async (token: string): Promise<CalcResponse | null> => {
      try {
        return await apiCalculate(getCalculatePayload(), token);
      } catch (e: unknown) {
        toast({ title: "계산 요청 실패", description: String(e), variant: "destructive" });
        return null;
      }
    },
    [project],
  );

  const generateDoc = useCallback(
    async (type: "daejin" | "energy" | "certificate", token: string): Promise<DocGenResponse | null> => {
      try {
        const payload = getPayload();

        // Run calculation first to get install_items, sensor_rows, totals, etc.
        const calcPayload = getCalculatePayload();
        const calcResult = await apiCalculate(calcPayload, token);
        console.log("DOC_GEN calc result for payload merge =", calcResult);

        const res =
          type === "daejin" || type === "energy"
            ? await apiGenerateMergedDoc(type, payload, token, user, calcResult)
            : await apiGenerateDoc(type, payload, token, user, calcResult);

        if (res.success) {
          const key = type === "certificate" ? "report" : type;
          setProject((p) => ({
            ...p,
            support: {
              ...p.support,
              docStatus: { ...p.support.docStatus, [key]: true },
              docUrls: { ...p.support.docUrls, [key]: res.download_url || "" },
            },
          }));
          toast({ title: `${type} 문서 생성 완료` });
        }

        return res;
      } catch (e: unknown) {
        toast({
          title: "문서 생성 실패",
          description: String(e),
          variant: "destructive",
        });
        return null;
      }
    },
    [project, user],
  );

  return (
    <ProjectContext.Provider
      value={{
        project,
        setProject,
        updateBusiness,
        setEmissions,
        setPreventions,
        updateSupport,
        setPhotoInputs,
        resetProject,
        projectList,
        loadProjectList,
        loadProject,
        saveDraft,
        saveFinal,
        runCalculation,
        generateDoc,
        saving,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
