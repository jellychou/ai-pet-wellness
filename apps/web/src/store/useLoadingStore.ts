import { create } from "zustand";

// 全域 loading 遮罩的計數器——用計數而不是單純的 boolean，是因為畫面上
// 常常同時有好幾個 apiFetch() 平行打出去（例如 DashboardPage 一次抓
// 好幾支 API），如果只是 true/false，第一支先回來就會把遮罩關掉，
// 其他還在進行中的請求反而看不到 loading。改成計數：進一支 +1、
// 結束一支（不管成功或失敗）-1，只有全部都結束、數字回到 0 才真的隱藏。
type LoadingState = {
  activeRequests: number;
  startLoading: () => void;
  stopLoading: () => void;
};

export const useLoadingStore = create<LoadingState>((set) => ({
  activeRequests: 0,
  startLoading: () =>
    set((state) => ({ activeRequests: state.activeRequests + 1 })),
  // Math.max(0, ...) 防呆：理論上 start/stop 一定成對出現（apiFetch 的
  // try/finally 保證），但萬一未來哪裡漏接、多呼叫一次 stopLoading，
  // 也不會讓計數變成負數卡住整個遮罩邏輯
  stopLoading: () =>
    set((state) => ({ activeRequests: Math.max(0, state.activeRequests - 1) })),
}));
