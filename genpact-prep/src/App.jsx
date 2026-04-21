import { useState } from "react";
import { AuthProvider, useAuth, ROLE_DOMAIN_EXPERT } from "./AuthContext";
import AuthPage from "./AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import NormalDashboard from "./pages/NormalDashboard";
import DomainDashboard from "./pages/DomainDashboard";
import LandingPage from "./pages/LandingPage";
import "./styles/index.css";

function AppRouter() {
  const { user, profile, loading, role, refreshProfile } = useAuth();

  // ─── Landing page state ──────────────────────────────────────────────────
  // When user is not logged in, show the landing page first.
  // Clicking any CTA flips to AuthPage with the right tab pre-selected.
  const [showLanding, setShowLanding] = useState(true);
  const [authMode, setAuthMode] = useState("login");

  const handleNavigate = (destination) => {
    // destination: "login" | "signup" | "domain_expert"
    setAuthMode(destination === "domain_expert" ? "domain" : destination);
    setShowLanding(false);
  };

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

  // Not signed in → Landing page or Auth page
  if (!user) {
    if (showLanding) {
      return <LandingPage onNavigate={handleNavigate} />;
    }
    return (
      <AuthPage
        initialMode={authMode}
        onBack={() => setShowLanding(true)}
      />
    );
  }

  // Signed in but no onboarding → Onboarding
  // Pass the current role so onboarding knows which profile form to show
  if (!profile?.onboardingComplete) {
    return <OnboardingPage onComplete={async () => { await refreshProfile(); }} />;
  }

  // ─── ROLE-BASED DASHBOARD ROUTING ──────────────────────────────────────────
  // Domain experts → DomainDashboard (question management portal)
  // Everyone else (interviewers) → NormalDashboard (interview prep features)
  if (role === ROLE_DOMAIN_EXPERT) {
    return <DomainDashboard />;
  }

  // Default: interviewers and any unrecognized role
  return <NormalDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
