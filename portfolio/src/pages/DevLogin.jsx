import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleMark = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export default function DevLogin() {
  const navigate = useNavigate();
  const { user, isAdmin, authReady, signInWithGoogle, signOutUser } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authReady && user && isAdmin) {
      navigate('/dev/admin', { replace: true });
    }
  }, [authReady, user, isAdmin, navigate]);

  const handleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (signInError) {
      const code = String(signInError?.code || '');
      if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
        // User dismissed the popup — not an error worth surfacing.
      } else if (code.includes('popup-blocked')) {
        setError('Popup blocked. Allow popups for this site and try again.');
      } else {
        setError('Google sign-in failed. Try again in a moment.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signedInWithoutAccess = authReady && user && !isAdmin;

  return (
    <div className="min-h-screen bg-[#090909] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-2xl">
        <h1 className="text-xl font-bold">Developer Login</h1>
        <p className="mt-2 text-sm text-gray-400">
          Sign in with the developer Google account to access the admin panel.
        </p>

        {signedInWithoutAccess ? (
          <div className="mt-5">
            <p className="text-sm text-red-400">
              {user.email || 'This account'} does not have developer access.
            </p>
            <button
              type="button"
              onClick={signOutUser}
              className="mt-4 w-full rounded-md border border-white/25 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSignIn}
            disabled={loading || !authReady}
            className="mt-5 w-full rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform disabled:bg-gray-500"
          >
            <GoogleMark />
            {loading ? 'Waiting for Google...' : 'Sign in with Google'}
          </button>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
