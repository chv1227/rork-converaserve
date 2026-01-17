import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

const FETCH_TIMEOUT = 30000;
const MAX_RETRIES = 2;

export const trpc = createTRPCReact<AppRouter>();

let currentToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  currentToken = token;
};

export const getAuthToken = () => currentToken;

const getApiUrl = (): string => {
  const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (baseUrl) {
    let cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    if (cleanBase.endsWith('/api/trpc')) {
      cleanBase = cleanBase.slice(0, -9);
    } else if (cleanBase.endsWith('/trpc')) {
      cleanBase = cleanBase.slice(0, -5);
    } else if (cleanBase.endsWith('/api')) {
      cleanBase = cleanBase.slice(0, -4);
    }
    return `${cleanBase}/api/trpc`;
  }
  return "/api/trpc";
};

let cachedApiUrl: string | null = null;

const getApiUrlCached = (): string => {
  if (!cachedApiUrl) {
    cachedApiUrl = getApiUrl();
  }
  return cachedApiUrl;
};

const fetchWithTimeout = async (
  url: RequestInfo | URL, 
  options?: RequestInit, 
  timeout = FETCH_TIMEOUT
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    const err = error as Error;
    if (err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const fetchWithRetry = async (
  url: RequestInfo | URL, 
  options?: RequestInit, 
  retries = MAX_RETRIES
): Promise<Response> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      
      if (!response.ok && response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message || "Unknown error";
      const isRetryable = errorMessage.includes("Failed to fetch") || 
                          errorMessage.includes("Network") ||
                          errorMessage.includes("Server error") ||
                          errorMessage.includes("timed out") ||
                          errorMessage.includes("ECONNREFUSED") ||
                          errorMessage.includes("ERR_CONNECTION");
      
      if (attempt < retries && isRetryable) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error("Request failed after retries");
};

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: getApiUrlCached(),
      transformer: superjson,
      headers: () => {
        const token = currentToken;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        return headers;
      },
      fetch: fetchWithRetry,
    }),
  ],
});

export function isTRPCError(error: unknown): error is TRPCClientError<AppRouter> {
  return error instanceof TRPCClientError;
}

export function getTRPCErrorMessage(error: unknown): string {
  if (isTRPCError(error)) {
    const message = error.message;
    if (message.includes("UNAUTHORIZED")) {
      return "Please sign in to continue.";
    }
    if (message.includes("Failed to fetch") || message.includes("Network")) {
      return "Unable to connect to server. Please check your internet connection.";
    }
    return message;
  }
  if (error instanceof Error) {
    const message = error.message;
    if (message.includes("Failed to fetch") || message.includes("Network") || message.includes("ERR_CONNECTION")) {
      return "Unable to connect to server. Please check your internet connection.";
    }
    if (message.includes("timed out")) {
      return "Request timed out. Please try again.";
    }
    if (message.includes("ECONNREFUSED")) {
      return "Server is not available. Please try again later.";
    }
    return message;
  }
  return "An unexpected error occurred. Please try again.";
}

export function clearApiUrlCache(): void {
  cachedApiUrl = null;
}
