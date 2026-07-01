
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth, ROLE_DOMAIN } from "./AuthContext";
import AuthPage from "./AuthPage";
import NormalDashboard from "./pages/NormalDashboard";
import DomainDashboard from "./pages/DomainDashboard";
import OnboardingPage from "./pages/OnboardingPage";
import LandingPage from "./pages/LandingPage";
import "./styles/index.css";

function AppRoutes() {
  const { user, loading, role, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, transform: "rotate(45deg)", animation: "spin 2s linear infinite" }}>
              {["#ef4444", "#3b82f6", "#3b82f6", "#ef4444"].map((c, i) => <span key={i} style={{ borderRadius: 4, background: c }} />)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", letterSpacing: 2, textTransform: "uppercase" }}>Loading PrepWise…</div>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={
          <LandingPage onNavigate={(mode) => navigate(`/auth?mode=${mode}`)} />
        } />
        <Route path="/auth" element={
          <AuthPage 
            initialMode={new URLSearchParams(location.search).get("mode") || "login"} 
            onBack={() => navigate("/")} 
          />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Signed in but onboarding not complete — gate to onboarding
  if (profile && !profile.onboardingComplete) {
    return (
      <OnboardingPage onComplete={async () => {
        await refreshProfile();
      }} />
    );
  }

  // Signed in + onboarded — route to appropriate dashboard
  return (
    <Routes>
      <Route path="/" element={role === ROLE_DOMAIN ? <DomainDashboard /> : <NormalDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

