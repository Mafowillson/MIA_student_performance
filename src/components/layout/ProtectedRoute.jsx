import { Navigate } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import Loading from '../Loading';

// Guards a role-scoped platform route — redirects to the login screen if
// you're not signed in, or signed in as a role that doesn't hold this route
// (e.g. a Mentor hitting /center directly). This is a UX convenience, not a
// security boundary; see README "Authentication" for the real-auth plan.
export default function ProtectedRoute({ allow, children }) {
  const { role, loading } = useRole();
  // While RoleProvider is still restoring the Supabase session on first
  // load/refresh, `role` is momentarily null even for a signed-in user —
  // wait for that to settle instead of bouncing straight to /login.
  if (loading) return <Loading />;
  if (!role || !allow.includes(role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
