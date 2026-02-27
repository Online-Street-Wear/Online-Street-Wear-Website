import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "@/react-app/lib/firebase";

interface AuthContextValue {
  user: User | null;
  isPending: boolean;
  isConfigured: boolean;
  redirectToLogin: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function createAuthUnavailableError() {
  return new Error("Firebase authentication is not configured. Add Firebase Web SDK values in .env.local.");
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setIsPending(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setIsPending(false);
      },
      () => {
        setIsPending(false);
      },
    );

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isPending,
      isConfigured: Boolean(auth && isFirebaseConfigured),
      redirectToLogin: async () => {
        if (!auth || !googleProvider || !isFirebaseConfigured) {
          throw createAuthUnavailableError();
        }

        await signInWithPopup(auth, googleProvider);
      },
      loginWithEmail: async (email, password) => {
        if (!auth || !isFirebaseConfigured) {
          throw createAuthUnavailableError();
        }

        await signInWithEmailAndPassword(auth, email, password);
      },
      registerWithEmail: async (email, password) => {
        if (!auth || !isFirebaseConfigured) {
          throw createAuthUnavailableError();
        }

        await createUserWithEmailAndPassword(auth, email, password);
      },
      logout: async () => {
        if (!auth || !isFirebaseConfigured) {
          return;
        }

        await signOut(auth);
      },
    }),
    [isPending, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within FirebaseAuthProvider.");
  }

  return context;
}
