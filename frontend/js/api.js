/**
 * CivicVoice AI — API Layer
 * Communicates with the Vercel Serverless / Spring Boot backend.
 * Automatically attaches Admin Firebase Auth Token for protected operations.
 */

const API_BASE = window.CIVIC_API_BASE || 'http://localhost:8080/api';

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Attach Firebase Authorization token if logged in
  if (window.CivicAuth && CivicAuth.idToken) {
    headers['Authorization'] = `Bearer ${CivicAuth.idToken}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  let data;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.fields = data?.fields || null;
    throw err;
  }

  return data;
}

window.CivicAPI = {
  health:           ()         => apiFetch('/health'),
  getComplaints:    ()         => apiFetch('/complaints'),
  getComplaint:     (id)       => apiFetch(`/complaints/${id}`),
  createComplaint:  (body)     => apiFetch('/complaints', { method: 'POST', body: JSON.stringify(body) }),
  updateStatus:     (id, status) => apiFetch(`/complaints/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getDashboardStats: ()        => apiFetch('/dashboard/stats'),
};
