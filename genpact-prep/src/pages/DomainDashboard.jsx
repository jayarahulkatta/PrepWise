import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../AuthContext";
import { StatCard, Badge, Toast } from "../components/ui";
import { apiFetch, API_BASE } from "../utils/api";
import { QUESTION_TYPES, EXPERIENCE_LEVELS, DIFFICULTIES } from "../utils/constants";

export default function DomainDashboard() {
  const { user, signOut, getToken } = useAuth();
  const [view, setView] = useState("dashboard"); // dashboard | submit | review | my-questions
  const [stats, setStats] = useState(null);
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Submit form
  const [form, setForm] = useState({ company: "Genpact", job: "", type: "Technical", diff: "Medium", exp: "Fresher", text: "" });
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toast, setToast] = useState({ msg: "", visible: false });
  const toastRef = useRef(null);
  const showToast = useCallback(msg => { clearTimeout(toastRef.current); setToast({ msg, visible: true }); toastRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500); }, []);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // Load stats
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const data = await apiFetch(`${API_BASE}/user/domain-stats`, {}, token);
        setStats(data);
      } catch { }
    })();
  }, [getToken]);

  // Load pending when viewing review
  useEffect(() => {
    if (view !== "review") return;
    (async () => {
      try {
        const token = await getToken();
        const data = await apiFetch(`${API_BASE}/questions/pending`, {}, token);
        setPendingQuestions(data);
      } catch { }
    })();
  }, [view, getToken]);

  const submitQuestion = async (e) => {
    e.preventDefault();
    if (!form.text.trim() || !form.job.trim()) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await apiFetch(`${API_BASE}/questions/submit`, { method: "POST", body: JSON.stringify(form) }, token);
      showToast(res.message || "Question published!");
      setForm({ company: "Genpact", job: "", type: "Technical", diff: "Medium", exp: "Fresher", text: "" });
      // Reload stats
      const data = await apiFetch(`${API_BASE}/user/domain-stats`, {}, token);
      setStats(data);
    } catch { showToast("Failed to submit. Try again."); }
    setSubmitting(false);
  };

  const approveQuestion = async (id) => {
    try {
      const token = await getToken();
      await apiFetch(`${API_BASE}/questions/${id}/approve`, { method: "PUT" }, token);
      setPendingQuestions(prev => prev.filter(q => q.id !== id));
      showToast("Question approved!");
    } catch { showToast("Failed to approve"); }
  };

  const inputSt = {
    width: "100%", padding: "12px 16px", borderRadius: 12, outline: "none",
    background: "var(--card-highest)", border: "1px solid transparent",
    color: "var(--text)", fontSize: 13, fontFamily: "var(--font)", transition: "all 0.3s",
  };
  const selectSt = { ...inputSt, cursor: "pointer" };

  const contributorLevel = (score) => {
    if (score >= 200) return { label: "Master", color: "var(--purple)" };
    if (score >= 100) return { label: "Expert", color: "var(--blue-bright)" };
    if (score >= 50) return { label: "Contributor", color: "var(--green)" };
    return { label: "Newcomer", color: "var(--muted)" };
  };
  const level = contributorLevel(stats?.contributorScore || 0);

  const navItems = [
    { key: "dashboard", icon: "📊", label: "Dashboard" },
    { key: "submit", icon: "📝", label: "Submit Question" },
    { key: "review", icon: "🔍", label: "Review Queue" },
    { key: "my-questions", icon: "📋", label: "My Questions" },
  ];

  return (
    <div className="app-layout">
      {sidebarOpen && <div className="sidebar-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 899 }} onClick={() => setSidebarOpen(false)} />}

      <aside className={`app-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, paddingLeft: 4 }}>
          <div style={{ width: 28, height: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, transform: "rotate(45deg)" }}>
            {["#ef4444", "#2563eb", "#2563eb", "#ef4444"].map((c, i) => <span key={i} style={{ borderRadius: 3, background: c }} />)}
          </div>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Prep<span style={{ color: "var(--red)" }}>Wise</span></span>
        </div>
        <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, padding: "0 4px", marginBottom: 16, fontFamily: "var(--mono)" }}>Domain Expert</div>

        {navItems.map(n => (
          <button key={n.key} className={`nav-link ${view === n.key ? "active" : ""}`} onClick={() => { setView(n.key); setSidebarOpen(false); }}>
            <span className="nav-icon">{n.icon}</span>{n.label}
          </button>
        ))}

        <div style={{ marginTop: "auto", padding: "16px 4px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,var(--green),var(--blue))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, overflow: "hidden" }}>
              {user.photoURL ? <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (user.displayName?.[0] || "D")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.displayName || "Expert"}</div>
              <div style={{ fontSize: 10, color: level.color, fontWeight: 600 }}>{level.label}</div>
            </div>
          </div>
          <button onClick={signOut} style={{ width: "100%", background: "none", border: "1px solid var(--border)", color: "var(--red)", padding: "7px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500 }}>Sign Out</button>
        </div>
      </aside>

      <main className="app-main">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, marginBottom: 16, color: "var(--text)" }}>☰</button>

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div className="fadeUp">
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px", marginBottom: 4 }}>
              Welcome, <span style={{ color: "var(--green)" }}>{user.displayName?.split(" ")[0] || "Expert"}</span>
            </h1>
            <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28 }}>Your contributions help candidates succeed</p>

            <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
              <StatCard value={stats?.questionsSubmitted || 0} label="Submitted" color="var(--blue-bright)" icon="📝" />
              <StatCard value={stats?.questionsApproved || 0} label="Approved" color="var(--green)" icon="✅" />
              <StatCard value={stats?.questionsPending || 0} label="Pending" color="var(--yellow)" icon="⏳" />
              <StatCard value={stats?.totalLearnerEngagement || 0} label="Engagements" color="var(--purple)" icon="👁️" />
            </div>

            {/* Contributor Level */}
            <div style={{ padding: 24, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, marginBottom: 24, display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${level.color}20`, border: `2px solid ${level.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🏆</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: level.color }}>{level.label}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{stats?.contributorScore || 0} contribution points</div>
                <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 6 }}>Submit and get questions approved to level up!</div>
              </div>
            </div>

            {/* Quick submit CTA */}
            <button className="card-hover" onClick={() => setView("submit")} style={{ width: "100%", padding: 24, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, cursor: "pointer", textAlign: "left", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 32 }}>📝</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Submit a New Question</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Share a real interview question from your experience</div>
              </div>
            </button>
          </div>
        )}

        {/* SUBMIT QUESTION */}
        {view === "submit" && (
          <div className="fadeUp">
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>Submit a Question</h1>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>As a domain expert, your questions are auto-approved.</p>

            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, padding: 28 }}>
              <form onSubmit={submitQuestion}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Job Role</label>
                    <input value={form.job} onChange={e => update("job", e.target.value)} placeholder="e.g. Java Developer" required style={inputSt} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Type</label>
                    <select value={form.type} onChange={e => update("type", e.target.value)} style={selectSt}>
                      {QUESTION_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Difficulty</label>
                    <select value={form.diff} onChange={e => update("diff", e.target.value)} style={selectSt}>
                      {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Experience Level</label>
                    <select value={form.exp} onChange={e => update("exp", e.target.value)} style={selectSt}>
                      {EXPERIENCE_LEVELS.map(x => <option key={x}>{x}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Question</label>
                  <textarea value={form.text} onChange={e => update("text", e.target.value)} placeholder="Type the interview question here…" required rows={4} style={{ ...inputSt, resize: "vertical", lineHeight: 1.7 }} />
                </div>
                <button className="btn-glow" type="submit" disabled={submitting} style={{
                  width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
                  background: "linear-gradient(135deg, var(--blue), #2563eb)",
                  color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "var(--font)",
                  cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1,
                }}>{submitting ? "Publishing…" : "Publish Question"}</button>
              </form>
            </div>
          </div>
        )}

        {/* REVIEW QUEUE */}
        {view === "review" && (
          <div className="fadeUp">
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>Review Queue</h1>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>{pendingQuestions.length} questions awaiting review</p>

            {pendingQuestions.length === 0 ? <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}><div style={{ fontSize: 48, marginBottom: 12 }}>✅</div><p>All caught up! No pending questions.</p></div> :
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {pendingQuestions.map((q, i) => (
                  <div key={q.id} className="card-hover" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, animation: `fadeUp 0.3s ease ${i * 80}ms both` }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                      <Badge label={q.type} cls={`tag-${q.type}`} />
                      <Badge label={q.diff} cls={`diff-${q.diff}`} />
                      <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500 }}>{q.job}</span>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.7, marginBottom: 16, color: "var(--text)" }}>{q.text}</p>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className="btn-glow" onClick={() => approveQuestion(q.id)} style={{ padding: "8px 20px", borderRadius: 10, background: "linear-gradient(135deg,var(--green),#059669)", border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)" }}>✓ Approve</button>
                      <button className="btn-secondary-hover" style={{ padding: "8px 20px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--border)", color: "var(--red)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font)" }}>✕ Reject</button>
                    </div>
                  </div>
                ))}
              </div>}
          </div>
        )}

        {/* MY QUESTIONS */}
        {view === "my-questions" && (
          <div className="fadeUp">
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>My Questions</h1>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>Questions you've submitted</p>

            {!stats?.recentSubmissions?.length ? <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}><div style={{ fontSize: 48, marginBottom: 12 }}>📝</div><p>No submissions yet. Start contributing!</p></div> :
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {stats.recentSubmissions.map((q, i) => (
                  <div key={q.id} className="card-hover" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, animation: `fadeUp 0.3s ease ${i * 80}ms both` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: "var(--text)", flex: 1 }}>{q.text}</p>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                        textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "var(--mono)",
                        background: q.status === "approved" ? "var(--green-dim)" : "rgba(245,158,11,0.1)",
                        color: q.status === "approved" ? "var(--green)" : "var(--yellow)",
                        flexShrink: 0, marginLeft: 12,
                      }}>{q.status}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{q.company} · {q.date}</span>
                  </div>
                ))}
              </div>}
          </div>
        )}
      </main>
      <Toast msg={toast.msg} visible={toast.visible} />
    </div>
  );
}
