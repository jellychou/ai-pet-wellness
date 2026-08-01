import { useEffect, useState } from "react";
import { usePetStore } from "../store/usePetStore";
import {
  fetchTimeline,
  formatTimelineDayLabel,
  timelineIconMap,
  type TimelineItem,
} from "../lib/timeline";

// 把同一天的項目分在同一組，維持原本「今天／昨天／N 天前」的分組外觀，
// 但改成讀真的資料（疫苗紀錄 + 健康檢查紀錄），不再是寫死的假資料
function groupByDay(items: TimelineItem[]) {
  const groups: { day: string; items: TimelineItem[] }[] = [];
  for (const item of items) {
    const day = formatTimelineDayLabel(item.date);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.day === day) {
      lastGroup.items.push(item);
    } else {
      groups.push({ day, items: [item] });
    }
  }
  return groups;
}

export function RecordsPage() {
  const selectedPet = usePetStore((s) => s.selectedPet);
  const [items, setItems] = useState<TimelineItem[]>([]);

  useEffect(() => {
    const petId = selectedPet?.id;
    if (!petId) return;
    fetchTimeline(petId)
      .then(setItems)
      .catch((error) => console.error(error));
  }, [selectedPet?.id]);

  const groups = groupByDay(items);

  return (
    <section className="card p-4">
      {groups.length === 0 && (
        <p className="py-6 text-center text-xs text-ink/40">
          目前還沒有任何紀錄
        </p>
      )}
      <div className="relative space-y-4">
        {groups.length > 0 && (
          <div className="absolute bottom-6 left-2 top-2 w-px bg-[#cdeee7]" />
        )}
        {groups.map((group) => (
          <div key={group.day} className="relative pl-10">
            <span className="absolute left-0 top-0 grid h-4 w-4 place-items-center rounded-full bg-[#A6B9C7] text-[#ffffff]"></span>
            <div className="pt-1.5 text-xs font-semibold text-ink/70">
              {group.day}
            </div>
            <div className="mt-2 space-y-2">
              {group.items.map((item) => {
                const { Icon, color } = timelineIconMap[item.type];
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${color}`}
                    >
                      <Icon size={14} />
                    </span>
                    <span className="text-xs text-ink/80">{item.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
