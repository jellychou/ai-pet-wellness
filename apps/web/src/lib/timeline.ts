import dayjs from "dayjs";
import { ClipboardPlus, Syringe, type LucideIcon } from "lucide-react";
import { apiFetch } from "./api";

// 跟後端 app/schemas/timeline.py 的 TimelineItemOut 對齊——時間軸只是把
// vaccine_records / report_records 兩張表讀出來、依日期攤平合併，不是自己
// 存了一份新資料，之後飲食/心情等功能有真的後端了，type 才會跟著多起來
export type TimelineItemType = "vaccine" | "report";

export type TimelineItem = {
  type: TimelineItemType;
  id: number;
  date: string; // ISO 字串，例如 "2026-07-25"
  title: string;
  summary: string | null;
};

export function fetchTimeline(petId: number) {
  return apiFetch<TimelineItem[]>(`/timeline/${petId}`);
}

export const timelineIconMap: Record<
  TimelineItemType,
  { Icon: LucideIcon; color: string }
> = {
  vaccine: { Icon: Syringe, color: "bg-[#dcf2ec] text-[#3fa88f]" },
  report: { Icon: ClipboardPlus, color: "bg-[#eae3f7] text-[#8462c9]" },
};

// 把日期換成「今天／昨天／N 天前／更早的實際日期」這種相對感，列表用
// group 呈現比較好讀；超過一週的直接顯示日期，不然「30 天前」意義不大
export function formatTimelineDayLabel(dateStr: string): string {
  const target = dayjs(dateStr).startOf("day");
  const today = dayjs().startOf("day");
  const diffDays = today.diff(target, "day");

  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} 天前`;
  return target.format("YYYY/MM/DD");
}
