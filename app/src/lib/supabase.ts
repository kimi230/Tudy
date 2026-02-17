import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\s+/g, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').replace(/\s+/g, '');

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // HashRouter가 # 사용하므로 Supabase 자동 해시 감지 비활성화.
        // handleOAuthHashIfPresent()에서 직접 처리.
        detectSessionInUrl: false,
      },
    })
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

  // 해시를 먼저 정리 (HashRouter가 읽기 전에)
  window.history.replaceState(null, '', window.location.pathname + '#/');

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    console.error('OAuth session setup failed:', error);
  }
}
