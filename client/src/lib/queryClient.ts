import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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

export async function apiRequest(
  method: string,
  url: string,
  body?: any,
  options?: RequestInit,
): Promise<Response> {
  // For state-changing methods, ensure we have a CSRF token
  const needsCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  
  if (needsCsrf && !csrfToken) {
    csrfToken = await fetchCSRFToken();
  }
  
  const headers: HeadersInit = {
    ...(body && { "Content-Type": "application/json" }),
    ...(needsCsrf && csrfToken && { "X-CSRF-Token": csrfToken }),
    ...options?.headers,
  };

  const res = await fetch(url, {
    method,
    credentials: "include",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

  // Update CSRF token from response header if present
  const newToken = res.headers.get('X-CSRF-Token');
  if (newToken) {
    csrfToken = newToken;
  }

  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      cacheTime: 10 * 60 * 1000, // 10 minutes - data kept in cache
      retry: (failureCount, error: any) => {
        // Only retry on network errors, not on 4xx errors
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 3; // Retry up to 3 times with exponential backoff
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Only retry on network errors, not on 4xx errors
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 3; // Retry up to 3 times with exponential backoff
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
