import { create } from "zustand";

export type AuthUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  role: string;
  accountStatus: string;
};

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (accessToken: string, user: AuthUser) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,

  setAuth: (accessToken, user) => {
    set({ accessToken, user });
  },

  clearAuth: () => {
    set({ accessToken: null, user: null });
  },
}));
