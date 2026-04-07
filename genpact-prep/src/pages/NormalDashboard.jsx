import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../AuthContext";
import { SkeletonCard, Toast, StatCard, ScoreBar } from "../components/ui";
import QuestionCard from "../components/interview/QuestionCard";
import MockInterview from "../components/interview/MockInterview";
import ChatSimulator from "../components/interview/ChatSimulator";
import { apiFetch, API_BASE } from "../utils/api";
import { scoreColor, readinessLabel, daysUntil, SCORE_AXES, QUESTION_TYPES, EXPERIENCE_LEVELS, DIFFICULTIES, formatTimeAgo } from "../utils/constants";

export default function NormalDashboard() {
  const { user, profile: authProfile, signOut, getToken } = useAuth();
  const [profile, setProfile] = useState(null);
  const isDomain = (authProfile?.role === 'domain' || authProfile?.role === 'admin');
  const [view, setView] = useState("dashboard"); // dashboard | practice | mock | chat | history | saved | submit
  const [loaded, setLoaded] = useState(false);

  // Questions
  const [questions, setQuestions] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [companyMeta, setCompanyMeta] = useState(null);

  // Filters
  const [filterJob, setFilterJob] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterExp, setFilterExp] = useState("");
  const [filterDiff, setFilterDiff] = useState("");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("helpful");
  const [page, setPage] = useState(1);

  // User data
  const [bookmarks, setBookmarks] = useState(new Set());
  const [likes, setLikes] = useState(new Set());

  // Modals
  const [showMock, setShowMock] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Submit form (domain only)
  const [submitForm, setSubmitForm] = useState({ company: "Genpact", job: "", type: "Technical", diff: "Medium", exp: "Fresher", text: "" });
  const [submitting, setSubmitting] = useState(false);
  const updateForm = (k, v) => setSubmitForm(prev => ({ ...prev, [k]: v }));

  // History
  const [sessions, setSessions] = useState([]);

  // Toast
  const [toast, setToast] = useState({ msg: "", visible: false });
  const toastRef = useRef(null);
  const showToast = useCallback(msg => { clearTimeout(toastRef.current); setToast({ msg, visible: true }); toastRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500); }, []);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const company = "Genpact";

  // Load profile
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const p = await apiFetch(`${API_BASE}/user/profile`, {}, token);
        setProfile(p);
        setBookmarks(new Set(p.bookmarks));
        setLikes(new Set(p.likes));
      } catch { }
    })();
  }, [getToken]);

  // Load company meta
  useEffect(() => { apiFetch(`${API_BASE}/companies/${company}`).then(setCompanyMeta).catch(console.error); }, []);

  // Load questions
  useEffect(() => {
    const params = new URLSearchParams({ company, page, limit: 8, sort: sortMode });
    if (filterJob) params.set("job", filterJob);
    if (filterType) params.set("type", filterType);
    if (filterExp) params.set("exp", filterExp);
    if (filterDiff) params.set("diff", filterDiff);
    if (search) params.set("search", search);
    apiFetch(`${API_BASE}/questions?${params}`).then(data => {
      setQuestions(data.questions); setTotalPages(data.totalPages); setTotal(data.total); setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [filterJob, filterType, filterExp, filterDiff, search, sortMode, page]);

  // Load ALL questions for mock/chat
  useEffect(() => { apiFetch(`${API_BASE}/questions/all?company=${company}`).then(setAllQuestions).catch(console.error); }, []);

  // Load sessions when viewing history
  useEffect(() => {
    if (view !== "history") return;
    (async () => {
      try {
        const token = await getToken();
        const data = await apiFetch(`${API_BASE}/user/mock-sessions`, {}, token);
        setSessions(data.sessions || []);
      } catch { }
    })();
  }, [view, getToken]);

  const onBookmark = useCallback(async (id) => {
    try { const token = await getToken(); const res = await apiFetch(`${API_BASE}/user/bookmarks`, { method: "PUT", body: JSON.stringify({ questionId: id }) }, token); setBookmarks(new Set(res.bookmarks)); } catch { showToast("Failed to bookmark"); }
  }, [getToken, showToast]);

  const onLike = useCallback(async (id) => {
    try { const token = await getToken(); await apiFetch(`${API_BASE}/questions/${id}/vote`, { method: "POST", body: JSON.stringify({ direction: "up" }) }, token); const res = await apiFetch(`${API_BASE}/user/likes`, { method: "PUT", body: JSON.stringify({ questionId: id }) }, token); setLikes(new Set(res.likes)); } catch { showToast("Failed to vote"); }
  }, [getToken, showToast]);

  const resetFilters = () => { setFilterJob(""); setFilterType(""); setFilterExp(""); setFilterDiff(""); setSearch(""); setPage(1); };

  const reloadProfile = async () => {
    try { const token = await getToken(); const p = await apiFetch(`${API_BASE}/user/profile`, {}, token); setProfile(p); } catch { }
  };

  // Delete handler (domain only)
  const handleDelete = useCallback(async (id) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      const token = await getToken();
      await apiFetch(`${API_BASE}/questions/${id}`, { method: "DELETE" }, token);
      setQuestions(prev => prev.filter(q => q.id !== id));
      setAllQuestions(prev => prev.filter(q => q.id !== id));
      setTotal(t => Math.max(0, t - 1));
      showToast("Question deleted");
    } catch { showToast("Failed to delete question"); }
  }, [getToken, showToast]);

  // Submit handler (domain only)
  const submitQuestion = async (e) => {
    e.preventDefault();
    if (!submitForm.text.trim() || !submitForm.job.trim()) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await apiFetch(`${API_BASE}/questions/submit`, { method: "POST", body: JSON.stringify(submitForm) }, token);
      showToast("Question published!");
      setSubmitForm({ company: "Genpact", job: "", type: "Technical", diff: "Medium", exp: "Fresher", text: "" });
      // Refresh question list
      const params = new URLSearchParams({ company, page: 1, limit: 8, sort: sortMode });
      const data = await apiFetch(`${API_BASE}/questions?${params}`);
      setQuestions(data.questions); setTotalPages(data.totalPages); setTotal(data.total);
      apiFetch(`${API_BASE}/questions/all?company=${company}`).then(setAllQuestions).catch(console.error);
    } catch { showToast("Failed to submit. Try again."); }
    setSubmitting(false);
  };

  const jobs = [...new Set(allQuestions.map(q => q.job))];
  const bookmarkedQs = allQuestions.filter(q => bookmarks.has(q.id));
  const daysLeft = daysUntil(profile?.prepProfile?.interviewDate);

  const filterSS = {
    background: "var(--card-highest)", border: "1px solid transparent",
    color: "var(--text)", padding: "9px 30px 9px 14px", borderRadius: 12,
    fontSize: 13, fontFamily: "var(--font)", cursor: "pointer",
    outline: "none", appearance: "none", transition: "all 0.3s",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
  };

  const navItems = [
    { key: "dashboard", icon: "📊", label: "Dashboard" },
    { key: "practice", icon: "📝", label: "Practice" },
    ...(isDomain ? [{ key: "submit", icon: "➕", label: "Submit Q" }] : []),
    { key: "history", icon: "📈", label: "History" },
    { key: "saved", icon: "🔖", label: `Saved (${bookmarks.size})` },
  ];

  return (
    <div className="app-layout">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 899 }} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, paddingLeft: 4 }}>
          <div style={{ width: 28, height: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, transform: "rotate(45deg)" }}>
            {["#ef4444", "#2563eb", "#2563eb", "#ef4444"].map((c, i) => <span key={i} style={{ borderRadius: 3, background: c }} />)}
          </div>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Prep<span style={{ color: "var(--red)" }}>Wise</span></span>
        </div>

        {navItems.map(n => (
          <button key={n.key} className={`nav-link ${view === n.key ? "active" : ""}`} onClick={() => { setView(n.key); setSidebarOpen(false); }}>
            <span className="nav-icon">{n.icon}</span>{n.label}
          </button>
        ))}

        <div style={{ borderTop: "1px solid var(--border)", margin: "12px 0", paddingTop: 12 }}>
          <button className="nav-link" onClick={() => { setShowMock(true); setSidebarOpen(false); }}><span className="nav-icon">⏱️</span>Mock Interview</button>
          <button className="nav-link" onClick={() => { setShowChat(true); setSidebarOpen(false); }}><span className="nav-icon">💬</span>AI Chat</button>
        </div>

        <div style={{ marginTop: "auto", padding: "16px 4px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,var(--blue-bright),var(--blue))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, overflow: "hidden" }}>
              {user.photoURL ? <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (user.displayName?.[0] || "U")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.displayName || "User"}</div>
              <div style={{ fontSize: 10, color: isDomain ? "var(--green)" : "var(--muted)" }}>{isDomain ? "Domain Expert" : "Interview Prep"}</div>
            </div>
          </div>
          <button onClick={signOut} style={{ width: "100%", background: "none", border: "1px solid var(--border)", color: "var(--red)", padding: "7px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500 }}>Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <main className="app-main">
        {/* Mobile menu button */}
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, marginBottom: 16, color: "var(--text)" }}>☰</button>

        {/* DASHBOARD VIEW */}
        {view === "dashboard" && (
          <div className="fadeUp">
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px", marginBottom: 4 }}>
                Welcome back, <span style={{ color: "var(--blue-bright)" }}>{user.displayName?.split(" ")[0] || "there"}</span>
              </h1>
              <p style={{ fontSize: 14, color: "var(--muted)" }}>
                {profile?.prepProfile?.targetRole ? `Preparing for ${profile.prepProfile.targetRole} at Genpact` : "Your AI interview coach"}
                {daysLeft && <span style={{ color: "var(--yellow)", fontWeight: 600 }}> · {daysLeft} days until interview</span>}
              </p>
            </div>

            {/* Stats */}
            <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
              <StatCard value={profile?.readinessScore || 0} label="Readiness" color={scoreColor(profile?.readinessScore || 0)} icon="🎯" />
              <StatCard value={profile?.totalPracticeSessions || 0} label="Sessions" color="var(--blue-bright)" icon="📝" />
              <StatCard value={profile?.streakDays || 0} label="Day Streak" color="var(--yellow)" icon="🔥" />
              <StatCard value={bookmarks.size} label="Saved" color="var(--red)" icon="🔖" />
            </div>

            {/* Readiness breakdown */}
            {profile?.readinessScore > 0 && (
              <div style={{ padding: 24, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Your Readiness</h3>
                    <p style={{ fontSize: 12, color: "var(--muted)" }}>Based on your last 5 sessions</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "var(--mono)", color: scoreColor(profile.readinessScore), letterSpacing: "-2px" }}>{profile.readinessScore}</div>
                    <div style={{ fontSize: 11, color: scoreColor(profile.readinessScore), fontWeight: 600 }}>{readinessLabel(profile.readinessScore)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
              <button className="card-hover" onClick={() => setShowMock(true)} style={{ padding: 24, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, cursor: "pointer", textAlign: "left", fontFamily: "var(--font)" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>⏱️</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Mock Interview</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Timed practice with 6-axis coaching</div>
              </button>
              <button className="card-hover" onClick={() => setShowChat(true)} style={{ padding: 24, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, cursor: "pointer", textAlign: "left", fontFamily: "var(--font)" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>AI Interviewer</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Live conversation with debrief</div>
              </button>
            </div>

            {/* Company info */}
            {companyMeta && (
              <div className="card-hover" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
                <h3 style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted)", marginBottom: 16, fontFamily: "var(--mono)" }}>Genpact Interview Process</h3>
                {companyMeta.process?.map(({ n, h, p }) => (
                  <div key={n} style={{ display: "flex", gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid var(--border)" }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--blue-dim)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--blue)", fontFamily: "var(--mono)", flexShrink: 0 }}>{n}</div>
                    <div><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{h}</div><div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>{p}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PRACTICE VIEW */}
        {view === "practice" && (
          <div className="fadeUp">
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>Question Bank</h1>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>Real interview questions from Genpact interviews</p>

            {/* Filters */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>Filter:</span>
              {[
                { val: filterJob, set: setFilterJob, opts: jobs, ph: "All Roles" },
                { val: filterType, set: setFilterType, opts: QUESTION_TYPES, ph: "All Types" },
                { val: filterExp, set: setFilterExp, opts: EXPERIENCE_LEVELS, ph: "All Levels" },
                { val: filterDiff, set: setFilterDiff, opts: DIFFICULTIES, ph: "All Difficulty" },
              ].map(({ val, set, opts, ph }) => (
                <select key={ph} value={val} onChange={e => { set(e.target.value); setPage(1); }} style={filterSS}>
                  <option value="">{ph}</option>{opts.map(o => <option key={o}>{o}</option>)}
                </select>
              ))}
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--muted)" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search…" style={{ ...filterSS, paddingLeft: 32, width: 220, backgroundImage: "none" }} />
              </div>
              {(filterJob || filterType || filterExp || filterDiff || search) && <button onClick={resetFilters} style={{ background: "var(--red-dim)", border: "1px solid transparent", color: "var(--red)", padding: "6px 14px", borderRadius: 10, fontSize: 12, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500 }}>✕ Clear</button>}
            </div>

            {/* Results bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Showing <strong style={{ color: "var(--text)" }}>{questions.length}</strong> of <strong style={{ color: "var(--text)" }}>{total}</strong></span>
              <div style={{ display: "flex", gap: 8 }}>
                {["helpful", "recent"].map(m => <button key={m} className="btn-secondary-hover" onClick={() => { setSortMode(m); setPage(1); }} style={{ background: sortMode === m ? "var(--blue-dim)" : "transparent", border: `1px solid ${sortMode === m ? "rgba(59,130,246,0.3)" : "var(--border)"}`, color: sortMode === m ? "var(--blue)" : "var(--text2)", padding: "7px 16px", borderRadius: 10, fontSize: 12, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500 }}>{m === "helpful" ? "🔥 Popular" : "🕐 Recent"}</button>)}
              </div>
            </div>

            {/* Question list */}
            {!loaded ? [0, 1, 2, 3].map(i => <div key={i} style={{ marginBottom: 16, animation: `fadeUp 0.4s ease ${i * 100}ms both` }}><SkeletonCard /></div>) :
              questions.length === 0 ? <div style={{ textAlign: "center", padding: 72, color: "var(--muted)", fontSize: 14 }}>No questions match your filters.</div> :
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {questions.map((q, i) => <div key={q.id} style={{ animationDelay: `${i * 50}ms` }} className="fadeUp"><QuestionCard q={q} bookmarked={bookmarks.has(q.id)} liked={likes.has(q.id)} onBookmark={onBookmark} onLike={onLike} onDelete={isDomain ? handleDelete : undefined} showToast={showToast} userRole={authProfile?.role} /></div>)}
                </div>}

            {/* Pagination */}
            {totalPages > 1 && <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 32, alignItems: "center" }}>
              {page > 1 && <button onClick={() => setPage(p => p - 1)} style={pageBtn(false)}>←</button>}
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1).map((p, idx, arr) =>
                <span key={p}>{idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: "var(--muted)", padding: "0 4px", fontSize: 12 }}>…</span>}<button onClick={() => setPage(p)} style={pageBtn(p === page)}>{p}</button></span>
              )}
              {page < totalPages && <button onClick={() => setPage(p => p + 1)} style={pageBtn(false)}>→</button>}
            </div>}
          </div>
        )}

        {/* HISTORY VIEW */}
        {view === "history" && (
          <div className="fadeUp">
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>Practice History</h1>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>Track your improvement over time</p>

            {sessions.length === 0 ? <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}><div style={{ fontSize: 48, marginBottom: 12 }}>📈</div><p>No sessions yet. Take a mock interview to start tracking!</p></div> :
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {sessions.map((s, i) => (
                  <div key={s._id || i} className="card-hover" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, animation: `fadeUp 0.3s ease ${i * 80}ms both` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{s.role || "General"}</span>
                        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>{s.company}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--mono)", color: scoreColor(s.readinessScore || 0), letterSpacing: "-1px" }}>{s.readinessScore || 0}</span>
                        <span style={{ fontSize: 10, color: "var(--muted)" }}>{formatTimeAgo(s.date)}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 11, color: "var(--text2)" }}>{s.questionsAttempted || 0} answered</span>
                      {s.questionsSkipped > 0 && <span style={{ fontSize: 11, color: "var(--yellow)" }}>{s.questionsSkipped} skipped</span>}
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{Math.floor((s.sessionDurationSec || 0) / 60)}m {(s.sessionDurationSec || 0) % 60}s</span>
                    </div>
                    {s.averages && <div>
                      {SCORE_AXES.slice(0, 3).map(a => (
                        <ScoreBar key={a.key} value={s.averages[a.key] || 0} color={scoreColor(s.averages[a.key] || 0)} label={a.label} icon={a.icon} />
                      ))}
                    </div>}
                  </div>
                ))}
              </div>}
          </div>
        )}

        {/* SUBMIT VIEW (domain only) */}
        {isDomain && view === "submit" && (
          <div className="fadeUp">
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>Submit a Question</h1>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>As a domain expert, your questions are auto-approved.</p>

            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, padding: 28 }}>
              <form onSubmit={submitQuestion}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Job Role</label>
                    <input value={submitForm.job} onChange={e => updateForm("job", e.target.value)} placeholder="e.g. Java Developer" required style={{ ...filterSS, backgroundImage: "none", width: "100%" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Type</label>
                    <select value={submitForm.type} onChange={e => updateForm("type", e.target.value)} style={{ ...filterSS, width: "100%" }}>
                      {QUESTION_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Difficulty</label>
                    <select value={submitForm.diff} onChange={e => updateForm("diff", e.target.value)} style={{ ...filterSS, width: "100%" }}>
                      {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Experience Level</label>
                    <select value={submitForm.exp} onChange={e => updateForm("exp", e.target.value)} style={{ ...filterSS, width: "100%" }}>
                      {EXPERIENCE_LEVELS.map(x => <option key={x}>{x}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Question</label>
                  <textarea value={submitForm.text} onChange={e => updateForm("text", e.target.value)} placeholder="Type the interview question here…" required rows={4} style={{ ...filterSS, backgroundImage: "none", width: "100%", resize: "vertical", lineHeight: 1.7 }} />
                </div>
                <button className="btn-glow" type="submit" disabled={submitting} style={{
                  width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
                  background: "linear-gradient(135deg, var(--blue), #2563eb)",
                  color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "var(--font)",
                  cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1,
                  boxShadow: "0 4px 20px rgba(59,130,246,0.3)",
                }}>{submitting ? "Publishing…" : "Publish Question"}</button>
              </form>
            </div>
          </div>
        )}

        {/* SAVED VIEW */}
        {view === "saved" && (
          <div className="fadeUp">
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>Saved Questions</h1>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>{bookmarks.size} bookmarked questions</p>
            {bookmarkedQs.length === 0 ? <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}><div style={{ fontSize: 48, marginBottom: 12 }}>🔖</div><p>No bookmarks yet. Click 🔖 on any question to save it.</p></div> :
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {bookmarkedQs.map((q, i) => <div key={q.id} className="fadeUp" style={{ animationDelay: `${i * 60}ms` }}><QuestionCard q={q} bookmarked={true} liked={likes.has(q.id)} onBookmark={onBookmark} onLike={onLike} onDelete={isDomain ? handleDelete : undefined} showToast={showToast} userRole={authProfile?.role} /></div>)}
              </div>}
          </div>
        )}
      </main>

      {/* MODALS */}
      {showMock && <MockInterview onClose={() => setShowMock(false)} allQuestions={allQuestions} company={company} getToken={getToken} onSessionSaved={reloadProfile} />}
      {showChat && <ChatSimulator onClose={() => setShowChat(false)} company={company} getToken={getToken} />}
      <Toast msg={toast.msg} visible={toast.visible} />
    </div>
  );
}

function pageBtn(active) {
  return {
    width: 36, height: 36, borderRadius: 10,
    background: active ? "linear-gradient(135deg,var(--blue-bright),var(--blue))" : "var(--card-highest)",
    border: "1px solid transparent", color: active ? "#08090d" : "var(--text)",
    fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font)", transition: "all 0.3s",
    boxShadow: active ? "0 4px 16px rgba(37,99,235,0.3)" : "none",
  };
}
