import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Create a detailed log for debugging authentication issues
  console.log(`Making ${method} request to ${url} with credentials included`);
  
  // Log cookies before the request
  console.log("Available browser cookies:", document.cookie);
  
  // Use consistent headers across all requests
  const headers: Record<string, string> = {
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "X-Requested-With": "XMLHttpRequest",
    "Accept": "application/json"
  };
  
  // Add content type for requests with body
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // This ensures cookies are sent with the request
    cache: "no-store"
  });

  // Log the response status
  console.log(`Response from ${url}: status ${res.status}`);
  
  if (!res.ok) {
    console.error(`Error response from ${url}:`, res.status, res.statusText);
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    console.log(`Making query request to ${url} with credentials included`);
    
    // Try to log document.cookie to debug what cookies are available
    console.log("Available browser cookies:", document.cookie);
    
    // Use consistent headers across all requests
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json"
      },
      // Add a random parameter to avoid caching issues
      cache: "no-store"
    });

    console.log(`Response from ${url}: status ${res.status}`);
    
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log(`Auth required for ${url} but returning null as configured`);
      return null;
    }

    if (!res.ok) {
      console.error(`Error response from ${url}:`, res.status, res.statusText);
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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
