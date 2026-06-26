import { createContext, useContext, useEffect, useState, useRef } from "react";
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

// ─── ROLE CONSTANTS ─────────────────────────────────────────────────────────
// Role values used throughout the app — matches the database schema exactly.
const ROLE_NORMAL = "normal";
const ROLE_DOMAIN = "domain";

export { ROLE_NORMAL, ROLE_DOMAIN };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── ROLE STATE ─────────────────────────────────────────────────────────────
  // role: "normal" | "domain" | null
  // Role is determined by the server profile, NOT localStorage.
  const [role, setRole] = useState(null);

  // Track which role was active at logout so the login page can auto-select the right tab
  const lastLogoutRoleRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        // Always fetch profile from server — role is determined server-side
        try {
          const token = await getIdToken(fbUser);
          const p = await apiFetch(`${API_BASE}/user/profile`, {}, token);
          setProfile(p);
          // Role comes from the server profile, never from client storage
          setRole(p.role || ROLE_NORMAL);
        } catch {
          setProfile(null);
          setRole(ROLE_NORMAL);
        }
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getToken = async () => {
    if (auth.currentUser) return getIdToken(auth.currentUser);
    return null;
  };

  const refreshProfile = async () => {
    try {
      const token = await getToken();
      if (token) {
        const p = await apiFetch(`${API_BASE}/user/profile`, {}, token);
        setProfile(p);
      }
    } catch { }
  };

  // ─── SIGN OUT ───────────────────────────────────────────────────────────────
  // Clears all auth state. Stores the last role so login page can show the right tab.
  const signOut = async () => {
    // Remember which role was active before logout
    lastLogoutRoleRef.current = role;

    await fbSignOut(auth);
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  // ─── DOMAIN EXPERT LOGIN ───────────────────────────────────────────────────
  // Role will be set from server profile after onAuthStateChanged fires
  const signInAsDomain = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  // ─── STANDARD USER LOGIN ───────────────────────────────────────────────────
  // Role will be set from server profile after onAuthStateChanged fires
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

  // ─── CONTEXT VALUE ─────────────────────────────────────────────────────────
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, role, isAuthenticated,
      getToken, refreshProfile, signOut, 
      signInWithEmail, signUpWithEmail, signInWithGoogle, signInAsDomain,
      lastLogoutRoleRef,
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
