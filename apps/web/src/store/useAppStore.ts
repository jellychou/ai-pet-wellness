import { create } from "zustand";

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
  editHealthOpen: boolean;
  setEditHealthOpen: (v: boolean) => void;
  healthDetailIndex: number | null;
  setHealthDetailIndex: (v: number | null) => void;
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
  editHealthOpen: false,
  setEditHealthOpen: (editHealthOpen) => set({ editHealthOpen }),
  healthDetailIndex: null,
  setHealthDetailIndex: (healthDetailIndex) => set({ healthDetailIndex }),
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
