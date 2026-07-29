import { useState, type FormEvent } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Droplet,
  Heart,
  PlusCircle,
  Radar,
  Stethoscope,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

const examTypes = [
  { label: "年度健康檢查", icon: Stethoscope },
  { label: "血液檢查", icon: Droplet },
  { label: "糞便檢查", emoji: "💩" },
  { label: "心臟檢查", icon: Heart },
  { label: "超音波檢查", icon: Radar },
  { label: "其他檢查", icon: PlusCircle },
] as const;

const summaries = [
  { label: "正常", icon: CheckCircle2, color: "#3fa876", bg: "#dff3e6" },
  { label: "需追蹤", icon: AlertCircle, color: "#d9834f", bg: "#fbe9d9" },
  { label: "異常", icon: AlertTriangle, color: "#d9645a", bg: "#fdeceb" },
] as const;

export function AddHealthRecordDrawer() {
  const open = useAppStore((s) => s.addHealthRecordOpen);
  const setOpen = useAppStore((s) => s.setAddHealthRecordOpen);
  const navigate = useNavigate();

  const [date, setDate] = useState("2025/05/10");
  const [time, setTime] = useState("10:30");
  const [examType, setExamType] = useState("年度健康檢查");
  const [summary, setSummary] = useState("正常");
  const [weight, setWeight] = useState("25.4");
  const [temp, setTemp] = useState("38.5");
  const [heartRate, setHeartRate] = useState("110");
  const [note, setNote] = useState("");

  function handleBack() {
    setOpen(false);
    navigate("/");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleBack();
  }

  const inputClass =
    "w-full rounded-2xl border border-[#ece0d2] bg-white px-4 py-3 text-sm text-ink outline-none";

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

      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto max-w-md space-y-5">
            <div>
              <label className="mb-1.5 block text-sm text-ink/70">
                檢查日期 <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-[1.3fr_1fr] gap-2">
                <div className="relative">
                  <input
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`${inputClass} pl-10`}
                  />
                  <Calendar
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/40"
                  />
                </div>
                <div className="relative">
                  <input
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={`${inputClass} pl-10`}
                  />
                  <Clock
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/40"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-ink/70">
                檢查類型 <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {examTypes.map((t) => {
                  const selected = examType === t.label;
                  return (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => setExamType(t.label)}
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
                  const selected = summary === s.label;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setSummary(s.label)}
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
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl border border-[#ece0d2] bg-white px-4 py-3 text-left transition hover:bg-[#fbf7f1]"
              >
                <Building2 size={18} className="shrink-0 text-ink/40" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">
                    Happy Animal Hospital
                  </span>
                  <span className="block text-xs text-ink/45">
                    台北市中正區忠孝東路 123 號
                  </span>
                </span>
                <ArrowLeft
                  size={16}
                  className="shrink-0 rotate-180 text-ink/30"
                />
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-ink/70">
                主治醫師
              </label>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl border border-[#ece0d2] bg-white px-4 py-3 text-left transition hover:bg-[#fbf7f1]"
              >
                <UserRound size={18} className="shrink-0 text-ink/40" />
                <span className="flex-1 text-sm font-medium text-ink">
                  Dr. Lee
                </span>
              </button>
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
              <button
                type="button"
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
            </div>
          </div>
        </div>

        <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-4 py-4">
          <div className="mx-auto max-w-md">
            <button
              type="submit"
              className="w-full rounded-2xl bg-[#caa06f] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260]"
            >
              儲存
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
