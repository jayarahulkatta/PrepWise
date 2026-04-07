import { useState, useEffect, useRef } from "react";
import { Badge, Spinner, TypingDots, ScoreBar } from "../ui";
import { callAI, apiFetch, API_BASE } from "../../utils/api";
import { SCORE_AXES, scoreColor, readinessLabel } from "../../utils/constants";

export default function MockInterview({ onClose, allQuestions, company, getToken, onSessionSaved }) {
  const [phase, setPhase] = useState("setup");
  const [role, setRole] = useState("");
  const [timeLimit, setTimeLimit] = useState(180);
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(180);
  const [feedback, setFeedback] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [scores, setScores] = useState([]);
  const [sessionStart, setSessionStart] = useState(null);
  const [savingSession, setSavingSession] = useState(false);
  const [skippedCount, setSkippedCount] = useState(0);
  const timerRef = useRef(null);

  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
  const selectSt = {
    background: "var(--card-highest)", border: "1px solid transparent",
    color: "var(--text)", padding: "9px 14px", borderRadius: 10,
    fontSize: 13, fontFamily: "var(--font)", width: "100%",
    outline: "none", cursor: "pointer", transition: "all 0.3s",
  };
  const primaryBtn = {
    padding: "10px 22px", borderRadius: 12,
    background: "linear-gradient(135deg, var(--blue), #2563eb)",
    border: "none", color: "#fff", fontSize: 13, fontWeight: 600,
    fontFamily: "var(--font)", cursor: "pointer",
    boxShadow: "0 2px 12px rgba(59,130,246,0.25)",
  };
  const secondaryBtn = {
    padding: "10px 22px", borderRadius: 12,
    background: "var(--card)", border: "1px solid var(--border)",
    color: "var(--text2)", fontSize: 13, fontWeight: 500,
    fontFamily: "var(--font)", cursor: "pointer",
  };

  const start = () => {
    let pool = role ? allQuestions.filter(q => q.job === role) : allQuestions;
    if (pool.length < count) pool = allQuestions;
    setQuestions(shuffle(pool).slice(0, count));
    setIdx(0); setUserAnswer(""); setFeedback(null); setScores([]); setSkippedCount(0);
    setTimeLeft(timeLimit); setSessionStart(Date.now()); setPhase("active");
  };

  useEffect(() => {
    if (phase !== "active" || feedback) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); submitAnswer(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line
  }, [phase, idx, feedback]);

  const submitAnswer = async () => {
    clearInterval(timerRef.current);
    setLoadingFeedback(true);
    const q = questions[idx];
    const ans = userAnswer.trim();
    try {
      const raw = await callAI([{
        role: "user",
        content: `You are an experienced ${company || "company"} interviewer. Evaluate this answer using 6 axes.\nQuestion: "${q.text}"\nRole: ${q.job}\nAnswer: "${ans || "(no answer)"}"\n\nReturn ONLY valid JSON:\n{"technicalAccuracy":<0-100>,"communicationClarity":<0-100>,"structureOrganization":<0-100>,"depthOfExamples":<0-100>,"roleRelevance":<0-100>,"overallImpression":<0-100>,"strengths":["str1","str2"],"improvements":[{"area":"name","issue":"what","suggestion":"how"}],"feedback":"2-3 sentence coaching"}`
      }], "evaluate");
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      const scoreEntry = { ...parsed, qid: q.id, questionText: q.text, skipped: false };
      setScores(prev => [...prev, scoreEntry]);
      setFeedback(parsed);
    } catch {
      const fb = {
        technicalAccuracy: 50, communicationClarity: 50, structureOrganization: 50,
        depthOfExamples: 40, roleRelevance: 50, overallImpression: 45,
        strengths: ["Attempted the question"], improvements: [{ area: "Connection", issue: "Could not get AI feedback", suggestion: "Keep practicing!" }],
        feedback: "Could not evaluate. Keep practicing!",
      };
      setScores(prev => [...prev, { ...fb, qid: q.id, questionText: q.text, skipped: false }]);
      setFeedback(fb);
    }
    setLoadingFeedback(false);
  };

  const skip = () => {
    const q = questions[idx];
    setScores(prev => [...prev, {
      qid: q.id, questionText: q.text, skipped: true,
      technicalAccuracy: 0, communicationClarity: 0, structureOrganization: 0,
      depthOfExamples: 0, roleRelevance: 0, overallImpression: 0,
      strengths: [], improvements: [], feedback: "Question skipped.",
    }]);
    setSkippedCount(s => s + 1);
    next();
  };

  const next = () => {
    if (idx + 1 >= questions.length) { handleResults(); return; }
    setIdx(idx + 1); setUserAnswer(""); setFeedback(null); setTimeLeft(timeLimit);
  };

  const handleResults = async () => {
    setPhase("results");
    // Save session to backend
    try {
      setSavingSession(true);
      const token = await getToken();
      const sessionData = {
        company: company || "Genpact",
        role: role || "General",
        scores: scores.map(s => ({
          questionId: s.qid,
          questionText: s.questionText,
          technicalAccuracy: s.technicalAccuracy || 0,
          communicationClarity: s.communicationClarity || 0,
          structureOrganization: s.structureOrganization || 0,
          depthOfExamples: s.depthOfExamples || 0,
          roleRelevance: s.roleRelevance || 0,
          overallImpression: s.overallImpression || 0,
          feedback: s.feedback || "",
          strengths: s.strengths || [],
          improvements: s.improvements || [],
          skipped: s.skipped || false,
        })),
        sessionDurationSec: Math.floor((Date.now() - sessionStart) / 1000),
        questionsAttempted: scores.filter(s => !s.skipped).length,
        questionsSkipped: skippedCount,
      };
      await apiFetch(`${API_BASE}/user/mock-sessions`, { method: "POST", body: JSON.stringify(sessionData) }, token);
      if (onSessionSaved) onSessionSaved();
    } catch (err) {
      console.error("Failed to save session:", err);
    }
    setSavingSession(false);
  };

  const avg = k => {
    const valid = scores.filter(s => !s.skipped);
    return valid.length ? Math.round(valid.reduce((s, x) => s + (x[k] || 0), 0) / valid.length) : 0;
  };

  const readiness = () => {
    const weights = { technicalAccuracy: 0.25, communicationClarity: 0.20, structureOrganization: 0.15, depthOfExamples: 0.20, roleRelevance: 0.10, overallImpression: 0.10 };
    return Math.round(SCORE_AXES.reduce((sum, a) => sum + avg(a.key) * (weights[a.key] || 0), 0));
  };

  const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
  const tc = timeLeft <= 30 ? "var(--red)" : timeLeft <= 60 ? "var(--yellow)" : "var(--text)";
  const q = questions[idx];

  // Find best and worst questions
  const bestQ = scores.filter(s => !s.skipped).sort((a, b) => (b.overallImpression || 0) - (a.overallImpression || 0))[0];
  const worstQ = scores.filter(s => !s.skipped).sort((a, b) => (a.overallImpression || 0) - (b.overallImpression || 0))[0];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 750 }}>
        <button onClick={onClose} className="modal-close">×</button>

        {/* SETUP PHASE */}
        {phase === "setup" && <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 28 }}>⏱️</span>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px" }}>Mock Interview {company && `— ${company}`}</h2>
              <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>Timed practice with AI coaching on 6 performance axes.</p>
            </div>
          </div>
          <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
            {[
              { label: "Role", el: <select value={role} onChange={e => setRole(e.target.value)} style={selectSt}><option value="">Any Role</option>{[...new Set(allQuestions.map(q => q.job))].map(j => <option key={j}>{j}</option>)}</select> },
              { label: "Time per question", el: <select value={timeLimit} onChange={e => setTimeLimit(+e.target.value)} style={selectSt}><option value={120}>2 min</option><option value={180}>3 min</option><option value={300}>5 min</option></select> },
              { label: "Questions", el: <select value={count} onChange={e => setCount(+e.target.value)} style={selectSt}><option value={3}>3</option><option value={5}>5</option><option value={10}>10</option></select> },
            ].map(({ label, el }) => <div key={label}><label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6, fontWeight: 500 }}>{label}</label>{el}</div>)}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            <button className="btn-glow" onClick={start} style={{ ...primaryBtn, flex: 1 }}>Start Interview</button>
            <button className="btn-secondary-hover" onClick={onClose} style={{ ...secondaryBtn, flex: 1 }}>Cancel</button>
          </div>
        </div>}

        {/* ACTIVE PHASE */}
        {phase === "active" && q && <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg,var(--blue),var(--green))", borderRadius: 4, width: `${(idx / questions.length) * 100}%`, transition: "width 0.6s" }} />
            </div>
            <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", fontWeight: 500 }}>{idx + 1}/{questions.length}</span>
          </div>
          <div style={{ fontSize: 52, fontWeight: 800, fontFamily: "var(--mono)", textAlign: "center", color: tc, marginBottom: 20, letterSpacing: "-2px", textShadow: timeLeft <= 30 ? "0 0 20px var(--red)" : "none", transition: "all 0.3s" }}>{m}:{String(s).padStart(2, "0")}</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}><Badge label={q.type} cls={`tag-${q.type}`} /><Badge label={q.diff} cls={`diff-${q.diff}`} /></div>
          <p style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.7, marginBottom: 20 }}>{q.text}</p>
          <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)} placeholder="Type your answer…" style={{ width: "100%", background: "var(--card-highest)", border: "1px solid transparent", color: "var(--text)", borderRadius: 14, padding: 16, fontSize: 13, fontFamily: "var(--font)", resize: "vertical", minHeight: 140, outline: "none", lineHeight: 1.8 }} />
          {!feedback && !loadingFeedback && <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn-glow" onClick={submitAnswer} style={{ ...primaryBtn, flex: 1 }}>Submit & Get Feedback</button>
            <button className="btn-secondary-hover" onClick={skip} style={{ ...secondaryBtn, flex: 1 }}>Skip →</button>
          </div>}
          {loadingFeedback && <div style={{ marginTop: 18, textAlign: "center", color: "var(--text2)", fontSize: 13, padding: 12 }}><TypingDots /> <span style={{ marginLeft: 8 }}>Analyzing your answer across 6 axes…</span></div>}
          {feedback && <div className="fadeUp" style={{ marginTop: 20, padding: 20, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 16 }}>
            {/* 6-axis scores */}
            <div style={{ marginBottom: 16 }}>
              {SCORE_AXES.map(a => (
                <ScoreBar key={a.key} value={feedback[a.key] || 0} color={scoreColor(feedback[a.key] || 0)} label={a.label} icon={a.icon} />
              ))}
            </div>
            {/* Strengths */}
            {feedback.strengths?.length > 0 && <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: 1 }}>Strengths</span>
              {feedback.strengths.map((s, i) => <div key={i} style={{ fontSize: 12, color: "var(--text2)", marginTop: 4, display: "flex", gap: 6 }}><span style={{ color: "var(--green)" }}>✓</span>{s}</div>)}
            </div>}
            {/* Improvements */}
            {feedback.improvements?.length > 0 && <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--yellow)", textTransform: "uppercase", letterSpacing: 1 }}>To Improve</span>
              {feedback.improvements.map((imp, i) => <div key={i} style={{ fontSize: 12, color: "var(--text2)", marginTop: 6, padding: 10, background: "var(--card)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <strong style={{ color: "var(--yellow)", fontSize: 11 }}>{imp.area}:</strong> {imp.issue}
                <div style={{ marginTop: 4, color: "var(--blue-bright)", fontSize: 11 }}>💡 {imp.suggestion}</div>
              </div>)}
            </div>}
            <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text2)" }}>{feedback.feedback}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn-glow" onClick={next} style={{ ...primaryBtn, flex: 1 }}>{idx + 1 >= questions.length ? "See Results" : "Next →"}</button>
              <button className="btn-secondary-hover" onClick={onClose} style={{ ...secondaryBtn, flex: 1 }}>End</button>
            </div>
          </div>}
        </div>}

        {/* RESULTS PHASE */}
        {phase === "results" && <div>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 56, marginBottom: 12, animation: "float 2s ease-in-out infinite" }}>🎉</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Session Complete!</h2>
            <p style={{ fontSize: 13, color: "var(--text2)" }}>{questions.length} questions · {scores.filter(s => !s.skipped).length} answered · {skippedCount} skipped</p>
          </div>

          {/* Readiness Score */}
          <div style={{ textAlign: "center", marginBottom: 28, padding: 24, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20 }}>
            <div style={{ fontSize: 48, fontWeight: 800, fontFamily: "var(--mono)", color: scoreColor(readiness()), letterSpacing: "-2px" }}>{readiness()}<span style={{ fontSize: 20, color: "var(--muted)" }}>/100</span></div>
            <div style={{ fontSize: 14, color: scoreColor(readiness()), fontWeight: 600, marginTop: 4 }}>{readinessLabel(readiness())}</div>
          </div>

          {/* 6-axis breakdown */}
          <div style={{ marginBottom: 24, padding: 20, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16 }}>
            <h3 style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted)", marginBottom: 16, fontFamily: "var(--mono)" }}>Score Breakdown</h3>
            {SCORE_AXES.map(a => (
              <ScoreBar key={a.key} value={avg(a.key)} color={scoreColor(avg(a.key))} label={a.label} icon={a.icon} />
            ))}
          </div>

          {/* Best & Worst */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            {bestQ && <div style={{ padding: 16, background: "var(--green-dim)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: 1 }}>🏆 Best Answer</span>
              <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 6, lineHeight: 1.6 }}>{bestQ.questionText?.slice(0, 80)}…</p>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", fontFamily: "var(--mono)" }}>{bestQ.overallImpression}/100</span>
            </div>}
            {worstQ && worstQ !== bestQ && <div style={{ padding: 16, background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--red)", textTransform: "uppercase", letterSpacing: 1 }}>⚠️ Needs Work</span>
              <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 6, lineHeight: 1.6 }}>{worstQ.questionText?.slice(0, 80)}…</p>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", fontFamily: "var(--mono)" }}>{worstQ.overallImpression}/100</span>
            </div>}
          </div>

          {savingSession && <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", marginBottom: 12 }}><Spinner /> Saving session…</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn-glow" onClick={() => { setPhase("setup"); setScores([]); }} style={primaryBtn}>Practice Again</button>
            <button className="btn-secondary-hover" onClick={onClose} style={secondaryBtn}>Close</button>
          </div>
        </div>}
      </div>
    </div>
  );
}
