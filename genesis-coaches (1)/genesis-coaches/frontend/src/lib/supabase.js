import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — add them to frontend/.env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

let baseApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
if (baseApiUrl && !baseApiUrl.endsWith('/api') && !baseApiUrl.endsWith('/api/')) {
  baseApiUrl = baseApiUrl.replace(/\/$/, '') + '/api';
}
export const API_URL = baseApiUrl;

/** Downloads a protected binary endpoint (e.g. the PDF ticket) using the current session token. */
export async function apiDownload(path, filename) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API_URL}${path}`, {
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Download failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Fetch wrapper that attaches the current Supabase session's access token.
 * Pass `accessToken` directly to avoid a race condition where getSession()
 * hasn't persisted the new session yet (e.g. inside onAuthStateChange).
 */
export async function apiFetch(path, options = {}, accessToken = null) {
  let token = accessToken;
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token ?? null;
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Request failed');
  return body;
}
