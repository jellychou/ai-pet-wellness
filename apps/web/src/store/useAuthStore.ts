import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  picture_url?: string | null;
  slogan?: string | null;
  phone?: string | null;
  birthday?: string | null;
  language?: string | null;
  gender?: string | null;
  login_method: string | null;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  userInfo: AuthUser | null;
  isAuthenticated: boolean;
  // 目前後端還沒有寵物相關的 API，先用這個旗標當作「這個帳號是否已經填過寵物資料」的假資料，
  // 之後接上真的寵物 API 後，應該改成用「有沒有寵物」這種真實資料判斷，這個旗標就可以拿掉
  hasPet: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setUserInfo: (userInfo: AuthUser) => void;
  setHasPet: (hasPet: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      userInfo: null,
      isAuthenticated: false,
      hasPet: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () =>
        set({ token: null, user: null, isAuthenticated: false, hasPet: false }),
      setUserInfo: (userInfo) => set({ userInfo }),
      setHasPet: (hasPet) => set({ hasPet }),
    }),
    {
      name: "auth-storage",
      // userInfo 刻意不存進 localStorage：頭貼現在是 base64 圖片，資料量大，
      // 容易把 localStorage 的容量塞爆（QuotaExceededError，setUserInfo 就是這樣壞的）。
      // App.tsx 只要有 token 進站時就會打 /user/user-info 重新抓一份最新的 userInfo，
      // 不持久化這欄不會少功能。
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        hasPet: state.hasPet,
      }),
    },
  ),
);
