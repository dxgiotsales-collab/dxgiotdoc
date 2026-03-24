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

export const apiGenerateMergedDoc = (orgType: "daejin" | "energy", data: unknown, token?: string) =>
  apiFetch<DocGenResponse>("/api/generate/generate", {
    method: "POST",
    body: {
      org_type: orgType,
      project_data: data,
    },
    token,
  });
