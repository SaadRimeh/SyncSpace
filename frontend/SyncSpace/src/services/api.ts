import { Platform } from 'react-native';

// Default backend API URL based on platform
const DEFAULT_API_URL = Platform.select({
  android: 'http://10.85.246.241:5000/api',
  ios: 'http://localhost:5000/api',
  web: 'http://localhost:5000/api',
  default: 'http://localhost:5000/api',
});

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

export const request = async <T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: any,
  options: RequestOptions = {}
): Promise<{ status: number; data: T; error?: string; message?: string }> => {
  let url = `${DEFAULT_API_URL}${endpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.warn(`[SyncSpace API] Request error for ${method} ${endpoint}:`, err.message);
    return {
      status: 500,
      data: null as any,
      error: 'Network Error',
      message: err.message || 'Failed to connect to backend server.',
    };
  }
};

export const api = {
  // Auth
  register: (payload: any) => request('/auth/register', 'POST', payload),
  login: (payload: any) => request('/auth/login', 'POST', payload),
  getMe: () => request('/auth/me', 'GET'),
  logout: () => request('/auth/logout', 'POST'),

  // Daily Canvas
  getCanvas: (date?: string, forceRefresh = false) =>
    request('/canvas/today', 'GET', undefined, { params: { date, force_refresh: forceRefresh } }),

  // Synapse Notes
  getSynapses: (params?: any) => request('/synapses', 'GET', undefined, { params }),
  createSynapse: (payload: any) => request('/synapses', 'POST', payload),
  updateSynapse: (id: string, payload: any) => request(`/synapses/${id}`, 'PATCH', payload),
  deleteSynapse: (id: string) => request(`/synapses/${id}`, 'DELETE'),
  convertSynapse: (id: string, payload: any) => request(`/synapses/${id}/convert`, 'POST', payload),
  getTags: () => request('/synapses/tags', 'GET'),

  // Task Engine
  getTasks: (params?: any) => request('/tasks', 'GET', undefined, { params }),
  createTask: (payload: any) => request('/tasks', 'POST', payload),
  updateTask: (id: string, payload: any) => request(`/tasks/${id}`, 'PATCH', payload),
  deleteTask: (id: string) => request(`/tasks/${id}`, 'DELETE'),
  getTaskSummary: () => request('/tasks/stats/summary', 'GET'),

  // Habit Matrix
  getHabits: (date?: string) => request('/habits', 'GET', undefined, { params: { date } }),
  createHabit: (payload: any) => request('/habits', 'POST', payload),
  updateHabit: (id: string, payload: any) => request(`/habits/${id}`, 'PATCH', payload),
  deleteHabit: (id: string) => request(`/habits/${id}`, 'DELETE'),
  toggleHabit: (id: string, payload?: any) => request(`/habits/${id}/toggle`, 'POST', payload),
  getHeatmap: (id: string, params?: any) => request(`/habits/${id}/heatmap`, 'GET', undefined, { params }),

  // Nano-Ledger
  getCategories: (month?: string) => request('/categories', 'GET', undefined, { params: { month } }),
  createCategory: (payload: any) => request('/categories', 'POST', payload),
  deleteCategory: (id: string) => request(`/categories/${id}`, 'DELETE'),
  getTransactions: (params?: any) => request('/transactions', 'GET', undefined, { params }),
  createTransaction: (payload: any) => request('/transactions', 'POST', payload),
  deleteTransaction: (id: string) => request(`/transactions/${id}`, 'DELETE'),
  getMonthlyLedgerSummary: (month?: string) =>
    request('/transactions/stats/monthly', 'GET', undefined, { params: { month } }),
};
