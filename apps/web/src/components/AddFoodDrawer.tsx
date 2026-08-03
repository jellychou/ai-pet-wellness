import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Bot,
  Camera,
  Check,
  ChevronRight,
  Clock,
  History,
  Info,
  Plus,
  Search,
  Star,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useAppStore,
  type FoodDraftItem,
  type FoodScanItem,
  type FoodScanResult,
} from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { apiFetch } from "../lib/api";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import { useAlert } from "../hooks/useAlert";

const speciesLabel: Record<string, string> = { dog: "狗狗", cat: "貓咪" };

// 純前端產生的暫存 id，不是後端資料
function makeLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type FoodScanUsage = {
  used: number;
  limit: number;
  unlimited: boolean;
};

type AnalyzeFoodResponse = FoodScanResult & { usage: FoodScanUsage };

// 上傳照片、還沒送出分析前的暫存項目——note 是這張照片各自的補充說明
// （選填），分析時會跟著這張照片一起送出去，不是全部照片共用一段文字
type PendingPhoto = {
  file: File;
  note: string;
};

type HistoryFoodItem = {
  food_name: string;
  image_url: string | null;
  portion_grams: number;
  calories: number;
  times_used: number;
  last_used_at: string;
};

// 整個新增流程分 5 個畫面（跟設計稿「1 選擇記錄方式」~「5 確認與保存」
// 一一對應，「6 歷史紀錄」是 Dashboard 的飲食記錄卡片，不是這個 drawer
// 裡的畫面）：
// choose   1 選擇記錄方式——拍照辨識 or 從歷史選擇
// collect  2 上傳多張圖片/選擇Item——用 collectTab 切換兩種輸入方式
// results  3 AI 辨識結果——列出這輪加進來的品項，可以點進去看細節
// portions 4 調整份量與組合——每項可以加減調整份量
// confirm  5 確認與保存——總熱量/營養概況/餐別時間，按下去才真的存
type Step = "choose" | "collect" | "results" | "portions" | "confirm";
type CollectTab = "upload" | "history";

const mealTypeOptions = [
  { label: "早餐", value: "breakfast" },
  { label: "午餐", value: "lunch" },
  { label: "晚餐", value: "dinner" },
  { label: "點心", value: "snack" },
] as const;

function toDateTimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

