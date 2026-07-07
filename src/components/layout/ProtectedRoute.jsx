import { Navigate } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';

// Guards a role-scoped route. There's no real auth in this mock-data phase —
// this just keeps navigation consistent with the selected demo role so you
// can't land on e.g. /center without having picked "Center Coordinator" first.
export default function ProtectedRoute({ allow, children }) {
  const { role } = useRole();
  if (!role || !allow.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
