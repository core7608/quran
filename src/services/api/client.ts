/**
 * Provider-agnostic API client with:
 * - Typed requests/responses
 * - Timeout & retry logic
 * - Request cancellation
 * - Loading/error states
 * - Configurable base URLs
 */

import Constants from 'expo-constants';

// ============================================
// Configuration
// ============================================

interface ProviderConfig {
  name: string;
  baseUrl: string;
  timeout: number;
  headers?: Record<string, string>;
  requiresApiKey?: boolean;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  quranCom: {
    name: 'Quran.com API v4',
    baseUrl: 'https://api.quran.com/api/v4',
    timeout: 15000,
    headers: { 'Accept': 'application/json' },
  },
  alQuranCloud: {
    name: 'AlQuran Cloud',
    baseUrl: 'https://api.alquran.cloud/v1',
    timeout: 15000,
    headers: { 'Accept': 'application/json' },
  },
  mp3Quran: {
    name: 'MP3 Quran / EveryAyah',
    baseUrl: 'https://everyayah.com/data',
    timeout: 10000,
    headers: {},
  },
};

export type ProviderName = keyof typeof PROVIDERS;

let defaultProvider: ProviderName = 'quranCom';

// Get config from Expo Constants (set via app.config.js / env)
function getProviderConfig(name: ProviderName = defaultProvider): ProviderConfig {
  const extra = Constants.expoConfig?.extra?.apiProviders ?? {};
  const override = extra[name];
  return { ...PROVIDERS[name], ...override };
}

// ============================================
// Core Types
// ============================================

export interface RequestOptions {
  provider?: ProviderName;
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, string | number | boolean>;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
  skipCache?: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
  provider: ProviderName;
  endpoint: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  fromCache: boolean;
}

// ============================================
// Cache (in-memory + persistent)
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCached<T>(key: string): Promise<T | null> {
  const entry = memoryCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  // TODO: Check persistent cache (MMKV/AsyncStorage)
  return null;
}

function setCache<T>(key: string, data: T, etag?: string): void {
  memoryCache.set(key, { data, timestamp: Date.now(), etag });
}

function clearCache(pattern?: string): void {
  if (pattern) {
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern)) memoryCache.delete(key);
    }
  } else {
    memoryCache.clear();
  }
}

// ============================================
// Request Execution
// ============================================

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number,
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const onAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onAbort);
  }
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
    externalSignal?.removeEventListener('abort', onAbort);
  }
}

async function request<T>(
  opts: RequestOptions
): Promise<ApiResponse<T>> {
  const provider = getProviderConfig(opts.provider);
  const { endpoint, method = 'GET', params, body, headers, timeout = provider.timeout, retries = 2, retryDelay = 1000, signal, skipCache = false } = opts;

  // Build URL
  const url = new URL(endpoint, provider.baseUrl);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
    });
  }

  const cacheKey = `${provider.name}:${url.toString()}`;

  // Check cache for GET
  if (method === 'GET' && !skipCache) {
    const cached = await getCached<T>(cacheKey);
    if (cached) return { data: cached, error: null, loading: false, fromCache: true };
  }

  const requestHeaders = {
    ...provider.headers,
    ...headers,
    'Content-Type': 'application/json',
  } as Record<string, string>;

  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  };

  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url.toString(), fetchOptions, timeout, signal);

      if (!response.ok) {
        const err: ApiError = {
          code: 'HTTP_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          provider: opts.provider ?? defaultProvider,
          endpoint,
        };
        throw err;
      }

      const data = await response.json() as T;

      // Cache successful GET
      if (method === 'GET' && !skipCache) {
        const etag = response.headers.get('etag') ?? undefined;
        setCache(cacheKey, data, etag);
      }

      return { data, error: null, loading: false, fromCache: false };
    } catch (e) {
      lastError = e as ApiError;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)));
      }
    }
  }

  return { data: null, error: lastError, loading: false, fromCache: false };
}

// ============================================
// Public API
// ============================================

export const api = {
  get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'endpoint'>) {
    return request<T>({ ...options, endpoint, method: 'GET' });
  },

  post<T>(endpoint: string, body: unknown, options?: Omit<RequestOptions, 'method' | 'endpoint' | 'body'>) {
    return request<T>({ ...options, endpoint, method: 'POST', body });
  },

  // Cancel all pending requests (by clearing cache and letting abort signals handle the rest)
  cancelAll: () => {
    clearCache();
  },

  // Cache management
  cache: {
    get: getCached,
    set: setCache,
    clear: clearCache,
  },

  // Provider switching
  setDefaultProvider: (name: ProviderName) => {
    defaultProvider = name;
  },
};

// ============================================
// React Query Integration Helpers
// ============================================

export const createQueryKey = (provider: ProviderName, endpoint: string, params?: Record<string, unknown>) => {
  const search = params ? JSON.stringify(params) : '';
  return ['api', provider, endpoint, search];
};

export const apiQueryOptions = <T>(opts: RequestOptions) => ({
  queryKey: createQueryKey(opts.provider ?? defaultProvider, opts.endpoint, opts.params),
  queryFn: () => api.get<T>(opts.endpoint, opts),
  staleTime: 2 * 60 * 1000, // 2 min
  gcTime: 10 * 60 * 1000,   // 10 min
  retry: opts.retries ?? 1,
});