const API_BASE = "https://essentially-unweldable-faustino.ngrok-free.dev";

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export async function apiFetch<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ----- Auth -----
export interface LoginResponse {
  success: boolean;
  user_name: string;
  role: "admin" | "user";
  token?: string;
}

export const apiLogin = (username: string, password: string) =>
  apiFetch<LoginResponse>("/api/login", {
    method: "POST",
    body: { username, password },
  });

// ----- Projects -----
export interface ProjectListItem {
  project_key: string;
  save_status?: string;
  saved_at?: string;
  file_path?: string;
}

export const apiGetProjects = (token?: string) => apiFetch<{ items: ProjectListItem[] }>("/api/projects", { token });

export const apiGetProject = (key: string, token?: string) =>
  apiFetch<{ success: boolean; project: Record<string, unknown> }>(`/api/projects/${key}`, { token });

export const apiSaveDraft = (data: unknown, token?: string) =>
  apiFetch<{ success: boolean; message?: string }>("/api/projects/save-draft", {
    method: "POST",
    body: data,
    token,
  });

export const apiSaveFinal = (data: unknown, token?: string) =>
  apiFetch<{ success: boolean; message?: string }>("/api/projects/save-final", {
    method: "POST",
    body: data,
    token,
  });

// ----- Calculation -----
export interface CalcResponse {
  success: boolean;
  total_cost?: number;
  subsidy_ratio?: number;
  self_ratio?: number;
  national_subsidy?: number;
  self_burden?: number;
  sensor_rows?: unknown[];
  prevention_subtotals?: unknown[];
  install_items?: unknown[];
  site_facility_status?: unknown[];
  project_device_text?: string;
}

export const apiCalculate = (data: unknown, token?: string) =>
  apiFetch<CalcResponse>("/api/calculate/application", {
    method: "POST",
    body: { data },
    token,
  });

// ----- Document generation -----
export interface DocGenResponse {
  success: boolean;
  output_filename?: string;
  download_url?: string;
}

export const apiGenerateDoc = (type: "daejin" | "energy" | "certificate", data: unknown, token?: string) =>
  apiFetch<DocGenResponse>(`/api/generate/${type}`, {
    method: "POST",
    body: data,
    token,
  });

export const apiGenerateMergedDoc = (orgType: "daejin" | "energy", data: unknown, token?: string) => {
  const proj = data as Record<string, unknown> | undefined;
  const biz = (proj?.business ?? {}) as Record<string, unknown>;

  console.log("DOC_10022 proj =", proj);
  console.log("DOC_10022 biz =", biz);
  console.log("DOC_10022 biz.layoutFile =", biz.layoutFile);

  const existingImages = (proj?.images ?? {}) as Record<string, unknown>;
  const photoInputs = proj?.photoInputs ?? {};

  const rawPollutants = (biz.pollutants ?? []) as Array<{ type?: string; amount?: string }>;
  const mappedPollutants = rawPollutants.map((p) => ({
    ITEM_POLLUTANT_TYPE: p.type || "",
    ITEM_POLLUTANT_AMOUNT: p.amount || "",
  }));

  console.log("DOC_10010_B pollutants payload =", mappedPollutants);

  const requestBody = {
    org_type: orgType,
    project_data: {
      ...(proj ?? {}),
      pollutants: mappedPollutants,
      images: {
        ...existingImages,
        INSTALL_LAYOUT_FILE: biz.layoutFile || "",
        BUSINESS_LOCATION_MAP_FILE: biz.locationFile || "",
      },
    },
  };

  console.log("FULL REQUEST BODY =", requestBody);

  return apiFetch<DocGenResponse>("/api/merged/generate", {
    method: "POST",
    body: requestBody,
    token,
  });
};
