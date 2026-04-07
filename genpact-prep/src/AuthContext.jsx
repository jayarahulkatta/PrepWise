import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";
import { getIdToken, onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { apiFetch, API_BASE } from "./utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        // Try to load the profile from backend
        try {
          const token = await getIdToken(fbUser);
          const p = await apiFetch(`${API_BASE}/user/profile`, {}, token);
          setProfile(p);
        } catch {
          // New user — profile will be created on first API call
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

  const signOut = async () => {
    await fbSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, getToken, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
