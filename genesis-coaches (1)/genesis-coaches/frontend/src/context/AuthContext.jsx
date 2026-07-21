import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, apiFetch } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (accessToken = null) => {
    try {
      const { profile } = await apiFetch('/auth/me', {}, accessToken);
      setProfile(profile);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.access_token);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) await loadProfile(newSession.access_token);
      else setProfile(null);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // Real-time synchronization: listen for admin changes to the logged-in staff's profile
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    // 1. Supabase Realtime channel for instant push updates
    const channel = supabase
      .channel(`profile-sync-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        async (payload) => {
          if (payload.eventType === 'DELETE' || (payload.new && payload.new.is_active === false)) {
            await signOut();
            return;
          }
          await loadProfile(session?.access_token);
        }
      )
      .subscribe();

    // 2. Window focus listener: re-fetch when returning to the tab
    const onFocus = () => loadProfile(session?.access_token);
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, [session?.user?.id, session?.access_token, loadProfile]);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await loadProfile();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const value = {
    session,
    profile,
    loading,
    isAuthenticated: !!session,
    role: profile?.role,
    mustChangePassword: !!profile?.must_change_password,
    signIn,
    signOut,
    refreshProfile: loadProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
