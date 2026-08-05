import { useState, useEffect } from "react";
import { ArrowLeft, Syringe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { apiFetch } from "../lib/api";
import { usePetStore } from "../store/usePetStore";
import { isPastDate } from "../lib/utils";
import { VaccineRecord } from "../data/pets";

export function AddVaccineDrawer() {
  const { t } = useTranslation();
  const tabs = [
    { label: t("vaccine.tabAll"), value: "all" },
    { label: t("vaccine.tabDone"), value: "1" },
    { label: t("vaccine.tabPending"), value: "0" },
  ] as const;
  const open = useAppStore((s) => s.addVaccineOpen);
  const setOpen = useAppStore((s) => s.setAddVaccineOpen);
  const selectedPet = usePetStore((s) => s.selectedPet);
  const setAddVaccineFormOpen = useAppStore((s) => s.setAddVaccineFormOpen);
  const setAddPendingVaccineFormOpen = useAppStore(
    (s) => s.setAddPendingVaccineFormOpen,
  );
  const vaccineRefreshKey = useAppStore((s) => s.vaccineRefreshKey);
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof tabs)[number]["value"]>("all");
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);

  function handleBack() {
    setOpen(false);
    navigate("/");
  }

  const fetchVaccines = async () => {
    try {
      const petId = selectedPet?.id;
      if (!petId) {
        return;
      }
      const response = await apiFetch<VaccineRecord[]>(
        `/vaccine/get-vaccines/${petId}`,
      );
      const vaccines = response.map((item: any) => {
        return {
          ...item,
          status: isPastDate(item.vaccination_date) ? "1" : "0",
        };
      });
      setVaccines(vaccines);
    } catch (error) {
      console.error(error);
    }
  };

  // 除了 mount 的時候，drawer 每次被打開、選中的寵物換了、或是有新的疫苗
  // 紀錄被新增（vaccineRefreshKey 改變）都要重新抓一次，不然疊在上面的
  // 新增疫苗 drawer 關掉之後，這裡（本來就是 open 的）不會自動重新 mount，
  // 剛新增的紀錄就不會出現在列表裡
  useEffect(() => {
    if (!open) return;
    fetchVaccines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedPet?.id, vaccineRefreshKey]);

  const filtered = vaccines.filter((v) => tab === "all" || v.status === tab);

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
              aria-label={t("vaccine.backHomeAria")}
              className="grid h-9 w-9 place-items-center rounded-full text-ink transition hover:bg-cream"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-semibold text-ink">
              {t("vaccine.headerTitle")}
            </h1>
          </div>

          <div className="flex gap-6 border-b border-[#ece4dc] text-sm">
            {tabs.map((tb) => (
              <button
                key={tb.value}
                type="button"
                onClick={() => setTab(tb.value)}
                className={`pb-2 transition ${
                  tab === tb.value
                    ? "border-b-2 border-[#5b83ab] font-medium text-ink"
                    : "text-ink/40"
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl bg-[#fbf7f1] p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <Syringe
                    size={22}
                    className={
                      v.status === "0"
                        ? "mt-0.5 shrink-0 text-[#e78154]"
                        : "mt-0.5 shrink-0 text-[#8083c9]"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-ink">
                        {v.vaccine_type}
                      </div>
                      <span
                        className={`pill shrink-0 ${
                          v.status === "0"
                            ? "bg-[#f4ddc3] text-[#a46e3d]"
                            : "bg-[#dce8ed] text-[#5d7c8c]"
                        }`}
                      >
                        {v.status === "all"
                          ? t("vaccine.tabAll")
                          : v.status === "0"
                            ? t("vaccine.tabPending")
                            : t("vaccine.tabDone")}
                      </span>
                    </div>
                    <div className="text-xs text-ink/45">{v.note}</div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/70">
                      <span>{v.vaccination_date}</span>
                      {v.next_date && (
                        <span>
                          {t("vaccine.nextDateLabel", { date: v.next_date })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[#ece4dc] bg-[#fffdfa] px-4 py-4">
        <div className="mx-auto max-w-md flex gap-4">
          <button
            type="button"
            onClick={() => setAddVaccineFormOpen(true)}
            className="w-1/2 rounded-2xl bg-[#ead3ba] py-3.5 text-sm font-semibold text-ink transition hover:bg-[#e4c6a5]"
          >
            {t("vaccine.addVaccineButton")}
          </button>
          <button
            type="button"
            onClick={() => setAddPendingVaccineFormOpen(true)}
            className="w-1/2 rounded-2xl border border-[#e8c9a3] py-3.5 text-sm font-semibold text-[#c9784a] transition hover:bg-[#fbe9d9]/40"
          >
            {t("vaccine.addPendingVaccineButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
