'use client';
// Who is signed in, and as what. One listener for the whole site, so the header and every page agree.
// This only decides what to show: row-level security in the database decides what anyone can read or change.
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

export const isStaffRole = (role) => role === 'worker' || role === 'admin';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [profile, setProfile] = useState(null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      // Opening a password reset link signs you in with a one-time "recovery" session.
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    setProfile(null);
    if (!userId) return;
    let live = true;
    supabase.from('profiles').select('role, full_name, phone').eq('id', userId).single()
      .then(({ data }) => { if (live) setProfile(data || { role: 'customer' }); });
    return () => { live = false; };
  }, [userId]);

  const role = profile?.role;
  const value = {
    session,
    user: session?.user || null,
    profile,
    role,
    isStaff: isStaffRole(role),
    isAdmin: role === 'admin',
    // ready: we know whether someone is signed in and, if so, their role
    ready: session !== undefined && (!session || profile !== null),
    recovering,
    doneRecovering: () => setRecovering(false),
    signOut: () => supabase.auth.signOut(),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
