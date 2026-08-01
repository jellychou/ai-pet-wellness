import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  Bookmark,
  Bot,
  Camera,
  Check,
  Clock,
  Info,
  Pencil,
  RotateCcw,
  Search,
  Star,
  TriangleAlert,
  UtensilsCrossed,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useAppStore,
  type FoodScanItem,
  type FoodScanResult,
} from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { apiFetch } from "../lib/api";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import { useAlert } from "../hooks/useAlert";

const speciesLabel: Record<string, string> = { dog: "狗狗", cat: "貓咪" };

// 分析 loading 畫面用的假進度清單，純粹是 UI 上讓等待感覺有在動——
// 實際分析是一次 API call 打完，不是真的分這幾步驟執行
const LOADING_STEPS = ["辨讀食物種類", "分析營養成分", "評估安全性", "生成建議"];

type FoodScanUsage = {
  used: number;
  limit: number;
  unlimited: boolean;
};

type AnalyzeFoodResponse = FoodScanResult & { usage: FoodScanUsage };

// 逐項食材/品項分解表，跟畫面上其他區塊不同的地方是這裡是唯讀的——目前
// 只有整份餐點的 food_name/estimated_grams/calories 可以在「修改結果」
// 裡校正，個別品項還沒有編輯功能。included=false 的品項（AI 判斷不該計入
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

// 「這一份」（AI 估計的 estimated_grams）的營養資訊卡，success/uncertain/
// danger 三種變化都共用同一張卡，只是外面包的提示 banner 不同——undetected
// 那種完全沒有食物資料可以顯示，不會走到這裡
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
          <span className="text-4xl font-bold text-ink">
            {result.calories}
          </span>
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
              <span
                key={s}
                className="flex items-center gap-1 text-ink/80"
              >
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

