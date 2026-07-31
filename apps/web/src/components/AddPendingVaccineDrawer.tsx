import { useEffect, useState, type ReactNode } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Lightbulb,
  Syringe,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { calculateAge } from "../lib/utils";
import { apiFetch } from "../lib/api";
import type { Pet } from "../data/pets";

const defaultPetPhoto =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=240&h=240&fit=crop";

// 跟 AddVaccineFormDrawer 共用同一份疫苗類型清單，保持兩邊選項一致
const vaccineTypeOptions = [
  // 犬用
  "狂犬病疫苗（如 寵必威 Nobivac Rabies）",
  "犬五合一疫苗（DHPPi，如 寵必威 Nobivac DHPPi）",
  "犬六合一疫苗（DHPPi+L）",
  "犬七合一疫苗（如 寵必威 Nobivac 1-DAPPvL2）",
  "犬八合一疫苗",
  "犬十合一疫苗（如 碩騰 Vanguard Plus 10、Duramune）",
  "犬十一合一疫苗",
  "鉤端螺旋體疫苗（Lepto）",
  "犬舍咳疫苗（Bordetella）",
  "萊姆病疫苗（Lyme）",
  // 貓用
  "貓三合一疫苗（FVRCP，如 寵必威 Nobivac Tricat Trio）",
  "貓四合一疫苗（含披衣菌）",
  "貓白血病疫苗（FeLV，如 Purevax FeLV）",
  // 其他
  "其他",
];

const doseCountOptions = [
  { label: "1 劑", value: "1" },
  { label: "2 劑", value: "2" },
  { label: "3 劑以上", value: "3+" },
];

const reminderLeadDaysOptions = [
  { label: "提前 14 天", value: "14" },
  { label: "提前 7 天", value: "7" },
  { label: "提前 3 天", value: "3" },
  { label: "提前 1 天", value: "1" },
];

const recurringIntervalOptions = [
  { label: "6 個月", value: "6_months" },
  { label: "1 年", value: "1_year" },
  { label: "3 年", value: "3_years" },
];

