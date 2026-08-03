import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { calculateAge } from "../lib/utils";
import { apiFetch } from "../lib/api";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import { useAlert } from "../hooks/useAlert";

const defaultPetPhoto =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=240&h=240&fit=crop";

// 這幾組都是純前端定義的固定選項，對應後端 Literal 型別——要調整選項
// 只要改這裡，不用動後端 schema（後端目前就是照這幾個中文字做 Literal 驗證，
// 兩邊要保持一致）
const APPETITE_OPTIONS = ["很好", "正常", "偏差", "不好"];
const ENERGY_OPTIONS = ["很好", "正常", "偏差", "不好"];
const ACTIVITY_OPTIONS = ["多", "正常", "偏少", "很少"];
const BOWEL_OPTIONS = ["正常", "偏軟", "偏硬", "腹瀉"];
const VOMIT_OPTIONS = ["無", "1次", "多次"];
const TAG_OPTIONS = ["皮膚", "耳朵", "眼睛", "口腔", "行為", "環境", "用藥", "其他"];
const MAX_PHOTOS = 6;
const MAX_CUSTOM_SYMPTOMS = 5;
const MAX_DIARY_LENGTH = 500;

type HealthJournalUsage = {
  used: number;
  limit: number;
  unlimited: boolean;
};

type JournalRecommendations = {
  maintain: string[];
  watch: string[];
  concern: string[];
};

type AnalyzeJournalResponse = {
  id: number;
  log_date: string;
  health_score: number;
  score_delta: number | null;
  risk_level: "低" | "中" | "高";
  summary_points: string[];
  recommendations: JournalRecommendations;
  disclaimer: string;
  usage: HealthJournalUsage;
};

// 風險等級對應的顏色/圖示/預設說明文字——後端只回傳「低/中/高」三個字，
// 這裡負責轉成畫面上的顏色跟一句固定的補充說明
const RISK_META: Record<
  string,
  { color: string; bg: string; note: string }
> = {
  低: { color: "#3fa88f", bg: "#e8f5f0", note: "持續觀察即可" },
  中: { color: "#d9834f", bg: "#fff3e5", note: "建議留意變化，必要時諮詢獸醫" },
  高: { color: "#c9503f", bg: "#fdf1ee", note: "建議儘快諮詢獸醫" },
};

// 依健康評分給一個簡短的心情標籤，純粹是畫面上的呈現，不是後端算出來的
function moodLabel(score: number): { emoji: string; label: string } {
  if (score >= 80) return { emoji: "😊", label: "良好" };
  if (score >= 60) return { emoji: "😐", label: "普通" };
  return { emoji: "😟", label: "需留意" };
}

function toDateKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

