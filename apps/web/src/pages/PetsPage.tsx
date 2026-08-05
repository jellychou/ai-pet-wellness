import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useAppStore } from "../store/useAppStore";
import { apiFetch } from "../lib/api";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Pet } from "../data/pets";
import { usePetStore } from "../store/usePetStore";
import { calculateDailyCalories } from "../lib/calorie";

const defaultPetAvatar =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=240&h=240&fit=crop";

// 只定義欄位順序跟標籤 key/格式化邏輯，實際的值要從 API 抓回來的寵物資料算，
// 不要把假資料寫死在這裡（之前 value 都是寫死的 "Coco"/"Golden Retriever"...）
// format 是可選的：像 neutered 這種原始值是代碼（"1"/"0"）、需要轉成對應語言
// 顯示文字的欄位才需要給，格式化邏輯跟著欄位定義走，不用在渲染那裡另外寫
// if/else。因為 format 需要用 t() 翻譯，這個定義要放在元件裡面（拿得到 t）
// 才能建立，不能是模組層級的常數
type PetFieldDef = {
  label: string;
  key: keyof Pet;
  format?: (value: Pet[keyof Pet]) => string;
};

function getPetFieldDefs(t: TFunction): PetFieldDef[] {
  return [
    { label: t("pets.fieldName"), key: "name" },
    {
      label: t("pets.fieldSpecies"),
      key: "species",
      format: (value) =>
        value === "cat" ? t("pets.speciesCat") : t("pets.speciesDog"),
    },
    { label: t("pets.fieldBreed"), key: "breed" },
    {
      label: t("pets.fieldGender"),
      key: "gender",
      format: (value) =>
        value === "male" ? t("common.male") : t("common.female"),
    },
    {
      label: t("pets.fieldAge"),
      key: "birthday",
      format: (value) => {
        const now = new Date();
        const birth = new Date(String(value ?? ""));
        const age = now.getFullYear() - birth.getFullYear();
        return t("pets.ageValue", { age });
      },
    },
    { label: t("pets.fieldBirthday"), key: "birthday" },
    { label: t("pets.fieldWeight"), key: "weight" },
    { label: t("pets.fieldCoatColor"), key: "coatColor" },
    {
      label: t("pets.fieldNeutered"),
      key: "neutered",
      format: (value) =>
        value === "1" ? t("pets.neuteredYes") : t("pets.neuteredNo"),
    },
    { label: t("pets.fieldChipNumber"), key: "chipNumber" },
    { label: t("pets.fieldAllergy"), key: "allergy" },
    { label: t("pets.fieldActivity"), key: "activity" },
  ];
}

