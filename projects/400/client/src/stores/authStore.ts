import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  [key: string]: unknown;
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (params: { token: string; user: AuthUser }) => void;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  setError: (error: string | null) => void;
  hydrateFromStorage: () => void;
}

const STORAGE_KEY = "auth";

const getInitialState = (): Omit<
  AuthState,
  "login" | "logout" | "setUser" | "setToken" | "setError" | "hydrateFromStorage"
> => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...getInitialState(),

      login: ({ token, user }) => {
        set({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      logout: () => {
        set({
          ...getInitialState(),
        });
      },

      setUser: (user) => {
        set((state) => ({
          ...state,
          user,
          isAuthenticated: !!user && !!state.token,
        }));
      },

      setToken: (token) => {
        set((state) => ({
          ...state,
          token,
          isAuthenticated: !!token && !!state.user,
        }));
      },

      setError: (error) => {
        set((state) => ({
          ...state,
          error,
        }));
      },

      hydrateFromStorage: () => {
        const state = get();
        if (state.token && state.user && !state.isAuthenticated) {
          set({
            ...state,
            isAuthenticated: true,
          });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const hasToken = !!state.token;
        const hasUser = !!state.user;
        state.isAuthenticated = hasToken && hasUser;
        state.isLoading = false;
        state.error = null;
      },
    }
  )
);

export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectAuthToken = (state: AuthState) => state.token;
export const selectAuthUser = (state: AuthState) => state.user;
export const selectAuthError = (state: AuthState) => state.error;
export const selectAuthLoading = (state: AuthState) => state.isLoading;