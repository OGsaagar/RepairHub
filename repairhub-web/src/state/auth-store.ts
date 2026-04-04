import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppRole } from "../data/mock-data";
import type { AuthTokens, AuthUser } from "../lib/auth/auth-types";

type AuthState = {
  role: AppRole;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setSession: (session: AuthTokens) => void;
  setAccessToken: (accessToken: string) => void;
  clearSession: () => void;
};

const guestState = {
  role: "guest" as const,
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...guestState,
      setSession: (session) =>
        set({
          role: session.user.role,
          user: session.user,
          accessToken: session.access,
          refreshToken: session.refresh,
          isAuthenticated: true,
        }),
      setAccessToken: (accessToken) =>
        set((state) => ({
          ...state,
          accessToken,
          isAuthenticated: Boolean(accessToken && state.user),
        })),
      clearSession: () => set(guestState),
    }),
    {
      name: "repairhub-auth",
      partialize: (state) => ({
        role: state.role,
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export function getAccessToken() {
  return useAuthStore.getState().accessToken;
}

export function getRefreshToken() {
  return useAuthStore.getState().refreshToken;
}

export function setAccessToken(accessToken: string) {
  useAuthStore.getState().setAccessToken(accessToken);
}

export function clearStoredSession() {
  useAuthStore.getState().clearSession();
}
