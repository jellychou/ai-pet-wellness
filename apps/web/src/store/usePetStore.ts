import { create } from "zustand";
import { Pet } from "../data/pets";

type PetState = {
  pets: Pet[];
  hasFetchedPets: boolean;
  allPetsList: Pet[];
  selectedPet: Pet | null;
  setSelectedPet: (pet: Pet | null) => void;
  setAllPetsList: (pets: Pet[]) => void;
};

export const usePetStore = create<PetState>((set, get) => ({
  pets: [],
  hasFetchedPets: false,
  selectedPet: null,
  allPetsList: [],
  setSelectedPet: (pet: Pet | null) => set({ selectedPet: pet }),
  setAllPetsList: (pets: Pet[]) => set({ pets: pets }),
}));