const steps = [
  { n: 1, label: "基本資訊" },
  { n: 2, label: "預計接種" },
  { n: 3, label: "完成" },
] as const;

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center py-4">
      {steps.map((item, i) => (
        <div key={item.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold transition ${
                item.n <= step
                  ? "bg-[#b88672] text-white"
                  : "bg-[#ece4dc] text-ink/40"
              }`}
            >
              {item.n}
            </div>
            <span
              className={`text-[11px] ${
                item.n === step ? "font-medium text-ink/80" : "text-ink/40"
              }`}
            >
              {item.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <span
              className={`mx-2 mb-4 h-px w-10 transition ${
                item.n < step ? "bg-[#b88672]" : "bg-[#ece4dc]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-ink/70">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[] | { label: string; value: string }[];
}) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { label: o, value: o } : o,
  );
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none rounded-xl border border-[#ece0d2] bg-white px-3 py-2.5 text-[12px] outline-none ${
          value ? "text-ink" : "text-ink/35"
        }`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {normalized.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/40"
      />
    </div>
  );
}

function ToggleGroup({
  options,
  value,
  onChange,
  columns,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  columns?: number;
}) {
  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-xl border py-2.5 text-[12px] font-medium transition ${
            value === o.value
              ? "border-[#e8a56b] bg-[#fdf1e6] text-[#c9784a]"
              : "border-[#ece4dc] bg-white text-ink/50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 overflow-hidden rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#caa06f] focus-visible:ring-offset-2 ${
        checked ? "bg-[#caa06f]" : "bg-[#e3dcd2]"
      }`}
    >
      {/* left-1 是明確寫死的起始位置（不是靠 absolute 元素沒設 left 時瀏覽器自己
          去猜的「static position」），checked 時再往右平移固定距離，兩種狀態下
          圓點都保證還在藥丸範圍內，不會因為位置計算誤差跑出去；overflow-hidden
          當最後一道防線，就算真的算錯也只會被裁掉，不會整顆跑到藥丸外面 */}
      <span
        className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

const initialState = {
  vaccineType: "",
  vaccineName: "",
  doseCount: "1",
  batchNumber: "",
  note: "",
  nextDate: "",
  reminderLeadDays: "14",
  recurringEnabled: true,
  recurringInterval: "1_year",
  nextNote: "",
};

export function AddPendingVaccineDrawer() {
  const open = useAppStore((s) => s.addPendingVaccineFormOpen);
  const setOpen = useAppStore((s) => s.setAddPendingVaccineFormOpen);
  const bumpVaccineRefreshKey = useAppStore((s) => s.bumpVaccineRefreshKey);
  const pets = usePetStore((s) => s.pets);
  const selectedPet = usePetStore((s) => s.selectedPet);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [targetPet, setTargetPet] = useState<Pet | null>(null);
  const [petPickerOpen, setPetPickerOpen] = useState(false);

  const [vaccineType, setVaccineType] = useState(initialState.vaccineType);
  const [vaccineName, setVaccineName] = useState(initialState.vaccineName);
  const [doseCount, setDoseCount] = useState(initialState.doseCount);
  const [batchNumber, setBatchNumber] = useState(initialState.batchNumber);
  const [note, setNote] = useState(initialState.note);

  const [nextDate, setNextDate] = useState(initialState.nextDate);
  const [reminderLeadDays, setReminderLeadDays] = useState(
    initialState.reminderLeadDays,
  );
  const [recurringEnabled, setRecurringEnabled] = useState(
    initialState.recurringEnabled,
  );
  const [recurringInterval, setRecurringInterval] = useState(
    initialState.recurringInterval,
  );
  const [nextNote, setNextNote] = useState(initialState.nextNote);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 每次打開這個 drawer 都是全新填寫一筆待接種疫苗，重置成初始狀態，
  // 預設對象是「我的寵物」目前選中的那隻
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setTargetPet(selectedPet);
    setPetPickerOpen(false);
    setVaccineType(initialState.vaccineType);
    setVaccineName(initialState.vaccineName);
    setDoseCount(initialState.doseCount);
    setBatchNumber(initialState.batchNumber);
    setNote(initialState.note);
    setNextDate(initialState.nextDate);
    setReminderLeadDays(initialState.reminderLeadDays);
    setRecurringEnabled(initialState.recurringEnabled);
    setRecurringInterval(initialState.recurringInterval);
    setNextNote(initialState.nextNote);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    setOpen(false);
  }

  function handleNext() {
    if (!vaccineType || !vaccineName) {
      setError("請完整填寫所有必填欄位");
      return;
    }
    setError("");
    setStep(2);
  }

  async function handleSave() {
    if (!nextDate) {
      setError("請選擇預計接種日期");
      return;
    }
    if (!targetPet) {
      setError("請選擇寵物");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      await apiFetch("/vaccine/add-vaccine", {
        method: "POST",
        body: JSON.stringify({
          pet_id: targetPet.id,
          vaccine_type: vaccineType,
          vaccine_name: vaccineName,
          batch_number: batchNumber || null,
          // 待接種疫苗還沒真的打，這三個欄位先留空，等之後真的去打了再另外補一筆
          // 已接種紀錄（或是之後做「標記為已接種」功能時再回頭補上）
          vaccination_date: null,
          location: null,
          hospital: null,
          vet: null,
          note: note || null,
          reminder_enabled: true,
          next_date: nextDate,
          reminder_lead_days: Number(reminderLeadDays),
          next_note: nextNote || null,
          recurring_enabled: recurringEnabled,
          recurring_interval: recurringEnabled ? recurringInterval : null,
        }),
      });
      bumpVaccineRefreshKey();
      setStep(3);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "待接種疫苗儲存失敗，請稍後再試",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-[#ece0d2] bg-white px-3 py-2.5 text-[12px] text-ink outline-none placeholder:text-ink/30";

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
      <div className="flex items-center justify-between border-b border-[#ece4dc] bg-[#fffdfa] px-4 py-3">
        <button
          type="button"
          onClick={handleClose}
          aria-label="返回"
          className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-sm font-semibold text-ink">新增待接種疫苗</h1>
        <span className="w-9" />
      </div>

      <Stepper step={step} />

      <div className="flex-1 overflow-y-auto px-4 pb-5">
        <div className="mx-auto max-w-md">
          {petHeader}

          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#fbf1e6] p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#d9834f]">
                  <Lightbulb size={13} />
                  什麼是待接種疫苗？
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] leading-5 text-ink/70">
                    記錄尚未接種的疫苗，系統會在接種時間前提醒您，幫助毛孩準時獲得保護！
                  </p>
                  <span className="shrink-0 text-3xl">🐶</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#d9834f]">
                <Syringe size={13} />
                疫苗資訊
              </div>

              <Field label="疫苗類型" required>
                <Select
                  value={vaccineType}
                  onChange={setVaccineType}
                  placeholder="請選擇疫苗類型"
                  options={vaccineTypeOptions}
                />
              </Field>
              <p className="-mt-2 text-[11px] text-ink/40">
                不確定疫苗類型？
                <span className="text-[#5b83ab]">查看常見疫苗說明</span>
              </p>

              <Field label="疫苗名稱" required>
                <input
                  value={vaccineName}
                  onChange={(e) => setVaccineName(e.target.value)}
                  placeholder="請輸入疫苗名稱（例：狂犬病疫苗）"
                  className={inputClass}
                />
              </Field>

              <Field label="疫苗批號（選填）">
                <input
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="若尚未取得，可稍後再補上"
                  className={inputClass}
                />
              </Field>

              <Field label="備註（選填）">
                <div className="relative">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 200))}
                    placeholder="可記錄此疫苗的備註或建議事項..."
                    rows={3}
                    maxLength={200}
                    className={`${inputClass} resize-none`}
                  />
                  <span className="pointer-events-none absolute bottom-2 right-3 text-[9px] text-ink/35">
                    {note.length}/200
                  </span>
                </div>
              </Field>

              {error && (
                <p className="text-center text-xs text-red-500">{error}</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#eef3f6] p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#5d7c8c]">
                  <Calendar size={13} />
                  預計接種提醒
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] leading-5 text-ink/70">
                    設定預計接種日期，系統將在接種前時間您，建議依照獸醫師建議的時間進行接種。
                  </p>
                  <span className="shrink-0 text-3xl">📅🔔</span>
                </div>
              </div>

              <Field label="預計接種日期" required>
                <div className="relative">
                  <input
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    placeholder="請選擇預計接種日期"
                    className={`${inputClass} pr-9 [color-scheme:light]`}
                  />
                </div>
              </Field>

              <Field label="提醒時間">
                <ToggleGroup
                  value={reminderLeadDays}
                  onChange={setReminderLeadDays}
                  options={reminderLeadDaysOptions}
                  columns={3}
                />
              </Field>

              <Field label="備註（選填）">
                <div className="relative">
                  <textarea
                    value={nextNote}
                    onChange={(e) => setNextNote(e.target.value.slice(0, 200))}
                    placeholder="可記錄此疫苗的施打週期或獸醫師建議..."
                    rows={3}
                    maxLength={200}
                    className={`${inputClass} resize-none`}
                  />
                  <span className="pointer-events-none absolute bottom-2 right-3 text-[9px] text-ink/35">
                    {nextNote.length}/200
                  </span>
                </div>
              </Field>

              {error && (
                <p className="text-center text-xs text-red-500">{error}</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[#dff3e6] text-[#3fa876]">
                <CheckCircle2 size={32} />
              </span>
              <h2 className="mt-4 text-base font-semibold text-ink">
                待接種疫苗新增成功！
              </h2>
              <p className="mt-1.5 text-[12px] text-ink/50">
                {targetPet?.name} 的 {vaccineName || vaccineType}
                ，預計接種日期是 {nextDate}
                ，我們會提前 {reminderLeadDays} 天提醒您。
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-4 py-4">
        <div className="mx-auto max-w-md space-y-2">
          {step === 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="w-full rounded-2xl bg-[#caa06f] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260]"
            >
              下一步
            </button>
          )}
          {step === 2 && (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full rounded-2xl bg-[#caa06f] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "儲存中…" : "完成並儲存"}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSaving}
                className="w-full rounded-full border border-[#e8c9a3] py-3.5 text-sm font-semibold text-[#c9784a] transition hover:bg-[#fbe9d9]/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                上一步
              </button>
            </>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-2xl bg-[#caa06f] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260]"
            >
              完成
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
