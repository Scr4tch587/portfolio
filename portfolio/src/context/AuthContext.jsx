import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';

const AuthContext = createContext({
  user: null,
  isAdmin: false,
  authReady: false,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
});

// Playwright signs in headlessly through these hooks (Google popups can't be
// automated); import.meta.env.DEV keeps them out of production builds.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__testSignInWithCustomToken = (token) => signInWithCustomToken(auth, token);
  window.__testSignInWithEmailPassword = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);
  window.__testSignOut = () => signOut(auth);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      try {
        // Force refresh so a claim granted server-side is visible on first sign-in.
        const token = await nextUser.getIdTokenResult(true);
        setIsAdmin(token?.claims?.admin === true);
      } catch {
        setIsAdmin(false);
      }
      setUser(nextUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAdmin,
      authReady,
      signInWithGoogle: async () => {
        await signInWithPopup(auth, new GoogleAuthProvider());
      },
      signOutUser: async () => {
        await signOut(auth);
      },
    }),
    [user, isAdmin, authReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
