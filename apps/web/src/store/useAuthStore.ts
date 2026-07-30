import { create } from "zustand";
import { persist } from "zustand/middleware";

type Pet = {
  id: number;
  name: string;
  breed: string;
  gender: string;
  birthday: string;
  weight: number;
};

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
  is_set_password?: boolean;
  reset_token_hash?: string | null;
  reset_token_expires_at?: string | null;
  pets: Pet[];
  active_pet_id?: number | null;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  userInfo: AuthUser | null;
  // 目前後端還沒有寵物相關的 API，先用這個旗標當作「這個帳號是否已經填過寵物資料」的假資料，
  // 之後接上真的寵物 API 後，應該改成用「有沒有寵物」這種真實資料判斷，這個旗標就可以拿掉
  hasPet: boolean;
  // localStorage 的持久化資料是不是已經讀取完成。剛 reload 網頁的瞬間，
  // zustand 還沒把 localStorage 裡的 auth-storage 讀回 state，這時候
  // isAuthenticated 只是初始值 false，如果路由守衛在這個瞬間就判斷「沒登入」，
  // 會先閃一下跳去 /login。要等 hasHydrated 變 true，才代表 isAuthenticated
  // 是真的從 localStorage 判斷出來的結果，可以拿來做導頁判斷。
  hasHydrated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setUserInfo: (userInfo: AuthUser) => void;
  setHasPet: (hasPet: boolean) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      userInfo: null,
      hasPet: false,
      hasHydrated: false,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null, hasPet: false }),
      setUserInfo: (userInfo) => set({ userInfo }),
      setHasPet: (hasPet) => set({ hasPet }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "auth-storage",
      // userInfo、user 刻意都不存進 localStorage：這兩個都可能帶著 base64 頭貼
      // （user 是登入當下後端回傳的那份，userInfo 是 /user/user-info 抓回來的那份），
      // 資料量大，容易把 localStorage 的容量塞爆（QuotaExceededError）。
      // 而且只要 user 有被存進去，之後任何一次 set()（不管改的是哪個欄位）都會把
      // 整包 partialize 出來的 state 重新序列化寫入 localStorage，帶著這個大欄位一起寫，
      // 所以看起來像是「setUserInfo 壞的」，其實是 user 這個大欄位一直躺在裡面。
      // App.tsx 只要有 token 進站就會打 /user/user-info 重新抓一份最新的 userInfo，
      // 不持久化 user/userInfo 不會少功能。
      partialize: (state) => ({
        token: state.token,
        hasPet: state.hasPet,
      }),
      // 從 localStorage 讀完（不管有沒有存過資料）都會呼叫這裡，
      // 用來把 hasHydrated 打開，讓路由守衛知道現在可以放心判斷登入狀態了
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
