export type Pet = {
  id: number;
  avatar: string;
  name: string;
  species: "dog" | "cat";
  breed: string;
  gender: string;
  birthday: string;
  weight: number;
  coatColor: string;
  neutered: string;
  allergy: string;
  activity: string;
  chipNumber: string;
  note: string;
};

export type VaccineRecord = {
  id: number;
  pet_id: number;
  vaccine_type: string;
  vaccine_name: string;
  batch_number: string | null;
  // null 代表「待接種」（還沒真的打），有值代表「已接種」
  vaccination_date: string | null;
  location: string | null;
  hospital: string | null;
  vet: string | null;
  note: string | null;
  reminder_enabled: boolean;
  next_date: string | null;
  reminder_lead_days: number | null;
  next_note: string | null;
  recurring_enabled: boolean;
  recurring_interval: string | null;
  // 前端自己依 vaccination_date 算出來的狀態，不是後端回傳的欄位
  status: string | "all" | "1" | "0";
};

export type HealthRecord = {
  id: number;
  pet_id: number;
  report_date: string;
  report_type: string;
  report_result: string;
  report_weight: number;
  report_temperature: number;
  report_heart_rate: number;
  report_hospital: string;
  report_vet: string;
  report_note: string;
  report_files: string[];
};

// 用純物件（不是 TS enum）：enum 的 key 不能是數字字串（"1".."6"）在
// isolatedModules 開著的情況下會直接編譯失敗（TS2452），plain object
// 用起來（ReportTypeEnum[key as keyof typeof ReportTypeEnum]）跟 enum
// 一樣，改成這樣就不會踩到這個限制
export const ReportTypeEnum = {
  "1": "年度健康檢查",
  "2": "血液檢查",
  "3": "糞便檢查",
  "4": "心臟檢查",
  "5": "超音波檢查",
  "6": "其他檢查",
} as const;
