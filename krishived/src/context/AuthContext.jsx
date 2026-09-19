import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isDemoMode } from '../lib/supabaseClient';
import { getFarmerProfile } from '../lib/api';
import { mockFarmer } from '../mock/data';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(isDemoMode ? { id: 'demo-user', email: 'demo.farmer@krishived.ai' } : null);
  const [farmer, setFarmer] = useState(isDemoMode ? mockFarmer : null);
  const [loading, setLoading] = useState(!isDemoMode);

  useEffect(() => {
    if (isDemoMode) return;

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || isDemoMode) return;
    getFarmerProfile(user.id)
      .then(setFarmer)
      .catch(() => setFarmer(null));
  }, [user]);

  async function signInWithPassword(email, password) {
    if (isDemoMode) {
      setUser({ id: 'demo-user', email });
      return { data: { user: { id: 'demo-user', email } }, error: null };
    }
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signUpWithPassword(email, password) {
    if (isDemoMode) {
      setUser({ id: 'demo-user', email });
      return { data: { user: { id: 'demo-user', email } }, error: null };
    }
    return supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
  }

  async function signInWithGoogle() {
    if (isDemoMode) {
      setUser({ id: 'demo-google-user', email: 'farmer.google@krishived.ai' });
      return { error: null };
    }
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  }

  async function sendMagicLink(email) {
    if (isDemoMode) {
      return { error: null };
    }
    return supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
  }

  async function signOut() {
    if (isDemoMode) {
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        farmer,
        setFarmer,
        loading,
        signInWithPassword,
        signUpWithPassword,
        signInWithGoogle,
        sendMagicLink,
        signOut,
        isDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
