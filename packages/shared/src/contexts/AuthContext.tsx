import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, GoogleAuthProvider, type User as FirebaseUser } from 'firebase/auth';
import { firebaseAuth, googleProvider, isFirebaseConfigured } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { firebaseUidToUuid } from '../lib/authBridge';

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
  user: { id: string; email?: string | null; user_metadata?: { full_name?: string; avatar_url?: string } } | null;
  profile: Profile | null;
  session: null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

function firebaseUserToAppUser(fbUser: FirebaseUser): NonNullable<AuthContextType['user']> {
  const uuid = firebaseUidToUuid(fbUser.uid);
  return {
    id: uuid,
    email: fbUser.email,
    user_metadata: {
      full_name: fbUser.displayName ?? undefined,
      avatar_url: fbUser.photoURL ?? undefined,
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrCreateProfile = useCallback(async (appUser: NonNullable<AuthContextType['user']>) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', appUser.id)
      .single();
    if (data) {
      setProfile(data as Profile);
    } else {
      const { data: created } = await supabase
        .from('profiles')
        .upsert({
          id: appUser.id,
          display_name: appUser.user_metadata?.full_name || appUser.email || '',
          avatar_url: appUser.user_metadata?.avatar_url || null,
        })
        .select()
        .single();
      if (created) setProfile(created as Profile);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchOrCreateProfile(user);
  }, [user, fetchOrCreateProfile]);

  const signInWithGoogle = useCallback(async () => {
    if (!firebaseAuth) return;
    await signInWithPopup(firebaseAuth, googleProvider);
    // onAuthStateChanged will handle the rest
  }, []);

  const signOut = useCallback(async () => {
    if (firebaseAuth) {
      await firebaseSignOut(firebaseAuth).catch(() => {});
    }
    setUser(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth!, (fbUser) => {
      if (fbUser) {
        const appUser = firebaseUserToAppUser(fbUser);
        setUser(appUser);
        fetchOrCreateProfile(appUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchOrCreateProfile]);

  return (
    <AuthContext.Provider
      value={{ user, profile, session: null, loading, signInWithGoogle, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
