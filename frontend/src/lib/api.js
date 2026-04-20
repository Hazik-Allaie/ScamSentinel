import { auth } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

async function fetchWithAuth(endpoint, options = {}) {
  let token = null;
  if (auth.currentUser) {
    token = await auth.currentUser.getIdToken();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  scan: (data) => fetchWithAuth('/api/v1/scan', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  intercept: (data) => fetchWithAuth('/api/v1/intercept', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  feed: (params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', params.limit);
    if (params.threat_type) query.set('threat_type', params.threat_type);
    if (params.region) query.set('region', params.region);
    return fetchWithAuth(`/api/v1/feed?${query.toString()}`);
  },
  report: (data) => fetchWithAuth('/api/v1/report', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  health: () => fetchWithAuth('/api/v1/health'),
};
