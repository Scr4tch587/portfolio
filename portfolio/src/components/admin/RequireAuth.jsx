import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RequireAuth({ children }) {
  const { user, isAdmin, authReady } = useAuth();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#090909] text-white flex items-center justify-center">
        <p className="text-sm text-gray-400">Checking admin session...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dev" replace />;
  }

  return children;
}
