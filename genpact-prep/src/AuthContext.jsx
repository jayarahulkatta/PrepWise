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
// Role values used throughout the app. Change these when integrating real backend auth.
const ROLE_INTERVIEWER = "interviewer";
const ROLE_DOMAIN_EXPERT = "domain_expert";
const ROLE_STORAGE_KEY = "prepwise_role";

export { ROLE_INTERVIEWER, ROLE_DOMAIN_EXPERT };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── ROLE STATE ─────────────────────────────────────────────────────────────
  // role: "interviewer" | "domain_expert" | null
  // Persisted in localStorage so it survives page refresh.
  const [role, setRole] = useState(() => {
    // Restore role from localStorage on mount
    return localStorage.getItem(ROLE_STORAGE_KEY) || null;
  });

  // Track which role was active at logout so the login page can auto-select the right tab
  const lastLogoutRoleRef = useRef(null);

  // Helper: persist role to localStorage
  const persistRole = (newRole) => {
    setRole(newRole);
    if (newRole) {
      localStorage.setItem(ROLE_STORAGE_KEY, newRole);
    } else {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      // If we are hardcoded domain, ignore firebase nulls
      if (localStorage.getItem("domainAuth") === "true") {
        setUser({ uid: 'domain-hardcoded' });
        // Ensure role is set to domain_expert for hardcoded domain auth
        if (role !== ROLE_DOMAIN_EXPERT) {
          persistRole(ROLE_DOMAIN_EXPERT);
        }
        try {
          // TODO: Replace with real backend auth — remove hardcoded token
          const p = await apiFetch(`${API_BASE}/user/profile`, {}, "DOMAIN_SECRET_TOKEN_87654321");
          setProfile(p);
        } catch {
          setProfile(null);
        }
        setLoading(false);
        return;
      }

      if (fbUser) {
        setUser(fbUser);
        // If role is already set from localStorage, keep it. 
        // If not (shouldn't happen normally), default to interviewer.
        if (!localStorage.getItem(ROLE_STORAGE_KEY)) {
          persistRole(ROLE_INTERVIEWER);
        }
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
        // Don't clear role here — it's cleared explicitly in signOut
      }
      setLoading(false);
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getToken = async () => {
    // TODO: Replace with real backend auth — remove hardcoded token
    if (localStorage.getItem("domainAuth") === "true") return "DOMAIN_SECRET_TOKEN_87654321";
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

    // Clear all persisted state
    localStorage.removeItem("domainAuth");
    localStorage.removeItem(ROLE_STORAGE_KEY);

    await fbSignOut(auth);
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  // ─── DOMAIN EXPERT LOGIN ───────────────────────────────────────────────────
  // TODO: Replace with real backend auth — remove hardcoded credentials
  const signInAsDomain = async () => {
    localStorage.setItem("domainAuth", "true");
    persistRole(ROLE_DOMAIN_EXPERT);
    setUser({ uid: 'domain-hardcoded' });
    
    try {
      const p = await apiFetch(`${API_BASE}/user/profile`, {}, "DOMAIN_SECRET_TOKEN_87654321");
      setProfile(p);
    } catch {
      setProfile({ role: 'domain', name: 'Domain Expert', email: 'jayarahul696@gmail.com' });
    }
  };

  // ─── STANDARD USER LOGIN ───────────────────────────────────────────────────
  // All standard auth methods set role = "interviewer"
  const signInWithEmail = async (email, password) => {
    persistRole(ROLE_INTERVIEWER);
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email, password, name) => {
    persistRole(ROLE_INTERVIEWER);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });
      setUser({ ...userCredential.user, displayName: name });
    }
    return userCredential;
  };

  const signInWithGoogle = async () => {
    persistRole(ROLE_INTERVIEWER);
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
