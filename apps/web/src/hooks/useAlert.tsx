import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";

type AlertState = {
  severity: "success" | "error";
  message: string;
};

type AlertContextValue = {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  clear: () => void;
};

const AlertContext = createContext<AlertContextValue | null>(null);

/**
 * 全域的成功/失敗提示。包在 App 最外層一次（見 App.tsx）就好，
 * 裡面任何元件都可以直接呼叫 useAlert() 拿 showSuccess/showError 來用，
 * 不用各自 import、也不用各自在畫面裡加 {AlertSlot} 才會顯示：
 *
 *   const { showSuccess, showError } = useAlert();
 *   showSuccess("密碼變更成功");
 *   showError("密碼變更失敗，請稍後再試");
 */
export function AlertProvider({ children }: { children: ReactNode }) {
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

  return (
    <AlertContext.Provider value={{ showSuccess, showError, clear }}>
      {children}
      {alert && (
        <Alert
          onClose={clear}
          severity={alert.severity}
          className="fixed left-1/2 top-4 z-[80] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 shadow-lg"
        >
          {alert.message}
        </Alert>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error("useAlert() 要在 <AlertProvider> 裡面用");
  }
  return ctx;
}
