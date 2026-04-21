import { useState } from "react";
import { useAuth } from "./AuthContext";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
:root {
  --bg: #08090d; --surface: #121317; --card: #1e1f24; --card-hover: #292a2e;
  --border: rgba(67, 70, 85, 0.2); --border-hover: rgba(67, 70, 85, 0.4);
  --red: #ef4444; --red-dim: rgba(239,68,68,0.1);
  --blue: #2563eb; --blue-dim: rgba(37,99,235,0.1);
  --green: #10b981; --green-dim: rgba(16,185,129,0.08);
  --amber: #f59e0b; --amber-dim: rgba(245,158,11,0.1);
  --text: #e3e2e8; --text2: #c3c6d7; --muted: #8d90a0;
  --font: 'Inter', -apple-system, sans-serif; --mono: 'JetBrains Mono', monospace;
}
body { font-family:var(--font); background:var(--bg); color:var(--text); -webkit-font-smoothing:antialiased; }
@keyframes fadeUp { from { opacity:0; transform:translateY(30px) } to { opacity:1; transform:translateY(0) } }
@keyframes float { 0%,100% { transform: translate(0,0) scale(1) } 33% { transform: translate(30px,-20px) scale(1.05) } 66% { transform: translate(-20px, 15px) scale(0.95) } }
@keyframes float2 { 0%,100% { transform: translate(0,0) scale(1) } 33% { transform: translate(-25px,20px) scale(1.08) } 66% { transform: translate(15px, -25px) scale(0.92) } }
`;

export default function AuthPage({ initialMode: initialModeProp, onBack }) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsDomain, lastLogoutRoleRef } = useAuth();

  // Use prop if provided (from landing page CTA), else fall back to logout-role logic
  const resolvedInitialMode = initialModeProp
    || (lastLogoutRoleRef?.current === "domain_expert" ? "domain" : "login");
  const [mode, setMode] = useState(resolvedInitialMode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "domain") {
        // TODO: Replace with real backend auth — remove hardcoded credentials
        if (email !== "jayarahul696@gmail.com" || password !== "87654321") {
          setError("Invalid credentials. Domain expert access is restricted.");
          setLoading(false);
          return;
        }
        await signInAsDomain();
        // Role is set to "domain_expert" inside signInAsDomain
      } else if (mode === "login") {
        await signInWithEmail(email, password);
        // Role is set to "interviewer" inside signInWithEmail
      } else {
        if (!name.trim()) { setError("Name is required"); setLoading(false); return; }
        await signUpWithEmail(email, password, name);
        // Role is set to "interviewer" inside signUpWithEmail
      }
    } catch (err) {
      const msg = err.code === "auth/user-not-found" ? "No account found. Sign up first!"
        : err.code === "auth/wrong-password" ? "Incorrect password"
          : err.code === "auth/email-already-in-use" ? "Email already registered. Try logging in!"
            : err.code === "auth/weak-password" ? "Password must be at least 6 characters"
              : err.code === "auth/invalid-email" ? "Invalid email address"
                : err.code === "auth/invalid-credential" ? "Invalid credentials. Check email & password"
                  : err.message || "Something went wrong";
      setError(msg);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      // Role is set to "interviewer" inside signInWithGoogle
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Google sign-in failed. Try again.");
      }
    }
    setLoading(false);
  };

  // Whether we're in domain expert mode
  const isDomainMode = mode === "domain";

  return (
    <>
      <style>{css}</style>
      <div style={{
        minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, position: "relative", overflow: "hidden",
      }}>
        {/* Animated ambient blobs */}
        <div style={{ position: "absolute", top: "-15%", left: "-8%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.07), transparent 65%)", pointerEvents: "none", animation: "float 20s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(239,68,68,0.05), transparent 65%)", pointerEvents: "none", animation: "float2 25s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "40%", left: "60%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.04), transparent 65%)", pointerEvents: "none", animation: "float 18s ease-in-out infinite reverse" }} />

        {/* Decorative grid */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        <div style={{
          width: "100%", maxWidth: 440, animation: "fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both",
          position: "relative", zIndex: 1,
        }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, transform: "rotate(45deg)",
                filter: "drop-shadow(0 0 20px rgba(239,68,68,0.3))",
              }}>
                {["#ef4444", "#3b82f6", "#3b82f6", "#ef4444"].map((c, i) => <span key={i} style={{ borderRadius: 5, background: c, transition: "all 0.3s" }} />)}
              </div>
              <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-1.5px" }}>Prep<span style={{ color: "var(--red)" }}>Wise</span></span>
            </div>
            <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, maxWidth: 320, margin: "0 auto" }}>
              AI-powered interview prep for top companies
            </p>
          </div>

          {/* ─── STANDARD AUTH CARD (Log In / Sign Up) ─────────────────────── */}
          {!isDomainMode && (
            <div style={{
              background: "var(--glass)", border: "1px solid var(--glass-border)",
              borderRadius: 24, padding: 36,
              boxShadow: "var(--shadow), 0 0 0 1px rgba(255,255,255,0.03) inset",
              backdropFilter: "blur(24px) saturate(1.3)",
              WebkitBackdropFilter: "blur(24px) saturate(1.3)",
              marginBottom: 16,
            }}>
              {/* Tabs — only Log In and Sign Up */}
              <div style={{ display: "flex", marginBottom: 32, background: "var(--surface)", borderRadius: 14, padding: 4 }}>
                {["login", "signup"].map(m => (
                  <button key={m} onClick={() => { setMode(m); setError(""); }} type="button" style={{
                    flex: 1, padding: "11px 0", borderRadius: 11, border: "none", cursor: "pointer",
                    fontFamily: "var(--font)", fontSize: 13, fontWeight: 600, transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                    background: mode === m ? "linear-gradient(135deg, var(--blue), #2563eb)" : "transparent",
                    color: mode === m ? "#fff" : "var(--muted)",
                    boxShadow: mode === m ? "0 2px 12px rgba(59,130,246,0.25)" : "none",
                  }}>
                    {m === "login" ? "Log In" : "Sign Up"}
                  </button>
                ))}
              </div>

              {/* Google button */}
              <button type="button" onClick={handleGoogle} disabled={loading} style={{
                width: "100%", padding: "13px 0", borderRadius: 14, cursor: loading ? "not-allowed" : "pointer",
                background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)",
                fontSize: 13, fontWeight: 600, fontFamily: "var(--font)", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 10, marginBottom: 24, transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.background = "var(--card-hover)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
                <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, var(--border), transparent)" }} />
                <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500 }}>or</span>
                <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, var(--border), transparent)" }} />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                {mode === "signup" && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 7, fontWeight: 500 }}>Full Name</label>
                    <input
                      value={name} onChange={e => setName(e.target.value)}
                      placeholder="John Doe"
                      style={inputStyle}
                    />
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 7, fontWeight: 500 }}>Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 7, fontWeight: 500 }}>Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required minLength={6}
                    style={inputStyle}
                  />
                </div>

                {error && (
                  <div style={{
                    background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12,
                    padding: "11px 16px", marginBottom: 18, fontSize: 12, color: "#f87171", lineHeight: 1.6,
                    display: "flex", alignItems: "center", gap: 8,
                    animation: "fadeUp 0.3s ease both",
                  }}>
                    <span style={{ fontSize: 14 }}>⚠️</span> {error}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{
                  width: "100%", padding: "13px 0", borderRadius: 14, border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  background: "linear-gradient(135deg, var(--blue), #2563eb)",
                  color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "var(--font)",
                  transition: "all 0.25s", opacity: loading ? 0.7 : 1,
                  boxShadow: "0 4px 20px rgba(59,130,246,0.3)",
                  letterSpacing: "-0.2px",
                }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(59,130,246,0.4)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(59,130,246,0.3)"; }}
                >
                  {loading ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
                </button>
              </form>
            </div>
          )}

          {/* ─── DOMAIN EXPERT CARD (Visually Separate) ──────────────────────── */}
          {isDomainMode && (
            <div style={{
              background: "var(--glass)", border: "1px solid rgba(245,158,11,0.15)",
              borderRadius: 24, padding: 36,
              boxShadow: "0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,158,11,0.05) inset",
              backdropFilter: "blur(24px) saturate(1.3)",
              WebkitBackdropFilter: "blur(24px) saturate(1.3)",
              marginBottom: 16,
            }}>
              {/* Domain Expert Header */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 48, height: 48, borderRadius: 14,
                  background: "var(--amber-dim)", border: "1px solid rgba(245,158,11,0.2)",
                  marginBottom: 14,
                }}>
                  <span style={{ fontSize: 22 }}>🔐</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 6 }}>Domain Expert Portal</h3>
                <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                  For verified professionals only · Restricted access
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 7, fontWeight: 500 }}>Expert Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="verified@domain.com" required
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 7, fontWeight: 500 }}>Access Key</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required minLength={6}
                    style={inputStyle}
                  />
                </div>

                {error && (
                  <div style={{
                    background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12,
                    padding: "11px 16px", marginBottom: 18, fontSize: 12, color: "#f87171", lineHeight: 1.6,
                    display: "flex", alignItems: "center", gap: 8,
                    animation: "fadeUp 0.3s ease both",
                  }}>
                    <span style={{ fontSize: 14 }}>⚠️</span> {error}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{
                  width: "100%", padding: "13px 0", borderRadius: 14, border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "var(--font)",
                  transition: "all 0.25s", opacity: loading ? 0.7 : 1,
                  boxShadow: "0 4px 20px rgba(245,158,11,0.3)",
                  letterSpacing: "-0.2px",
                }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(245,158,11,0.4)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(245,158,11,0.3)"; }}
                >
                  {loading ? "Please wait…" : "🔐 Access Domain Portal"}
                </button>
              </form>
            </div>
          )}

          {/* ─── Back to Landing Page ──────────────────────────────────────────── */}
          {onBack && (
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <button
                onClick={onBack}
                type="button"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--muted)", fontSize: 12, fontFamily: "var(--font)", fontWeight: 500,
                  padding: "8px 16px", transition: "all 0.3s",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--text2)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--muted)"; }}
              >
                ← Back to Home
              </button>
            </div>
          )}

          {/* ─── TOGGLE between Standard / Domain Expert ──────────────────────── */}
          <div style={{ textAlign: "center" }}>
            {!isDomainMode ? (
              <button
                onClick={() => { setMode("domain"); setError(""); setEmail(""); setPassword(""); }}
                type="button"
                style={{
                  background: "none", border: "1px solid rgba(245,158,11,0.15)", cursor: "pointer",
                  color: "var(--muted)", fontSize: 12, fontFamily: "var(--font)", fontWeight: 500,
                  padding: "10px 20px", borderRadius: 12, transition: "all 0.3s",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)"; e.currentTarget.style.color = "#f59e0b"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.15)"; e.currentTarget.style.color = "var(--muted)"; }}
              >
                🔐 Domain Expert? Login here
              </button>
            ) : (
              <button
                onClick={() => { setMode("login"); setError(""); setEmail(""); setPassword(""); }}
                type="button"
                style={{
                  background: "none", border: "1px solid var(--border)", cursor: "pointer",
                  color: "var(--muted)", fontSize: 12, fontFamily: "var(--font)", fontWeight: 500,
                  padding: "10px 20px", borderRadius: 12, transition: "all 0.3s",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text2)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}
              >
                ← Back to Student Login
              </button>
            )}
          </div>

          {/* Footer */}
          {!isDomainMode && (
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
                Practice for <span style={{ color: "var(--text2)" }}>Genpact</span> · <span style={{ color: "var(--text2)" }}>TCS</span> · <span style={{ color: "var(--text2)" }}>Infosys</span> · <span style={{ color: "var(--text2)" }}>Wipro</span> · <span style={{ color: "var(--text2)" }}>Accenture</span> & more
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const inputStyle = {
  width: "100%", padding: "12px 16px", borderRadius: 12, outline: "none",
  background: "var(--card-highest)", border: "1px solid transparent",
  color: "var(--text)", fontSize: 13, fontFamily: "var(--font)",
  transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
  letterSpacing: "-0.1px",
};
