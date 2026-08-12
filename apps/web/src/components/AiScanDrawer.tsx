import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Bot,
  CalendarPlus,
  Camera,
  Check,
  Clock,
  Flame,
  Footprints,
  Search,
  Smile,
  Sparkles,
  Utensils,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { apiFetch } from "../lib/api";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import { useAlert } from "../hooks/useAlert";
import { ImageCropModal } from "./ImageCropModal";

type AiScanFinding = {
  condition: string;
  confidence: number;
  description: string;
};

// 分析 loading 畫面用的假進度清單，跟 AddFoodDrawer 同一套做法——實際分析
// 是一次 API call 打完，不是真的分這幾步驟執行，純粹讓等待感覺有在動
const LOADING_STEP_KEYS = [
  "aiScan.loadingSteps.step1",
  "aiScan.loadingSteps.step2",
  "aiScan.loadingSteps.step3",
  "aiScan.loadingSteps.step4",
] as const;

// 上傳照片時可以指定要分析的部位，單選——選了會附進送給 AI 的 prompt裡，
// 讓分析更聚焦。純前端定義的選項清單，後端 body_part 欄位是自由文字，
// 不是綁死的 enum，之後要加選項只要改這裡就好，不用動後端。
// 這裡的值會直接當成 body_part 存進後端、也會被拿來顯示在結果卡片上，
// 屬於「自由文字資料」而不是純 UI 顯示字串，跟 vaccine 的
// vaccineTypeOptions 是同一種情況，所以刻意不做 i18n 轉換
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

// 「已加入時間軸」確認畫面下方的「相關記錄」清單——目前只有飲食紀錄
// 後端真的有資料，行為紀錄/活動量/心情日記都還沒做，所以這裡故意不做成
// 可以點擊跳轉的連結（沒有對應頁面可以跳，做成假的可點擊反而誤導使用者），
// 純粹是跟設計稿一致的靜態展示
const RELATED_RECORDS = [
  { icon: Utensils, labelKey: "aiScan.relatedRecordFood" },
  { icon: Footprints, labelKey: "aiScan.relatedRecordBehavior" },
  { icon: Flame, labelKey: "aiScan.relatedRecordActivity" },
  { icon: Smile, labelKey: "aiScan.relatedRecordMood" },
];