// 逐項食材/品項分解表，唯讀顯示。included=false 的品項（AI 判斷不該計入
// 總熱量，例如明顯沒吃完的配菜）用淡化 + 刪除線顯示，note 說明原因
function ItemsTable({ items }: { items: FoodScanItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-[#eee5da]">
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="bg-[#f7f2ea] text-ink/50">
            <th className="px-2.5 py-2 font-medium">食材</th>
            <th className="px-2.5 py-2 text-right font-medium">估計份量</th>
            <th className="px-2.5 py-2 text-right font-medium">熱量</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={`${item.name}-${i}`}
              className={`border-t border-[#eee5da] ${item.included ? "" : "opacity-50"}`}
            >
              <td className="px-2.5 py-2 align-top">
                <div
                  className={
                    item.included ? "text-ink/80" : "text-ink/50 line-through"
                  }
                >
                  {item.name}
                </div>
                {item.note && (
                  <div className="mt-0.5 text-[10px] text-ink/35">
                    {item.note}
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap px-2.5 py-2 text-right text-ink/60">
                約 {item.estimated_grams_low}–{item.estimated_grams_high}g
              </td>
              <td className="whitespace-nowrap px-2.5 py-2 text-right font-medium text-ink">
                {item.calories_low}–{item.calories_high}
                <span className="ml-0.5 text-[9px] font-normal text-ink/40">
                  kcal
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NutritionGrid({ result }: { result: FoodScanResult }) {
  const items = [
    { label: "蛋白質", value: result.protein },
    { label: "脂肪", value: result.fat },
    { label: "碳水", value: result.carb },
    { label: "纖維", value: result.fiber },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl bg-[#f7f2ea] px-1 py-2.5 text-center"
        >
          <div className="text-sm font-semibold text-ink">
            {item.value}
            <span className="text-[10px] font-normal text-ink/40">g</span>
          </div>
          <div className="mt-0.5 text-[10px] text-ink/45">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

// 「這一份」（AI 估計的 estimated_grams）的完整分析結果卡——只有拍照辨識
// 來的品項才有，在「AI 辨識結果」畫面點進某一項才會看到
function ResultCard({ result }: { result: FoodScanResult }) {
  return (
    <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 shadow-[0_4px_16px_rgba(120,96,84,.06)]">
      <div className="flex items-start justify-between">
        <div className="text-xs text-ink/45">AI 辨識結果</div>
        <span className="rounded-full bg-[#f1e6d8] px-2 py-0.5 text-[11px] font-medium text-ink/60">
          信心度 {result.confidence}%
        </span>
      </div>
      <div className="mt-1 text-base font-semibold text-ink">
        {result.food_name}
      </div>
      <div className="text-xs text-ink/40">
        AI 估計這份大約 {result.estimated_grams} g
      </div>

      {result.items.length > 0 && (
        <div className="mt-3">
          <ItemsTable items={result.items} />
        </div>
      )}

      {result.estimate_note && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-4 text-ink/40">
          <Info size={12} className="mt-0.5 shrink-0" />
          {result.estimate_note}
        </p>
      )}

      <div className="mt-3">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-ink">{result.calories}</span>
          <span className="text-sm text-ink/50">kcal（最佳估計）</span>
        </div>
        {(result.calories_low > 0 || result.calories_high > 0) && (
          <div className="mt-0.5 text-xs text-ink/40">
            整體估計範圍約 {result.calories_low}–{result.calories_high} kcal
          </div>
        )}
      </div>

      <div className="my-4 h-px bg-[#eee5da]" />

      <div className="flex items-center justify-between text-sm">
        <span className="text-ink/50">安全等級</span>
        <span className="flex items-center gap-2">
          <span
            className={`font-medium ${
              result.is_safe ? "text-[#3fa88f]" : "text-[#c9503f]"
            }`}
          >
            {result.is_safe ? "Safe" : "Unsafe"}
          </span>
          <span
            className={`flex ${
              result.is_safe ? "text-[#3fa88f]" : "text-[#c9503f]"
            }`}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={13}
                fill={i < result.safety_level ? "currentColor" : "none"}
                strokeWidth={i < result.safety_level ? 0 : 1.5}
              />
            ))}
          </span>
        </span>
      </div>

      <div className="my-4 h-px bg-[#eee5da]" />

      <div className="flex items-center justify-between text-sm">
        <span className="text-ink/50">適合寵物</span>
        <span className="flex items-center gap-3">
          {result.suitable_species.length === 0 ? (
            <span className="text-ink/40">無</span>
          ) : (
            result.suitable_species.map((s) => (
              <span key={s} className="flex items-center gap-1 text-ink/80">
                <Check size={14} className="text-[#3fa88f]" />
                {speciesLabel[s] ?? s}
              </span>
            ))
          )}
        </span>
      </div>

      <div className="my-4 h-px bg-[#eee5da]" />

      <div>
        <div className="text-xs text-ink/50">
          這份（約 {result.estimated_grams}g）的營養資訊
        </div>
        <div className="mt-2">
          <NutritionGrid result={result} />
        </div>
      </div>

      {result.suggestions.length > 0 && (
        <>
          <div className="my-4 h-px bg-[#eee5da]" />
          <div>
            <div className="text-xs text-ink/50">建議與注意事項</div>
            <ul className="mt-1.5 space-y-1">
              {result.suggestions.map((s) => (
                <li key={s} className="text-sm leading-6 text-ink/80">
                  · {s}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// 「AI 辨識結果」畫面的一列——縮圖 + 名稱 + 份量/熱量，有完整分析資料
// （scanDetail，拍照辨識來源）才能點進去看細節，從歷史選擇來的品項沒有
// 這份資料，整列不能點，只能移除
function ResultsRow({
  item,
  onOpenDetail,
  onRemove,
}: {
  item: FoodDraftItem;
  onOpenDetail: () => void;
  onRemove: () => void;
}) {
  const clickable = Boolean(item.scanDetail);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-3">
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
      <button
        type="button"
        onClick={clickable ? onOpenDetail : undefined}
        disabled={!clickable}
        className="min-w-0 flex-1 text-left disabled:cursor-default"
      >
        <div className="truncate text-sm font-medium text-ink">
          {item.food_name}
        </div>
        <div className="mt-0.5 text-xs text-ink/45">
          約 {item.portion_grams}g・約 {item.calories} kcal
        </div>
      </button>
      {clickable && <ChevronRight size={16} className="shrink-0 text-ink/30" />}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`移除 ${item.food_name}`}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink/35 transition hover:bg-cream hover:text-ink/60"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// 「調整份量與組合」畫面的一列——縮圖 + 名稱 + 可調整的份量（±10g）+ 熱量 +
// 移除鈕，不管來源是拍照辨識還是從歷史選擇都是同一種顯示方式
function PortionRow({
  item,
  onAdjustPortion,
  onRemove,
}: {
  item: FoodDraftItem;
  onAdjustPortion: (delta: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-3">
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
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAdjustPortion(-10)}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#ece4dc] text-xs text-ink/60 transition hover:bg-cream"
          >
            −
          </button>
          <span className="text-xs text-ink/60">
            {item.portion_grams}g / {item.calories} kcal
          </span>
          <button
            type="button"
            onClick={() => onAdjustPortion(10)}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#ece4dc] text-xs text-ink/60 transition hover:bg-cream"
          >
            +
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`移除 ${item.food_name}`}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink/35 transition hover:bg-cream hover:text-ink/60"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function AddFoodDrawer() {
  const open = useAppStore((s) => s.addFoodOpen);
  const setOpen = useAppStore((s) => s.setAddFoodOpen);
  const setHistoryOpen = useAppStore((s) => s.setFoodScanHistoryOpen);
  const draftItems = useAppStore((s) => s.foodDraftItems);
  const addFoodDraftItem = useAppStore((s) => s.addFoodDraftItem);
  const updateFoodDraftItemPortion = useAppStore(
    (s) => s.updateFoodDraftItemPortion,
  );
  const removeFoodDraftItem = useAppStore((s) => s.removeFoodDraftItem);
  const clearFoodDraftItems = useAppStore((s) => s.clearFoodDraftItems);
  const bumpFoodRecordRefreshKey = useAppStore(
    (s) => s.bumpFoodRecordRefreshKey,
  );
  const selectedPet = usePetStore((s) => s.selectedPet);
  const { showError, showSuccess } = useAlert();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("choose");
  const [collectTab, setCollectTab] = useState<CollectTab>("upload");
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryFoodItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryNames, setSelectedHistoryNames] = useState<Set<string>>(
    new Set(),
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({
    current: 0,
    total: 0,
  });
  const [detailItem, setDetailItem] = useState<FoodDraftItem | null>(null);
  const [usage, setUsage] = useState<FoodScanUsage | null>(null);

  const [mealType, setMealType] = useState<string>("snack");
  const [fedAt, setFedAt] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    apiFetch<FoodScanUsage>("/food-scan/usage-today", { method: "GET" })
      .then(setUsage)
      .catch((err) => console.error(err));
  }, [open]);

  // 每次重新打開都是全新一輪記錄，回到第一畫面、清掉上一輪的暫存清單
  useEffect(() => {
    if (!open) return;
    setStep("choose");
    setCollectTab("upload");
    setPendingPhotos([]);
    setSelectedHistoryNames(new Set());
    setDetailItem(null);
    setMealType("snack");
    setFedAt(toDateTimeLocal(new Date()));
    setNote("");
    setError("");
    clearFoodDraftItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // pendingPreviews 跟 pendingPhotos 保持同步，換掉舊的 objectURL 時記得
  // revoke，不然選很多次照片會累積一堆沒釋放的記憶體
  useEffect(() => {
    const urls = pendingPhotos.map((p) => URL.createObjectURL(p.file));
    setPendingPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingPhotos]);

  // 切到「歷史選擇」分頁才打 API，不用一開始就抓（大多數人可能只走拍照
  // 這條路，沒必要每次打開都先撈一次歷史清單）
  useEffect(() => {
    const petId = selectedPet?.id;
    if (!open || step !== "collect" || collectTab !== "history" || !petId) {
      return;
    }
    setHistoryLoading(true);
    apiFetch<HistoryFoodItem[]>(`/food/history-items/${petId}`, {
      method: "GET",
    })
      .then(setHistoryItems)
      .catch((err) => console.error(err))
      .finally(() => setHistoryLoading(false));
  }, [open, step, collectTab, selectedPet?.id]);

  const limitReached =
    usage != null && !usage.unlimited && usage.used >= usage.limit;

  function handleClose() {
    setOpen(false);
    navigate("/");
  }

  function handleBack() {
    if (step === "choose") {
      handleClose();
      return;
    }
    if (step === "collect") {
      setStep(draftItems.length > 0 ? "results" : "choose");
      return;
    }
    if (step === "results") {
      setStep("collect");
      return;
    }
    if (step === "portions") {
      setStep("results");
      return;
    }
    setStep("portions");
  }

  function handleViewHistory() {
    setHistoryOpen(true);
  }

  function handleChooseMethod(tab: CollectTab) {
    setCollectTab(tab);
    setStep("collect");
  }

  function handlePickPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    if (!selectedPet) {
      showError("請先選擇寵物");
      return;
    }
    setPendingPhotos((current) =>
      [...current, ...files.map((file) => ({ file, note: "" }))].slice(0, 10),
    );
  }

  function handleRemovePendingPhoto(index: number) {
    setPendingPhotos((current) => current.filter((_, i) => i !== index));
  }

  function handleUpdatePendingNote(index: number, note: string) {
    setPendingPhotos((current) =>
      current.map((p, i) => (i === index ? { ...p, note } : p)),
    );
  }

  // 依序分析每一張照片——沒有一次打包多張圖給同一次 AI 呼叫，是沿用
  // /food-scan/analyze-image 原本一張一次的介面，前端自己迴圈跑過去，
  // 每張照片各自的補充說明（如果有填）會跟著那一張一起送出去，結果合併成
  // 同一份暫存清單再顯示。中途如果額度用完就提早停止，不繼續浪費使用者
  // 已經選好但打不完的照片
  async function handleStartAnalysis() {
    if (pendingPhotos.length === 0 || !selectedPet) return;
    setAnalyzing(true);
    setAnalyzeProgress({ current: 0, total: pendingPhotos.length });

    let usedCount = usage?.used ?? 0;
    const limit = usage?.limit ?? Infinity;
    const unlimited = usage?.unlimited ?? false;
    let skipped = 0;
    let quotaStopped = false;

    for (let i = 0; i < pendingPhotos.length; i++) {
      if (!unlimited && usedCount >= limit) {
        skipped += pendingPhotos.length - i;
        quotaStopped = true;
        break;
      }
      setAnalyzeProgress({ current: i + 1, total: pendingPhotos.length });
      try {
        const uploadedUrl = await uploadImageToCloudinary(
          pendingPhotos[i].file,
        );
        const response = await apiFetch<AnalyzeFoodResponse>(
          "/food-scan/analyze-image",
          {
            method: "POST",
            body: JSON.stringify({
              pet_id: selectedPet.id,
              image_url: uploadedUrl,
              description: pendingPhotos[i].note.trim() || null,
            }),
          },
        );
        const { usage: nextUsage, ...scanResult } = response;
        if (nextUsage) {
          setUsage(nextUsage);
          usedCount = nextUsage.used;
        } else {
          usedCount += 1;
        }
        if (scanResult.food_detected) {
          const caloriesPerGram =
            scanResult.estimated_grams > 0
              ? scanResult.calories / scanResult.estimated_grams
              : 0;
          addFoodDraftItem({
            localId: makeLocalId(),
            food_name: scanResult.food_name,
            image_url: uploadedUrl,
            portion_grams: scanResult.estimated_grams,
            calories: scanResult.calories,
            caloriesPerGram,
            source: "scan",
            scanDetail: scanResult,
          });
        } else {
          skipped += 1;
        }
      } catch (err) {
        console.error(err);
        skipped += 1;
      }
    }

    setAnalyzing(false);
    setPendingPhotos([]);
    if (quotaStopped) {
      showError(
        `今天的 AI 食物辨識次數已用完（每天最多 ${limit} 次），還有 ${skipped} 張照片沒分析`,
      );
    } else if (skipped > 0) {
      showError(`${skipped} 張照片看不出是食物或分析失敗，已略過`);
    }
    setStep("results");
  }

  function toggleHistorySelection(foodName: string) {
    setSelectedHistoryNames((current) => {
      const next = new Set(current);
      if (next.has(foodName)) {
        next.delete(foodName);
      } else {
        next.add(foodName);
      }
      return next;
    });
  }

  function handleAddSelectedHistory() {
    for (const item of historyItems) {
      if (!selectedHistoryNames.has(item.food_name)) continue;
      const caloriesPerGram =
        item.portion_grams > 0 ? item.calories / item.portion_grams : 0;
      addFoodDraftItem({
        localId: makeLocalId(),
        food_name: item.food_name,
        image_url: item.image_url,
        portion_grams: item.portion_grams,
        calories: item.calories,
        caloriesPerGram,
        source: "history",
      });
    }
    setSelectedHistoryNames(new Set());
    setStep("results");
  }

  function handleAddMore() {
    setPendingPhotos([]);
    setStep("collect");
  }

  function handleGoToPortions() {
    if (draftItems.length === 0) return;
    setStep("portions");
  }

  function handleGoToConfirm() {
    if (draftItems.length === 0) return;
    setStep("confirm");
  }

  async function handleSave() {
    if (draftItems.length === 0) {
      setError("沒有食材，請先新增");
      return;
    }
    if (!selectedPet) {
      setError("請選擇寵物");
      return;
    }
    if (draftItems.some((item) => item.portion_grams <= 0)) {
      setError("每項食材的份量都要大於 0");
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
          pet_id: selectedPet.id,
          items: draftItems.map((item) => ({
            food_name: item.food_name,
            image_url: item.image_url,
            portion_grams: item.portion_grams,
            calories: item.calories,
          })),
          meal_type: mealType,
          fed_at: new Date(fedAt).toISOString(),
          note: note || null,
        }),
      });
      showSuccess(`已加入 ${selectedPet.name} 的飲食記錄`);
      clearFoodDraftItems();
      setOpen(false);
      navigate("/");
      bumpFoodRecordRefreshKey();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "飲食記錄儲存失敗，請稍後再試",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const totalCalories =
    Math.round(draftItems.reduce((sum, item) => sum + item.calories, 0) * 10) /
    10;

  // 營養概況只用「有完整 AI 分析資料」的品項算——從歷史選擇進來的品項沒存過
  // 蛋白質/脂肪/碳水/纖維，混在一起算會失真，寧可只算有資料的部分並註明，
  // 也不要假裝算出一個包含缺資料品項的「完整」數字
  const itemsWithMacro = draftItems.filter((item) => item.scanDetail);
  const hasItemsWithoutMacro = draftItems.some((item) => !item.scanDetail);
  const macroTotals = itemsWithMacro.reduce(
    (acc, item) => {
      const detail = item.scanDetail!;
      const ratio =
        detail.estimated_grams > 0
          ? item.portion_grams / detail.estimated_grams
          : 0;
      acc.protein += detail.protein * ratio;
      acc.fat += detail.fat * ratio;
      acc.carb += detail.carb * ratio;
      acc.fiber += detail.fiber * ratio;
      return acc;
    },
    { protein: 0, fat: 0, carb: 0, fiber: 0 },
  );
  const macroGramSum =
    macroTotals.protein +
    macroTotals.fat +
    macroTotals.carb +
    macroTotals.fiber;
  const macroPercents =
    macroGramSum > 0
      ? [
          {
            label: "蛋白質",
            percent: Math.round((macroTotals.protein / macroGramSum) * 100),
            color: "bg-[#688696]",
          },
          {
            label: "脂肪",
            percent: Math.round((macroTotals.fat / macroGramSum) * 100),
            color: "bg-[#d9834f]",
          },
          {
            label: "碳水化合物",
            percent: Math.round((macroTotals.carb / macroGramSum) * 100),
            color: "bg-[#caa06f]",
          },
          {
            label: "纖維",
            percent: Math.round((macroTotals.fiber / macroGramSum) * 100),
            color: "bg-[#3fa88f]",
          },
        ]
      : null;

  const headerTitle =
    step === "choose"
      ? "新增飲食記錄"
      : step === "collect"
        ? collectTab === "upload"
          ? "上傳照片"
          : "從歷史選擇"
        : step === "results"
          ? "AI 辨識結果"
          : step === "portions"
            ? "調整份量與組合"
            : "今日飲食總結";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-[#fbf8f4] transition-transform duration-300 ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      {detailItem && detailItem.scanDetail && (
        <div className="absolute inset-0 z-10 flex flex-col bg-[#fbf8f4]">
          <div className="flex items-center gap-2 border-b border-[#ece4dc] bg-[#fffdfa] px-4 py-3">
            <button
              type="button"
              onClick={() => setDetailItem(null)}
              aria-label="返回"
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-sm font-semibold text-ink">AI 判讀細節</h1>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="mx-auto max-w-md">
              <ResultCard result={detailItem.scanDetail} />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              aria-label="返回"
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-semibold text-ink">{headerTitle}</h1>
            {step === "choose" ? (
              <button
                type="button"
                onClick={handleViewHistory}
                aria-label="檢視辨識記錄"
                className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
              >
                <Clock size={19} />
              </button>
            ) : (
              <span className="w-9" />
            )}
          </div>

          {(step === "choose" ||
            (step === "collect" && collectTab === "upload")) &&
            usage && (
              <div
                className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                  limitReached
                    ? "bg-[#fbe4de] text-[#c9503f]"
                    : "bg-[#eef4f6] text-[#688696]"
                }`}
              >
                {usage.unlimited
                  ? `管理員帳號，今日已使用 ${usage.used} 次，無次數限制`
                  : `今日已使用 ${usage.used} / ${usage.limit} 次${limitReached ? "，請明天再試" : ""}`}
              </div>
            )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePickPhotos}
          />

          {/* 1 選擇記錄方式 */}
          {step === "choose" && (
            <div className="space-y-3">
              <p className="text-sm text-ink/50">你要如何新增？</p>
              <button
                type="button"
                onClick={() => handleChooseMethod("upload")}
                disabled={limitReached}
                className="flex w-full items-center gap-3 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 text-left transition hover:bg-[#f7f2ea] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#eef4f6] text-[#688696]">
                  <Camera size={22} />
                </span>
                <div>
                  <div className="text-sm font-semibold text-ink">
                    拍照辨識食物
                  </div>
                  <div className="mt-0.5 text-xs text-ink/45">
                    拍攝食物或飼料照片，AI 自動辨識
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleChooseMethod("history")}
                className="flex w-full items-center gap-3 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 text-left transition hover:bg-[#f7f2ea]"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#f1e6d8] text-[#b98a5c]">
                  <History size={22} />
                </span>
                <div>
                  <div className="text-sm font-semibold text-ink">
                    從歷史 Item 選擇
                  </div>
                  <div className="mt-0.5 text-xs text-ink/45">
                    從常用食材中選擇，快速記錄
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* 2 上傳多張圖片/選擇Item */}
          {step === "collect" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#f1ece3] p-1">
                <button
                  type="button"
                  onClick={() => setCollectTab("upload")}
                  className={`rounded-xl py-2 text-sm font-medium transition ${
                    collectTab === "upload"
                      ? "bg-white text-ink shadow-sm"
                      : "text-ink/45"
                  }`}
                >
                  上傳照片
                </button>
                <button
                  type="button"
                  onClick={() => setCollectTab("history")}
                  className={`rounded-xl py-2 text-sm font-medium transition ${
                    collectTab === "history"
                      ? "bg-white text-ink shadow-sm"
                      : "text-ink/45"
                  }`}
                >
                  歷史選擇
                </button>
              </div>

              {collectTab === "upload" &&
                (analyzing ? (
                  <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-[#eee5da] bg-[#fffdfa] px-6 py-8">
                    <p className="text-base font-semibold text-ink">
                      食物辨識中…
                    </p>
                    <div className="relative grid h-20 w-20 place-items-center rounded-full bg-[#eef4f6] text-[#688696]">
                      <Bot size={40} />
                      <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-white text-[#b98a5c] shadow-[0_2px_8px_rgba(0,0,0,.12)]">
                        <Search size={16} />
                      </span>
                    </div>
                    <p className="text-sm font-medium text-ink/70">
                      正在辨識第 {analyzeProgress.current} /{" "}
                      {analyzeProgress.total} 張照片…
                    </p>
                    <p className="text-xs text-ink/40">
                      每張約 10~30 秒，請稍候
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {pendingPhotos.map((photo, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 rounded-2xl border border-[#eee5da] bg-[#fffdfa] p-2"
                        >
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                            <img
                              src={pendingPreviews[i]}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePendingPhoto(i)}
                              aria-label="移除照片"
                              className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/50 text-white"
                            >
                              <X size={11} />
                            </button>
                          </div>
                          <textarea
                            value={photo.note}
                            onChange={(e) =>
                              handleUpdatePendingNote(i, e.target.value)
                            }
                            rows={2}
                            placeholder="補充說明（選填），例如品牌、包裝上的文字…"
                            className="min-w-0 flex-1 resize-none rounded-xl border border-[#eee5da] bg-white px-2.5 py-1.5 text-xs outline-none placeholder:text-ink/30"
                          />
                        </div>
                      ))}
                      {pendingPhotos.length < 10 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={limitReached}
                          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#d8c9b4] bg-[#fbf7f1] py-3 text-sm font-medium text-[#b98a5c] transition disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus size={16} />
                          新增照片
                        </button>
                      )}
                    </div>
                    <p className="text-center text-xs text-ink/35">
                      最多可上傳 10 張照片
                    </p>
                  </>
                ))}

              {collectTab === "history" &&
                (historyLoading ? (
                  <p className="py-10 text-center text-sm text-ink/40">
                    載入中…
                  </p>
                ) : historyItems.length === 0 ? (
                  <p className="py-10 text-center text-sm text-ink/40">
                    {selectedPet?.name ?? "這隻寵物"} 還沒有飲食記錄可以選
                  </p>
                ) : (
                  <div className="space-y-2">
                    {historyItems.map((item) => {
                      const isSelected = selectedHistoryNames.has(
                        item.food_name,
                      );
                      return (
                        <button
                          key={item.food_name}
                          type="button"
                          onClick={() => toggleHistorySelection(item.food_name)}
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
                              上次約 {item.portion_grams}g / {item.calories}{" "}
                              kcal・吃過 {item.times_used} 次
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
                    })}
                  </div>
                ))}
            </div>
          )}

          {/* 3 AI 辨識結果 */}
          {step === "results" && (
            <div className="space-y-2">
              {draftItems.map((item) => (
                <ResultsRow
                  key={item.localId}
                  item={item}
                  onOpenDetail={() => setDetailItem(item)}
                  onRemove={() => removeFoodDraftItem(item.localId)}
                />
              ))}
              <button
                type="button"
                onClick={handleAddMore}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#d8c9b4] py-3 text-sm font-medium text-[#b98a5c] transition hover:bg-[#fbf7f1]"
              >
                <Plus size={16} />
                新增其他食材
              </button>
            </div>
          )}

          {/* 4 調整份量與組合 */}
          {step === "portions" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-ink/50">
                <span>共 {draftItems.length} 項食材</span>
                <span className="text-sm font-semibold text-ink">
                  {totalCalories} kcal
                </span>
              </div>
              {draftItems.map((item) => (
                <PortionRow
                  key={item.localId}
                  item={item}
                  onAdjustPortion={(delta) =>
                    updateFoodDraftItemPortion(
                      item.localId,
                      Math.max(0, item.portion_grams + delta),
                    )
                  }
                  onRemove={() => removeFoodDraftItem(item.localId)}
                />
              ))}
            </div>
          )}

          {/* 5 確認與保存 */}
          {step === "confirm" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 text-center">
                <div className="text-xs text-ink/45">總熱量</div>
                <div className="mt-1 text-4xl font-bold text-ink">
                  {totalCalories}
                  <span className="ml-1 text-sm font-normal text-ink/40">
                    kcal
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {draftItems.map((item) => (
                  <div
                    key={item.localId}
                    className="flex items-center gap-3 rounded-xl bg-[#fbf7f1] p-2.5"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.food_name}
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f1e6d8] text-[#b98a5c]">
                        <UtensilsCrossed size={14} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-ink/80">
                      {item.food_name}
                    </span>
                    <span className="shrink-0 text-sm font-medium text-ink">
                      {item.calories} kcal
                    </span>
                  </div>
                ))}
              </div>

              {macroPercents && (
                <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4">
                  <div className="text-xs text-ink/45">營養概況</div>
                  <div className="mt-3 space-y-2.5">
                    {macroPercents.map((m) => (
                      <div key={m.label}>
                        <div className="flex items-center justify-between text-xs text-ink/60">
                          <span>{m.label}</span>
                          <span className="font-medium text-ink">
                            {m.percent}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#eee5da]">
                          <div
                            className={`h-full rounded-full ${m.color}`}
                            style={{ width: `${m.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasItemsWithoutMacro && (
                    <p className="mt-3 text-[11px] text-ink/35">
                      僅供參考：從歷史選擇加入的品項沒有存過營養素資料，
                      這裡的比例只計算有 AI 分析資料的品項。
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-[12px] font-medium text-ink/70">
                  餐別
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {mealTypeOptions.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setMealType(o.value)}
                      className={`rounded-xl border py-2.5 text-[12px] font-medium transition ${
                        mealType === o.value
                          ? "border-[#e8a56b] bg-[#fdf1e6] text-[#c9784a]"
                          : "border-[#ece4dc] bg-white text-ink/50"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-ink/70">
                  餵食時間
                </label>
                <input
                  type="datetime-local"
                  value={fedAt}
                  onChange={(e) => setFedAt(e.target.value)}
                  className="w-full rounded-xl border border-[#ece0d2] bg-white px-3 py-2.5 text-[12px] text-ink outline-none [color-scheme:light]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-ink/70">
                  備註（選填）
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 200))}
                  placeholder="可記錄寵物進食狀況..."
                  rows={2}
                  maxLength={200}
                  className="w-full resize-none rounded-xl border border-[#ece0d2] bg-white px-3 py-2.5 text-[12px] text-ink outline-none placeholder:text-ink/30"
                />
              </div>

              {error && (
                <p className="text-center text-xs text-red-500">{error}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-4 py-4">
        <div className="mx-auto max-w-md">
          {step === "collect" &&
            (analyzing ? (
              <button
                type="button"
                disabled
                className="w-full rounded-2xl bg-[#688696] py-3.5 text-sm font-semibold text-white opacity-60"
              >
                分析中…
              </button>
            ) : collectTab === "upload" ? (
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={pendingPhotos.length === 0 || limitReached}
                className="w-full rounded-2xl bg-[#688696] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(185,138,92,.35)] transition hover:bg-[#5a7684] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {pendingPhotos.length > 0
                  ? `開始分析（${pendingPhotos.length} 張）`
                  : "請先選擇照片"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddSelectedHistory}
                disabled={selectedHistoryNames.size === 0}
                className="w-full rounded-2xl bg-[#688696] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(185,138,92,.35)] transition hover:bg-[#5a7684] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {selectedHistoryNames.size > 0
                  ? `加入 ${selectedHistoryNames.size} 項`
                  : "請先選擇食材"}
              </button>
            ))}

          {step === "results" && (
            <button
              type="button"
              onClick={handleGoToPortions}
              disabled={draftItems.length === 0}
              className="w-full rounded-2xl bg-[#b98a5c] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(185,138,92,.35)] transition hover:bg-[#a97a4d] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              下一步：調整份量
            </button>
          )}

          {step === "portions" && (
            <button
              type="button"
              onClick={handleGoToConfirm}
              disabled={draftItems.length === 0}
              className="w-full rounded-2xl bg-[#b98a5c] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(185,138,92,.35)] transition hover:bg-[#a97a4d] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              計算總熱量
            </button>
          )}

          {step === "confirm" && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || draftItems.length === 0}
              className="w-full rounded-2xl bg-[#b98a5c] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(185,138,92,.35)] transition hover:bg-[#a97a4d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "儲存中…" : "儲存記錄"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
