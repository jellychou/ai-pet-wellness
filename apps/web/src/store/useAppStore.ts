import { create } from "zustand";
import type { HealthRecord } from "../data/pets";

// 逐項食材/品項分解裡的一項，例如「黑松露野菇燉飯」「干貝 x2」——low/high
// 都是估計範圍，不是精確值。included=false 表示 AI 判斷這項不該計入整份
// 餐點的總熱量（例如明顯沒吃完的配菜），note 可以簡短說明為什麼
export type FoodScanItem = {
  name: string;
  estimated_grams_low: number;
  estimated_grams_high: number;
  calories_low: number;
  calories_high: number;
  included: boolean;
  note: string;
};

// AI 食物辨別的分析結果——AddFoodDrawer 分析完成後存進來，EditFoodResultDrawer
// 可以在原地修改（目前只有 food_name/estimated_grams/calories 這幾個「單一
// 最佳估計」欄位真的會影響後續流程，items 逐項分解目前是唯讀顯示；category/
// cooking method 是 UI 上額外的分類欄位，後端 schema 沒有對應欄位，純粹讓
// 使用者自己備註用，不會送到後端），AddFoodRecordDrawer 讀這筆資料算總熱量
export type FoodScanResult = {
  food_detected: boolean;
  food_name: string;
  confidence: number;
  // 逐項食材/品項分解，最多 8 項
  items: FoodScanItem[];
  // AI 直接目測估計「照片裡這一份」食物的總重量（公克，只加總 included
  // 的品項）——使用者身邊通常沒有秤，所以下面 calories/protein/fat/carb/
  // fiber 都是對應這個總重量的整份總量估計，不是每 100g 的密度
  estimated_grams: number;
  // 整份總熱量的估計範圍，跟 calories 的「單一最佳估計」互補顯示
  calories_low: number;
  calories_high: number;
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  fiber: number;
  // 估算準確度的簡短說明，前端要顯示在結果卡片上
  estimate_note: string;
  safety_level: number; // 0-5，0 = food_detected 是 false
  is_safe: boolean;
  suitable_species: ("dog" | "cat")[];
  suggestions: string[];
  disclaimer: string;
};

// 從 AiScanDrawer 帶去 AICenterPage（AI 心靈導師）的分析結果摘要，讓那頁
// 一開始就能顯示「已引用今日影像分析」——目前 AICenterPage 還是純前端假
// 資料（罐頭回覆），這裡只是把 context 遞過去顯示，還沒接真的後端對話
export type AiScanReferenceForMentor = {
  summary: string;
  bodyPart: string | null;
  suggestions: string[];
  imageUrl: string;
};

