import { create } from "zustand";
import { Pet } from "../data/pets";

type PetState = {
  selectedPet: Pet | null;
  setSelectedPet: (pet: Pet | null) => void;
};
export const usePetStore = create<PetState>((set) => ({
  selectedPet: null,
  setSelectedPet: (pet: Pet | null) => set({ selectedPet: pet }),
}));
