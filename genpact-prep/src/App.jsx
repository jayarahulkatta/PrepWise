import { AuthProvider, useAuth } from "./AuthContext";
import AuthPage from "./AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import NormalDashboard from "./pages/NormalDashboard";
import "./styles/index.css";

function AppRouter() {
  const { user, profile, loading, refreshProfile } = useAuth();

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

  // Not signed in → Auth page
  if (!user) return <AuthPage />;

  // Signed in but no onboarding → Onboarding
  if (!profile?.onboardingComplete) {
    return <OnboardingPage onComplete={async () => { await refreshProfile(); }} />;
  }

  // All users → same dashboard (role-based features handled inside)
  return <NormalDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