function formatTodayDate() {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

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
  const { t } = useTranslation();
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
  // 「加入時間軸」按下去之後的本地確認狀態，純 UI 用——避免同一筆
  // 重複打 API（雖然後端本來就 idempotent），也讓按鈕能顯示「已加入」
  const [addedToTimeline, setAddedToTimeline] = useState(false);
  const [usage, setUsage] = useState<AiScanUsage | null>(null);
  // 選好照片先開自由裁切畫面（不鎖比例），讓使用者可以先把不相關的背景
  // 裁掉、聚焦在真正要給 AI 看的部位；裁切完才真的設成 earPhoto/
  // selectedFile 進入下一步。保留「使用原圖」選項——裁過頭反而可能把 AI
  // 判斷需要的畫面內容也裁掉，不想裁的話可以直接跳過
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);

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
      setLoadingStep((step) =>
        Math.min(step + 1, LOADING_STEP_KEYS.length - 1),
      );
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
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setPendingPhotoFile(null);
  }

  function handleReupload() {
    if (limitReached) {
      showError(t("aiScan.limitReachedMessage", { limit: usage?.limit }));
      return;
    }
    fileInputRef.current?.click();
  }

  function handleViewHistory() {
    // 疊在這個 drawer 上面開第二層，跟 HealthDetailDrawer 疊在
    // EditHealthDrawer 上面同一個模式，不用把自己關掉、也不用換路由
    setHistoryOpen(true);
  }

  // 選完照片先開裁切畫面，裁切完（或選擇使用原圖）才真的做本地預覽 + 記住
  // File，不立刻上傳分析——讓使用者有機會先裁切、選部位、填補充說明，
  // 按「開始分析」才真的打 API（見 handleStartAnalysis）
  function handlePhotoPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!selectedPet) {
      showError(t("healthJournal.selectPetFirst"));
      return;
    }
    resetAll();
    setPendingPhotoFile(file);
    setCropSrc(URL.createObjectURL(file));
  }

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setPendingPhotoFile(null);
  }

  function applyPickedPhoto(file: File) {
    closeCrop();
    const previewUrl = URL.createObjectURL(file);
    setEarPhoto(previewUrl);
    setSelectedFile(file);
  }

  function handleUseOriginalPhoto() {
    const file = pendingPhotoFile;
    if (!file) {
      closeCrop();
      return;
    }
    applyPickedPhoto(file);
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
        error instanceof Error
          ? error.message
          : t("healthJournal.analyzeFailed"),
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
        error instanceof Error
          ? error.message
          : t("aiScan.addToTimelineFailed"),
      );
    }
  }

  // 把這次分析的摘要存進 store 帶去 AICenterPage，讓那頁開場白可以直接
  // 引用「已引用今日影像分析」；petId 一併帶過去，AICenterPage 的寵物
  // 切換器會預設選到這隻，而不是永遠跟著全域 selectedPet
  function handleAskMentor() {
    if (!result || !selectedPet) return;
    setAiScanReferenceForMentor({
      summary: result.summary,
      bodyPart: result.body_part,
      suggestions: result.suggestions,
      imageUrl: earPhoto ?? "",
      petId: selectedPet.id,
    });
    resetAll();
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
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <div className="mx-auto max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              aria-label={t("common.backAria")}
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-semibold text-ink">
              {t("aiScan.headerTitle")}
            </h1>
            <button
              type="button"
              onClick={handleViewHistory}
              aria-label={t("aiScan.viewHistoryAria")}
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
                ? t("healthJournal.usageUnlimited", { used: usage.used })
                : `${t("healthJournal.usageLimited", { used: usage.used, limit: usage.limit })}${
                    limitReached
                      ? t("healthJournal.usageLimitReachedSuffix")
                      : ""
                  }`}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoPick}
          />

          <ImageCropModal
            open={!!cropSrc}
            imageSrc={cropSrc}
            fileName="ai-scan-photo.jpg"
            onCancel={closeCrop}
            onConfirm={applyPickedPhoto}
            onUseOriginal={handleUseOriginalPhoto}
          />

          {/* 一旦加入時間軸，原始照片跟完整分析內容就不再顯示——
              下面會換成精簡的確認卡片，跟設計稿一致 */}
          {!addedToTimeline &&
            (analyzing ? (
              <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-[#eee5da] bg-[#fffdfa] px-6 py-8">
                <p className="text-base font-semibold text-ink">
                  {t("aiScan.analyzingTitle")}
                </p>
                <div className="relative grid h-20 w-20 place-items-center rounded-full bg-[#eef4f6] text-[#688696]">
                  <Bot size={40} />
                  <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-white text-[#688696] shadow-[0_2px_8px_rgba(0,0,0,.12)]">
                    <Search size={16} />
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-ink/70">
                    {t("aiScan.analyzingSubtitle")}
                  </p>
                  <p className="mt-0.5 text-xs text-ink/40">
                    {t("aiScan.analyzingWait")}
                  </p>
                </div>
                <ul className="w-full max-w-[220px] space-y-2">
                  {LOADING_STEP_KEYS.map((stepKey, i) => (
                    <li
                      key={stepKey}
                      className="flex items-center gap-2 text-xs"
                    >
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
                        {t(stepKey)}
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
                    alt={t("aiScan.photoAlt")}
                    className="h-56 w-full rounded-2xl object-contain"
                  />
                ) : (
                  <div className="flex h-56 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d8c9b4] bg-[#fbf7f1]">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-[#eef4f6] text-[#688696]">
                      <Camera size={22} />
                    </span>
                    <p className="text-sm font-medium text-ink/50">
                      {t("aiScan.noPhotoTitle")}
                    </p>
                    <p className="text-xs text-ink/35">
                      {t("aiScan.noPhotoHint")}
                    </p>
                  </div>
                )}
              </div>
            ))}

          {/* 選好照片、還沒送出分析——讓使用者先指定部位/補充說明，
              按下面「開始分析」才真的打 API */}
          {earPhoto && !result && !analyzing && (
            <div className="space-y-3 rounded-2xl border border-[#eee5da] bg-[#fffdfa] p-4">
              <div>
                <div className="text-xs font-medium text-ink/50">
                  {t("aiScan.bodyPartLabel")}
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
                  {t("aiScan.descriptionLabel")}
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder={t("aiScan.descriptionPlaceholder")}
                  className="mt-2 w-full resize-none rounded-xl border border-[#eee5da] bg-white px-3 py-2 text-sm outline-none placeholder:text-ink/30"
                />
              </div>
            </div>
          )}

          {result && !addedToTimeline && (
            <>
              <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 shadow-[0_4px_16px_rgba(120,96,84,.06)]">
                <div className="text-xs text-ink/45">
                  {t("aiScan.resultTitle")}
                </div>
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
                    {t("aiScan.noAbnormalFound")}
                  </p>
                )}
              </div>

              {result.suggestions.length > 0 && (
                <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 shadow-[0_4px_16px_rgba(120,96,84,.06)]">
                  <div className="text-xs text-ink/45">
                    {t("aiScan.suggestionsTitle")}
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {result.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex gap-1.5 text-sm text-ink/70">
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

              <button
                type="button"
                onClick={handleAddToTimeline}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#b98a5c] py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(185,138,92,.35)] transition hover:bg-[#a97a4d]"
              >
                <CalendarPlus size={16} />
                {t("aiScan.addToTimelineButton")}
              </button>

              {/* 不強迫使用者一定要先「加入時間軸」才能問心靈導師——
                  結果一出來就可以直接跳過去問，跟加入時間軸後確認畫面上
                  的那顆是同一個 handleAskMentor，行為完全一樣 */}
              <button
                type="button"
                onClick={handleAskMentor}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#eee5da] bg-white py-2.5 text-sm font-semibold text-[#688696] transition hover:bg-[#f7f2ea]"
              >
                <Sparkles size={16} />
                {t("aiScan.askMentorButton")}
              </button>
            </>
          )}

          {/* 加入時間軸後換成精簡確認畫面：原始照片跟完整判讀結果都收起來，
              對應設計稿「4 加入時間軸」「5 諮詢選擇」畫面（中間的「資料選擇」
              畫面確認過使用者要跳過，因為行為紀錄/活動量/心情日記都還沒有
              真的資料，直接從確認頁跳到心靈導師） */}
          {result && addedToTimeline && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-2xl bg-[#e8f5f0] px-3 py-3 text-sm font-semibold text-[#3fa88f]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#3fa88f] text-white">
                  <Check size={13} strokeWidth={3} />
                </span>
                {t("healthJournal.addedToTimelineNote")}
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-3 shadow-[0_4px_16px_rgba(120,96,84,.06)]">
                {earPhoto ? (
                  <img
                    src={earPhoto}
                    alt={t("aiScan.photoAlt")}
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#eef4f6] text-[#688696]">
                    <Camera size={20} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {result.body_part
                      ? t("aiScan.analysisTitleWithPart", {
                          bodyPart: result.body_part,
                        })
                      : t("aiScan.analysisTitleDefault")}
                  </p>
                  <p className="mt-0.5 text-xs text-ink/45">
                    {formatTodayDate()}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    result.findings.length > 0
                      ? "bg-[#fff3e5] text-[#d9834f]"
                      : "bg-[#eef4f6] text-[#688696]"
                  }`}
                >
                  {result.findings.length > 0
                    ? t("aiScan.statusWatch")
                    : t("health.summaryNormal")}
                </span>
              </div>

              <div className="rounded-2xl border border-[#eee5da] bg-[#fffdfa] p-4">
                <p className="text-sm font-semibold text-ink">
                  {t("aiScan.consultTitle")}
                </p>
                <p className="mt-1 text-xs text-ink/50">
                  {t("aiScan.consultSubtitle")}
                </p>
                <div className="mt-3 space-y-2.5">
                  <button
                    type="button"
                    onClick={handleAskMentor}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#688696] py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(104,134,150,.3)] transition hover:bg-[#5a7684]"
                  >
                    <Sparkles size={16} />
                    {t("aiScan.askMentorButton")}
                  </button>
                  <button
                    type="button"
                    onClick={resetAll}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#eee5da] py-2.5 text-sm font-semibold text-ink/60 transition hover:bg-[#f7f2ea]"
                  >
                    {t("aiScan.notNowButton")}
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-ink/45">
                  {t("aiScan.relatedRecordsTitle")}
                </div>
                <div className="mt-2 space-y-2">
                  {RELATED_RECORDS.map(({ icon: Icon, labelKey }) => (
                    <div
                      key={labelKey}
                      className="flex items-center gap-3 rounded-xl border border-[#eee5da] bg-[#fffdfa] px-3 py-2.5 text-sm text-ink/60"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#eef4f6] text-[#688696]">
                        <Icon size={15} />
                      </span>
                      {t(labelKey)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!result && (
        <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-3 py-3">
          <div className="mx-auto grid max-w-md  gap-3">
            {earPhoto && !result ? (
              <>
                <button
                  type="button"
                  onClick={handleReupload}
                  disabled={limitReached || analyzing}
                  className="rounded-2xl border border-mist py-2.5 text-sm font-semibold text-[#688696] transition hover:bg-mist/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  {t("aiScan.reuploadButton")}
                </button>
                <button
                  type="button"
                  onClick={handleStartAnalysis}
                  disabled={limitReached || analyzing}
                  className="rounded-2xl  py-2.5 text-sm font-semibold bg-[#688696] text-white shadow-[0_10px_24px_rgba(185,138,92,.35)] transition hover:bg-[#688696] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  {t("aiScan.startAnalysisButton")}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleReupload}
                disabled={limitReached || analyzing}
                className="w-full rounded-2xl border border-mist py-2.5 text-sm font-semibold text-[#688696] transition hover:bg-mist/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {t("aiScan.uploadCta")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
