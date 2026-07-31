import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Droplet,
  FileText,
  Heart,
  Image as ImageIcon,
  PlusCircle,
  Radar,
  Stethoscope,
  UploadCloud,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import dayjs from "dayjs";
import { apiFetch } from "../lib/api";
import { useAlert } from "../hooks/useAlert";
import { calculateAge } from "../lib/utils";
import { uploadFileToCloudinary } from "../lib/cloudinary";
import type { Pet } from "../data/pets";

const defaultPetPhoto =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=240&h=240&fit=crop";

const examTypes = [
  { label: "年度健康檢查", icon: Stethoscope, value: "1" },
  { label: "血液檢查", icon: Droplet, value: "2" },
  { label: "糞便檢查", emoji: "💩", value: "3" },
  { label: "心臟檢查", icon: Heart, value: "4" },
  { label: "超音波檢查", icon: Radar, value: "5" },
  { label: "其他檢查", icon: PlusCircle, value: "6" },
] as const;

const summaries = [
  {
    label: "正常",
    icon: CheckCircle2,
    color: "#3fa876",
    bg: "#dff3e6",
    value: "1",
  },
  {
    label: "需追蹤",
    icon: AlertCircle,
    color: "#d9834f",
    bg: "#fbe9d9",
    value: "2",
  },
  {
    label: "異常",
    icon: AlertTriangle,
    color: "#d9645a",
    bg: "#fdeceb",
    value: "3",
  },
] as const;

