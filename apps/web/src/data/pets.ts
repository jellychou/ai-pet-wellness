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
  // 體溫/心跳改成選填，後端可能回 null——在家記錄健檢時不一定量得到
  report_temperature: number | null;
  report_heart_rate: number | null;
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

// 品種
export const breedList = [
  { zh: "米克斯", en: "Mixed Breed", group: "Mixed / Unknown" },
  { zh: "其他", en: "Other", group: "Mixed / Unknown" },

  { zh: "黃金獵犬", en: "Golden Retriever", group: "Sporting" },
  { zh: "拉布拉多", en: "Labrador Retriever", group: "Sporting" },
  { zh: "英國可卡犬", en: "English Cocker Spaniel", group: "Sporting" },
  { zh: "美國可卡犬", en: "American Cocker Spaniel", group: "Sporting" },
  { zh: "米格魯", en: "Beagle", group: "Hound" },
  { zh: "臘腸犬", en: "Dachshund", group: "Hound" },
  { zh: "阿富汗獵犬", en: "Afghan Hound", group: "Hound" },
  { zh: "巴吉度獵犬", en: "Basset Hound", group: "Hound" },

  { zh: "柴犬", en: "Shiba Inu", group: "Spitz / Primitive" },
  { zh: "秋田犬", en: "Akita", group: "Spitz / Primitive" },
  { zh: "哈士奇", en: "Siberian Husky", group: "Working" },
  { zh: "阿拉斯加雪橇犬", en: "Alaskan Malamute", group: "Working" },
  { zh: "薩摩耶", en: "Samoyed", group: "Spitz / Primitive" },

  { zh: "邊境牧羊犬", en: "Border Collie", group: "Herding" },
  { zh: "澳洲牧羊犬", en: "Australian Shepherd", group: "Herding" },
  { zh: "德國牧羊犬", en: "German Shepherd Dog", group: "Herding" },
  { zh: "喜樂蒂牧羊犬", en: "Shetland Sheepdog", group: "Herding" },
  { zh: "柯基", en: "Welsh Corgi", group: "Herding" },

  { zh: "貴賓犬", en: "Poodle", group: "Companion" },
  { zh: "瑪爾濟斯", en: "Maltese", group: "Companion" },
  { zh: "博美犬", en: "Pomeranian", group: "Toy" },
  { zh: "吉娃娃", en: "Chihuahua", group: "Toy" },
  { zh: "約克夏", en: "Yorkshire Terrier", group: "Toy" },
  { zh: "比熊犬", en: "Bichon Frise", group: "Companion" },
  { zh: "西施犬", en: "Shih Tzu", group: "Companion" },
  { zh: "巴哥犬", en: "Pug", group: "Companion" },
  { zh: "法國鬥牛犬", en: "French Bulldog", group: "Companion" },
  { zh: "英國鬥牛犬", en: "Bulldog", group: "Companion" },

  { zh: "雪納瑞", en: "Schnauzer", group: "Pinscher / Schnauzer" },
  { zh: "杜賓犬", en: "Doberman Pinscher", group: "Working" },
  { zh: "羅威納犬", en: "Rottweiler", group: "Working" },
  { zh: "伯恩山犬", en: "Bernese Mountain Dog", group: "Working" },
  { zh: "大白熊犬", en: "Great Pyrenees", group: "Working" },
  { zh: "聖伯納犬", en: "Saint Bernard", group: "Working" },
  { zh: "大丹犬", en: "Great Dane", group: "Working" },

  { zh: "西高地白梗", en: "West Highland White Terrier", group: "Terrier" },
  { zh: "傑克羅素梗", en: "Jack Russell Terrier", group: "Terrier" },
  { zh: "牛頭梗", en: "Bull Terrier", group: "Terrier" },
  { zh: "波士頓梗", en: "Boston Terrier", group: "Terrier" },
];

export const allergyList = [
  { zh: "無", en: "None", value: "0" },
  { zh: "雞肉、牛肉", en: "Chicken, Beef", value: "1" },
  { zh: "海鮮", en: "Seafood", value: "2" },
  { zh: "穀物", en: "Grain", value: "3" },
  { zh: "其他", en: "Other", value: "4" },
];

export const activityList = [
  { zh: "低", en: "Low", value: "1" },
  { zh: "中等", en: "Medium", value: "2" },
  { zh: "高", en: "High", value: "3" },
];

// 過敏/運動量顯示用的格式化：兩者都是多選代碼（不是二元的有/無），
// 統一從 allergyList/activityList 查表轉成對應語言文字，取回來的值要
// 顯示在哪個頁面都呼叫這裡，不要各自寫 if/else 或當成二元值處理
export function formatAllergyValue(
  value: string | undefined,
  language: string,
): string {
  if (!value) return "";
  const option = allergyList.find((o) => o.value === value);
  if (!option) return value;
  return language === "en" ? option.en : option.zh;
}

export function formatActivityValue(
  value: string | undefined,
  language: string,
): string {
  if (!value) return "";
  const option = activityList.find((o) => o.value === value);
  if (!option) return value;
  return language === "en" ? option.en : option.zh;
}
