import { useState } from "react";
import { useAuth } from "./AuthContext";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
:root {
  --bg: #0b0d13; --surface: #111318; --card: #161921; --card-hover: #1c1f2a;
  --border: #222632; --border-hover: #2e3447;
  --red: #e84b3a; --red-dim: rgba(232,75,58,0.12);
  --blue: #3d7de8; --blue-dim: rgba(61,125,232,0.12);
  --green: #00c896; --green-dim: rgba(0,200,150,0.1);
  --yellow: #f5a623; --purple: #a855f7;
  --text: #eaedf5; --text2: #9aa3b8; --muted: #555f78;
  --font: 'Sora', sans-serif; --mono: 'IBM Plex Mono', monospace;
  --shadow: 0 4px 24px rgba(0,0,0,0.5); --radius: 12px;
}
body { font-family:var(--font); background:var(--bg); color:var(--text); }
@keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes glow { 0%,100%{opacity:0.4} 50%{opacity:1} }
`;

export default function AuthPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState("login");
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
      if (mode === "login") {
        await signInWithEmail(email, password);
      } else {
        if (!name.trim()) { setError("Name is required"); setLoading(false); return; }
        await signUpWithEmail(email, password, name);
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
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Google sign-in failed. Try again.");
      }
    }
    setLoading(false);
  };

  return (
    <>
      <style>{css}</style>
      <div style={{
        minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center",
        padding:20, position:"relative", overflow:"hidden",
      }}>
        {/* Ambient glow */}
        <div style={{ position:"absolute", top:"-20%", left:"-10%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(61,125,232,0.08), transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"-15%", right:"-5%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(232,75,58,0.06), transparent 70%)", pointerEvents:"none" }} />

        <div style={{
          width:"100%", maxWidth:420, animation:"fadeUp 0.5s ease both",
        }}>
          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <div style={{ width:44, height:44, display:"grid", gridTemplateColumns:"1fr 1fr", gap:3, transform:"rotate(45deg)" }}>
                {["#e84b3a","#3d7de8","#3d7de8","#e84b3a"].map((c,i) => <span key={i} style={{ borderRadius:4, background:c }} />)}
              </div>
              <span style={{ fontSize:28, fontWeight:700, letterSpacing:"-1px" }}>Prep<span style={{ color:"var(--red)" }}>Wise</span></span>
            </div>
            <p style={{ fontSize:14, color:"var(--text2)", lineHeight:1.6 }}>
              AI-powered interview prep for top companies
            </p>
          </div>

          {/* Card */}
          <div style={{
            background:"var(--surface)", border:"1px solid var(--border)", borderRadius:20,
            padding:32, boxShadow:"0 8px 40px rgba(0,0,0,0.4)",
          }}>
            {/* Tabs */}
            <div style={{ display:"flex", marginBottom:28, background:"var(--card)", borderRadius:12, padding:4 }}>
              {["login", "signup"].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
                  flex:1, padding:"10px 0", borderRadius:10, border:"none", cursor:"pointer",
                  fontFamily:"var(--font)", fontSize:13, fontWeight:600, transition:"all 0.2s",
                  background: mode === m ? "var(--blue)" : "transparent",
                  color: mode === m ? "#fff" : "var(--muted)",
                }}>
                  {m === "login" ? "Log In" : "Sign Up"}
                </button>
              ))}
            </div>

            {/* Google button */}
            <button onClick={handleGoogle} disabled={loading} style={{
              width:"100%", padding:"12px 0", borderRadius:12, cursor: loading ? "not-allowed" : "pointer",
              background:"var(--card)", border:"1px solid var(--border)", color:"var(--text)",
              fontSize:13, fontWeight:600, fontFamily:"var(--font)", display:"flex", alignItems:"center",
              justifyContent:"center", gap:10, marginBottom:20, transition:"border-color 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--blue)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ flex:1, height:1, background:"var(--border)" }} />
              <span style={{ fontSize:11, color:"var(--muted)", textTransform:"uppercase", letterSpacing:1 }}>or</span>
              <div style={{ flex:1, height:1, background:"var(--border)" }} />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {mode === "signup" && (
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:12, color:"var(--text2)", marginBottom:6 }}>Full Name</label>
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="John Doe"
                    style={inputStyle}
                  />
                </div>
              )}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:12, color:"var(--text2)", marginBottom:6 }}>Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ display:"block", fontSize:12, color:"var(--text2)", marginBottom:6 }}>Password</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  style={inputStyle}
                />
              </div>

              {error && (
                <div style={{
                  background:"var(--red-dim)", border:"1px solid rgba(232,75,58,0.3)", borderRadius:10,
                  padding:"10px 14px", marginBottom:16, fontSize:12, color:"#f87171", lineHeight:1.5,
                }}>
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width:"100%", padding:"12px 0", borderRadius:12, border:"none", cursor: loading ? "not-allowed" : "pointer",
                background:"linear-gradient(135deg, var(--blue), #2563eb)", color:"#fff",
                fontSize:14, fontWeight:600, fontFamily:"var(--font)", transition:"opacity 0.2s",
                opacity: loading ? 0.7 : 1,
              }}>
                {loading ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p style={{ textAlign:"center", marginTop:20, fontSize:12, color:"var(--muted)" }}>
            Practice for Genpact, TCS, Infosys, Wipro, Accenture & more
          </p>
        </div>
      </div>
    </>
  );
}

const inputStyle = {
  width:"100%", padding:"11px 14px", borderRadius:10, outline:"none",
  background:"var(--card)", border:"1px solid var(--border)", color:"var(--text)",
  fontSize:13, fontFamily:"'Sora', sans-serif", transition:"border-color 0.2s",
};
