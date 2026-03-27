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
  user: {
    id: string;
    name: string;
    phone: string;
    role: "admin" | "user";
  };
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

// ----- File upload -----
export interface UploadResponse {
  file_path: string;
}

export const apiUploadFile = async (file: File, token?: string): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {
    "ngrok-skip-browser-warning": "true",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Upload ${res.status}: ${text}`);
  }

  return res.json() as Promise<UploadResponse>;
};

// ----- Document generation -----
export interface DocGenResponse {
  success: boolean;
  output_filename?: string;
  download_url?: string;
}

export const apiGenerateDoc = (
  type: "daejin" | "energy" | "certificate",
  data: any,
  token?: string,
  user?: { id: string; name: string; phone: string; role: "admin" | "user" } | null,
) =>
  apiFetch<DocGenResponse>(`/api/generate/${type}`, {
    method: "POST",
    body: {
      ...data,
      user,
    },
    token,
  });

export const apiGenerateMergedDoc = async (
  orgType: "daejin" | "energy",
  data: unknown,
  token?: string,
  user?: { id: string; name: string; phone: string; role: "admin" | "user" } | null,
) => {
  const proj = data as Record<string, unknown> | undefined;
  const biz = (proj?.business ?? {}) as Record<string, unknown>;

  console.log("DOC_10022 proj =", proj);
  console.log("DOC_10022 biz =", biz);
  console.log("DOC_10022 biz.layoutFile =", biz.layoutFile);

  const existingImages = (proj?.images ?? {}) as Record<string, unknown>;

  // Upload layout/location files if they are File objects
  let layoutFilePath = "";
  let locationFilePath = "";

  const fileUploadPromises: Promise<void>[] = [];

  if (biz.layoutFile instanceof File) {
    fileUploadPromises.push(
      apiUploadFile(biz.layoutFile, token).then((res) => {
        layoutFilePath = res.file_path;
      }),
    );
  } else if (typeof biz.layoutFile === "string" && biz.layoutFile !== "") {
    layoutFilePath = biz.layoutFile as string;
  }

  if (biz.locationFile instanceof File) {
    fileUploadPromises.push(
      apiUploadFile(biz.locationFile, token).then((res) => {
        locationFilePath = res.file_path;
      }),
    );
  } else if (typeof biz.locationFile === "string" && biz.locationFile !== "") {
    locationFilePath = biz.locationFile as string;
  }

  if (fileUploadPromises.length > 0) {
    console.log(`DOC_10022/10050 uploading ${fileUploadPromises.length} layout/location file(s)...`);
    await Promise.all(fileUploadPromises);
  }

  console.log("DOC_10022 INSTALL_LAYOUT_FILE =", layoutFilePath);
  console.log("DOC_10050 BUSINESS_LOCATION_MAP_FILE =", locationFilePath);

  // Upload photo File objects and collect real server paths
  const rawPhotoInputs = (proj?.photoInputs ?? {}) as Record<string, unknown>;
  const photoInputs: Record<string, string> = {};

  const uploadPromises: Promise<void>[] = [];
  for (const key of Object.keys(rawPhotoInputs)) {
    const val = rawPhotoInputs[key];
    if (val instanceof File) {
      uploadPromises.push(
        apiUploadFile(val, token).then((res) => {
          photoInputs[key] = res.file_path;
        }),
      );
    } else if (typeof val === "string" && val !== "") {
      photoInputs[key] = val;
    }
  }

  if (uploadPromises.length > 0) {
    console.log(`DOC_10024 uploading ${uploadPromises.length} file(s)...`);
    await Promise.all(uploadPromises);
  }

  const rawPollutants = (biz.pollutants ?? []) as Array<{ type?: string; amount?: string }>;
  const mappedPollutants = rawPollutants.map((p) => ({
    ITEM_POLLUTANT_TYPE: p.type || "",
    ITEM_POLLUTANT_AMOUNT: p.amount || "",
  }));

  console.log("DOC_10010_B pollutants payload =", mappedPollutants);
  console.log("DOC_10024 photo_inputs =", photoInputs);

  const requestBody = {
    org_type: orgType,
    user,
    project_data: {
      ...(proj ?? {}),
      photoInputs: undefined,
      pollutants: mappedPollutants,
      photo_inputs: photoInputs,
      images: {
        ...existingImages,
        INSTALL_LAYOUT_FILE: layoutFilePath,
        BUSINESS_LOCATION_MAP_FILE: locationFilePath,
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
