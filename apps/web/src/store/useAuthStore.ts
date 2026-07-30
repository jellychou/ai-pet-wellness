import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  picture_url?: string | null;
  slogan?: string | null;
  phone?: string | null;
  birthdate?: string | null;
  language?: string | null;
  gender?: string | null;
  login_method: string | null;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  userInfo: AuthUser | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setUserInfo: (userInfo: AuthUser) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      userInfo: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
      setUserInfo: (userInfo) => set({ userInfo }),
    }),
    { name: "auth-storage" },
  ),
);