// 底部次要動作用的小按鈕：圖示在上、文字在下，寬度平均分配在 grid-cols-3
// 裡，不會像純文字按鈕那樣因為字數不同（「修改結果」4字 vs 之前「儲存到
// 我的常用食物」8字）而看起來一邊擠一邊鬆。badge 用來誠實標示「還沒做好」
// ——之前用很淡的文字顏色偽裝成 disabled，但按鈕其實還是能點、點下去只是
// 跳一個「敬請期待」的 toast，使用者容易誤會是壞掉了；現在直接用原生
// disabled + 右上角小標籤說清楚，不騙使用者
function ActionIconButton({
  icon,
  label,
  onClick,
  disabled,
  badge,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] font-medium transition ${
        disabled
          ? "cursor-not-allowed border-dashed border-[#ece4dc] text-ink/30"
          : "border-[#ece4dc] text-ink/70 hover:bg-cream"
      }`}
    >
      {badge && (
        <span className="absolute -top-2 right-1 whitespace-nowrap rounded-full bg-[#f1e6d8] px-1.5 py-[1px] text-[9px] font-semibold text-[#b98a5c]">
          {badge}
        </span>
      )}
      {icon}
      {label}
    </button>
  );
}

export function AddFoodDrawer() {
  const open = useAppStore((s) => s.addFoodOpen);
  const setOpen = useAppStore((s) => s.setAddFoodOpen);
  const setHistoryOpen = useAppStore((s) => s.setFoodScanHistoryOpen);
  const setAddFoodRecordOpen = useAppStore((s) => s.setAddFoodRecordOpen);
  const setEditFoodResultOpen = useAppStore((s) => s.setEditFoodResultOpen);
  const result = useAppStore((s) => s.foodScanResult);
  const setResult = useAppStore((s) => s.setFoodScanResult);
  const setImageUrl = useAppStore((s) => s.setFoodScanImageUrl);
  const selectedPet = usePetStore((s) => s.selectedPet);
  const { showError } = useAlert();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 一開始不放真實照片，改用下面的圖示佔位——之前放的是網路上抓的示意照，
  // 使用者常常會誤以為那就是「已經上傳的照片」
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  // 分析其實是一次打完的單一 API call，不是真的分階段回報進度——這個
  // loadingStep 只是照時間軸假裝逐步完成，讓等待的 10~20 秒感覺不是卡住，
  // 不代表後端真的在做這幾個獨立步驟
  const [loadingStep, setLoadingStep] = useState(0);
  const [usage, setUsage] = useState<FoodScanUsage | null>(null);

  // 一打開就先問今天用了幾次，跟 AiScanDrawer 同樣的理由：還沒選照片就能先
  // 顯示標語、額度用完也能提早擋下來
  useEffect(() => {
    if (!open) return;
    apiFetch<FoodScanUsage>("/food-scan/usage-today", { method: "GET" })
      .then(setUsage)
      .catch((error) => console.error(error));
  }, [open]);

  // 每次重新打開都是全新一輪辨識，上一次的結果留著只會誤導使用者
  useEffect(() => {
    if (!open) return;
    setPhoto(null);
    setResult(null);
    setImageUrl(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 開始分析就從第一步跑起，每 4 秒跳下一步，跑到最後一步就停在那裡等真正
  // 的 API 回應——真實分析大約 10~20 秒，4 步跑完大概 12 秒，稍微留一點
  // buffer，避免進度條比實際回應快太多看起來像卡住
  useEffect(() => {
    if (!analyzing) {
      setLoadingStep(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingStep((step) => Math.min(step + 1, LOADING_STEPS.length - 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [analyzing]);

  // 用 != 而不是 !==，理由跟 AiScanDrawer 一樣：避免舊版後端回應缺欄位時
  // usage 變成 undefined，用 !== null 判斷不出來就直接讀 .used 炸掉
  const limitReached =
    usage != null && !usage.unlimited && usage.used >= usage.limit;

  function handleBack() {
    setOpen(false);
    navigate("/");
  }

  function handleRetake() {
    if (limitReached) {
      showError(
        `今天的 AI 食物辨識次數已用完（每天最多 ${usage?.limit} 次），請明天再試`,
      );
      return;
    }
    fileInputRef.current?.click();
  }

  function handleViewHistory() {
    setHistoryOpen(true);
  }

  function handleEditResult() {
    if (!result) return;
    setEditFoodResultOpen(true);
  }

  function handleAddToLog() {
    if (!result || !result.food_detected) return;
    setAddFoodRecordOpen(true);
  }

  async function handlePhotoPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!selectedPet) {
      showError("請先選擇寵物");
      return;
    }

    // 先本地預覽，不用等上傳完成才看得到剛選的照片
    const previewUrl = URL.createObjectURL(file);
    setPhoto(previewUrl);
    setResult(null);
    setAnalyzing(true);
    try {
      const uploadedUrl = await uploadImageToCloudinary(file);
      setImageUrl(uploadedUrl);
      const response = await apiFetch<AnalyzeFoodResponse>(
        "/food-scan/analyze-image",
        {
          method: "POST",
          body: JSON.stringify({
            pet_id: selectedPet.id,
            image_url: uploadedUrl,
          }),
        },
      );
      const { usage: nextUsage, ...scanResult } = response;
      setResult(scanResult);
      // 跟 AiScanDrawer 一樣的防呆：usage 理論上一定會有，但寧可保留原本的
      // 顯示，也不要整個設成 undefined 讓畫面之後炸掉
      if (nextUsage) {
        setUsage(nextUsage);
      }
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "AI 分析失敗，請稍後再試",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  const variant = !result
    ? null
    : !result.food_detected
      ? "undetected"
      : !result.is_safe
        ? "danger"
        : result.confidence < 50
          ? "uncertain"
          : "safe";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-[#fbf8f4] transition-transform duration-300 ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              aria-label="返回首頁"
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-semibold text-ink">
              AI 食物辨別 / Food Scan
            </h1>
            <button
              type="button"
              onClick={handleViewHistory}
              aria-label="檢視辨識記錄"
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <Clock size={19} />
            </button>
          </div>

          {usage && (
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
            className="hidden"
            onChange={handlePhotoPick}
          />
          {analyzing ? (
            <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-[#eee5da] bg-[#fffdfa] px-6 py-8">
              <p className="text-base font-semibold text-ink">食物辨識中…</p>
              <div className="relative grid h-20 w-20 place-items-center rounded-full bg-[#eef4f6] text-[#688696]">
                <Bot size={40} />
                <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-white text-[#b98a5c] shadow-[0_2px_8px_rgba(0,0,0,.12)]">
                  <Search size={16} />
                </span>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-ink/70">
                  AI 正在分析食物…
                </p>
                <p className="mt-0.5 text-xs text-ink/40">請稍候 10~20 秒</p>
              </div>
              <ul className="w-full max-w-[220px] space-y-2">
                {LOADING_STEPS.map((step, i) => (
                  <li key={step} className="flex items-center gap-2 text-xs">
                    <span
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded-full transition-colors ${
                        i <= loadingStep
                          ? "bg-[#3fa88f] text-white"
                          : "bg-[#eee5da] text-transparent"
                      }`}
                    >
                      <Check size={10} strokeWidth={3} />
                    </span>
                    <span
                      className={
                        i <= loadingStep ? "text-ink/70" : "text-ink/30"
                      }
                    >
                      {step}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="relative">
              {photo ? (
                <img
                  src={photo}
                  alt="掃描食物照片"
                  className="h-56 w-full rounded-2xl object-contain"
                />
              ) : (
                <div className="flex h-56 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d8c9b4] bg-[#fbf7f1]">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f1e6d8] text-[#b98a5c]">
                    <UtensilsCrossed size={22} />
                  </span>
                  <p className="text-sm font-medium text-ink/50">
                    尚未上傳照片
                  </p>
                  <p className="text-xs text-ink/35">
                    點擊下方「拍照辨識食物」開始
                  </p>
                </div>
              )}
            </div>
          )}

          {variant === "uncertain" && (
            <div className="flex items-start gap-2 rounded-2xl bg-[#fff3e5] p-4 text-xs leading-5">
              <Info size={16} className="mt-0.5 shrink-0 text-[#d9834f]" />
              <span className="text-[#a9713f]">
                AI 對這次辨識沒有太大把握，建議人工確認名稱與熱量後再加入記錄。
              </span>
            </div>
          )}

          {variant === "danger" && (
            <div className="flex items-start gap-2 rounded-2xl bg-[#fdf1ee] p-4 text-xs leading-5">
              <TriangleAlert
                size={16}
                className="mt-0.5 shrink-0 text-[#c9503f]"
              />
              <span className="font-medium text-[#c9503f]">
                這個食物可能對寵物有危險，請勿直接餵食，建議諮詢獸醫。
              </span>
            </div>
          )}

          {variant === "undetected" && (
            <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-6 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f1e6d8] text-ink/40">
                <Info size={22} />
              </span>
              <p className="mt-3 text-sm font-medium text-ink/70">
                看不出這是食物
              </p>
              <p className="mt-1 text-xs text-ink/45">
                請靠近一點、對焦清楚後再拍一次
              </p>
            </div>
          )}

          {result && result.food_detected && <ResultCard result={result} />}

          {result && result.food_detected && (
            <div className="rounded-2xl bg-[#fff3e5] p-4 text-xs leading-5">
              <span className="font-semibold text-[#d9834f]">
                ⚠ {result.disclaimer}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-[#ece4dc] bg-[#fffdfa] px-4 py-4">
        <div className="mx-auto max-w-md space-y-2">
          {result && result.food_detected ? (
            <>
              <button
                type="button"
                onClick={handleAddToLog}
                className="w-full rounded-2xl bg-[#b98a5c] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(185,138,92,.35)] transition hover:bg-[#a97a4d]"
              >
                加入飲食記錄
              </button>
              <div className="grid grid-cols-3 gap-2">
                <ActionIconButton
                  icon={<RotateCcw size={16} />}
                  label="重新拍攝"
                  onClick={handleRetake}
                  disabled={limitReached || analyzing}
                />
                <ActionIconButton
                  icon={<Pencil size={16} />}
                  label="修改結果"
                  onClick={handleEditResult}
                />
                <ActionIconButton
                  icon={<Bookmark size={16} />}
                  label="常用食物"
                  disabled
                  badge="敬請期待"
                />
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={handleRetake}
              disabled={limitReached || analyzing}
              className="w-full rounded-2xl bg-[#b98a5c] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(185,138,92,.35)] transition hover:bg-[#a97a4d] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {result ? "重新拍攝" : "拍照辨識食物"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
