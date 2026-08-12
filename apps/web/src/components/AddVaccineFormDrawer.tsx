import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, ChevronDown, ChevronLeft, Syringe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { calculateAge } from "../lib/utils";
import { apiFetch } from "../lib/api";
import type { Pet } from "../data/pets";

const defaultPetPhoto =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=240&h=240&fit=crop";

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

const steps = [
  { n: 1, labelKey: "vaccine.stepBasicInfo" },
  { n: 2, labelKey: "vaccine.stepDone" },
] as const;

function Stepper({ step }: { step: 1 | 2 }) {
  const { t } = useTranslation();
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
              {t(item.labelKey)}
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
  options: string[];
}) {
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
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
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
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className={`grid gap-2`}
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
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

const initialState = {
  vaccineType: "",
  vaccineName: "",
  batchNumber: "",
  vaccinationDate: "",
  location: "hospital",
  hospital: "",
  vet: "",
  note: "",
};

export function AddVaccineFormDrawer() {
  const { t } = useTranslation();
  const open = useAppStore((s) => s.addVaccineFormOpen);
  const setOpen = useAppStore((s) => s.setAddVaccineFormOpen);
  const bumpVaccineRefreshKey = useAppStore((s) => s.bumpVaccineRefreshKey);
  const pets = usePetStore((s) => s.pets);
  const selectedPet = usePetStore((s) => s.selectedPet);

  const [step, setStep] = useState<1 | 2>(1);
  const [targetPet, setTargetPet] = useState<Pet | null>(null);
  const [petPickerOpen, setPetPickerOpen] = useState(false);

  const [vaccineType, setVaccineType] = useState(initialState.vaccineType);
  const [vaccineName, setVaccineName] = useState(initialState.vaccineName);
  const [batchNumber, setBatchNumber] = useState(initialState.batchNumber);
  const [vaccinationDate, setVaccinationDate] = useState(
    initialState.vaccinationDate,
  );
  const [location, setLocation] = useState(initialState.location);
  const [hospital, setHospital] = useState(initialState.hospital);
  const [vet, setVet] = useState(initialState.vet);
  const [note, setNote] = useState(initialState.note);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 每次打開這個 drawer 都是全新填寫一筆疫苗紀錄，重置成初始狀態，
  // 預設對象是「我的寵物」目前選中的那隻
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setTargetPet(selectedPet);
    setPetPickerOpen(false);
    setVaccineType(initialState.vaccineType);
    setVaccineName(initialState.vaccineName);
    setBatchNumber(initialState.batchNumber);
    setVaccinationDate(initialState.vaccinationDate);
    setLocation(initialState.location);
    setHospital(initialState.hospital);
    setVet(initialState.vet);
    setNote(initialState.note);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    setOpen(false);
  }

  async function handleSave() {
    if (
      !vaccineType ||
      !vaccinationDate ||
      !location ||
      (location === "hospital" && !hospital)
    ) {
      setError(t("addPet.validationRequired"));
      return;
    }
    if (!targetPet) {
      setError(t("food.selectPetError"));
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
          vaccination_date: vaccinationDate,
          location,
          hospital: location === "hospital" ? hospital : null,
          vet: vet || null,
          note: note || null,
          // 拿掉「下次施打提醒」那個步驟之後，這筆紀錄單純是補記已經打過的
          // 疫苗，不再收集下次提醒相關欄位（要設定下次提醒的話，改用
          // 「新增待接種疫苗」那個 drawer）
          reminder_enabled: false,
          next_date: null,
          reminder_lead_days: null,
          next_note: null,
        }),
      });
      bumpVaccineRefreshKey();
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("vaccine.saveFailed"));
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
          {targetPet?.name ?? t("vaccine.selectPetFallback")}
          <ChevronDown size={14} className="text-ink/40" />
        </button>
        <div className="truncate text-[11px] text-ink/45">
          {targetPet?.birthday &&
            t("vaccine.petAgePrefix", {
              age: calculateAge(targetPet.birthday),
            })}
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
          aria-label={t("common.backAria")}
          className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-sm font-semibold text-ink">
          {t("vaccine.addFormHeaderTitle")}
        </h1>
        <span className="w-9" />
      </div>

      <Stepper step={step} />

      <div className="flex-1 overflow-y-auto px-4 pb-5">
        <div className="mx-auto max-w-md">
          {petHeader}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#d9834f]">
                <Syringe size={13} />
                {t("vaccine.sectionVaccineInfo")}
              </div>

              <Field label={t("vaccine.fieldVaccineType")} required>
                <Select
                  value={vaccineType}
                  onChange={setVaccineType}
                  placeholder={t("vaccine.selectVaccineTypePlaceholder")}
                  options={vaccineTypeOptions}
                />
              </Field>

              {vaccineType && vaccineType === "其他" && (
                <Field label={t("vaccine.fieldVaccineName")}>
                  <input
                    value={vaccineName}
                    onChange={(e) => setVaccineName(e.target.value)}
                    placeholder={t("vaccine.vaccineNamePlaceholder")}
                    className={inputClass}
                  />
                </Field>
              )}

              <Field label={t("vaccine.fieldBatchNumber")}>
                <input
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder={t("vaccine.batchNumberPlaceholder")}
                  className={inputClass}
                />
              </Field>

              <Field label={t("vaccine.fieldVaccinationDate")} required>
                <div className="relative">
                  <input
                    type="date"
                    value={vaccinationDate}
                    onChange={(e) => setVaccinationDate(e.target.value)}
                    className={`${inputClass} pr-9 [color-scheme:light]`}
                  />
                </div>
              </Field>

              <Field label={t("vaccine.fieldLocation")} required>
                <ToggleGroup
                  value={location}
                  onChange={setLocation}
                  options={[
                    { label: t("vaccine.locationHospital"), value: "hospital" },
                    { label: t("vaccine.locationHome"), value: "home" },
                  ]}
                />
              </Field>

              {location === "hospital" && (
                <Field label={t("vaccine.fieldHospital")} required>
                  <input
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                    placeholder={t("vaccine.hospitalPlaceholder")}
                    className={inputClass}
                  />
                </Field>
              )}

              <Field label={t("vaccine.fieldVet")}>
                <input
                  value={vet}
                  onChange={(e) => setVet(e.target.value)}
                  placeholder={t("vaccine.vetPlaceholder")}
                  className={inputClass}
                />
              </Field>

              <Field label={t("common.noteOptional")}>
                <div className="relative">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 200))}
                    placeholder={t("vaccine.notePlaceholderDone")}
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
            <div className="flex flex-col items-center py-10 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[#dff3e6] text-[#3fa876]">
                <CheckCircle2 size={32} />
              </span>
              <h2 className="mt-4 text-base font-semibold text-ink">
                {t("vaccine.addSuccessTitle")}
              </h2>
              <p className="mt-1.5 text-[12px] text-ink/50">
                {t("vaccine.addSuccessBody", {
                  name: targetPet?.name,
                  vaccineName: vaccineName || vaccineType,
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-3 py-3">
        <div className="mx-auto max-w-md space-y-2">
          {step === 1 && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full rounded-2xl bg-[#caa06f] py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? t("common.saving") : t("vaccine.saveAndFinish")}
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-2xl bg-[#caa06f] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260]"
            >
              {t("vaccine.finish")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
