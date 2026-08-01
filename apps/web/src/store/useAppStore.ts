import { create } from "zustand";
import type { HealthRecord } from "../data/pets";

type AppState = {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  selectedPet: string;
  setSelectedPet: (v: string) => void;
  addFoodOpen: boolean;
  setAddFoodOpen: (v: boolean) => void;
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
