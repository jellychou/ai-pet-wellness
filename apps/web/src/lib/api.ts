import { useAuthStore } from "../store/useAuthStore";
import { useLoadingStore } from "../store/useLoadingStore";
import i18n from "../i18n/config";

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().token;

  // 全域 loading 遮罩：每一支 apiFetch() 呼叫都算一次，不用每個元件自己
  // 記得包 try/finally 手動控制——見 store/useLoadingStore.ts 的計數器
  // 說明。用最外層 try/finally 包，成功/失敗/例外都保證會把這次的請求
  // 計數扣掉，不會卡住遮罩一直不消失
  useLoadingStore.getState().startLoading();
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (res.status === 401) {
      useAuthStore.getState().logout();
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(
        res.status,
        body?.detail ?? i18n.t("common.apiErrorFallback", { status: res.status }),
      );
    }

    return res.json() as Promise<T>;
  } finally {
    useLoadingStore.getState().stopLoading();
  }
}
