import {
  Camera,
  Smile,
  Stethoscope,
  Syringe,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { apiFetch } from "./api";

// 跟後端 app/schemas/timeline.py 的 TimelineItemOut 對齊——時間軸只是把
// food_records / vaccine_records / report_records / ai_scan_logs /
// health_journal_logs 這幾張表讀出來、依日期攤平合併，不是自己存了一份
// 新資料，之後有更多功能要進時間軸，type 才會跟著多起來
export type TimelineItemType =
  | "food"
  | "vaccine"
  | "report"
  | "ai_scan"
  | "health_journal";

export type TimelineItem = {
  type: TimelineItemType;
  id: number;
  date: string; // "YYYY-MM-DD"
  // "HH:MM"——只有食物/AI 分析這種來源資料表本來就存了時間的才有值，
  // 疫苗/健檢/健康日誌只存日期，這裡是 null，畫面要對這種情況防呆
  time: string | null;
  title: string;
  summary: string | null;
  image_url: string | null;
};

export function fetchTimeline(petId: number) {
  return apiFetch<TimelineItem[]>(`/timeline/${petId}`);
}

// 每種類型在時間軸卡片上的圖示/配色，照圖片的分類配色對照（食物橘、健檢綠、
// AI 分析紫、健康日誌黃、疫苗紅）
export const timelineTypeMeta: Record<
  TimelineItemType,
  { Icon: LucideIcon; iconClass: string; badgeClass: string }
> = {
  food: {
    Icon: Utensils,
    iconClass: "bg-[#fbe4cf] text-[#d9834f]",
    badgeClass: "bg-[#fbe4cf] text-[#d9834f]",
  },
  report: {
    Icon: Stethoscope,
    iconClass: "bg-[#dcf2ec] text-[#3fa88f]",
    badgeClass: "bg-[#dcf2ec] text-[#3fa88f]",
  },
  ai_scan: {
    Icon: Camera,
    iconClass: "bg-[#eae3f7] text-[#8462c9]",
    badgeClass: "bg-[#eae3f7] text-[#8462c9]",
  },
  health_journal: {
    Icon: Smile,
    iconClass: "bg-[#fdf0cf] text-[#c99a3f]",
    badgeClass: "bg-[#fdf0cf] text-[#c99a3f]",
  },
  vaccine: {
    Icon: Syringe,
    iconClass: "bg-[#fbe4de] text-[#c9503f]",
    badgeClass: "bg-[#fbe4de] text-[#c9503f]",
  },
};
