import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { enUS, zhTW } from "react-day-picker/locale";
import { useTranslation } from "react-i18next";
import "react-day-picker/style.css";

type DatePickerFieldProps = {
  // 跟原本 <input type="date"> 一樣吃/回傳 "YYYY-MM-DD" 純日期字串（或空
  // 字串代表未選擇），呼叫端不用改任何送後端的邏輯
  value: string;
  onChange: (value: string) => void;
  // 不傳的話用預設的 inputClass 樣式（跟其他文字欄位一致的白底圓角框）
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  // 年份下拉的範圍——預設涵蓋 1930 到明年，寵物/飼主生日、疫苗日期都夠用，
  // 個別欄位需要更窄的範圍（例如「下次接種日」不太可能選到很久以前）可以
  // 自己覆寫
  fromYear?: number;
  toYear?: number;
};

// 後端存的是 "YYYY-MM-DD" 純日期字串，直接 new Date(那個字串) 會被當成
// UTC 午夜解析，在 UTC 負時區可能整個跳回前一天，這裡強制用本地時間解析——
// 跟 TimelinePage/RecordsPage 的 parseDateKey 同樣的理由
function parseISODate(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toISODate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDisplay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()} / ${pad(date.getMonth() + 1)} / ${pad(date.getDate())}`;
}

const defaultTriggerClass =
  "flex w-full items-center justify-between rounded-xl border border-[#ece0d2] bg-white px-3 py-2 text-[11px] text-ink outline-none transition disabled:cursor-not-allowed disabled:opacity-60";

// 取代所有 <input type="date">：不同手機/瀏覽器原生日期選擇器的操作方式、
// 外觀都不一樣（先前為了避免 iOS 自動 zoom 已經修過好幾次字級/邊框問題），
// 改用同一套 react-day-picker 日曆，全平台外觀一致，也能直接套用跟畫面
// 其他地方一致的米色系配色（見 index.css 的 .rdp-pw 覆寫區塊）
export function DatePickerField({
  value,
  onChange,
  className,
  placeholder,
  disabled,
  fromYear = 1930,
  toYear = new Date().getFullYear() + 1,
}: DatePickerFieldProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = parseISODate(value);

  // 點外面收起日曆——跟 TimelinePage/RecordsPage 的寵物切換下拉不同，
  // 那些用的是「再點一次同一顆按鈕」關閉，這裡日曆範圍比較大，點外面
  // 沒有反應會讓人以為卡住
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={className ?? defaultTriggerClass}
      >
        <span className={selected ? "" : "text-ink/30"}>
          {selected
            ? formatDisplay(selected)
            : (placeholder ?? t("common.datePlaceholder"))}
        </span>
        <CalendarIcon size={14} className="shrink-0 text-ink/35" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 rounded-2xl border border-[#ece4dc] bg-white p-2 shadow-lg">
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              if (!date) return;
              onChange(toISODate(date));
              setOpen(false);
            }}
            locale={i18n.language === "en" ? enUS : zhTW}
            captionLayout="dropdown"
            startMonth={new Date(fromYear, 0)}
            endMonth={new Date(toYear, 11)}
            className="rdp-pw"
          />
        </div>
      )}
    </div>
  );
}
