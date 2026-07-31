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
