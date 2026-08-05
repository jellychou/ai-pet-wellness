import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePetStore } from "../store/usePetStore";
import { fetchTimeline, formatTimelineDayLabel, type TimelineItem } from "../lib/timeline";

export function TimelinePage() {
  const { t } = useTranslation();
  const selectedPet = usePetStore((s) => s.selectedPet);
  const [items, setItems] = useState<TimelineItem[]>([]);

  useEffect(() => {
    const petId = selectedPet?.id;
    if (!petId) return;
    fetchTimeline(petId)
      .then(setItems)
      .catch((error) => console.error(error));
  }, [selectedPet?.id]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold">{t("timeline.pageTitle")}</h1>
      {items.length === 0 ? (
        <p className="muted mt-8">{t("timeline.emptyState")}</p>
      ) : (
        <div className="relative mt-8 border-l-2 border-mist pl-8">
          {items.map((item) => (
            <div key={`${item.type}-${item.id}`} className="relative mb-6 card p-5">
              <span className="absolute -left-[42px] top-6 h-5 w-5 rounded-full border-4 border-[#f8f4ee] bg-mist" />
              <div className="muted">{formatTimelineDayLabel(item.date)}</div>
              <h2 className="mt-1 font-semibold">{item.title}</h2>
              {item.summary && <p className="muted mt-2">{item.summary}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
