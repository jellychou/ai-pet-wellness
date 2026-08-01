import { useEffect, useState } from "react";
import { ArrowLeft, Check, Star } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { apiFetch } from "../lib/api";

const speciesLabel: Record<string, string> = { dog: "狗狗", cat: "貓咪" };

type FoodScanHistoryItem = {
  id: number;
  pet_id: number;
  image_url: string;
  food_detected: boolean;
  food_name: string;
  confidence: number;
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  fiber: number;
  safety_level: number;
  is_safe: boolean;
  suitable_species: string[];
  suggestions: string[];
  created_at: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate(),
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

// 疊在 AddFoodDrawer 上面的第二層 drawer（z-[60] > AddFoodDrawer 的 z-50），
// 跟 AiScanHistoryDrawer 疊在 AiScanDrawer 上面同一個模式
export function FoodScanHistoryDrawer() {
  const open = useAppStore((s) => s.foodScanHistoryOpen);
  const setOpen = useAppStore((s) => s.setFoodScanHistoryOpen);
  const selectedPet = usePetStore((s) => s.selectedPet);
  const [items, setItems] = useState<FoodScanHistoryItem[]>([]);

  useEffect(() => {
    const petId = selectedPet?.id;
    if (!open || !petId) return;
    apiFetch<FoodScanHistoryItem[]>(`/food-scan/history/${petId}`, {
      method: "GET",
    })
      .then(setItems)
      .catch((error) => console.error(error));
  }, [open, selectedPet?.id]);

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col bg-[#fbf8f4] transition-transform duration-300 ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-md space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="返回 AI 食物辨別"
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold text-ink">AI 食物辨識記錄</h1>
          </div>

          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/40">
              {selectedPet?.name ?? "這隻寵物"} 還沒有 AI 食物辨識記錄
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-3"
                >
                  <img
                    src={item.image_url}
                    alt="食物照片"
                    className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-ink/40">
                      {formatDateTime(item.created_at)}
                    </div>
                    {item.food_detected ? (
                      <>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-sm font-medium text-ink/80">
                            {item.food_name}
                          </p>
                          <span className="flex items-center gap-1 text-[11px] text-ink/40">
                            {item.calories} kcal/100g
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`flex ${
                              item.is_safe
                                ? "text-[#3fa88f]"
                                : "text-[#c9503f]"
                            }`}
                          >
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={11}
                                fill={
                                  i < item.safety_level ? "currentColor" : "none"
                                }
                                strokeWidth={i < item.safety_level ? 0 : 1.5}
                              />
                            ))}
                          </span>
                          {item.suitable_species.length > 0 && (
                            <span className="flex items-center gap-1.5">
                              {item.suitable_species.map((s) => (
                                <span
                                  key={s}
                                  className="flex items-center gap-0.5 text-[10px] text-ink/50"
                                >
                                  <Check
                                    size={10}
                                    className="text-[#3fa88f]"
                                  />
                                  {speciesLabel[s] ?? s}
                                </span>
                              ))}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-ink/50">
                        AI 沒有從這張照片中辨識出食物
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
