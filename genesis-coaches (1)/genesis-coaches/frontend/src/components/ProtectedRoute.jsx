import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Wrap any route that needs auth. Pass roles={['admin']} to also restrict by role. */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, role, loading, mustChangePassword } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-midnight">
        <div className="route-line w-40"><span className="route-line-marker animate-drive" /></div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (roles && !roles.includes(role)) return <Navigate to="/" replace />;

  return children;
}
