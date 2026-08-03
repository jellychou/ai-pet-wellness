import { useEffect, useState } from "react";
import { ArrowLeft, Check, UtensilsCrossed } from "lucide-react";
import { useAppStore, type FoodDraftItem } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { apiFetch } from "../lib/api";

type HistoryFoodItem = {
  food_name: string;
  image_url: string | null;
  portion_grams: number;
  calories: number;
  times_used: number;
  last_used_at: string;
};

// 純前端產生的暫存 id，不是後端資料——crypto.randomUUID 在所有現代瀏覽器
// 都有，這裡多包一層 fallback 只是防止極少數不支援的環境直接整個掛掉
function makeLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// 疊在 AddFoodDrawer 上面的第二層 drawer（跟 FoodScanHistoryDrawer 同一個
// z-[60] 疊法），但用途不同：FoodScanHistoryDrawer 是唯讀查看「AI 辨識過
// 的記錄」，這裡是「依食材名稱彙整過去吃過的品項」，可以多選、選好按
// 「加入」一次性丟進 foodDraftItems，不用重新辨識或重新輸入
export function FoodHistoryItemsDrawer() {
  const open = useAppStore((s) => s.foodHistoryItemsOpen);
  const setOpen = useAppStore((s) => s.setFoodHistoryItemsOpen);
  const addFoodDraftItem = useAppStore((s) => s.addFoodDraftItem);
  const selectedPet = usePetStore((s) => s.selectedPet);
  const [items, setItems] = useState<HistoryFoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const petId = selectedPet?.id;
    if (!open || !petId) return;
    setSelected(new Set());
    setLoading(true);
    apiFetch<HistoryFoodItem[]>(`/food/history-items/${petId}`, {
      method: "GET",
    })
      .then(setItems)
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
  }, [open, selectedPet?.id]);

  function toggle(foodName: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(foodName)) {
        next.delete(foodName);
      } else {
        next.add(foodName);
      }
      return next;
    });
  }

  function handleAddSelected() {
    for (const item of items) {
      if (!selected.has(item.food_name)) continue;
      const caloriesPerGram =
        item.portion_grams > 0 ? item.calories / item.portion_grams : 0;
      const draftItem: FoodDraftItem = {
        localId: makeLocalId(),
        food_name: item.food_name,
        image_url: item.image_url,
        portion_grams: item.portion_grams,
        calories: item.calories,
        caloriesPerGram,
        source: "history",
      };
      addFoodDraftItem(draftItem);
    }
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
      <div className="flex items-center gap-2 border-b border-[#ece4dc] bg-[#fffdfa] px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="返回"
          className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-sm font-semibold text-ink">從歷史選擇食材</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-md space-y-2.5">
          {loading ? (
            <p className="py-10 text-center text-sm text-ink/40">載入中…</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/40">
              {selectedPet?.name ?? "這隻寵物"} 還沒有飲食記錄可以選
            </p>
          ) : (
            items.map((item) => {
              const isSelected = selected.has(item.food_name);
              return (
                <button
                  key={item.food_name}
                  type="button"
                  onClick={() => toggle(item.food_name)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                    isSelected
                      ? "border-mist bg-mist/10"
                      : "border-[#ece0d2] bg-[#fffdfa] hover:bg-[#f7f2ea]"
                  }`}
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.food_name}
                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f1e6d8] text-[#b98a5c]">
                      <UtensilsCrossed size={18} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink">
                      {item.food_name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-ink/45">
                      上次約 {item.portion_grams}g / {item.calories} kcal ·
                      吃過 {item.times_used} 次
                    </div>
                  </div>
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                      isSelected
                        ? "border-mist bg-mist text-white"
                        : "border-[#d8c9b4] text-transparent"
                    }`}
                  >
                    <Check size={14} strokeWidth={3} />
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-4 py-4">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={handleAddSelected}
            disabled={selected.size === 0}
            className="w-full rounded-2xl bg-[#688696] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(104,134,150,.3)] transition hover:bg-[#5a7684] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {selected.size > 0 ? `加入 ${selected.size} 項` : "請先選擇食材"}
          </button>
        </div>
      </div>
    </div>
  );
}
