import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";

type AlertState = {
  severity: "success" | "error";
  message: string;
};

/**
 * 共用的成功/失敗提示。用法：
 *
 *   const { showSuccess, showError, AlertSlot } = useAlert();
 *   ...
 *   showSuccess("密碼變更成功");
 *   showError("密碼變更失敗，請稍後再試");
 *   ...
 *   return (
 *     <>
 *       ...原本的畫面...
 *       {AlertSlot}
 *     </>
 *   );
 *
 * 注意：AlertSlot 要放在最外層（跟其他內容平行），不要放在有 transform
 * （例如 drawer 滑入滑出動畫）的元素裡面，不然 fixed 定位會被那個
 * transform 影響，畫面關掉時提示也會跟著被移出畫面。
 */
export function useAlert() {
  const [alert, setAlert] = useState<AlertState | null>(null);

  // 沒有像 Snackbar 內建的 autoHideDuration，自己補一個計時器讓它幾秒後消失
  useEffect(() => {
    if (!alert) return;
    const timer = window.setTimeout(() => setAlert(null), 3000);
    return () => window.clearTimeout(timer);
  }, [alert]);

  function showSuccess(message: string) {
    setAlert({ severity: "success", message });
  }

  function showError(message: string) {
    setAlert({ severity: "error", message });
  }

  function clear() {
    setAlert(null);
  }

  const AlertSlot = alert ? (
    <Alert
      onClose={clear}
      severity={alert.severity}
      className="fixed left-1/2 top-4 z-[80] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 shadow-lg"
    >
      {alert.message}
    </Alert>
  ) : null;

  return { showSuccess, showError, clear, AlertSlot };
}
