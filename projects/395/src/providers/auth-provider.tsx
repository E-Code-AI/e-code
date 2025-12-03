"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  ReactNode,
} from "react";
import {
  SessionProvider as NextAuthSessionProvider,
  useSession as useNextAuthSession,
} from "next-auth/react";
import type { Session } from "next-auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  session: Session | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  initialSession?: Session | null;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  initialSession,
}) => {
  return (
    <NextAuthSessionProvider session={initialSession}>
      <AuthContextInner>{children}</AuthContextInner>
    </NextAuthSessionProvider>
  );
};

const AuthContextInner: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: session, status } = useNextAuthSession();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const value: AuthContextValue = useMemo(() => {
    const isAuthenticated = status === "authenticated" && !!session;
    const isLoading = status === "loading" || !hydrated;

    return {
      session: session ?? null,
      status: isLoading ? "loading" : isAuthenticated ? "authenticated" : "unauthenticated",
      isAuthenticated,
      isLoading,
    };
  }, [session, status, hydrated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};