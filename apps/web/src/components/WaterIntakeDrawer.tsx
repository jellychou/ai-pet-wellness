import { useEffect, useState } from "react";
import { ArrowLeft, Droplets, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { usePetStore } from "../store/usePetStore";
import { apiFetch } from "../lib/api";
import { calculateDailyWaterTargetMl } from "../lib/water";
import { useAlert } from "../hooks/useAlert";

type WaterTodaySummary = { total_ml: number };

const QUICK_AMOUNTS = [50, 100, 150, 200, 300, 500];

// 跟 HealthJournalDrawer/AddFoodDrawer 同一種「Dashboard 觸發、全螢幕記錄」
// 模式，但內容簡單很多——沒有分步驟，開起來就是「今日已喝多少 + 快速加
// 幾筆」，不用像飲食記錄那樣先辨識/挑選再確認
export function WaterIntakeDrawer() {
  const { t } = useTranslation();
  const open = useAppStore((s) => s.waterIntakeOpen);
  const setOpen = useAppStore((s) => s.setWaterIntakeOpen);
  const bumpWaterRefreshKey = useAppStore((s) => s.bumpWaterRefreshKey);
  const selectedPet = usePetStore((s) => s.selectedPet);
  const { showError } = useAlert();

  const [totalMl, setTotalMl] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const targetMl = selectedPet
    ? calculateDailyWaterTargetMl(selectedPet)
    : null;
  const percent =
    targetMl && targetMl > 0
      ? Math.min(100, Math.round((totalMl / targetMl) * 100))
      : null;

  useEffect(() => {
    const petId = selectedPet?.id;
    if (!open || !petId) return;
    apiFetch<WaterTodaySummary>(`/water/today/${petId}`, { method: "GET" })
      .then((res) => setTotalMl(res.total_ml))
      .catch((err) => console.error(err));
  }, [open, selectedPet?.id]);

  useEffect(() => {
    if (!open) return;
    setCustomAmount("");
  }, [open]);

  async function addAmount(amount: number) {
    const petId = selectedPet?.id;
    if (!petId || amount <= 0 || saving) return;
    setSaving(true);
    try {
      await apiFetch("/water/add-record", {
        method: "POST",
        body: JSON.stringify({ pet_id: petId, amount_ml: amount }),
      });
      setTotalMl((current) => current + amount);
      bumpWaterRefreshKey();
      setCustomAmount("");
    } catch (err) {
      console.error(err);
      showError(t("water.addFailed"));
    } finally {
      setSaving(false);
    }
  }

  function handleCustomAdd() {
    const amount = Math.round(Number(customAmount));
    if (!Number.isFinite(amount) || amount <= 0) return;
    addAmount(amount);
  }

  function handleClose() {
    setOpen(false);
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              aria-label={t("common.backAria")}
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-semibold text-ink">
              {t("water.title")}
            </h1>
          </div>

          <div className="rounded-2xl border border-[#ece0d2] bg-[#fffdfa] p-4 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#eef4f6] text-[#688696]">
              <Droplets size={22} />
            </span>
            <div className="mt-2 text-2xl font-bold text-ink">
              {t("water.todayTotal", { total: totalMl })}
            </div>
            <div className="mt-1 text-xs text-ink/45">
              {targetMl
                ? t("water.targetLine", { target: targetMl })
                : t("water.noTarget")}
            </div>
            {percent != null && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#eee5da]">
                <div
                  className="h-full rounded-full bg-[#688696]"
                  style={{ width: `${percent}%` }}
                />
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 text-[12px] font-medium text-ink/70">
              {t("water.quickAddTitle")}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => addAmount(amount)}
                  disabled={saving}
                  aria-label={t("water.addAria", { amount })}
                  className="rounded-xl border border-[#ece4dc] bg-white py-2.5 text-sm font-medium text-ink/70 transition hover:bg-[#eef4f6] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {amount} ml
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[12px] font-medium text-ink/70">
              {t("water.customTitle")}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder={t("water.customPlaceholder")}
                className="min-w-0 flex-1 rounded-xl border border-[#ece0d2] bg-white px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink/30"
              />
              <button
                type="button"
                onClick={handleCustomAdd}
                disabled={saving || !customAmount}
                className="flex shrink-0 items-center gap-1 rounded-xl bg-[#688696] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a7684] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={15} />
                {t("water.addButton")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-3 py-3">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={handleClose}
            className="w-full rounded-2xl bg-[#b98a5c] py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(185,138,92,.35)] transition hover:bg-[#a97a4d]"
          >
            {t("water.doneButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
