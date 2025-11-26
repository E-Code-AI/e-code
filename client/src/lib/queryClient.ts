import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { handleUnauthorized } from "./auth-redirect";

interface HttpError extends Error {
  status: number;
}

async function throwIfResNotOk(res: Response, url?: string): Promise<void> {
  if (!res.ok) {
    // Handle 401 specially - redirect to login
    if (res.status === 401) {
      handleUnauthorized(url);
      // Create error with status for downstream handling
      const error = new Error('Unauthorized') as HttpError;
      error.status = 401;
      throw error;
    }
    
    const text = (await res.text()) || res.statusText;
    const error = new Error(`${res.status}: ${text}`) as HttpError;
    error.status = res.status;
    throw error;
  }
}

let csrfToken: string | null = null;

// Function to fetch CSRF token from server
async function fetchCSRFToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include',
      method: 'GET'
    });
    if (response.ok) {
      const data = await response.json();
      return data.csrfToken;
    }
    // Also check if token is in header
    const headerToken = response.headers.get('X-CSRF-Token');
    if (headerToken) {
      return headerToken;
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
  return null;
}

/**
 * Type-safe API request helper with automatic CSRF token handling
 * @template T - Expected response type (use 'void' for 204 No Content)
 * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param url - API endpoint URL
 * @param body - Request body (JSON object or FormData)
 * @param options - Additional fetch options
 * @returns Parsed JSON response of type T, or void for 204 responses
 * 
 * @example
 * // With type safety
 * const project = await apiRequest<Project>('POST', '/api/projects', { name: 'My Project' });
 * 
 * // For 204 No Content responses
 * await apiRequest<void>('DELETE', `/api/projects/${id}`);
 * 
 * // FormData uploads
 * const formData = new FormData();
 * formData.append('file', file);
 * await apiRequest<UploadResult>('POST', '/api/upload', formData);
 */
export async function apiRequest<T = any>(
  method: string,
  url: string,
  body?: any,
  options?: RequestInit,
): Promise<T> {
  // For state-changing methods, ensure we have a CSRF token
  const needsCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  
  if (needsCsrf && !csrfToken) {
    csrfToken = await fetchCSRFToken();
  }
  
  // Detect if body is FormData or other non-JSON type
  const isFormData = body instanceof FormData;
  
  const headers: HeadersInit = {
    // Only set Content-Type for JSON bodies, let browser set it for FormData
    ...(body && !isFormData && { "Content-Type": "application/json" }),
    ...(needsCsrf && csrfToken && { "X-CSRF-Token": csrfToken }),
    ...options?.headers,
  };

  const res = await fetch(url, {
    method,
    credentials: "include",
    headers,
    // Only JSON.stringify non-FormData bodies
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    ...options,
  });

  // Update CSRF token from response header if present
  const newToken = res.headers.get('X-CSRF-Token');
  if (newToken) {
    csrfToken = newToken;
  }

  // Throw if response not ok (following TanStack Query pattern)
  await throwIfResNotOk(res, url);
  
  // Handle responses that should not have a body (204, 205, 304)
  // 204 No Content, 205 Reset Content, 304 Not Modified
  if (res.status === 204 || res.status === 205 || res.status === 304) {
    return undefined as T;
  }
  
  // Read the response text once to avoid multiple consumptions
  const text = await res.text();
  
  // If response is truly empty, return undefined
  if (!text || text.length === 0) {
    return undefined as T;
  }
  
  // Check if response has JSON content type
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    // Parse JSON only if we have JSON content type
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      // If JSON parsing fails despite Content-Type header, throw
      throw new Error(`Failed to parse JSON response: ${error}`);
    }
  }
  
  // For non-JSON responses, return the text as-is
  // This respects the type contract: if caller expects string, they get string
  return text as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const res = await fetch(url, {
      credentials: "include",
    });

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        // Silently return null for expected auth checks
        return null;
      }
      // Trigger redirect for unexpected 401s
      handleUnauthorized(url);
      const error = new Error('Unauthorized') as HttpError;
      error.status = 401;
      throw error;
    }

    await throwIfResNotOk(res, url);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }), // Graceful 401 handling - return null for unauth
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - data kept in cache (renamed from cacheTime in v5)
      retry: (failureCount, error: any) => {
        // Don't retry on 401 Unauthorized - redirect already triggered
        if (error?.status === 401 || error?.message?.includes('401')) return false;
        // Only retry on network errors, not on other 4xx errors
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 3; // Retry up to 3 times with exponential backoff
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry on 401 Unauthorized
        if (error?.status === 401 || error?.message?.includes('401')) return false;
        // Only retry on network errors, not on other 4xx errors
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error: any) => {
        // 401 errors trigger redirect in throwIfResNotOk, no console logging needed
        if (error?.status === 401 || error?.message?.includes('401')) {
          // Silent handling - redirect already triggered
          return;
        }
      }
    },
  },
});

// Prefetch helper function for predictable navigation patterns
export const prefetchQuery = async <T>(
  key: string | string[],
  queryFn?: () => Promise<T>
) => {
  return queryClient.prefetchQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: queryFn || undefined,
    staleTime: 5 * 60 * 1000,
  });
};

// Helper for optimistic updates
export const optimisticUpdate = <T>(
  queryKey: string | string[],
  updater: (oldData: T | undefined) => T
) => {
  const previousData = queryClient.getQueryData<T>(
    Array.isArray(queryKey) ? queryKey : [queryKey]
  );
  
  queryClient.setQueryData<T>(
    Array.isArray(queryKey) ? queryKey : [queryKey],
    updater
  );
  
  return { previousData, queryKey };
};

// Helper to rollback optimistic updates
export const rollbackOptimisticUpdate = <T>(
  { previousData, queryKey }: { previousData: T | undefined; queryKey: string | string[] }
) => {
  queryClient.setQueryData(
    Array.isArray(queryKey) ? queryKey : [queryKey],
    previousData
  );
};
