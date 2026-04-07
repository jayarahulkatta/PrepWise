import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";
import { 
  getIdToken, 
  onAuthStateChanged, 
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { apiFetch, API_BASE } from "./utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      // If we are hardcoded domain, ignore firebase nulls
      if (localStorage.getItem("domainAuth") === "true") {
        setProfile({ role: 'domain', name: 'Domain Expert', email: 'jayarahul696@gmail.com' });
        setUser({ uid: 'domain-hardcoded' });
        setLoading(false);
        return;
      }

      if (fbUser) {
        setUser(fbUser);
        try {
          const token = await getIdToken(fbUser);
          const p = await apiFetch(`${API_BASE}/user/profile`, {}, token);
          setProfile(p);
        } catch {
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const getToken = async () => {
    if (localStorage.getItem("domainAuth") === "true") return "DOMAIN_SECRET_TOKEN_87654321";
    if (auth.currentUser) return getIdToken(auth.currentUser);
    return null;
  };

  const refreshProfile = async () => {
    if (localStorage.getItem("domainAuth") === "true") return;
    try {
      const token = await getToken();
      if (token) {
        const p = await apiFetch(`${API_BASE}/user/profile`, {}, token);
        setProfile(p);
      }
    } catch { }
  };

  const signOut = async () => {
    localStorage.removeItem("domainAuth");

    await fbSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  const signInAsDomain = () => {
    localStorage.setItem("domainAuth", "true");

    setUser({ uid: 'domain-hardcoded' });
    setProfile({ role: 'domain', name: 'Domain Expert', email: 'jayarahul696@gmail.com' });
  };

  const signInWithEmail = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email, password, name) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });
      setUser({ ...userCredential.user, displayName: name });
    }
    return userCredential;
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, getToken, refreshProfile, signOut, 
      signInWithEmail, signUpWithEmail, signInWithGoogle, signInAsDomain 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