function formatDateHeader(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}（${
    WEEKDAY_LABELS[d.getDay()]
  }）`;
}

function addDays(d: Date, delta: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + delta);
  return next;
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

// 「食慾/精神/活動量/排便/嘔吐」共用的單選 toggle 列——四個選項排成一列，
// 選中的用橘色底色標示，跟 AddFoodRecordDrawer 的餐別選擇是同一套視覺語言
function ToggleRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[12px] font-medium text-ink/70">{label}</div>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-xl border py-2 text-[12px] font-medium transition ${
              value === o
                ? "border-[#e8a56b] bg-[#fdf1e6] text-[#c9784a]"
                : "border-[#ece4dc] bg-white text-ink/50"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function HealthJournalDrawer() {
  const open = useAppStore((s) => s.healthJournalOpen);
  const setOpen = useAppStore((s) => s.setHealthJournalOpen);
  const setHistoryOpen = useAppStore((s) => s.setHealthJournalHistoryOpen);
  const bumpHealthJournalRefreshKey = useAppStore(
    (s) => s.bumpHealthJournalRefreshKey,
  );
  const selectedPet = usePetStore((s) => s.selectedPet);
  const { showError, showSuccess } = useAlert();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logDate, setLogDate] = useState(startOfToday);
  const [appetite, setAppetite] = useState("正常");
  const [energy, setEnergy] = useState("正常");
  const [activityLevel, setActivityLevel] = useState("正常");
  const [bowelMovement, setBowelMovement] = useState("正常");
  const [vomiting, setVomiting] = useState("無");
  const [otherSymptoms, setOtherSymptoms] = useState<string[]>([]);
  const [addingSymptom, setAddingSymptom] = useState(false);
  const [newSymptom, setNewSymptom] = useState("");
  const [diaryText, setDiaryText] = useState("");
  const [photos, setPhotos] = useState<{ file: File; previewUrl: string }[]>(
    [],
  );
  const [tags, setTags] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeJournalResponse | null>(null);
  const [addedToTimeline, setAddedToTimeline] = useState(false);
  const [addingToTimeline, setAddingToTimeline] = useState(false);
  const [usage, setUsage] = useState<HealthJournalUsage | null>(null);

  useEffect(() => {
    if (!open) return;
    apiFetch<HealthJournalUsage>("/health-journal/usage-today", {
      method: "GET",
    })
      .then(setUsage)
      .catch((err) => console.error(err));
  }, [open]);

  // 每次重新打開都是全新一輪記錄
  useEffect(() => {
    if (!open) return;
    setLogDate(startOfToday());
    setAppetite("正常");
    setEnergy("正常");
    setActivityLevel("正常");
    setBowelMovement("正常");
    setVomiting("無");
    setOtherSymptoms([]);
    setAddingSymptom(false);
    setNewSymptom("");
    setDiaryText("");
    setPhotos([]);
    setTags([]);
    setResult(null);
    setAddedToTimeline(false);
  }, [open]);

  // photos 的 previewUrl 是 objectURL，drawer 關掉或選新照片時要記得 revoke，
  // 避免累積沒釋放的記憶體
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const limitReached =
    usage != null && !usage.unlimited && usage.used >= usage.limit;
  const isToday = toDateKey(logDate) === toDateKey(new Date());

  function handleClose() {
    setOpen(false);
    navigate("/records");
  }

  function handleViewHistory() {
    setHistoryOpen(true);
  }

  function toggleTag(tag: string) {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag],
    );
  }

  function handleConfirmNewSymptom() {
    const trimmed = newSymptom.trim();
    if (trimmed && otherSymptoms.length < MAX_CUSTOM_SYMPTOMS) {
      setOtherSymptoms((current) =>
        current.includes(trimmed) ? current : [...current, trimmed],
      );
    }
    setNewSymptom("");
    setAddingSymptom(false);
  }

  function handleRemoveSymptom(symptom: string) {
    setOtherSymptoms((current) => current.filter((s) => s !== symptom));
  }

  function handlePickPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setPhotos((current) =>
      [
        ...current,
        ...files.map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ].slice(0, MAX_PHOTOS),
    );
  }

  function handleRemovePhoto(index: number) {
    setPhotos((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((_, i) => i !== index);
    });
  }

  async function handleAnalyze() {
    if (!selectedPet) {
      showError("請先選擇寵物");
      return;
    }
    if (limitReached) {
      showError(
        `今天的 AI 健康日誌分析次數已用完（每天最多 ${usage?.limit} 次），請明天再試`,
      );
      return;
    }
    setAnalyzing(true);
    try {
      const photoUrls = await Promise.all(
        photos.map((p) => uploadImageToCloudinary(p.file)),
      );
      const response = await apiFetch<AnalyzeJournalResponse>(
        "/health-journal/analyze",
        {
          method: "POST",
          body: JSON.stringify({
            pet_id: selectedPet.id,
            log_date: toDateKey(logDate),
            appetite,
            energy,
            activity_level: activityLevel,
            bowel_movement: bowelMovement,
            vomiting,
            other_symptoms: otherSymptoms,
            diary_text: diaryText.trim() || null,
            photo_urls: photoUrls,
            tags,
          }),
        },
      );
      setResult(response);
      if (response.usage) {
        setUsage(response.usage);
      }
      bumpHealthJournalRefreshKey();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "AI 分析失敗，請稍後再試",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSaveOnly() {
    // 分析成功的當下後端就已經存進 health_journal_logs 了，這裡不用再打
    // 一次 API，純粹是「看完了，關掉」的動作——跟「加入健康日誌」的差別
    // 只在於要不要順便把這篇加進健康時間軸
    showSuccess("已儲存這篇日誌紀錄");
    setOpen(false);
    navigate("/records");
  }

  async function handleAddToTimeline() {
    if (!result) return;
    setAddingToTimeline(true);
    try {
      await apiFetch(`/health-journal/${result.id}/add-to-timeline`, {
        method: "PUT",
      });
      setAddedToTimeline(true);
      showSuccess("已加入健康日誌");
      bumpHealthJournalRefreshKey();
      setOpen(false);
      navigate("/records");
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "加入健康日誌失敗，請稍後再試",
      );
    } finally {
      setAddingToTimeline(false);
    }
  }

  const petHeader = selectedPet && (
    <div className="flex items-center gap-3 rounded-2xl bg-[#fbf7f1] p-3">
      <img
        src={selectedPet.avatar ?? defaultPetPhoto}
        alt={selectedPet.name}
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink">
          {selectedPet.name}
        </div>
        <div className="truncate text-[11px] text-ink/45">
          {selectedPet.breed}・{calculateAge(selectedPet.birthday)}歲・
          {selectedPet.weight}kg
        </div>
      </div>
    </div>
  );

  const mood = result ? moodLabel(result.health_score) : null;
  const riskMeta = result ? RISK_META[result.risk_level] : null;

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
              onClick={result ? () => setResult(null) : handleClose}
              aria-label="返回"
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-semibold text-ink">
              {result ? "AI 分析結果" : "健康日誌記錄"}
            </h1>
            {!result ? (
              <button
                type="button"
                onClick={handleViewHistory}
                aria-label="檢視日誌記錄"
                className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
              >
                <Clock size={19} />
              </button>
            ) : (
              <span className="w-9" />
            )}
          </div>

          {!result && (
            <>
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

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setLogDate((d) => addDays(d, -1))}
                  aria-label="前一天"
                  className="grid h-8 w-8 place-items-center rounded-full text-ink/60 transition hover:bg-cream"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="font-semibold text-ink">
                  {formatDateHeader(logDate)}
                </span>
                <button
                  type="button"
                  onClick={() => setLogDate((d) => addDays(d, 1))}
                  disabled={isToday}
                  aria-label="後一天"
                  className="grid h-8 w-8 place-items-center rounded-full text-ink/60 transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {petHeader}

              <div className="space-y-3 rounded-2xl border border-[#eee5da] bg-[#fffdfa] p-4">
                <div className="text-xs font-medium text-ink/50">
                  今日狀況記錄
                </div>
                <ToggleRow
                  label="食慾"
                  options={APPETITE_OPTIONS}
                  value={appetite}
                  onChange={setAppetite}
                />
                <ToggleRow
                  label="精神"
                  options={ENERGY_OPTIONS}
                  value={energy}
                  onChange={setEnergy}
                />
                <ToggleRow
                  label="活動量"
                  options={ACTIVITY_OPTIONS}
                  value={activityLevel}
                  onChange={setActivityLevel}
                />
                <ToggleRow
                  label="排便"
                  options={BOWEL_OPTIONS}
                  value={bowelMovement}
                  onChange={setBowelMovement}
                />
                <ToggleRow
                  label="嘔吐"
                  options={VOMIT_OPTIONS}
                  value={vomiting}
                  onChange={setVomiting}
                />

                <div>
                  <div className="mb-1.5 text-[12px] font-medium text-ink/70">
                    其他症狀
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOtherSymptoms([])}
                      className={`rounded-xl border px-3 py-2 text-[12px] font-medium transition ${
                        otherSymptoms.length === 0
                          ? "border-[#e8a56b] bg-[#fdf1e6] text-[#c9784a]"
                          : "border-[#ece4dc] bg-white text-ink/50"
                      }`}
                    >
                      無
                    </button>
                    {otherSymptoms.map((s) => (
                      <span
                        key={s}
                        className="flex items-center gap-1 rounded-xl border border-[#e8a56b] bg-[#fdf1e6] px-3 py-2 text-[12px] font-medium text-[#c9784a]"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => handleRemoveSymptom(s)}
                          aria-label={`移除 ${s}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {addingSymptom ? (
                      <span className="flex items-center gap-1 rounded-xl border border-[#ece4dc] bg-white px-2 py-1">
                        <input
                          autoFocus
                          value={newSymptom}
                          onChange={(e) => setNewSymptom(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleConfirmNewSymptom();
                          }}
                          onBlur={handleConfirmNewSymptom}
                          placeholder="輸入症狀"
                          className="w-20 text-[12px] outline-none"
                        />
                      </span>
                    ) : (
                      otherSymptoms.length < MAX_CUSTOM_SYMPTOMS && (
                        <button
                          type="button"
                          onClick={() => setAddingSymptom(true)}
                          className="flex items-center gap-1 rounded-xl border border-dashed border-[#d8c9b4] px-3 py-2 text-[12px] font-medium text-[#b98a5c]"
                        >
                          <Plus size={12} />
                          新增症狀
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12px] font-medium text-ink/70">
                    文字日誌（自由輸入）
                  </span>
                </div>
                <div className="relative">
                  <textarea
                    value={diaryText}
                    onChange={(e) =>
                      setDiaryText(e.target.value.slice(0, MAX_DIARY_LENGTH))
                    }
                    rows={3}
                    maxLength={MAX_DIARY_LENGTH}
                    placeholder="今天早上食慾正常，散步後精神很好，晚上有一點飲食，但沒有嘔吐或咳嗽"
                    className="w-full resize-none rounded-xl border border-[#ece0d2] bg-white px-3 py-2.5 text-[12px] text-ink outline-none placeholder:text-ink/30"
                  />
                  <span className="pointer-events-none absolute bottom-2 right-3 text-[9px] text-ink/35">
                    {diaryText.length}/{MAX_DIARY_LENGTH}
                  </span>
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[12px] font-medium text-ink/70">
                  照片上傳（可多張）
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePickPhotos}
                />
                <div className="grid grid-cols-5 gap-2">
                  {photos.map((p, i) => (
                    <div
                      key={p.previewUrl}
                      className="relative aspect-square overflow-hidden rounded-xl"
                    >
                      <img
                        src={p.previewUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(i)}
                        aria-label="移除照片"
                        className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/50 text-white"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-[#d8c9b4] bg-[#fbf7f1] text-[9px] font-medium text-[#b98a5c]"
                    >
                      <Camera size={16} />
                      新增照片
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[12px] font-medium text-ink/70">
                  更多標籤（可選）
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TAG_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        tags.includes(tag)
                          ? "border-mist bg-mist text-white"
                          : "border-[#eee5da] bg-white text-ink/60 hover:bg-[#f7f2ea]"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {result && riskMeta && mood && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4">
                  <div className="text-xs text-ink/45">AI 健康評分</div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="relative grid h-16 w-16 shrink-0 place-items-center">
                      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="27"
                          fill="none"
                          stroke="#eee5da"
                          strokeWidth="6"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="27"
                          fill="none"
                          stroke="#3fa88f"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 27}
                          strokeDashoffset={
                            2 * Math.PI * 27 * (1 - result.health_score / 100)
                          }
                        />
                      </svg>
                      <span className="absolute text-sm font-bold text-ink">
                        {result.health_score}
                        <span className="text-[9px] font-normal text-ink/40">
                          /100
                        </span>
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        {mood.emoji} {mood.label}
                      </div>
                      {result.score_delta !== null && (
                        <div className="mt-0.5 text-[11px] text-ink/45">
                          較前次{" "}
                          {result.score_delta >= 0
                            ? `↑${result.score_delta}`
                            : `↓${Math.abs(result.score_delta)}`}{" "}
                          分
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4">
                  <div className="text-xs text-ink/45">風險等級</div>
                  <div className="mt-2 flex items-start gap-2">
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                      style={{ backgroundColor: riskMeta.bg, color: riskMeta.color }}
                    >
                      <TriangleAlert size={16} />
                    </span>
                    <div>
                      <div
                        className="text-sm font-bold"
                        style={{ color: riskMeta.color }}
                      >
                        {result.risk_level}風險
                      </div>
                      <div className="mt-0.5 text-[11px] text-ink/45">
                        {riskMeta.note}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {result.summary_points.length > 0 && (
                <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4">
                  <div className="text-xs font-semibold text-ink/60">
                    重點摘要
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {result.summary_points.map((s, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-sm leading-5 text-ink/80"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#caa06f]" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="mb-2 text-xs font-semibold text-ink/60">
                  AI 建議
                </div>
                <div className="space-y-2.5">
                  <div className="rounded-2xl bg-[#e8f5f0] p-4">
                    <div className="text-sm font-semibold text-[#3fa88f]">
                      ✓ 可維持
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {(result.recommendations.maintain.length > 0
                        ? result.recommendations.maintain
                        : ["維持目前的照顧方式即可"]
                      ).map((s, i) => (
                        <li key={i} className="text-xs leading-5 text-[#2f8a72]">
                          · {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl bg-[#fff3e5] p-4">
                    <div className="text-sm font-semibold text-[#d9834f]">
                      ⏱ 建議觀察
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {(result.recommendations.watch.length > 0
                        ? result.recommendations.watch
                        : ["目前沒有特別需要觀察的地方"]
                      ).map((s, i) => (
                        <li key={i} className="text-xs leading-5 text-[#a9713f]">
                          · {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl bg-[#fdf1ee] p-4">
                    <div className="text-sm font-semibold text-[#c9503f]">
                      ⚠ 需要留意
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {(result.recommendations.concern.length > 0
                        ? result.recommendations.concern
                        : ["目前沒有明顯警訊，很好！"]
                      ).map((s, i) => (
                        <li key={i} className="text-xs leading-5 text-[#a13c2f]">
                          · {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <p className="text-center text-[11px] text-ink/35">
                {result.disclaimer}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-4 py-4">
        <div className="mx-auto max-w-md">
          {!result ? (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing || limitReached}
              className="w-full rounded-2xl bg-[#b98a5c] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(185,138,92,.35)] transition hover:bg-[#a97a4d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analyzing ? "AI 分析中…" : "開始 AI 分析"}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSaveOnly}
                className="rounded-2xl border border-mist py-3.5 text-sm font-semibold text-[#688696] transition hover:bg-mist/10"
              >
                儲存紀錄
              </button>
              <button
                type="button"
                onClick={handleAddToTimeline}
                disabled={addingToTimeline || addedToTimeline}
                className="rounded-2xl bg-[#b98a5c] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(185,138,92,.35)] transition hover:bg-[#a97a4d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addingToTimeline
                  ? "處理中…"
                  : addedToTimeline
                    ? "已加入健康日誌"
                    : "加入健康日誌"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