type AppState = {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  selectedPet: string;
  setSelectedPet: (v: string) => void;
  addFoodOpen: boolean;
  setAddFoodOpen: (v: boolean) => void;
  // 疊在 AddFoodDrawer 上面的第二/三層 drawer，跟 AiScanHistoryDrawer 疊在
  // AiScanDrawer 上面同一個模式，各自獨立開關
  foodScanHistoryOpen: boolean;
  setFoodScanHistoryOpen: (v: boolean) => void;
  addFoodRecordOpen: boolean;
  setAddFoodRecordOpen: (v: boolean) => void;
  editFoodResultOpen: boolean;
  setEditFoodResultOpen: (v: boolean) => void;
  // 目前這次辨識結果，AddFoodDrawer/EditFoodResultDrawer/AddFoodRecordDrawer
  // 三個畫面共用同一份，不用互相傳 props（本來就是分開 mount 的 sibling drawer）
  foodScanResult: FoodScanResult | null;
  setFoodScanResult: (v: FoodScanResult | null) => void;
  // 上傳到 Cloudinary 後拿到的網址，AddFoodRecordDrawer 存飲食紀錄時要一起帶入
  foodScanImageUrl: string | null;
  setFoodScanImageUrl: (v: string | null) => void;
  // 跟 vaccineRefreshKey 同樣的道理：Dashboard 的飲食記錄卡片只在自己
  // mount/切換寵物時打一次 API，AddFoodRecordDrawer 新增成功關掉不會觸發
  // 它重新 mount，所以用這個數字當訊號，新增成功就 +1，讓卡片重新抓一次
  foodRecordRefreshKey: number;
  bumpFoodRecordRefreshKey: () => void;
  addVaccineOpen: boolean;
  setAddVaccineOpen: (v: boolean) => void;
  addVaccineFormOpen: boolean;
  setAddVaccineFormOpen: (v: boolean) => void;
  addPendingVaccineFormOpen: boolean;
  setAddPendingVaccineFormOpen: (v: boolean) => void;
  // 疫苗紀錄列表(AddVaccineDrawer)只在自己 open 的當下打一次 API，
  // 新增/編輯疫苗的 drawer 疊在上面關掉時不會觸發它重新 mount，
  // 所以用這個數字當「有新資料了，重新抓一次」的訊號，每次新增成功就 +1
  vaccineRefreshKey: number;
  bumpVaccineRefreshKey: () => void;
  aiScanOpen: boolean;
  setAiScanOpen: (v: boolean) => void;
  // 疊在 AiScanDrawer 上面的第二層 drawer，跟 HealthDetailDrawer 疊在
  // EditHealthDrawer 上面是同一個模式，各自獨立開關
  aiScanHistoryOpen: boolean;
  setAiScanHistoryOpen: (v: boolean) => void;
  // AiScanDrawer 按「詢問 AI 心靈導師」時把這次分析結果存進來，帶去 /ai
  // 頁面顯示「已引用今日影像分析」——AICenterPage 讀到之後就會清掉，
  // 只消費一次，不是永久跟著使用者的全域狀態
  aiScanReferenceForMentor: AiScanReferenceForMentor | null;
  setAiScanReferenceForMentor: (v: AiScanReferenceForMentor | null) => void;
  editHealthOpen: boolean;
  setEditHealthOpen: (v: boolean) => void;
  // 存整筆紀錄，不是只存 id——後端沒有「用 record id 查單筆健康檢查紀錄」的
  // API，EditHealthDrawer 列表本來就已經把完整資料抓下來了，直接把點到的
  // 那筆傳過去最省事，不用再讓 HealthDetailDrawer 自己想辦法打 API 撈
  healthDetailRecord: HealthRecord | null;
  setHealthDetailRecord: (v: HealthRecord | null) => void;
  // 跟 vaccineRefreshKey 同樣的道理：EditHealthDrawer 只在自己 mount/切換寵物時
  // 打一次 API，HealthDetailDrawer 刪除紀錄後不會觸發它重新 mount，
  // 所以用這個數字當訊號，刪除成功就 +1，讓列表重新抓一次
  healthRecordRefreshKey: number;
  bumpHealthRecordRefreshKey: () => void;
  editPetOpen: boolean;
  setEditPetOpen: (v: boolean) => void;
  addHealthRecordOpen: boolean;
  setAddHealthRecordOpen: (v: boolean) => void;
  settingsEditOpen: boolean;
  setSettingsEditOpen: (v: boolean) => void;
  changePasswordOpen: boolean;
  setChangePasswordOpen: (v: boolean) => void;
  setPasswordOpen: boolean;
  setSetPasswordOpen: (v: boolean) => void;
  addPetOpen: boolean;
  setAddPetOpen: (v: boolean) => void;
};
export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  selectedPet: "Coco",
  setSelectedPet: (selectedPet) => set({ selectedPet }),
  addFoodOpen: false,
  setAddFoodOpen: (addFoodOpen) => set({ addFoodOpen }),
  foodScanHistoryOpen: false,
  setFoodScanHistoryOpen: (foodScanHistoryOpen) => set({ foodScanHistoryOpen }),
  addFoodRecordOpen: false,
  setAddFoodRecordOpen: (addFoodRecordOpen) => set({ addFoodRecordOpen }),
  editFoodResultOpen: false,
  setEditFoodResultOpen: (editFoodResultOpen) => set({ editFoodResultOpen }),
  foodScanResult: null,
  setFoodScanResult: (foodScanResult) => set({ foodScanResult }),
  foodScanImageUrl: null,
  setFoodScanImageUrl: (foodScanImageUrl) => set({ foodScanImageUrl }),
  foodRecordRefreshKey: 0,
  bumpFoodRecordRefreshKey: () =>
    set((s) => ({ foodRecordRefreshKey: s.foodRecordRefreshKey + 1 })),
  addVaccineOpen: false,
  setAddVaccineOpen: (addVaccineOpen) => set({ addVaccineOpen }),
  addVaccineFormOpen: false,
  setAddVaccineFormOpen: (addVaccineFormOpen) => set({ addVaccineFormOpen }),
  addPendingVaccineFormOpen: false,
  setAddPendingVaccineFormOpen: (addPendingVaccineFormOpen) =>
    set({ addPendingVaccineFormOpen }),
  vaccineRefreshKey: 0,
  bumpVaccineRefreshKey: () =>
    set((s) => ({ vaccineRefreshKey: s.vaccineRefreshKey + 1 })),
  aiScanOpen: false,
  setAiScanOpen: (aiScanOpen) => set({ aiScanOpen }),
  aiScanHistoryOpen: false,
  setAiScanHistoryOpen: (aiScanHistoryOpen) => set({ aiScanHistoryOpen }),
  aiScanReferenceForMentor: null,
  setAiScanReferenceForMentor: (aiScanReferenceForMentor) =>
    set({ aiScanReferenceForMentor }),
  editHealthOpen: false,
  setEditHealthOpen: (editHealthOpen) => set({ editHealthOpen }),
  healthDetailRecord: null,
  setHealthDetailRecord: (healthDetailRecord) => set({ healthDetailRecord }),
  healthRecordRefreshKey: 0,
  bumpHealthRecordRefreshKey: () =>
    set((s) => ({ healthRecordRefreshKey: s.healthRecordRefreshKey + 1 })),
  editPetOpen: false,
  setEditPetOpen: (editPetOpen) => set({ editPetOpen }),
  addHealthRecordOpen: false,
  setAddHealthRecordOpen: (addHealthRecordOpen) => set({ addHealthRecordOpen }),
  settingsEditOpen: false,
  setSettingsEditOpen: (settingsEditOpen) => set({ settingsEditOpen }),
  changePasswordOpen: false,
  setChangePasswordOpen: (changePasswordOpen) => set({ changePasswordOpen }),
  setPasswordOpen: false,
  setSetPasswordOpen: (setPasswordOpen) => set({ setPasswordOpen }),
  addPetOpen: false,
  setAddPetOpen: (addPetOpen) => set({ addPetOpen }),
}));
