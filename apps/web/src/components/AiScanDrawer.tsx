import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Bot,
  CalendarPlus,
  Camera,
  Check,
  Search,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { apiFetch } from "../lib/api";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import { useAlert } from "../hooks/useAlert";

type AiScanFinding = {
  condition: string;
  confidence: number;
  description: string;
};

// 分析 loading 畫面用的假進度清單，跟 AddFoodDrawer 同一套做法——實際分析
// 是一次 API call 打完，不是真的分這幾步驟執行，純粹讓等待感覺有在動
const LOADING_STEPS = ["辨識症狀特徵", "比對可能狀況", "評估緊急程度", "生成建議"];

// 上傳照片時可以指定要分析的部位，單選——選了會附進送給 AI 的 prompt裡，
// 讓分析更聚焦。純前端定義的選項清單，後端 body_part 欄位是自由文字，
// 不是綁死的 enum，之後要加選項只要改這裡就好，不用動後端
const BODY_PART_OPTIONS = [
  "皮膚",
  "耳朵",
  "眼睛",
  "牙齒",
  "腳掌",
  "排泄物",
  "嘔吐物",
  "其他",
];

type AiScanUsage = {
  used: number;
  limit: number;
  unlimited: boolean;
};

type AnalyzeImageResponse = {
  id: number;
  body_part: string | null;
  summary: string;
  findings: AiScanFinding[];
  suggestions: string[];
  disclaimer: string;
  usage: AiScanUsage;
};

