import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_xp: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_date: string | null;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrCreateProfile = useCallback(async (user: User) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) {
      setProfile(data as Profile);
    } else {
      // Tudy 유저만 프로필 생성 (트리거 제거됨)
      const { data: created } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: user.user_metadata?.full_name || user.email || '',
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        .select()
        .single();
      if (created) setProfile(created as Profile);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchOrCreateProfile(user);
  }, [user, fetchOrCreateProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase!.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchOrCreateProfile(s.user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase!.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          fetchOrCreateProfile(s.user);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchOrCreateProfile]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    const redirectUrl = window.location.origin + '/Tudy/';
    localStorage.setItem('auth_return_to', window.location.href);
    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });
    if (data?.url) {
      // debug: Supabase가 보내는 실제 URL 확인
      console.log('[Auth] redirectTo:', redirectUrl);
      console.log('[Auth] Full auth URL:', data.url);
      window.location.href = data.url;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, signInWithGoogle, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
