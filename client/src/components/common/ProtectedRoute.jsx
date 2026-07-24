import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { ROLES } from '../../constants/roles.js';

export function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const redirect = user?.role === ROLES.ADMIN ? '/admin' : '/instructor';
    return <Navigate to={redirect} replace />;
  }

  return <Outlet />;
}
