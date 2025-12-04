import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

const API_BASE_URL =
  (typeof window !== "undefined" &&
    (window as any).__API_BASE_URL__) ||
  process.env.REACT_APP_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:4000/api";

let authTokens: AuthTokens | null = null;

export const setAuthTokens = (tokens: AuthTokens | null): void => {
  authTokens = tokens;
};

export const getAuthTokens = (): AuthTokens | null => {
  return authTokens;
};

const createHttpClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  });

  instance.interceptors.request.use((config: AxiosRequestConfig) => {
    if (authTokens?.accessToken) {
      config.headers = config.headers || {};
      (config.headers as Record<string, string>)["Authorization"] = `Bearer undefined`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        authTokens?.refreshToken
      ) {
        originalRequest._retry = true;
        try {
          const refreshed = await refreshAccessToken(authTokens.refreshToken);
          authTokens = {
            ...authTokens,
            accessToken: refreshed.accessToken,
          };
          originalRequest.headers = originalRequest.headers || {};
          (originalRequest.headers as Record<string, string>)["Authorization"] = `Bearer undefined`;
          return instance(originalRequest);
        } catch (refreshError) {
          authTokens = null;
        }
      }

      return Promise.reject(normalizeApiError(error));
    }
  );

  return instance;
};

const httpClient = createHttpClient();

const normalizeApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    const status = axiosError.response?.status ?? 0;
    const message =
      (axiosError.response?.data as any)?.message ||
      axiosError.message ||
      "An unexpected error occurred";
    const details = axiosError.response?.data;
    return { status, message, details };
  }

  return {
    status: 0,
    message: error instanceof Error ? error.message : "An unexpected error occurred",
  };
};

export const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
  try {
    const response = await httpClient.post<AuthResponse>("/auth/register", payload);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  try {
    const response = await httpClient.post<AuthResponse>("/auth/login", payload);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const logout = async (): Promise<void> => {
  try {
    await httpClient.post("/auth/logout");
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const refreshAccessToken = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  try {
    const response = await httpClient.post<RefreshTokenResponse>("/auth/refresh", {
      refreshToken,
    });
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getCurrentUser = async (): Promise<AuthUser> => {
  try {
    const response = await httpClient.get<AuthUser>("/auth/me");
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const isAuthenticated = (): boolean => {
  return Boolean(authTokens?.accessToken);
};