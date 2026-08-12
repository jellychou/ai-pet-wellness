import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

const foodCategoryOptions = [
  "肉類",
  "海鮮",
  "蔬菜",
  "水果",
  "穀物/澱粉",
  "乳製品",
  "零食/點心",
  "其他",
];

const cookingMethodOptions = [
  "生食",
  "水煮",
  "蒸",
  "烤",
  "炸",
  "未加工/原型食物",
  "其他",
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-ink/70">
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none rounded-xl border border-[#ece0d2] bg-white px-3 py-2.5 text-[12px] outline-none ${
          value ? "text-ink" : "text-ink/35"
        }`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/40"
      />
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#ece0d2] bg-white px-3 py-2.5 text-[12px] text-ink outline-none placeholder:text-ink/30";

// 疊在 AddFoodDrawer 上面的第二層 drawer，跟 AiScanHistoryDrawer/AddFoodDrawer
// 是同一個模式。這裡是純本地修正：food_category / cooking_method 兩個欄位
// 後端 food_scan_logs 表沒有對應欄位，純粹給使用者自己標注，不會送到後端；
// 真正會影響後續流程（加入飲食記錄時算總熱量）的是 food_name / estimated_grams
// / calories，這三個改完直接寫回 store 裡的 foodScanResult，
// AddFoodDrawer/AddFoodRecordDrawer 立刻就會看到更新後的值。estimated_grams
// 跟 calories 現在都是「這一份」的總量，不是每 100g 密度——使用者身邊通常
// 沒有秤，AI 目測估重難免會估不準，這裡讓使用者可以自己校正
export function EditFoodResultDrawer() {
  const open = useAppStore((s) => s.editFoodResultOpen);
  const setOpen = useAppStore((s) => s.setEditFoodResultOpen);
  const result = useAppStore((s) => s.foodScanResult);
  const setResult = useAppStore((s) => s.setFoodScanResult);

  const [foodName, setFoodName] = useState("");
  const [category, setCategory] = useState("");
  const [cookingMethod, setCookingMethod] = useState("");
  const [estimatedGrams, setEstimatedGrams] = useState(0);
  const [calories, setCalories] = useState(0);

  useEffect(() => {
    if (!open || !result) return;
    setFoodName(result.food_name);
    setCategory("");
    setCookingMethod("");
    setEstimatedGrams(result.estimated_grams);
    setCalories(result.calories);
  }, [open, result]);

  function handleClose() {
    setOpen(false);
  }

  function adjustEstimatedGrams(delta: number) {
    setEstimatedGrams((v) => Math.max(0, Math.round(v + delta)));
  }

  function adjustCalories(delta: number) {
    setCalories((v) => Math.max(0, Math.round((v + delta) * 10) / 10));
  }

  function handleSave() {
    if (!result) {
      setOpen(false);
      return;
    }
    setResult({
      ...result,
      food_name: foodName.trim() || result.food_name,
      estimated_grams: estimatedGrams,
      calories,
    });
    setOpen(false);
  }

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col bg-[#fbf8f4] transition-transform duration-300 ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between border-b border-[#ece4dc] bg-[#fffdfa] px-3 py-3">
        <button
          type="button"
          onClick={handleClose}
          aria-label="返回"
          className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-sm font-semibold text-ink">編輯辨識結果</h1>
        <span className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <div className="mx-auto max-w-md space-y-4">
          <Field label="食物名稱">
            <input
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="請輸入食物名稱"
              className={inputClass}
            />
          </Field>

          <Field label="食物類別（選填）">
            <Select
              value={category}
              onChange={setCategory}
              placeholder="請選擇食物類別"
              options={foodCategoryOptions}
            />
          </Field>

          <Field label="烹調方式（選填）">
            <Select
              value={cookingMethod}
              onChange={setCookingMethod}
              placeholder="請選擇烹調方式"
              options={cookingMethodOptions}
            />
          </Field>

          <Field label="估計份量">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => adjustEstimatedGrams(-10)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#ece4dc] text-ink/60 transition hover:bg-cream"
              >
                −
              </button>
              <div className="flex-1 text-center text-base font-semibold text-ink">
                {estimatedGrams}
                <span className="ml-1 text-xs font-normal text-ink/40">g</span>
              </div>
              <button
                type="button"
                onClick={() => adjustEstimatedGrams(10)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#ece4dc] text-ink/60 transition hover:bg-cream"
              >
                +
              </button>
            </div>
          </Field>

          <Field label="這份的總熱量">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => adjustCalories(-10)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#ece4dc] text-ink/60 transition hover:bg-cream"
              >
                −
              </button>
              <div className="flex-1 text-center text-base font-semibold text-ink">
                {calories}
                <span className="ml-1 text-xs font-normal text-ink/40">
                  kcal
                </span>
              </div>
              <button
                type="button"
                onClick={() => adjustCalories(10)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#ece4dc] text-ink/60 transition hover:bg-cream"
              >
                +
              </button>
            </div>
          </Field>

          <p className="text-[11px] leading-5 text-ink/40">
            食物類別與烹調方式只是方便你自己備註，不會影響 AI 辨識結果；
            食物名稱、估計份量與總熱量修改後會套用到這次的辨識結果與後續的
            飲食記錄——AI 是目測估重，覺得估太多或太少都可以在這裡校正。
          </p>
        </div>
      </div>

      <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-3 py-3">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-2xl bg-[#caa06f] py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260]"
          >
            儲存修改
          </button>
        </div>
      </div>
    </div>
  );
}