export function AiScanDrawer() {
  const open = useAppStore((s) => s.aiScanOpen);
  const setOpen = useAppStore((s) => s.setAiScanOpen);
  const setHistoryOpen = useAppStore((s) => s.setAiScanHistoryOpen);
  const setAiScanReferenceForMentor = useAppStore(
    (s) => s.setAiScanReferenceForMentor,
  );
  const selectedPet = usePetStore((s) => s.selectedPet);
  const { showError } = useAlert();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 一開始不放真實照片，改用下面的圖示佔位——之前放的是網路上抓的示意照，
  // 使用者常常會誤以為那就是「已經上傳的照片」
  const [earPhoto, setEarPhoto] = useState<string | null>(null);
  // 選好照片先不急著上傳分析，等使用者選完部位/填完補充說明按「開始分析」
  // 才真的打 API——原本是選完照片就立刻自動分析，沒有機會讓使用者先講清楚
  // 是哪個部位、發生什麼狀況
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bodyPart, setBodyPart] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  // 跟 AddFoodDrawer 同樣的道理：純粹照時間軸假裝逐步完成，不代表後端真的
  // 在做這幾個獨立步驟
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<AnalyzeImageResponse | null>(null);
  // 「加入健康時間軸」按下去之後的本地確認狀態，純 UI 用——避免同一筆
  // 重複打 API（雖然後端本來就 idempotent），也讓按鈕能顯示「已加入」
  const [addedToTimeline, setAddedToTimeline] = useState(false);
  const [usage, setUsage] = useState<AiScanUsage | null>(null);

  // 一打開就先問今天用了幾次，這樣按「重新上傳」之前就能看到標語、
  // 額度用完也能直接擋下來，不用浪費一次 Cloudinary 上傳才發現被拒絕
  useEffect(() => {
    if (!open) return;
    apiFetch<AiScanUsage>("/ai-scan/usage-today", { method: "GET" })
      .then(setUsage)
      .catch((error) => console.error(error));
  }, [open]);

  // 用 != 而不是 !==：後端如果剛好回傳一個沒有 usage 欄位的舊版回應
  // （例如部署還沒更新到最新版本），response.usage 會是 undefined 而不是
  // null，用 !== null 判斷不出來，讀 usage.used 就會直接炸掉。
  // unlimited 是給 admin 帳號用的（見後端 permissions 欄位），就算
  // used 已經超過 limit 也不算真的用完
  const limitReached =
    usage != null && !usage.unlimited && usage.used >= usage.limit;

  // 開始分析就從第一步跑起，每 4 秒跳下一步，跑到最後一步就停在那裡等真正
  // 的 API 回應，理由跟 AddFoodDrawer 一樣
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

  function handleBack() {
    setOpen(false);
    resetAll();
    navigate("/");
  }

  function resetAll() {
    setEarPhoto(null);
    setSelectedFile(null);
    setBodyPart(null);
    setDescription("");
    setResult(null);
    setAddedToTimeline(false);
  }

  function handleReupload() {
    if (limitReached) {
      showError(
        `今天的 AI 診斷次數已用完（每天最多 ${usage?.limit} 次），請明天再試`,
      );
      return;
    }
    fileInputRef.current?.click();
  }

  function handleViewHistory() {
    // 疊在這個 drawer 上面開第二層，跟 HealthDetailDrawer 疊在
    // EditHealthDrawer 上面同一個模式，不用把自己關掉、也不用換路由
    setHistoryOpen(true);
  }

  // 選完照片先只做本地預覽 + 記住 File，不立刻上傳分析——讓使用者有機會
  // 先選部位、填補充說明，按「開始分析」才真的打 API（見 handleStartAnalysis）
  function handlePhotoPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!selectedPet) {
      showError("請先選擇寵物");
      return;
    }
    resetAll();
    const previewUrl = URL.createObjectURL(file);
    setEarPhoto(previewUrl);
    setSelectedFile(file);
  }

  async function handleStartAnalysis() {
    if (!selectedFile || !selectedPet) return;
    setAnalyzing(true);
    try {
      const imageUrl = await uploadImageToCloudinary(selectedFile);
      const response = await apiFetch<AnalyzeImageResponse>(
        "/ai-scan/analyze-image",
        {
          method: "POST",
          body: JSON.stringify({
            pet_id: selectedPet.id,
            image_url: imageUrl,
            body_part: bodyPart,
            description: description.trim() || null,
          }),
        },
      );
      setResult(response);
      // response.usage 理論上一定會有，但如果打到還沒更新的舊版後端，
      // 這欄可能不存在——寧可保留原本的用量顯示，也不要整個設成 undefined
      // 讓畫面之後一讀到 usage.used 就炸掉
      if (response.usage) {
        setUsage(response.usage);
      }
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "AI 分析失敗，請稍後再試",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleAddToTimeline() {
    if (!result || addedToTimeline) return;
    try {
      await apiFetch(`/ai-scan/${result.id}/add-to-timeline`, {
        method: "PUT",
      });
      setAddedToTimeline(true);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "加入時間軸失敗，請稍後再試",
      );
    }
  }

  // 目前 AI 心靈導師（AICenterPage）還是純前端假資料，這裡只把這次分析的
  // 摘要存進 store 帶過去顯示「已引用今日影像分析」，不是真的串接對話後端
  function handleAskMentor() {
    if (!result) return;
    setAiScanReferenceForMentor({
      summary: result.summary,
      bodyPart: result.body_part,
      suggestions: result.suggestions,
      imageUrl: earPhoto ?? "",
    });
    setOpen(false);
    navigate("/ai");
  }

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
              AI 拍照診斷室 / AI Diagnosis
            </h1>
            <span className="w-9" />
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
              <p className="text-base font-semibold text-ink">AI 判讀中…</p>
              <div className="relative grid h-20 w-20 place-items-center rounded-full bg-[#eef4f6] text-[#688696]">
                <Bot size={40} />
                <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-white text-[#688696] shadow-[0_2px_8px_rgba(0,0,0,.12)]">
                  <Search size={16} />
                </span>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-ink/70">
                  AI 正在判讀照片…
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
              {earPhoto ? (
                <img
                  src={earPhoto}
                  alt="寵物拍照診斷照片"
                  className="h-56 w-full rounded-2xl object-contain"
                />
              ) : (
                <div className="flex h-56 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d8c9b4] bg-[#fbf7f1]">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[#eef4f6] text-[#688696]">
                    <Camera size={22} />
                  </span>
                  <p className="text-sm font-medium text-ink/50">
                    尚未上傳照片
                  </p>
                  <p className="text-xs text-ink/35">
                    點擊下方「拍照AI診斷」開始
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 選好照片、還沒送出分析——讓使用者先指定部位/補充說明，
              按下面「開始分析」才真的打 API */}
          {earPhoto && !result && !analyzing && (
            <div className="space-y-3 rounded-2xl border border-[#eee5da] bg-[#fffdfa] p-4">
              <div>
                <div className="text-xs font-medium text-ink/50">
                  請選擇要分析的部位（選填）
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {BODY_PART_OPTIONS.map((part) => (
                    <button
                      key={part}
                      type="button"
                      onClick={() =>
                        setBodyPart((current) =>
                          current === part ? null : part,
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        bodyPart === part
                          ? "border-mist bg-mist text-white"
                          : "border-[#eee5da] bg-white text-ink/60 hover:bg-[#f7f2ea]"
                      }`}
                    >
                      {part}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-ink/50">
                  補充說明（選填）
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="例如：最近一直舔腳，皮膚有點紅腫…"
                  className="mt-2 w-full resize-none rounded-xl border border-[#eee5da] bg-white px-3 py-2 text-sm outline-none placeholder:text-ink/30"
                />
              </div>
            </div>
          )}

          {result && (
            <>
              <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 shadow-[0_4px_16px_rgba(120,96,84,.06)]">
                <div className="text-xs text-ink/45">AI 判讀結果</div>
                {result.summary && (
                  <p className="mt-2 text-sm text-ink/80">{result.summary}</p>
                )}
                {result.findings.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {result.findings.map((finding) => (
                      <div key={finding.condition}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-ink/80">
                            {finding.condition}
                          </span>
                          <span className="font-semibold text-ink">
                            {finding.confidence}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#eee5da]">
                          <div
                            className="h-full rounded-full bg-mist"
                            style={{ width: `${finding.confidence}%` }}
                          />
                        </div>
                        {finding.description && (
                          <p className="mt-1 text-xs text-ink/50">
                            {finding.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink/60">
                    沒有觀察到明顯異常。
                  </p>
                )}
              </div>

              {result.suggestions.length > 0 && (
                <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 shadow-[0_4px_16px_rgba(120,96,84,.06)]">
                  <div className="text-xs text-ink/45">建議</div>
                  <ul className="mt-2 space-y-1.5">
                    {result.suggestions.map((suggestion, i) => (
                      <li
                        key={i}
                        className="flex gap-1.5 text-sm text-ink/70"
                      >
                        <span className="text-mist">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-2xl bg-[#fff3e5] p-4 text-xs leading-5">
                <span className="font-semibold text-[#d9834f]">
                  ⚠ {result.disclaimer}
                </span>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleAddToTimeline}
                  disabled={addedToTimeline}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#b98a5c] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(185,138,92,.35)] transition hover:bg-[#a97a4d] disabled:cursor-not-allowed disabled:bg-[#3fa88f] disabled:shadow-none"
                >
                  {addedToTimeline ? (
                    <>
                      <Check size={16} strokeWidth={3} />
                      已加入健康時間軸
                    </>
                  ) : (
                    <>
                      <CalendarPlus size={16} />
                      加入健康時間軸
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleAskMentor}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-mist py-3.5 text-sm font-semibold text-[#688696] transition hover:bg-mist/10"
                >
                  <Sparkles size={16} />
                  詢問 AI 心靈導師
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-4 py-4">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
          {earPhoto && !result ? (
            <>
              <button
                type="button"
                onClick={handleReupload}
                disabled={limitReached || analyzing}
                className="rounded-2xl border border-mist py-3.5 text-sm font-semibold text-[#688696] transition hover:bg-mist/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                重新選擇照片
              </button>
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={limitReached || analyzing}
                className="rounded-2xl bg-[#b98a5c] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(185,138,92,.35)] transition hover:bg-[#a97a4d] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                開始分析
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleReupload}
                disabled={limitReached || analyzing}
                className="rounded-2xl border border-mist py-3.5 text-sm font-semibold text-[#688696] transition hover:bg-mist/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                拍照AI診斷
              </button>
              <button
                type="button"
                onClick={handleViewHistory}
                className="rounded-2xl bg-mist py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(120,150,166,.35)] transition hover:opacity-90"
              >
                檢視記錄
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
