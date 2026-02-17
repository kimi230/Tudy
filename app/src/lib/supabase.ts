import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

/**
 * HashRouter와 Supabase OAuth 해시 충돌 해결.
 * #access_token=... 형태의 OAuth 콜백을 감지하여 세션 설정 후 해시 정리.
 * React 마운트 전에 호출해야 함.
 */
export async function handleOAuthHashIfPresent(): Promise<void> {
  if (!supabase) return;

  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token=')) return;

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) return;

  await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

  // 해시를 정리하여 HashRouter가 정상 작동하도록
  window.history.replaceState(null, '', window.location.pathname + '#/');
}
