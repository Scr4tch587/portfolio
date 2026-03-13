import { onAuthStateChanged, signOut } from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';
import { loginWithPassphrase } from '../lib/adminAuth';

const AdminContext = createContext({
  authed: false,
  isAdmin: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AdminProvider({ children }) {
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthed(false);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const token = await user.getIdTokenResult(true);
        const hasAdminClaim = token?.claims?.admin === true;
        setAuthed(true);
        setIsAdmin(hasAdminClaim);
      } catch {
        setAuthed(false);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      authed,
      isAdmin,
      loading,
      login: async (passphrase) => {
        await loginWithPassphrase(passphrase);
      },
      logout: async () => {
        await signOut(auth);
      },
    }),
    [authed, isAdmin, loading],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  return useContext(AdminContext);
}
