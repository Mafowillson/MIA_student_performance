import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ROLES } from '../constants/roles';
import { supabase } from '../data/supabaseClient';
import { getCurrentSession, logout as apiLogout } from '../data/api';

const RoleContext = createContext(null);

// Re-exported so existing `import { useRole, ROLES } from '../context/RoleContext'`
// call sites don't need to change — the canonical definition now lives in
// src/constants/roles.js so the data layer (src/data/api.js) can use the
// same role strings without importing from the context/UI layer.
export { ROLES };

export function RoleProvider({ children }) {
  const [session, setSession] = useState(null);
  // True only during the initial "is there already a Supabase session in
  // localStorage" check on mount/refresh — ProtectedRoute waits on this so a
  // signed-in user doesn't get bounced to /login for one render before the
  // restored session lands.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCurrentSession().then((restored) => {
      if (cancelled) return;
      setSession(restored);
      setLoading(false);
    });

    // Catches sign-out triggered elsewhere (another tab, an expired/revoked
    // token) so this tab's UI drops back to logged-out state too, not just
    // the tab that called logout().
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setSession(null);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const setRoleAndActor = (role, actor) => {
    setSession({ role, actor });
  };

  const clearRole = () => {
    apiLogout();
    setSession(null);
  };

  const value = useMemo(
    () => ({
      role: session?.role ?? null,
      actor: session?.actor ?? null,
      loading,
      setRoleAndActor,
      clearRole,
    }),
    [session, loading],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
