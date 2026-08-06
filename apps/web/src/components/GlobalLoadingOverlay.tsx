import { useTranslation } from "react-i18next";
import { useLoadingStore } from "../store/useLoadingStore";

// 全域 loading 遮罩：只要還有任何一支 apiFetch() 在進行中就會顯示（見
// lib/api.ts 怎麼觸發 useLoadingStore 的計數），蓋住整個畫面並暫時擋掉
// 點擊，避免使用者在資料還沒回來時重複送出、或點到舊畫面的按鈕。掛在
// App.tsx 最外層一次就好，不用每個頁面/drawer 自己處理 loading 遮罩。
export function GlobalLoadingOverlay() {
  const { t } = useTranslation();
  const isLoading = useLoadingStore((s) => s.activeRequests > 0);

  if (!isLoading) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
      aria-label={t("common.loading")}
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#fffdfa] px-6 py-5 shadow-[0_10px_30px_rgba(0,0,0,.15)]">
        <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#ece0d2] border-t-mist" />
        <span className="text-xs font-medium text-ink/60">
          {t("common.loading")}
        </span>
      </div>
    </div>
  );
}
