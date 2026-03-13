import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

export default function DevLogin() {
  const navigate = useNavigate();
  const { authed, isAdmin, loading: authLoading, login } = useAdmin();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && authed && isAdmin) {
      navigate('/dev/admin', { replace: true });
    }
  }, [authLoading, authed, isAdmin, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!passphrase.trim()) {
      setError('Passphrase is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(passphrase);
      navigate('/dev/admin', { replace: true });
    } catch (loginError) {
      setPassphrase('');
      const code = loginError?.code || '';
      if (code.includes('resource-exhausted')) {
        setError('Too many attempts. Try again later.');
      } else if (code.includes('permission-denied') || code.includes('unauthenticated')) {
        setError('Invalid passphrase');
      } else if (code.includes('invalid-argument')) {
        setError('Passphrase format rejected by server.');
      } else if (code.includes('not-found') || code.includes('configuration-not-found')) {
        setError('Auth configuration incomplete. Verify Firebase Auth and Functions setup.');
      } else {
        setError('Auth service unavailable. Try again in a moment.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090909] text-white flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-2xl">
        <h1 className="text-xl font-bold">Developer Login</h1>
        <p className="mt-2 text-sm text-gray-400">Enter passphrase to access the admin panel.</p>

        <label className="mt-5 block text-sm text-gray-300" htmlFor="passphrase">Passphrase</label>
        <input
          id="passphrase"
          type="password"
          autoComplete="off"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          className="mt-2 w-full rounded-md border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-green-500"
        />

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-black disabled:bg-gray-500"
        >
          {loading ? 'Verifying...' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
