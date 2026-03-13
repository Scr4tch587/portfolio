import { Navigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';

export default function RequireAuth({ children }) {
  const { authed, isAdmin, loading } = useAdmin();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090909] text-white flex items-center justify-center">
        <p className="text-sm text-gray-400">Checking admin session...</p>
      </div>
    );
  }

  if (!authed || !isAdmin) {
    return <Navigate to="/dev" replace />;
  }

  return children;
}
