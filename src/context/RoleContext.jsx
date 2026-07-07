import { createContext, useContext, useMemo, useState } from 'react';
import { ROLES } from '../constants/roles';

const RoleContext = createContext(null);

// Re-exported so existing `import { useRole, ROLES } from '../context/RoleContext'`
// call sites don't need to change — the canonical definition now lives in
// src/constants/roles.js so the data layer (src/data/api.js) can use the
// same role strings without importing from the context/UI layer.
export { ROLES };

const STORAGE_KEY = 'mia-role-session';

function readStoredSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function RoleProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());

  const setRoleAndActor = (role, actor) => {
    const next = { role, actor };
    setSession(next);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const clearRole = () => {
    setSession(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      role: session?.role ?? null,
      actor: session?.actor ?? null,
      setRoleAndActor,
      clearRole,
    }),
    [session],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