export function AddHealthRecordDrawer() {
  const open = useAppStore((s) => s.addHealthRecordOpen);
  const setOpen = useAppStore((s) => s.setAddHealthRecordOpen);
  const navigate = useNavigate();
  const pets = usePetStore((s) => s.pets);
  const selectedPet = usePetStore((s) => s.selectedPet);

  const [targetPet, setTargetPet] = useState<Pet | null>(null);
  const [petPickerOpen, setPetPickerOpen] = useState(false);

  // drawer 打開的當下，預設對象是「我的寵物」目前選中的那隻
  useEffect(() => {
    if (!open) return;
    setTargetPet(selectedPet);
    setPetPickerOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // <input type="date"> 一定要吃 ISO 格式（YYYY-MM-DD）才能正確顯示預設值，
  // 用 "YYYY/MM/DD" 瀏覽器的日期選擇器會顯示不出來；剛好這個格式也能直接送
  // 給後端的 report_date（Pydantic 的 date 欄位吃 ISO 格式），不用再轉一次
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [examType, setExamType] = useState("1");
  const [summary, setSummary] = useState("1");
  const [weight, setWeight] = useState("");
  const [hospital, setHospital] = useState("");
  const [vet, setVet] = useState("");
  const [temp, setTemp] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useAlert();

  function handleBack() {
    setOpen(false);
    navigate("/");
  }

  function handleFilesPick(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length) setFiles((prev) => [...prev, ...picked]);
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const handleSubmit = async () => {
    if (!targetPet) {
      showError("請選擇寵物");
      return;
    }
    const parsedWeight = Number(weight);
    const parsedTemp = Number(temp);
    const parsedHeartRate = Number(heartRate);
    if (
      !weight ||
      !temp ||
      !heartRate ||
      Number.isNaN(parsedWeight) ||
      Number.isNaN(parsedTemp) ||
      Number.isNaN(parsedHeartRate)
    ) {
      showError("請填寫正確的體重、體溫、心跳數值");
      return;
    }

    setIsSubmitting(true);
    try {
      // report_files 存的是網址，不是檔案本身——要先把每個檔案上傳到
      // Cloudinary，換成 secure_url 之後才能送給後端（後端 report_files 是
      // list[str]，直接把 File 物件塞進去會被 Pydantic 擋成
      // "Input should be a valid string"）
      const fileUrls = await Promise.all(
        files.map((file) => uploadFileToCloudinary(file)),
      );

      await apiFetch("/report/add-report-record", {
        method: "POST",
        body: JSON.stringify({
          pet_id: targetPet.id,
          report_date: date,
          report_type: examType,
          report_result: summary,
          report_weight: parsedWeight,
          report_temperature: parsedTemp,
          report_heart_rate: parsedHeartRate,
          report_hospital: hospital,
          report_vet: vet,
          report_note: note || null,
          report_files: fileUrls,
        }),
      });
      showSuccess("新增健康檢查紀錄成功");
      handleBack();
    } catch (error) {
      console.error(error);
      showError(
        error instanceof Error
          ? error.message
          : "新增健康檢查紀錄失敗，請稍後再試",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-2xl border border-[#ece0d2] bg-white px-4 py-3 text-sm text-ink outline-none";

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
      <div className="flex items-center justify-between border-b border-[#ece4dc] bg-[#fffdfa] px-4 py-4">
        <button
          type="button"
          onClick={handleBack}
          aria-label="返回首頁"
          className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-semibold text-ink">新增健康檢查紀錄</h1>
        <span className="w-9" />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto max-w-md space-y-5">
            {petHeader}

            <div>
              <label className="mb-1.5 block text-sm text-ink/70">
                檢查日期 <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="請選擇檢查日期"
                className={`${inputClass} pr-9 [color-scheme:light]`}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-ink/70">
                檢查類型 <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {examTypes.map((t) => {
                  const selected = examType === t.value;
                  return (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => setExamType(t.value)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition ${
                        selected
                          ? "border-[#e8a56b] bg-[#fdf1e6]"
                          : "border-[#ece4dc] bg-white"
                      }`}
                    >
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-full ${
                          selected ? "text-[#d9834f]" : "text-ink/40"
                        }`}
                      >
                        {"icon" in t ? (
                          <t.icon size={22} />
                        ) : (
                          <span className="text-xl">{t.emoji}</span>
                        )}
                      </span>
                      <span
                        className={`text-[11px] font-medium ${
                          selected ? "text-[#c9784a]" : "text-ink/60"
                        }`}
                      >
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-ink/70">
                檢查結果摘要
              </label>
              <div className="grid grid-cols-3 gap-2">
                {summaries.map((s) => {
                  const selected = summary === s.value;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setSummary(s.value)}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border py-3 text-sm font-medium transition"
                      style={
                        selected
                          ? {
                              borderColor: s.color,
                              backgroundColor: s.bg,
                              color: s.color,
                            }
                          : {
                              borderColor: "#ece4dc",
                              backgroundColor: "#fff",
                              color: "#a89c92",
                            }
                      }
                    >
                      <s.icon size={16} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-ink/70">體重</label>
              <div className="relative">
                <input
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  inputMode="decimal"
                  className={`${inputClass} pr-10`}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#c9784a]">
                  kg
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-ink/70">體溫</label>
              <div className="relative">
                <input
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  inputMode="decimal"
                  className={`${inputClass} pr-10`}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#c9784a]">
                  °C
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-ink/70">心跳</label>
              <div className="relative">
                <input
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  inputMode="numeric"
                  className={`${inputClass} pr-12`}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#c9784a]">
                  bpm
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-ink/70">
                檢查醫院
              </label>
              <input
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className={`${inputClass}`}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-ink/70">
                主治醫師
              </label>
              <input
                value={vet}
                onChange={(e) => setVet(e.target.value)}
                className={`${inputClass}`}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-ink/70">
                檢查備註
              </label>
              <div className="relative">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 200))}
                  placeholder="輸入此次檢查的備註（選填）"
                  rows={4}
                  maxLength={200}
                  className={`${inputClass} resize-none placeholder:text-ink/30`}
                />
                <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-ink/35">
                  {note.length}/200
                </span>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-ink">
                上傳檢查報告或圖片
              </div>
              <p className="mt-1 text-xs text-ink/45">
                可上傳檢查報告、血檢單、超音波等文件或圖片
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={handleFilesPick}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#dcccb8] bg-white py-8 transition hover:bg-cream/40"
              >
                <UploadCloud size={24} className="text-ink/35" />
                <span className="text-sm font-medium text-ink/70">
                  點擊上傳或拖曳檔案到此處
                </span>
                <span className="text-xs text-ink/40">
                  支援 JPG、PNG、PDF（單檔上限 10MB）
                </span>
              </button>

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      className="flex items-center gap-3 rounded-xl border border-[#ece0d2] bg-white px-3 py-2.5"
                    >
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                          file.type === "application/pdf"
                            ? "bg-[#fdeceb] text-[#d9645a]"
                            : "bg-[#dce8f5] text-[#5b83ab]"
                        }`}
                      >
                        {file.type === "application/pdf" ? (
                          <FileText size={16} />
                        ) : (
                          <ImageIcon size={16} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-ink/80">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        aria-label="移除檔案"
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink/40 transition hover:bg-cream hover:text-ink"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-4 py-4">
          <div className="mx-auto max-w-md">
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              aria-label="儲存"
              className="w-full rounded-2xl bg-[#caa06f] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "儲存中…" : "儲存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
