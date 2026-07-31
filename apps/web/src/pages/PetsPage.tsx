import { Plus } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { apiFetch } from "../lib/api";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Pet } from "../data/pets";
import { usePetStore } from "../store/usePetStore";

const defaultPetAvatar =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=240&h=240&fit=crop";

// 只定義欄位順序跟中文標籤，實際的值要從 API 抓回來的寵物資料算，
// 不要把假資料寫死在這裡（之前 value 都是寫死的 "Coco"/"Golden Retriever"...）
// format 是可選的：像 neutered 這種原始值是代碼（"1"/"0"）、需要轉成中文
// 顯示的欄位才需要給，格式化邏輯跟著欄位定義走，不用在渲染那裡另外寫 if/else
type PetFieldDef = {
  label: string;
  key: keyof Pet;
  format?: (value: Pet[keyof Pet]) => string;
};

const petFieldDefs: PetFieldDef[] = [
  { label: "名字", key: "name" },
  { label: "品種", key: "breed" },
  { label: "性別", key: "gender" },
  { label: "生日", key: "birthday" },
  { label: "體重", key: "weight" },
  { label: "毛色", key: "coatColor" },
  {
    label: "絕育狀態",
    key: "neutered",
    format: (value) => (value === "1" ? "已絕育" : "未絕育"),
  },
  { label: "晶片號碼", key: "chipNumber" },
  { label: "過敏", key: "allergy" },
  { label: "運動量", key: "activity" },
];

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
                ? "ring-2 ring-[#caa06f]"
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
                ? "font-semibold text-[#c9784a]"
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
        aria-label="新增寵物"
        className="flex shrink-0 flex-col items-center gap-1"
      >
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[#fbe9d9] text-[#c9784a] transition hover:bg-[#f6ddc2]">
          <Plus size={22} />
        </span>
        <span className="text-[11px] text-ink/50">新增</span>
      </button>
    </div>
  );
}

export function PetsPage() {
  const editPetOpen = useAppStore((s) => s.editPetOpen);
  const setEditPetOpen = useAppStore((s) => s.setEditPetOpen);
  const addPetOpen = useAppStore((s) => s.addPetOpen);
  const setAddPetOpen = useAppStore((s) => s.setAddPetOpen);
  const setSelectedPet = usePetStore((s) => s.setSelectedPet);
  const selectedPet = usePetStore((s) => s.selectedPet);
  const userInfo = useAuthStore((s) => s.userInfo);
  const [rows, setRows] = useState<{ label: string; value: string }[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);

  const fetchPets = async () => {
    const response = await apiFetch<Pet[]>("/pet/get-pets");
    setPets(response);
  };

  useEffect(() => {
    if (editPetOpen || addPetOpen) return;
    fetchPets();
  }, [editPetOpen, addPetOpen]);

  // userInfo 是 App.tsx 另外非同步打 /user/user-info 才抓回來的，
  // PetsPage 掛載當下 userInfo 通常還沒到，所以不能只在 fetchPets 裡算一次
  // active pet；改成 pets 或 userInfo 任何一個之後才到位，都重新算一次，
  // userInfo 還沒到之前先退回第一隻寵物撐住畫面，不要整個空白
  useEffect(() => {
    const activePet =
      pets.find((pet) => pet.id === userInfo?.active_pet_id) ?? pets[0] ?? null;
    setSelectedPet(activePet);
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
  }, [pets, userInfo]);

  return (
    <>
      <PetAvatarSwitcher
        pets={pets}
        selected={selectedPet?.id ?? 0}
        onSelect={(id) =>
          setSelectedPet(pets.find((pet) => pet.id === id) ?? null)
        }
        onAdd={() => setAddPetOpen(true)}
      />
      <section className="card p-4 mb-[12px]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">寵物資訊 / Pet Profile</h2>
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
          編輯資訊
        </button>
      </section>
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">熱量建議 / Calorie Advisor</h2>
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
              <div className="text-[9px]">建議每日熱量</div>
              <b className="text-xl">520</b>
              <span className="text-[9px]"> kcal</span>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[12px]">
          <div className="rounded-xl bg-[#fbf7f1] p-2">
            已攝取
            <br />
            <b>430 kcal</b>
          </div>
          <div className="rounded-xl bg-[#fbf7f1] p-2">
            還可攝取
            <br />
            <b>90 kcal</b>
          </div>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-4 text-[12px]">
          <li>增加優質蛋白質</li>
          <li>減少加工食品</li>
          <li>多攝取 Omega-3</li>
        </ul>
      </section>
    </>
  );
}
