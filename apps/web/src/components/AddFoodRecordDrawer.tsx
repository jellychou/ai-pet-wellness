import { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { calculateAge } from "../lib/utils";
import { apiFetch } from "../lib/api";
import { useAlert } from "../hooks/useAlert";
import type { Pet } from "../data/pets";

const defaultPetPhoto =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=240&h=240&fit=crop";

const mealTypeOptions = [
  { label: "早餐", value: "breakfast" },
  { label: "午餐", value: "lunch" },
  { label: "晚餐", value: "dinner" },
  { label: "點心", value: "snack" },
] as const;

function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: readonly { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-xl border py-2.5 text-[12px] font-medium transition ${
            value === o.value
              ? "border-[#e8a56b] bg-[#fdf1e6] text-[#c9784a]"
              : "border-[#ece4dc] bg-white text-ink/50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// 「本地時間、不含秒」給 <input type="datetime-local"> 用的格式
function toDateTimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

const inputClass =
  "w-full rounded-xl border border-[#ece0d2] bg-white px-3 py-2.5 text-[12px] text-ink outline-none placeholder:text-ink/30";

// 疊在 AddFoodDrawer 上面的第二層 drawer。跟 AddVaccineFormDrawer 共用同一套
// 寵物選擇器 UI（petHeader），但這裡是獨立複製一份，不是共用元件——這個
// session 建立的每個 xxxFormDrawer 都是各自獨立一份，方便各自演化
export function AddFoodRecordDrawer() {
  const open = useAppStore((s) => s.addFoodRecordOpen);
  const setOpen = useAppStore((s) => s.setAddFoodRecordOpen);
  const setAddFoodOpen = useAppStore((s) => s.setAddFoodOpen);
  const result = useAppStore((s) => s.foodScanResult);
  const setResult = useAppStore((s) => s.setFoodScanResult);
  const imageUrl = useAppStore((s) => s.foodScanImageUrl);
  const bumpFoodRecordRefreshKey = useAppStore(
    (s) => s.bumpFoodRecordRefreshKey,
  );
  const pets = usePetStore((s) => s.pets);
  const selectedPet = usePetStore((s) => s.selectedPet);
  const { showSuccess, showError } = useAlert();

  const [targetPet, setTargetPet] = useState<Pet | null>(null);
  const [petPickerOpen, setPetPickerOpen] = useState(false);
  const [portionGrams, setPortionGrams] = useState(100);
  const [mealType, setMealType] = useState<string>("snack");
  const [fedAt, setFedAt] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 每次打開都是全新填寫一筆飲食記錄。份量預設用 AI 估計的 estimated_grams
  // ——使用者身邊通常沒有秤，直接沿用 AI 估的份量，不用再手動輸入一次；
  // 如果實際餵的比照片裡少（例如只餵一半），使用者還是可以用下面的份量
  // 加減鈕自己調整
  useEffect(() => {
    if (!open) return;
    setTargetPet(selectedPet);
    setPetPickerOpen(false);
    setPortionGrams(Math.round(result?.estimated_grams ?? 0));
    setMealType("snack");
    setFedAt(toDateTimeLocal(new Date()));
    setNote("");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // AI 現在直接給「這一份」的總熱量/總重量，不是每 100g 密度，所以份量
  // 沒被調整過的話，總熱量就直接等於 AI 估的 calories；使用者調整份量
  // （例如寵物只吃了一半）時，用 AI 估出來的「這一份總熱量 ÷ 這一份總重量」
  // 反推每公克熱量密度，再乘上調整後的份量，維持跟原始估計一致的比例
  const caloriesPerGram =
    result && result.estimated_grams > 0
      ? result.calories / result.estimated_grams
      : 0;
  const totalCalories = Math.round(caloriesPerGram * portionGrams * 10) / 10;

  function handleClose() {
    setOpen(false);
  }

  function adjustPortion(delta: number) {
    setPortionGrams((v) => Math.max(0, v + delta));
  }

  async function handleSave() {
    if (!result) {
      setError("沒有辨識結果，請重新拍照辨識");
      return;
    }
    if (!targetPet) {
      setError("請選擇寵物");
      return;
    }
    if (portionGrams <= 0) {
      setError("請輸入正確的份量");
      return;
    }
    if (!fedAt) {
      setError("請選擇餵食時間");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      await apiFetch("/food/add-food-record", {
        method: "POST",
        body: JSON.stringify({
          pet_id: targetPet.id,
          food_name: result.food_name,
          image_url: imageUrl,
          portion_grams: portionGrams,
          calories: totalCalories,
          meal_type: mealType,
          fed_at: new Date(fedAt).toISOString(),
          note: note || null,
        }),
      });
      showSuccess(`已加入 ${targetPet.name} 的飲食記錄`);
      setOpen(false);
      // 記完就整套關掉、回首頁，跟 AiScanDrawer 流程完成後一樣不用留在原地
      setAddFoodOpen(false);
      setResult(null);
      // Dashboard 的飲食記錄卡片不會因為這個 drawer 關掉而重新 mount，
      // 用這個訊號讓它知道要重新抓一次，新記錄才會馬上出現
      bumpFoodRecordRefreshKey();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "飲食記錄儲存失敗，請稍後再試",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const petHeader = (
    <div className="relative mb-4 flex items-center gap-3 rounded-2xl bg-[#fbf7f1] p-3">
      <img
        src={targetPet?.avatar ?? defaultPetPhoto}
        alt={targetPet?.name}
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setPetPickerOpen((v) => !v)}
          className="flex items-center gap-1 text-sm font-semibold text-ink"
        >
          {targetPet?.name ?? "選擇寵物"}
          <ChevronDown size={14} className="text-ink/40" />
        </button>
        <div className="truncate text-[11px] text-ink/45">
          {targetPet?.birthday && `${calculateAge(targetPet.birthday)}歲 · `}
          {targetPet?.breed} · {targetPet?.weight} kg
        </div>
      </div>
      {petPickerOpen && (
        <div className="absolute left-3 top-full z-10 mt-1 w-40 overflow-hidden rounded-xl border border-[#ece4dc] bg-white shadow-lg">
          {pets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setTargetPet(p);
                setPetPickerOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition hover:bg-[#fbf7f1] ${
                targetPet?.id === p.id ? "text-[#c9784a]" : "text-ink/70"
              }`}
            >
              <img
                src={p.avatar ?? defaultPetPhoto}
                className="h-6 w-6 rounded-full object-cover"
              />
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col bg-[#fbf8f4] transition-transform duration-300 ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between border-b border-[#ece4dc] bg-[#fffdfa] px-4 py-3">
        <button
          type="button"
          onClick={handleClose}
          aria-label="返回"
          className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-sm font-semibold text-ink">加入飲食記錄</h1>
        <span className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-md space-y-4">
          {petHeader}

          <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4">
            <div className="text-sm font-semibold text-ink">
              {result?.food_name ?? "尚未辨識食物"}
            </div>
            <div className="mt-1 text-[11px] text-ink/45">
              AI 估計整份約 {result?.estimated_grams ?? 0}g / {result?.calories ?? 0} kcal
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-[12px] font-medium text-ink/70">
                實際餵食份量（g）
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => adjustPortion(-10)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#ece4dc] text-ink/60 transition hover:bg-cream"
                >
                  −
                </button>
                <div className="flex-1 text-center text-base font-semibold text-ink">
                  {portionGrams}
                  <span className="ml-1 text-xs font-normal text-ink/40">
                    g
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => adjustPortion(10)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#ece4dc] text-ink/60 transition hover:bg-cream"
                >
                  +
                </button>
              </div>
            </div>

            <div className="my-4 h-px bg-[#eee5da]" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-ink/50">這次總熱量</span>
              <span className="text-xl font-bold text-ink">
                {totalCalories}
                <span className="ml-1 text-xs font-normal text-ink/40">
                  kcal
                </span>
              </span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink/70">
              餐別
            </label>
            <ToggleGroup
              value={mealType}
              onChange={setMealType}
              options={mealTypeOptions}
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink/70">
              餵食時間
            </label>
            <input
              type="datetime-local"
              value={fedAt}
              onChange={(e) => setFedAt(e.target.value)}
              className={`${inputClass} [color-scheme:light]`}
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink/70">
              備註（選填）
            </label>
            <div className="relative">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                placeholder="可記錄寵物進食狀況..."
                rows={3}
                maxLength={200}
                className={`${inputClass} resize-none`}
              />
              <span className="pointer-events-none absolute bottom-2 right-3 text-[9px] text-ink/35">
                {note.length}/200
              </span>
            </div>
          </div>

          {error && (
            <p className="text-center text-xs text-red-500">{error}</p>
          )}
        </div>
      </div>

      <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-4 py-4">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-2xl bg-[#b98a5c] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(185,138,92,.35)] transition hover:bg-[#a97a4d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "儲存中…" : "加入飲食記錄"}
          </button>
        </div>
      </div>
    </div>
  );
}
