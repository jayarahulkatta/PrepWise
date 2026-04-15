import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../AuthContext";
import { StatCard, Toast, SkeletonCard } from "../components/ui";
import QuestionCard from "../components/interview/QuestionCard";
import { apiFetch, API_BASE } from "../utils/api";
import { QUESTION_TYPES, EXPERIENCE_LEVELS, DIFFICULTIES } from "../utils/constants";

export default function DomainDashboard() {
  const { user, signOut, getToken } = useAuth();
  const [view, setView] = useState("dashboard"); // dashboard | submit | review | my-questions
  const [stats, setStats] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]); // Used just for stats/job list if needed
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Pagination & Filtering
  const [questions, setQuestions] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [filterJob, setFilterJob] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterExp, setFilterExp] = useState("");
  const [filterDiff, setFilterDiff] = useState("");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("recent");
  const [page, setPage] = useState(1);

  // Advanced features
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingQuestion, setEditingQuestion] = useState(null);


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

  // Load paginated list for "my-questions"
  useEffect(() => {
    if (view !== "my-questions") return;
    setLoaded(false);
    const params = new URLSearchParams({ company: "Genpact", page, limit: 8, sort: sortMode });
    if (filterJob) params.set("job", filterJob);
    if (filterType) params.set("type", filterType);
    if (filterExp) params.set("exp", filterExp);
    if (filterDiff) params.set("diff", filterDiff);
    if (search) params.set("search", search);

    apiFetch(`${API_BASE}/questions?${params}`).then(data => {
      setQuestions(data.questions); setTotalPages(data.totalPages); setTotal(data.total); setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [view, filterJob, filterType, filterExp, filterDiff, search, sortMode, page]);

  // Load all for job listing
  useEffect(() => {
    apiFetch(`${API_BASE}/questions/all?company=Genpact`).then(setAllQuestions).catch(() => {});
  }, []);

  // Delete handler
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

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} selected questions?`)) return;
    try {
      const token = await getToken();
      await apiFetch(`${API_BASE}/questions/bulk-delete`, { method: "POST", body: JSON.stringify({ ids: Array.from(selectedIds) }) }, token);
      setQuestions(prev => prev.filter(q => !selectedIds.has(q.id)));
      setAllQuestions(prev => prev.filter(q => !selectedIds.has(q.id)));
      setTotal(t => Math.max(0, t - selectedIds.size));
      setSelectedIds(new Set());
      showToast(`${selectedIds.size} questions deleted`);
    } catch { showToast("Bulk delete failed"); }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    try {
      const token = await getToken();
      await apiFetch(`${API_BASE}/questions/${editingQuestion.id}`, { method: "PUT", body: JSON.stringify(editingQuestion) }, token);
      setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? { ...q, ...editingQuestion } : q));
      setAllQuestions(prev => prev.map(q => q.id === editingQuestion.id ? { ...q, ...editingQuestion } : q));
      setEditingQuestion(null);
      showToast("Question updated");
    } catch { showToast("Failed to update question"); }
  };


  const submitQuestion = async (e) => {
    e.preventDefault();
    if (!form.text.trim() || !form.job.trim()) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      const payload = { ...form, isCoding: form.type === "Java & DSA" };
      const res = await apiFetch(`${API_BASE}/questions/submit`, { method: "POST", body: JSON.stringify(payload) }, token);
      showToast(res.message || "Question published!");
      setForm({ company: "Genpact", job: "", type: "Technical", diff: "Medium", exp: "Fresher", text: "" });
      // Reload stats
      const data = await apiFetch(`${API_BASE}/user/domain-stats`, {}, token);
      setStats(data);
    } catch { showToast("Failed to submit. Try again."); }
    setSubmitting(false);
  };

  // Review queue removed

  const resetFilters = () => { setFilterJob(""); setFilterType(""); setFilterExp(""); setFilterDiff(""); setSearch(""); setPage(1); };
  const jobs = [...new Set(allQuestions.map(q => q.job))];

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
    { key: "my-questions", icon: "📚", label: "Question Bank" },
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

        {/* QUESTION BANK (formerly My Questions) */}
        {view === "my-questions" && (
          <div className="fadeUp">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>Question Bank</h1>
                <p style={{ fontSize: 13, color: "var(--muted)" }}>Manage all globally available interview questions</p>
              </div>
              <span style={{ fontSize: 13, color: "var(--muted)" }}><strong style={{ color: "var(--text)" }}>{total}</strong> entries</span>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: "var(--blue-dim)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 12, marginBottom: 16, animation: "fadeUp 0.2s" }}>
                <span style={{ fontSize: 13, color: "var(--blue)", fontWeight: 600 }}>{selectedIds.size} selected</span>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setSelectedIds(new Set())} style={{ background: "transparent", border: "none", color: "var(--text2)", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>Cancel</button>
                  <button onClick={handleBulkDelete} style={{ background: "var(--red)", border: "none", color: "#fff", padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>🗑️ Delete Selected</button>
                </div>
              </div>
            )}

            {/* Filters */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>Filter:</span>
              {[
                { val: filterJob, set: setFilterJob, opts: jobs, ph: "All Roles" },
                { val: filterType, set: setFilterType, opts: QUESTION_TYPES, ph: "All Types" },
                { val: filterExp, set: setFilterExp, opts: EXPERIENCE_LEVELS, ph: "All Levels" },
                { val: filterDiff, set: setFilterDiff, opts: DIFFICULTIES, ph: "All Difficulty" },
              ].map(({ val, set, opts, ph }) => (
                <select key={ph} value={val} onChange={e => { set(e.target.value); setPage(1); }} style={selectSt}>
                  <option value="">{ph}</option>{opts.map(o => <option key={o}>{o}</option>)}
                </select>
              ))}
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--muted)" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search…" style={{ ...inputSt, paddingLeft: 32, width: 180 }} />
              </div>
              {(filterJob || filterType || filterExp || filterDiff || search) && <button onClick={resetFilters} style={{ background: "var(--red-dim)", border: "1px solid transparent", color: "var(--red)", padding: "6px 14px", borderRadius: 10, fontSize: 12, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500 }}>✕ Clear</button>}
            </div>

            {/* Results bar sorting */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { k: "recent", l: "🕐 Recent" },
                  { k: "helpful", l: "🔥 Popular" },
                  { k: "hardest", l: "🤯 Hardest" },
                  { k: "easiest", l: "🎈 Easiest" }
                ].map(({ k, l }) => (
                  <button key={k} className="btn-secondary-hover" onClick={() => { setSortMode(k); setPage(1); }} style={{ background: sortMode === k ? "var(--blue-dim)" : "transparent", border: `1px solid ${sortMode === k ? "rgba(59,130,246,0.3)" : "var(--border)"}`, color: sortMode === k ? "var(--blue)" : "var(--text2)", padding: "7px 12px", borderRadius: 10, fontSize: 11, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500 }}>{l}</button>
                ))}
              </div>
            </div>

            {!loaded ? [0, 1, 2, 3].map(i => <div key={i} style={{ marginBottom: 16, animation: `fadeUp 0.4s ease ${i * 100}ms both` }}><SkeletonCard /></div>) :
              questions.length === 0 ? <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}><div style={{ fontSize: 48, marginBottom: 12 }}>📚</div><p>No questions found.</p></div> :
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {questions.map((q, i) => (
                  <div key={q.id} style={{ animationDelay: `${i * 30}ms` }} className="fadeUp">
                    {/* Add a subtle visual hint if they authored it */}
                    {stats?.recentSubmissions?.some(rs => rs.id === q.id) && (
                      <div style={{ fontSize: 10, color: "var(--blue)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: -10, paddingLeft: 12, position: "relative", zIndex: 1 }}>⭐ Your Submission</div>
                    )}
                    <QuestionCard 
                      q={q} 
                      bookmarked={false} 
                      liked={false} 
                      onBookmark={() => {}} 
                      onLike={() => {}} 
                      onDelete={handleDelete} 
                      onEdit={setEditingQuestion}
                      onDuplicate={(oldQ) => { setForm({ company: "Genpact", job: oldQ.job, type: oldQ.type, diff: oldQ.diff, exp: oldQ.exp, text: oldQ.text }); setView("submit"); }}
                      selectable={true}
                      selected={selectedIds.has(q.id)}
                      onSelect={toggleSelect}
                      showToast={showToast} 
                      userRole="domain_expert" 
                    />
                  </div>
                ))}
              </div>}

              {/* Pagination */}
              {totalPages > 1 && <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 32, alignItems: "center" }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1).map((p, idx, arr) =>
                  <span key={p}>{idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: "var(--muted)", padding: "0 4px", fontSize: 12 }}>…</span>}
                  <button onClick={() => setPage(p)} style={{ width: 36, height: 36, borderRadius: 10, background: p === page ? "linear-gradient(135deg,var(--blue-bright),var(--blue))" : "var(--card-highest)", border: "1px solid transparent", color: p === page ? "#08090d" : "var(--text)", fontSize: 13, fontWeight: p === page ? 700 : 500, cursor: "pointer", transition: "all 0.3s" }}>{p}</button></span>
                )}
              </div>}
          </div>
        )}

      </main>
      
      {/* EDIT MODAL */}
      {editingQuestion && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="fadeUp" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 500 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Edit Question</h2>
              <button onClick={() => setEditingQuestion(null)} style={{ background: "transparent", border: "none", color: "var(--text)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={submitEdit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Job Role</label>
                  <input value={editingQuestion.job} onChange={e => setEditingQuestion(p => ({ ...p, job: e.target.value }))} required style={inputSt} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Type</label>
                  <select value={editingQuestion.type} onChange={e => setEditingQuestion(p => ({ ...p, type: e.target.value }))} style={selectSt}>
                    {QUESTION_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Difficulty</label>
                  <select value={editingQuestion.diff} onChange={e => setEditingQuestion(p => ({ ...p, diff: e.target.value }))} style={selectSt}>
                    {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Experience Level</label>
                  <select value={editingQuestion.exp} onChange={e => setEditingQuestion(p => ({ ...p, exp: e.target.value }))} style={selectSt}>
                    {EXPERIENCE_LEVELS.map(x => <option key={x}>{x}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 7, fontWeight: 500 }}>Question</label>
                <textarea value={editingQuestion.text} onChange={e => setEditingQuestion(p => ({ ...p, text: e.target.value }))} required rows={4} style={{ ...inputSt, resize: "vertical", lineHeight: 1.7 }} />
              </div>
              <button className="btn-glow" type="submit" style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: "linear-gradient(135deg, var(--blue), #2563eb)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "var(--font)", cursor: "pointer" }}>Save Changes</button>
            </form>
          </div>
        </div>
      )}

      <Toast msg={toast.msg} visible={toast.visible} />
    </div>
  );
}
