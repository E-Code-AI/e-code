
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = {
  email: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 2,
    retryDelay: 500,
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Login failed');
      }
      return await res.json();
    },
    onSuccess: async (user: SelectUser) => {
      queryClient.setQueryData(["/api/me"], user);
      // Invalidate and refetch all queries that depend on authentication
      await queryClient.invalidateQueries();
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
      // If user is admin, redirect to admin page, otherwise dashboard
      if (user.isAdmin) {
        window.location.href = '/admin/chatgpt';
      } else {
        window.location.href = '/dashboard';
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Registration failed');
      }
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/me"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('Attempting logout...');
      const res = await apiRequest("POST", "/api/logout");
      console.log('Logout response:', res.status, res.ok);
      if (!res.ok) {
        const text = await res.text();
        console.error('Logout failed:', text);
        throw new Error(text || 'Logout failed');
      }
      return;
    },
    onSuccess: () => {
      console.log('Logout successful, clearing cache...');
      // Clear all cached data
      queryClient.clear();
      // Set user to null
      queryClient.setQueryData(["/api/me"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      // Navigate to login page after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    },
    onError: (error: Error) => {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
