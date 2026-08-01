import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  Bookmark,
  Check,
  Clock,
  Info,
  Pencil,
  RotateCcw,
  Star,
  TriangleAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore, type FoodScanResult } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { apiFetch } from "../lib/api";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import { useAlert } from "../hooks/useAlert";

const defaultScanPhoto =
  "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=500&fit=crop";

const speciesLabel: Record<string, string> = { dog: "狗狗", cat: "貓咪" };

type FoodScanUsage = {
  used: number;
  limit: number;
  unlimited: boolean;
};

type AnalyzeFoodResponse = FoodScanResult & { usage: FoodScanUsage };

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

// 每 100g 的營養資訊卡，success/uncertain/danger 三種變化都共用同一張卡，
// 只是外面包的提示 banner 不同——undetected 那種完全沒有食物資料可以顯示，
// 不會走到這裡
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

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-ink">{result.calories}</span>
        <span className="text-sm text-ink/50">kcal / 100g</span>
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
        <div className="text-xs text-ink/50">每 100g 營養資訊</div>
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
  const [photo, setPhoto] = useState(defaultScanPhoto);
  const [analyzing, setAnalyzing] = useState(false);
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
    setPhoto(defaultScanPhoto);
    setResult(null);
    setImageUrl(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
            capture="environment"
            className="hidden"
            onChange={handlePhotoPick}
          />
          <div className="relative">
            <img
              src={photo}
              alt="掃描食物照片"
              className="h-56 w-full rounded-2xl object-contain"
            />
            {analyzing && (
              <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/40 text-sm font-medium text-white">
                AI 辨識中…
              </div>
            )}
          </div>

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
