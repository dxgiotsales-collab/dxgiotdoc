export interface EmissionFacility {
  id: number;
  outletNo: number;
  facilityNo: string;
  name: string;
  capacity: string;
  unit: string;
  supported: boolean;
  exempt: boolean;
}

export interface PreventionFacility {
  id: number;
  outletNo: number;
  facilityNo: string;
  type: string;
  capacity: string;
  unit: string;
  installDate: string;
  supported: boolean;
}

export const unitOptions = ["HP", "㎥", "㎥/분", "KW", "ton"];

export const preventionTypes = [
  "여과집진시설",
  "흡착에 의한 시설",
  "원심력 집진시설",
  "세정집진시설",
  "전기집진시설",
  "흡수에 의한 시설",
  "여과 및 흡착에 의한 시설",
];
