import { useState } from "react";
import { useAuth } from "../AuthContext";
import { apiFetch, API_BASE } from "../utils/api";
import { EXPERIENCE_LEVELS } from "../utils/constants";

export default function OnboardingPage({ onComplete }) {
  const { getToken } = useAuth();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Normal user fields
  const [targetRole, setTargetRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Fresher");
  const [interviewDate, setInterviewDate] = useState("");
  const [focusAreas, setFocusAreas] = useState([]);

  // Domain user fields
  const [domainRoleArea, setDomainRoleArea] = useState("");
  const [yearsExperience, setYearsExperience] = useState(0);
  const [specializations, setSpecializations] = useState([]);

  const toggleFocus = (f) => setFocusAreas(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  const toggleSpec = (s) => setSpecializations(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const inputSt = {
    width: "100%", padding: "12px 16px", borderRadius: 12, outline: "none",
    background: "var(--card-highest)", border: "1px solid transparent",
    color: "var(--text)", fontSize: 13, fontFamily: "var(--font)",
    transition: "all 0.3s",
  };
  const selectSt = { ...inputSt, cursor: "pointer" };

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const token = await getToken();
      const body = { role };
      if (role === "normal") {
        body.prepProfile = { targetCompany: "Genpact", targetRole, experienceLevel, interviewDate: interviewDate || null, focusAreas };
      } else {
        body.domainProfile = { company: "Genpact", roleArea: domainRoleArea, yearsExperience, specializations };
      }
      await apiFetch(`${API_BASE}/user/onboarding`, { method: "PUT", body: JSON.stringify(body) }, token);
      onComplete(role);
    } catch (e) {
      console.error("ONBOARDING API ERROR:", e);
      setError("Failed to save. Please try again.");
    }
    setLoading(false);
  };

  const chipSt = (active) => ({
    padding: "8px 16px", borderRadius: 20, fontSize: 12, fontWeight: 500,
    fontFamily: "var(--font)", cursor: "pointer", border: "1px solid",
    borderColor: active ? "var(--blue)" : "var(--border)",
    background: active ? "var(--blue-dim)" : "transparent",
    color: active ? "var(--blue-bright)" : "var(--text2)",
    transition: "all 0.2s",
  });

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 20, position: "relative", overflow: "hidden",
    }}>
      {/* Ambient blobs */}
      <div style={{ position: "absolute", top: "-15%", left: "-8%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.07), transparent 65%)", pointerEvents: "none", animation: "float 20s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(239,68,68,0.05), transparent 65%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 520, animation: "fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both", position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, transform: "rotate(45deg)" }}>
              {["#ef4444", "#3b82f6", "#3b82f6", "#ef4444"].map((c, i) => <span key={i} style={{ borderRadius: 4, background: c }} />)}
            </div>
            <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px" }}>Prep<span style={{ color: "var(--red)" }}>Wise</span></span>
          </div>
          <p style={{ fontSize: 14, color: "var(--text2)" }}>Let's personalize your experience</p>
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>How will you use PrepWise?</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", marginBottom: 32 }}>This determines your dashboard and features</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className={`onboarding-card ${role === "normal" ? "selected" : ""}`} onClick={() => setRole("normal")}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Interview Prep</h3>
                <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>I'm preparing for interviews. I want to practice, get feedback, and track my progress.</p>
              </div>
              <div className={`onboarding-card ${role === "domain" ? "selected" : ""}`} onClick={() => setRole("domain")}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Domain Expert</h3>
                <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>I'm an industry professional. I want to contribute questions and help candidates prepare.</p>
              </div>
            </div>
            <button className="btn-glow" disabled={!role} onClick={() => setStep(2)} style={{
              width: "100%", marginTop: 28, padding: "14px 0", borderRadius: 14, border: "none",
              background: role ? "linear-gradient(135deg, var(--blue), #2563eb)" : "var(--card)",
              color: role ? "#fff" : "var(--muted)", fontSize: 14, fontWeight: 600,
              fontFamily: "var(--font)", cursor: role ? "pointer" : "not-allowed",
              opacity: role ? 1 : 0.5, boxShadow: role ? "0 4px 20px rgba(59,130,246,0.3)" : "none",
            }}>Continue →</button>
          </div>
        )}

        {/* Step 2: Profile Details */}
        {step === 2 && role === "normal" && (
          <div style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 24, padding: 36, backdropFilter: "blur(24px)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Your Interview Target</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>We'll personalize your preparation based on this</p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Target Role</label>
              <input value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g. Java Developer, Process Associate" style={inputSt} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Experience Level</label>
              <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} style={selectSt}>
                {EXPERIENCE_LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Interview Date (optional)</label>
              <input type="date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} style={inputSt} />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 10, fontWeight: 500 }}>Focus Areas</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Technical", "HR", "Behavioral", "Background"].map(f => (
                  <button key={f} onClick={() => toggleFocus(f)} style={chipSt(focusAreas.includes(f))}>{f}</button>
                ))}
              </div>
            </div>

            {error && <p style={{ color: "var(--red)", fontSize: 12, marginBottom: 12 }}>⚠️ {error}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "13px 0", borderRadius: 14, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text2)", fontSize: 13, fontWeight: 500, fontFamily: "var(--font)", cursor: "pointer" }}>← Back</button>
              <button className="btn-glow" onClick={submit} disabled={loading} style={{ flex: 2, padding: "13px 0", borderRadius: 14, border: "none", background: "linear-gradient(135deg, var(--blue), #2563eb)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "var(--font)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>{loading ? "Saving…" : "Start Preparing →"}</button>
            </div>
          </div>
        )}

        {step === 2 && role === "domain" && (
          <div style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 24, padding: 36, backdropFilter: "blur(24px)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Your Domain Expertise</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>Help us understand your background</p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Role Area</label>
              <input value={domainRoleArea} onChange={e => setDomainRoleArea(e.target.value)} placeholder="e.g. Software Engineering, Data Analytics" style={inputSt} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Years of Experience</label>
              <input type="number" value={yearsExperience} onChange={e => setYearsExperience(+e.target.value)} min={0} max={40} style={inputSt} />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 10, fontWeight: 500 }}>Specializations</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Java", "Python", "SQL", "System Design", "Data Structures", "Behavioral", "HR Processes"].map(s => (
                  <button key={s} onClick={() => toggleSpec(s)} style={chipSt(specializations.includes(s))}>{s}</button>
                ))}
              </div>
            </div>

            {error && <p style={{ color: "var(--red)", fontSize: 12, marginBottom: 12 }}>⚠️ {error}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "13px 0", borderRadius: 14, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text2)", fontSize: 13, fontWeight: 500, fontFamily: "var(--font)", cursor: "pointer" }}>← Back</button>
              <button className="btn-glow" onClick={submit} disabled={loading} style={{ flex: 2, padding: "13px 0", borderRadius: 14, border: "none", background: "linear-gradient(135deg, var(--blue), #2563eb)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "var(--font)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>{loading ? "Saving…" : "Start Contributing →"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
