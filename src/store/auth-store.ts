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
  isInitialized: boolean;

  setAuth: (accessToken: string, user: AuthUser) => void;
  clearAuth: () => void;
  setInitialized: (initialized: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isInitialized: false,

  setAuth: (accessToken, user) => {
    set({
      accessToken,
      user,
      isInitialized: true,
    });
  },

  clearAuth: () => {
    set({
      accessToken: null,
      user: null,
      isInitialized: true,
    });
  },

  setInitialized: (initialized) => {
    set({ isInitialized: initialized });
  },
}));