function PetAvatarSwitcher({
  pets,
  selected,
  onSelect,
  onAdd,
}: {
  pets: Pet[];
  selected: number;
  onSelect: (id: number) => void;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-3 flex gap-3 overflow-x-auto px-1 py-1">
      {pets.map((pet) => (
        <button
          key={pet.name}
          type="button"
          onClick={() => onSelect(pet.id)}
          className="flex shrink-0 flex-col items-center gap-1"
        >
          <span
            className={`grid h-14 w-14 place-items-center rounded-full p-0.5 transition ${
              selected === pet.id
                ? "ring-2 ring-[#8ca4b3]"
                : "ring-2 ring-transparent"
            }`}
          >
            <img
              src={pet.avatar ?? defaultPetAvatar}
              alt={pet.name}
              className="h-full w-full rounded-full object-cover overflow-hidden"
            />
          </span>
          <span
            className={`text-[11px] ${
              selected === pet.id
                ? "font-semibold text-[#8ca4b3]"
                : "text-ink/50"
            }`}
          >
            {pet.name}
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={onAdd}
        aria-label={t("pets.addAria")}
        className="flex shrink-0 flex-col items-center gap-1"
      >
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[#fbe9d9] text-[#c9784a] transition hover:bg-[#f6ddc2]">
          <Plus size={22} />
        </span>
        <span className="text-[11px] text-ink/50">{t("pets.add")}</span>
      </button>
    </div>
  );
}

export function PetsPage() {
  const { t } = useTranslation();
  const setEditPetOpen = useAppStore((s) => s.setEditPetOpen);
  const allPetsList = usePetStore((s) => s.allPetsList);
  const setAddPetOpen = useAppStore((s) => s.setAddPetOpen);
  const setSelectedPet = usePetStore((s) => s.setSelectedPet);
  const selectedPet = usePetStore((s) => s.selectedPet);
  const pets = usePetStore((s) => s.pets);
  const userInfo = useAuthStore((s) => s.userInfo);
  const [rows, setRows] = useState<{ label: string; value: string }[]>([]);
  const dailyCalories = selectedPet
    ? calculateDailyCalories(selectedPet)
    : null;

  useEffect(() => {
    const petFieldDefs = getPetFieldDefs(t);
    setRows(
      selectedPet
        ? petFieldDefs.map(({ label, key, format }) => ({
            label,
            value: format
              ? format(selectedPet[key])
              : String(selectedPet[key] ?? ""),
          }))
        : [],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPetsList]);

  const setActivePet = async (petId: number) => {
    try {
      await apiFetch(`/pet/set-active-pet/${petId}`, { method: "PUT" });
      const activePet = pets.find((pet) => pet.id === petId) ?? null;
      setSelectedPet(activePet);
      const petFieldDefs = getPetFieldDefs(t);
      setRows(
        activePet
          ? petFieldDefs.map(({ label, key, format }) => ({
              label,
              value: format
                ? format(activePet[key])
                : String(activePet[key] ?? ""),
            }))
          : [],
      );
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (selectedPet) {
      const petFieldDefs = getPetFieldDefs(t);
      setRows(
        petFieldDefs.map(({ label, key, format }) => ({
          label,
          value: format
            ? format(selectedPet[key])
            : String(selectedPet[key] ?? ""),
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPet]);

  return (
    <>
      <PetAvatarSwitcher
        pets={pets}
        selected={selectedPet?.id ?? 0}
        onSelect={(id) => setActivePet(id)}
        onAdd={() => setAddPetOpen(true)}
      />
      <section className="card p-4 mb-[12px]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">{t("pets.profileTitle")}</h2>
        </div>
        <div className="mb-3 flex justify-center">
          <div className="relative">
            <img
              src={selectedPet?.avatar ?? defaultPetAvatar}
              className="h-20 w-20 rounded-full object-cover"
            />
          </div>
        </div>
        <div className="divide-y divide-[#eee7df]">
          {rows.map(({ label, value }, index) => (
            <div
              key={index}
              className="grid grid-cols-[86px_1fr] py-1.5 text-[12px]"
            >
              <span className="font-medium">{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setEditPetOpen(true)}
          className="mt-3 w-full rounded-xl bg-[#b88672] py-2 text-xs font-medium text-white"
        >
          {t("pets.editInfo")}
        </button>
      </section>
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">{t("pets.calorieTitle")}</h2>
        </div>
        <div className="flex items-center gap-3">
          <img
            src={selectedPet?.avatar ?? ""}
            className="h-12 w-12 rounded-full object-cover"
          />
          <div>
            <b className="text-xs">{selectedPet?.name}</b>
            <div className="text-[12px] text-ink/45">
              {selectedPet?.breed}
              <br />
              {selectedPet?.birthday} / {selectedPet?.weight} kg
            </div>
          </div>
        </div>
        <div className="relative mx-auto mt-4 h-28 w-28 overflow-hidden rounded-full border-[12px] border-[#edf0ee] border-r-mist border-t-mist">
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="text-[9px]">
                {t("pets.suggestedDailyCalories")}
              </div>
              <b className="text-xl">{dailyCalories ?? "--"}</b>
              <span className="text-[9px]"> kcal</span>
            </div>
          </div>
        </div>
        {/* TODO: 已攝取/還可攝取要接真的飲食紀錄（food_records）才能算，
            現在還沒有那張表，先維持假資料，不要被當成真的算出來的數字 */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[12px]">
          <div className="rounded-xl bg-[#fbf7f1] p-2">
            {t("pets.consumed")}
            <br />
            <b>430 kcal</b>
          </div>
          <div className="rounded-xl bg-[#fbf7f1] p-2">
            {t("pets.remaining")}
            <br />
            <b>90 kcal</b>
          </div>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-4 text-[12px]">
          <li>{t("pets.tipProtein")}</li>
          <li>{t("pets.tipProcessed")}</li>
          <li>{t("pets.tipOmega3")}</li>
        </ul>
      </section>
    </>
  );
}
