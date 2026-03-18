import { useState, useEffect, useRef, useCallback } from "react";

let QUESTIONS = [];

const API_BASE = "http://localhost:5000/api";
const PAGE_SIZE = 8;

// ─── API HELPER ─────────────────────────────────────────────────────────────
async function fetchQuestions() {
  const res = await fetch(`${API_BASE}/questions`);
  if (!res.ok) throw new Error("Failed to load questions");
  QUESTIONS = await res.json();
}

async function callClaude(messages, maxTokens = 800) {
  const isEval = messages.length === 1 && messages[0].content.includes("Respond ONLY with valid JSON");
  const endpoint = isEval ? `${API_BASE}/evaluate` : `${API_BASE}/generate`;
  
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.content;
}

// ─── STYLES ─────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

* { margin:0; padding:0; box-sizing:border-box; }

:root {
  --bg: #0b0d13;
  --surface: #111318;
  --card: #161921;
  --card-hover: #1c1f2a;
  --border: #222632;
  --border-hover: #2e3447;
  --red: #e84b3a;
  --red-dim: rgba(232,75,58,0.12);
  --blue: #3d7de8;
  --blue-dim: rgba(61,125,232,0.12);
  --green: #00c896;
  --green-dim: rgba(0,200,150,0.1);
  --yellow: #f5a623;
  --purple: #a855f7;
  --text: #eaedf5;
  --text2: #9aa3b8;
  --muted: #555f78;
  --font: 'Sora', sans-serif;
  --mono: 'IBM Plex Mono', monospace;
  --shadow: 0 4px 24px rgba(0,0,0,0.5);
  --radius: 12px;
}

body { font-family:var(--font); background:var(--bg); color:var(--text); }

/* scrollbar */
::-webkit-scrollbar { width:5px; height:5px; }
::-webkit-scrollbar-track { background:var(--bg); }
::-webkit-scrollbar-thumb { background:var(--border); border-radius:3px; }

/* animations */
@keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
@keyframes spin { to{transform:rotate(360deg)} }
@keyframes blink { 50%{opacity:0} }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
@keyframes dot1 { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
@keyframes dot2 { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} animation-delay:0.16s }
@keyframes dot3 { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} animation-delay:0.32s }

.fadeUp { animation: fadeUp 0.35s ease both; }
.fadeIn { animation: fadeIn 0.25s ease both; }
.spin { animation: spin 0.8s linear infinite; display:inline-block; }

/* tag colors */
.tag-Technical { background:rgba(61,125,232,0.14); color:#6ea8fe; border:1px solid rgba(61,125,232,0.25); }
.tag-HR { background:rgba(232,75,58,0.12); color:#f87171; border:1px solid rgba(232,75,58,0.25); }
.tag-Background { background:rgba(168,85,247,0.12); color:#c084fc; border:1px solid rgba(168,85,247,0.25); }
.tag-Behavioral { background:rgba(245,166,35,0.12); color:#fbbf24; border:1px solid rgba(245,166,35,0.25); }
.diff-Easy { background:rgba(0,200,150,0.1); color:#34d399; border:1px solid rgba(0,200,150,0.2); }
.diff-Medium { background:rgba(245,166,35,0.1); color:#fbbf24; border:1px solid rgba(245,166,35,0.2); }
.diff-Hard { background:rgba(232,75,58,0.1); color:#f87171; border:1px solid rgba(232,75,58,0.2); }
`;

// ─── SMALL COMPONENTS ───────────────────────────────────────────────────────
const Badge = ({ label, cls }) => (
  <span style={{
    fontSize:10, fontWeight:600, padding:"3px 9px", borderRadius:20,
    textTransform:"uppercase", letterSpacing:"0.5px", fontFamily:"var(--mono)",
    display:"inline-block",
  }} className={cls}>{label}</span>
);

const IconBtn = ({ onClick, title, active, children, color }) => (
  <button onClick={onClick} title={title} style={{
    width:32, height:32, borderRadius:8, background: active ? `rgba(232,75,58,0.12)` : "var(--surface)",
    border: `1px solid ${active ? "var(--red)" : "var(--border)"}`,
    color: active ? "var(--red)" : "var(--text2)", cursor:"pointer",
    display:"flex", alignItems:"center", justifyContent:"center",
    transition:"all 0.2s", flexShrink:0,
  }}
  onMouseEnter={e => { e.currentTarget.style.borderColor = color || "var(--blue)"; e.currentTarget.style.color = color || "var(--blue)"; }}
  onMouseLeave={e => { if(!active){ e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.color="var(--text2)"; }}}
  >{children}</button>
);

const Spinner = () => <span className="spin">⟳</span>;

const TypingDots = () => (
  <span style={{display:"inline-flex", gap:4, alignItems:"center", padding:"2px 0"}}>
    {[0,160,320].map((d,i) => (
      <span key={i} style={{
        width:6, height:6, borderRadius:"50%", background:"var(--green)",
        display:"inline-block",
        animation:`dot1 1.2s ease-in-out ${d}ms infinite`,
      }}/>
    ))}
  </span>
);

// ─── TOAST ──────────────────────────────────────────────────────────────────
const Toast = ({ msg, visible }) => (
  <div style={{
    position:"fixed", bottom:24, right:24, zIndex:9999,
    background:"var(--card)", border:"1px solid var(--green)",
    color:"var(--green)", padding:"11px 18px", borderRadius:10,
    fontSize:13, fontFamily:"var(--font)",
    opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(10px)",
    transition:"all 0.3s", pointerEvents:"none",
    display:"flex", alignItems:"center", gap:8,
  }}>
    ✓ {msg}
  </div>
);

// ─── QUESTION CARD ───────────────────────────────────────────────────────────
function QuestionCard({ q, bookmarked, likes, onBookmark, onLike, showToast }) {
  const [answer, setAnswer] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [tone, setTone] = useState("confident");
  const [showAnswer, setShowAnswer] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [rating, setRating] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [displayedAnswer, setDisplayedAnswer] = useState("");
  const typewriterRef = useRef(null);
  const synthRef = useRef(null);

  const TONES = {
    confident: "💪 Confident",
    story: "📖 Story-driven",
    concise: "⚡ Concise",
    humble: "🙏 Humble",
    technical: "🔧 Technical",
  };

  const TONE_GUIDES = {
    confident: "Speak with confidence and authority. Use 'I've found that...' and 'In my experience...'",
    story: "Weave a mini-story with a clear beginning, challenge, action, and outcome. Feel natural and personal.",
    concise: "Be crisp and direct. Get to the point in under 120 words. No fluff.",
    humble: "Be genuine and modest. Acknowledge learning moments. Show eagerness to grow.",
    technical: "Go deep technically. Use precise terminology. Include a short code snippet if relevant.",
  };

  const typewrite = useCallback((text) => {
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    setDisplayedAnswer("");
    let i = 0;
    typewriterRef.current = setInterval(() => {
      if (i < text.length) {
        setDisplayedAnswer(text.slice(0, ++i));
      } else {
        clearInterval(typewriterRef.current);
      }
    }, text.length > 600 ? 6 : 10);
  }, []);

  const generate = async (feedback = null) => {
    if (generating) return;
    setGenerating(true);
    setShowAnswer(true);
    setDisplayedAnswer("");
    setRating(null);
    setShowFeedback(false);
    setFeedbackText("");

    const feedbackNote = feedback ? `\n\nThe user wasn't happy with the last answer. Their feedback: "${feedback}". Address this specifically.` : "";

    const prompt = `You're a job candidate being interviewed at Genpact. Answer this interview question in first person, naturally, as if you're actually speaking in the interview room right now.

Question: "${q.text}"
Role applying for: ${q.job}
Question type: ${q.type}
Tone: ${TONE_GUIDES[tone]}

Rules:
- Write exactly as someone would SPEAK — conversational, not a textbook
- Use natural transitions: "so what I did was...", "honestly...", "the way I see it...", "what really helped was..."
- First person throughout: "I", "my", "I've"
- No bullet points, no headers, no markdown — flowing spoken English only
- For technical: explain clearly like walking a colleague through it; add a short code snippet only if it clearly helps
- For HR/Behavioral: tell a real-sounding personal story — don't just list steps, make it feel lived-in
- Keep it 150–220 words. Conversational but substantive.
- End with a confident, memorable closer${feedbackNote}

Write the answer directly. No preamble.`;

    try {
      const text = await callClaude([{ role:"user", content:prompt }]);
      setAnswer(text);
      typewrite(text);
    } catch (e) {
      setDisplayedAnswer("⚠️ Could not connect to AI. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleTTS = () => {
    if (!answer && !displayedAnswer) return;
    if (ttsPlaying) {
      window.speechSynthesis.cancel();
      setTtsPlaying(false);
      return;
    }
    const utt = new SpeechSynthesisUtterance(answer || displayedAnswer);
    utt.rate = 0.9;
    utt.onend = () => setTtsPlaying(false);
    synthRef.current = utt;
    window.speechSynthesis.speak(utt);
    setTtsPlaying(true);
  };

  const copyAnswer = () => {
    navigator.clipboard.writeText(answer || displayedAnswer);
    showToast("Answer copied!");
  };

  const isTyping = generating || (displayedAnswer && displayedAnswer.length < (answer?.length || 0));

  return (
    <div className="fadeUp" style={{
      background:"var(--card)", border:"1px solid var(--border)",
      borderRadius:14, padding:22,
      borderLeft: showAnswer ? "3px solid var(--green)" : "3px solid var(--border)",
      transition:"all 0.25s",
    }}>
      {/* Top row */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:12}}>
        <div style={{display:"flex", gap:6, flexWrap:"wrap", alignItems:"center"}}>
          <Badge label={q.type} cls={`tag-${q.type}`} />
          <Badge label={q.diff} cls={`diff-${q.diff}`} />
          <span style={{fontSize:11, color:"var(--muted)"}}>|</span>
          <span style={{fontSize:12, color:"var(--text2)"}}>{q.job}</span>
        </div>
        <span style={{fontSize:11, color:"var(--muted)", fontFamily:"var(--mono)", flexShrink:0}}>{q.date}</span>
      </div>

      {/* Question text */}
      <p style={{fontSize:15, fontWeight:500, lineHeight:1.6, color:"var(--text)", marginBottom:18}}>{q.text}</p>

      {/* Actions */}
      <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
        <select
          value={tone} onChange={e => setTone(e.target.value)}
          style={{
            background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text2)",
            padding:"6px 28px 6px 10px", borderRadius:8, fontSize:12, fontFamily:"var(--font)",
            cursor:"pointer", outline:"none",
            backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat:"no-repeat", backgroundPosition:"right 8px center", appearance:"none",
          }}>
          {Object.entries(TONES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <button
          onClick={() => generate()}
          disabled={generating}
          style={{
            display:"flex", alignItems:"center", gap:7, padding:"7px 16px", borderRadius:8,
            background: "linear-gradient(135deg,#1b3564,#152a50)",
            border:"1px solid rgba(61,125,232,0.45)", color:"#6ea8fe",
            fontSize:12, fontWeight:600, fontFamily:"var(--font)", cursor: generating ? "not-allowed" : "pointer",
            opacity: generating ? 0.7 : 1, transition:"all 0.2s",
          }}>
          {generating ? <><Spinner /> Generating…</> : <>⚡ {answer ? "Regenerate" : "Generate Answer"}</>}
        </button>

        <IconBtn onClick={() => onBookmark(q.id)} title="Bookmark" active={bookmarked} color="var(--red)">🔖</IconBtn>
        <IconBtn onClick={() => { navigator.clipboard.writeText(q.text); showToast("Question copied!"); }} title="Copy question">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
        </IconBtn>

        {/* Like button */}
        <button
          onClick={() => onLike(q.id)}
          style={{
            display:"flex", alignItems:"center", gap:5, marginLeft:"auto",
            background:"none", border:"none", cursor:"pointer",
            color: likes > 0 ? "var(--blue)" : "var(--muted)",
            fontSize:12, fontFamily:"var(--font)", padding:"4px 8px",
            borderRadius:6, transition:"all 0.2s",
          }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill={likes>0?"currentColor":"none"} stroke="currentColor" strokeWidth="2">
            <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
          </svg>
          {likes}
        </button>
      </div>

      {/* Answer panel */}
      {showAnswer && (
        <div className="fadeIn" style={{marginTop:16, borderTop:"1px solid var(--border)", paddingTop:16}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10}}>
            <div style={{display:"flex", alignItems:"center", gap:6, fontSize:10, fontWeight:600, letterSpacing:1, textTransform:"uppercase", color:"var(--green)", fontFamily:"var(--mono)"}}>
              <span style={{width:6, height:6, borderRadius:"50%", background:"var(--green)", display:"inline-block", animation: generating ? "pulse 1s infinite" : "none"}}/>
              AI-Generated Answer
              {isTyping && !generating && <TypingDots />}
            </div>
            {answer && (
              <div style={{display:"flex", gap:6}}>
                <button onClick={handleTTS} style={{
                  background: ttsPlaying ? "var(--green-dim)" : "var(--surface)",
                  border:`1px solid ${ttsPlaying ? "var(--green)" : "var(--border)"}`,
                  color: ttsPlaying ? "var(--green)" : "var(--text2)",
                  padding:"4px 10px", borderRadius:6, fontSize:11, cursor:"pointer", fontFamily:"var(--font)",
                  display:"flex", alignItems:"center", gap:5,
                }}>
                  🔊 {ttsPlaying ? "Stop" : "Listen"}
                </button>
                <button onClick={copyAnswer} style={{
                  background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text2)",
                  padding:"4px 10px", borderRadius:6, fontSize:11, cursor:"pointer", fontFamily:"var(--font)",
                }}>📋 Copy</button>
              </div>
            )}
          </div>

          {generating && !displayedAnswer ? (
            <div style={{color:"var(--muted)", fontSize:13}}><TypingDots /></div>
          ) : (
            <p style={{
              fontSize:13.5, lineHeight:1.8, color:"var(--text2)", whiteSpace:"pre-wrap",
              borderLeft:"2px solid var(--green)", paddingLeft:14,
            }}>
              {displayedAnswer}
              {isTyping && !generating && <span style={{animation:"blink 0.7s step-end infinite", color:"var(--green)"}}>▋</span>}
            </p>
          )}

          {/* Rating */}
          {answer && !generating && (
            <div style={{display:"flex", alignItems:"center", gap:10, marginTop:14, paddingTop:12, borderTop:"1px solid var(--border)", flexWrap:"wrap"}}>
              <span style={{fontSize:12, color:"var(--muted)"}}>Was this helpful?</span>
              <button onClick={() => { setRating("good"); setShowFeedback(false); showToast("Marked as helpful!"); }} style={{
                background: rating==="good" ? "var(--green-dim)" : "var(--surface)",
                border:`1px solid ${rating==="good" ? "var(--green)" : "var(--border)"}`,
                color: rating==="good" ? "var(--green)" : "var(--text2)",
                padding:"4px 12px", borderRadius:20, fontSize:11, cursor:"pointer", fontFamily:"var(--font)",
              }}>👍 Yes</button>
              <button onClick={() => { setRating("bad"); setShowFeedback(true); }} style={{
                background: rating==="bad" ? "var(--red-dim)" : "var(--surface)",
                border:`1px solid ${rating==="bad" ? "var(--red)" : "var(--border)"}`,
                color: rating==="bad" ? "var(--red)" : "var(--text2)",
                padding:"4px 12px", borderRadius:20, fontSize:11, cursor:"pointer", fontFamily:"var(--font)",
              }}>👎 Improve</button>
              {showFeedback && (
                <>
                  <input
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    placeholder="Tell AI how to improve..."
                    style={{
                      flex:1, minWidth:140, background:"var(--surface)", border:"1px solid var(--border)",
                      color:"var(--text)", padding:"5px 10px", borderRadius:6, fontSize:11,
                      fontFamily:"var(--font)", outline:"none",
                    }}
                  />
                  <button onClick={() => generate(feedbackText)} style={{
                    background:"var(--red)", border:"none", color:"#fff",
                    padding:"5px 12px", borderRadius:6, fontSize:11, cursor:"pointer", fontFamily:"var(--font)",
                  }}>Regenerate</button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MOCK INTERVIEW ──────────────────────────────────────────────────────────
function MockInterview({ onClose }) {
  const [phase, setPhase] = useState("setup"); // setup | active | results
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
  const timerRef = useRef(null);

  const shuffle = arr => [...arr].sort(() => Math.random()-0.5);

  const start = () => {
    let pool = role ? QUESTIONS.filter(q => q.job === role) : QUESTIONS;
    if (pool.length < count) pool = QUESTIONS;
    const selected = shuffle(pool).slice(0, count);
    setQuestions(selected);
    setIdx(0);
    setUserAnswer("");
    setFeedback(null);
    setScores([]);
    setTimeLeft(timeLimit);
    setPhase("active");
  };

  useEffect(() => {
    if (phase !== "active" || feedback) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); submitAnswer(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, idx, feedback]);

  const submitAnswer = async (timedOut = false) => {
    clearInterval(timerRef.current);
    setLoadingFeedback(true);
    const q = questions[idx];
    const ans = userAnswer.trim();

    try {
      const raw = await callClaude([{
        role:"user",
        content:`You are an experienced Genpact interviewer. Evaluate this answer.
Question: "${q.text}"
Role: ${q.job}
Answer: "${ans || "(no answer given)"}"

Respond ONLY with valid JSON, no markdown:
{"completeness":75,"clarity":80,"relevance":70,"feedback":"2-3 sentence conversational feedback. Mention one strength and one thing to improve. Sound like a real interviewer."}`
      }]);
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      const score = { ...parsed, qid: q.id };
      setScores(prev => [...prev, score]);
      setFeedback(score);
    } catch(e) {
      const fallback = { completeness:60, clarity:60, relevance:60, feedback:"Could not get AI feedback this time. Keep practicing!", qid:q.id };
      setScores(prev => [...prev, fallback]);
      setFeedback(fallback);
    }
    setLoadingFeedback(false);
  };

  const next = () => {
    if (idx + 1 >= questions.length) { setPhase("results"); return; }
    setIdx(idx+1);
    setUserAnswer("");
    setFeedback(null);
    setTimeLeft(timeLimit);
  };

  const avg = (key) => scores.length ? Math.round(scores.reduce((s,x) => s + (x[key]||0), 0) / scores.length) : 0;
  const scoreColor = v => v >= 70 ? "var(--green)" : v >= 50 ? "var(--yellow)" : "var(--red)";
  const m = Math.floor(timeLeft/60), s = timeLeft%60;
  const timerColor = timeLeft <= 30 ? "var(--red)" : timeLeft <= 60 ? "var(--yellow)" : "var(--text)";
  const q = questions[idx];

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)",
      zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fadeUp" style={{
        background:"var(--surface)", border:"1px solid var(--border)", borderRadius:20,
        width:"100%", maxWidth:680, maxHeight:"90vh", overflowY:"auto", padding:32, position:"relative",
      }}>
        <button onClick={onClose} style={{
          position:"absolute", top:16, right:16, width:32, height:32, borderRadius:8,
          background:"var(--card)", border:"1px solid var(--border)", color:"var(--text2)",
          cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center",
        }}>×</button>

        {phase === "setup" && (
          <div>
            <h2 style={{fontSize:22, fontWeight:700, marginBottom:8}}>⏱️ Mock Interview</h2>
            <p style={{fontSize:13, color:"var(--text2)", marginBottom:24}}>Answer questions under timed conditions. Get AI scoring on each response.</p>
            {[
              { label:"Role", el: <select value={role} onChange={e=>setRole(e.target.value)} style={selectStyle}>
                  <option value="">Any Role</option>
                  {[...new Set(QUESTIONS.map(q=>q.job))].map(j=><option key={j}>{j}</option>)}
                </select>},
              { label:"Time per question", el: <select value={timeLimit} onChange={e=>setTimeLimit(+e.target.value)} style={selectStyle}>
                  <option value={120}>2 minutes</option><option value={180}>3 minutes</option><option value={300}>5 minutes</option>
                </select>},
              { label:"Number of questions", el: <select value={count} onChange={e=>setCount(+e.target.value)} style={selectStyle}>
                  <option value={3}>3</option><option value={5}>5</option><option value={10}>10</option>
                </select>},
            ].map(({ label, el }) => (
              <div key={label} style={{marginBottom:16}}>
                <label style={{fontSize:12, color:"var(--text2)", display:"block", marginBottom:6}}>{label}</label>
                {el}
              </div>
            ))}
            <div style={{display:"flex", gap:10, marginTop:24}}>
              <button onClick={start} style={primaryBtnStyle}>Start Interview</button>
              <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
            </div>
          </div>
        )}

        {phase === "active" && q && (
          <div>
            {/* Progress */}
            <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:20}}>
              <div style={{flex:1, height:4, background:"var(--border)", borderRadius:2, overflow:"hidden"}}>
                <div style={{height:"100%", background:"var(--green)", borderRadius:2, width:`${(idx/questions.length)*100}%`, transition:"width 0.5s"}}/>
              </div>
              <span style={{fontSize:11, color:"var(--muted)", fontFamily:"var(--mono)", whiteSpace:"nowrap"}}>{idx+1} / {questions.length}</span>
            </div>

            <div style={{fontSize:48, fontWeight:700, fontFamily:"var(--mono)", textAlign:"center", color:timerColor, marginBottom:16, animation: timeLeft<=30?"pulse 1s infinite":"none"}}>
              {m}:{String(s).padStart(2,"0")}
            </div>

            <div style={{display:"flex", gap:6, marginBottom:12}}>
              <Badge label={q.type} cls={`tag-${q.type}`}/>
              <Badge label={q.diff} cls={`diff-${q.diff}`}/>
            </div>
            <p style={{fontSize:16, fontWeight:500, lineHeight:1.6, marginBottom:18}}>{q.text}</p>

            <textarea
              value={userAnswer} onChange={e=>setUserAnswer(e.target.value)}
              placeholder="Type your answer here… speak naturally, as if you're in the actual interview room."
              style={{
                width:"100%", background:"var(--card)", border:"1px solid var(--border)", color:"var(--text)",
                borderRadius:10, padding:14, fontSize:13, fontFamily:"var(--font)", resize:"vertical",
                minHeight:130, outline:"none", lineHeight:1.7,
              }}
            />

            {!feedback && !loadingFeedback && (
              <div style={{display:"flex", gap:10, marginTop:14}}>
                <button onClick={()=>submitAnswer(false)} style={primaryBtnStyle}>Submit & Get Feedback</button>
                <button onClick={next} style={secondaryBtnStyle}>Skip →</button>
              </div>
            )}

            {loadingFeedback && (
              <div style={{marginTop:16, textAlign:"center", color:"var(--text2)", fontSize:13}}>
                <TypingDots /> Analyzing your answer…
              </div>
            )}

            {feedback && (
              <div className="fadeIn" style={{marginTop:18, padding:18, background:"var(--card)", border:"1px solid var(--border)", borderRadius:12}}>
                <div style={{display:"flex", gap:12, marginBottom:14}}>
                  {["completeness","clarity","relevance"].map(k => (
                    <div key={k} style={{flex:1, textAlign:"center", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:12}}>
                      <div style={{fontSize:26, fontWeight:700, fontFamily:"var(--mono)", color:scoreColor(feedback[k])}}>{feedback[k]}</div>
                      <div style={{fontSize:11, color:"var(--muted)", marginTop:2, textTransform:"capitalize"}}>{k}</div>
                    </div>
                  ))}
                </div>
                <p style={{fontSize:13, lineHeight:1.7, color:"var(--text2)"}}>{feedback.feedback}</p>
                <div style={{display:"flex", gap:10, marginTop:14}}>
                  <button onClick={next} style={primaryBtnStyle}>{idx+1 >= questions.length ? "See Results" : "Next Question →"}</button>
                  <button onClick={onClose} style={secondaryBtnStyle}>End Session</button>
                </div>
              </div>
            )}
          </div>
        )}

        {phase === "results" && (
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:48, marginBottom:12}}>🎉</div>
            <h2 style={{fontSize:22, marginBottom:8}}>Session Complete!</h2>
            <p style={{fontSize:13, color:"var(--text2)", marginBottom:24}}>You completed all {questions.length} questions.</p>
            <div style={{display:"flex", gap:12, justifyContent:"center", marginBottom:24}}>
              {["completeness","clarity","relevance"].map(k => (
                <div key={k} style={{textAlign:"center", background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:"16px 24px"}}>
                  <div style={{fontSize:32, fontWeight:700, fontFamily:"var(--mono)", color:scoreColor(avg(k))}}>{avg(k)}</div>
                  <div style={{fontSize:11, color:"var(--muted)", marginTop:4, textTransform:"capitalize"}}>{k}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex", gap:10, justifyContent:"center"}}>
              <button onClick={()=>{setPhase("setup");setScores([]);}} style={primaryBtnStyle}>Practice Again</button>
              <button onClick={onClose} style={secondaryBtnStyle}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI CHAT SIMULATOR ───────────────────────────────────────────────────────
function ChatSimulator({ onClose }) {
  const [messages, setMessages] = useState([
    { role:"ai", text:"Hi there! I'm your Genpact interviewer today. Let's warm up — could you tell me a bit about yourself and what brings you to Genpact?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const updatedMessages = [...messages, { role:"user", text }];
    setMessages(updatedMessages);
    setLoading(true);

    // Build full conversation history for context
    const apiMessages = updatedMessages.map(m => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.text
    }));

    // Prepend system-style instruction as first user message for context
    const systemInstruction = `You are a professional Genpact interviewer conducting a mock interview for a software/analyst role.

STRICT RULES:
- Stay fully in character as an interviewer at all times — never say you're an AI
- Ask ONE focused follow-up question based on what the candidate just said
- Be encouraging but probe deeper when answers are vague or incomplete
- After 5-7 exchanges, naturally conclude and give brief overall impressions
- Keep responses to 2-4 sentences max
- Sound warm and human: "Interesting, so...", "That's a solid point...", "I like how you mentioned..."
- React specifically to what the candidate actually said, not a generic response
- Do NOT repeat or rephrase the same question`;

    try {
      // Build messages with system context
      const fullMessages = [
        { role:"user", content:systemInstruction },
        { role:"assistant", content:"Understood, I'll act as a professional Genpact interviewer throughout this conversation." },
        ...apiMessages
      ];

      const reply = await callClaude(fullMessages, 300);
      setMessages(prev => [...prev, { role:"ai", text:reply }]);
    } catch(e) {
      setMessages(prev => [...prev, { role:"ai", text:"Sorry, I had a brief technical issue. Please continue — what were you saying?" }]);
    }
    setLoading(false);
  };

  const handleKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)",
      zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fadeUp" style={{
        background:"var(--surface)", border:"1px solid var(--border)", borderRadius:20,
        width:"100%", maxWidth:580, height:"80vh", maxHeight:650,
        display:"flex", flexDirection:"column", position:"relative", overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12, flexShrink:0}}>
          <div style={{width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,var(--blue),var(--green))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20}}>🤵</div>
          <div>
            <div style={{fontSize:14, fontWeight:600}}>Genpact Interviewer</div>
            <div style={{fontSize:11, color:"var(--green)"}}>● Live — AI Interview Simulator</div>
          </div>
          <button onClick={onClose} style={{marginLeft:"auto", width:32, height:32, borderRadius:8, background:"var(--card)", border:"1px solid var(--border)", color:"var(--text2)", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center"}}>×</button>
        </div>

        {/* Messages */}
        <div style={{flex:1, overflowY:"auto", padding:20, display:"flex", flexDirection:"column", gap:12}}>
          {messages.map((m,i) => (
            <div key={i} style={{display:"flex", gap:10, flexDirection: m.role==="user" ? "row-reverse" : "row"}}>
              <div style={{width:30, height:30, borderRadius:8, background: m.role==="ai" ? "var(--card)" : "var(--blue)", border: m.role==="ai" ? "1px solid var(--border)" : "none", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0}}>
                {m.role==="ai" ? "🤵" : "😊"}
              </div>
              <div style={{
                maxWidth:"80%", padding:"11px 14px", borderRadius:12, fontSize:13, lineHeight:1.65,
                background: m.role==="ai" ? "var(--card)" : "var(--blue)",
                border: m.role==="ai" ? "1px solid var(--border)" : "none",
                color: m.role==="ai" ? "var(--text)" : "#fff",
                borderBottomLeftRadius: m.role==="ai" ? 4 : 12,
                borderBottomRightRadius: m.role==="user" ? 4 : 12,
              }}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div style={{display:"flex", gap:10}}>
              <div style={{width:30, height:30, borderRadius:8, background:"var(--card)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14}}>🤵</div>
              <div style={{background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, borderBottomLeftRadius:4, padding:"12px 16px"}}>
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div style={{padding:14, borderTop:"1px solid var(--border)", display:"flex", gap:8, flexShrink:0}}>
          <textarea
            value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Type your answer… (Enter to send)"
            style={{
              flex:1, background:"var(--card)", border:"1px solid var(--border)", color:"var(--text)",
              padding:"9px 12px", borderRadius:10, fontSize:13, fontFamily:"var(--font)",
              resize:"none", height:42, outline:"none", lineHeight:1.6,
            }}
          />
          <button onClick={send} disabled={loading || !input.trim()} style={{
            width:42, height:42, borderRadius:10, background:"var(--blue)", border:"none",
            color:"#fff", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            opacity: loading || !input.trim() ? 0.6 : 1, display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BOOKMARKS PANEL ─────────────────────────────────────────────────────────
function BookmarksPanel({ bookmarks, onClose, onRemove }) {
  const bookmarked = QUESTIONS.filter(q => bookmarks.has(q.id));
  return (
    <div style={{
      position:"fixed", top:0, right:0, bottom:0, width:340, zIndex:800,
      background:"var(--surface)", borderLeft:"1px solid var(--border)",
      display:"flex", flexDirection:"column",
    }} className="fadeIn">
      <div style={{padding:"20px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0}}>
        <h2 style={{fontSize:16, fontWeight:700}}>🔖 Saved Questions <span style={{fontSize:12, color:"var(--muted)", fontFamily:"var(--mono)"}}>({bookmarked.length})</span></h2>
        <button onClick={onClose} style={{width:32, height:32, borderRadius:8, background:"var(--card)", border:"1px solid var(--border)", color:"var(--text2)", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center"}}>×</button>
      </div>
      <div style={{flex:1, overflowY:"auto", padding:14, display:"flex", flexDirection:"column", gap:10}}>
        {bookmarked.length === 0 ? (
          <div style={{textAlign:"center", color:"var(--muted)", fontSize:13, padding:"48px 16px"}}>
            No bookmarks yet.<br/>Click 🔖 on any question to save it.
          </div>
        ) : bookmarked.map(q => (
          <div key={q.id} style={{background:"var(--card)", border:"1px solid var(--border)", borderRadius:10, padding:14}}>
            <p style={{fontSize:13, fontWeight:500, lineHeight:1.5, marginBottom:10}}>{q.text}</p>
            <div style={{display:"flex", alignItems:"center", gap:6}}>
              <Badge label={q.type} cls={`tag-${q.type}`}/>
              <Badge label={q.diff} cls={`diff-${q.diff}`}/>
              <button onClick={()=>onRemove(q.id)} style={{marginLeft:"auto", background:"none", border:"none", color:"var(--red)", cursor:"pointer", fontSize:11, fontFamily:"var(--font)"}}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SHARED BUTTON STYLES ─────────────────────────────────────────────────────
const primaryBtnStyle = {
  flex:1, padding:"10px 20px", borderRadius:10, background:"var(--blue)", border:"none",
  color:"#fff", fontSize:13, fontWeight:600, fontFamily:"var(--font)", cursor:"pointer",
};
const secondaryBtnStyle = {
  flex:1, padding:"10px 20px", borderRadius:10,
  background:"var(--card)", border:"1px solid var(--border)", color:"var(--text)",
  fontSize:13, fontWeight:600, fontFamily:"var(--font)", cursor:"pointer",
};
const selectStyle = {
  background:"var(--card)", border:"1px solid var(--border)", color:"var(--text)",
  padding:"8px 14px", borderRadius:8, fontSize:13, fontFamily:"var(--font)",
  width:"100%", outline:"none", cursor:"pointer",
};

export default function App() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchQuestions()
      .then(() => setLoaded(true))
      .catch((err) => {
        console.error("Failed to load questions from backend", err);
        // Fallback or error state could be handled here
      });
  }, []);

  // Filters
  const [filterJob, setFilterJob] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterExp, setFilterExp] = useState("");
  const [filterDiff, setFilterDiff] = useState("");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("helpful");
  const [page, setPage] = useState(1);

  // Likes — stored as map: { [id]: count }
  const [likes, setLikes] = useState({});

  // Bookmarks
  const [bookmarks, setBookmarks] = useState(new Set());
  const [showBookmarks, setShowBookmarks] = useState(false);

  // Modals
  const [showMock, setShowMock] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Toast
  const [toast, setToast] = useState({ msg:"", visible:false });
  const toastRef = useRef(null);

  const showToast = useCallback((msg) => {
    clearTimeout(toastRef.current);
    setToast({ msg, visible:true });
    toastRef.current = setTimeout(() => setToast(t => ({...t, visible:false})), 2500);
  }, []);

  const onLike = useCallback((id) => {
    setLikes(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }, []);

  const onBookmark = useCallback((id) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  // Daily question
  const dailyQ = QUESTIONS[Math.floor(Date.now() / 86400000) % QUESTIONS.length];

  // Filter + sort
  const filtered = QUESTIONS.filter(q =>
    (!filterJob || q.job === filterJob) &&
    (!filterType || q.type === filterType) &&
    (!filterExp || q.exp === filterExp) &&
    (!filterDiff || q.diff === filterDiff) &&
    (!search || q.text.toLowerCase().includes(search.toLowerCase()) || q.job.toLowerCase().includes(search.toLowerCase()))
  ).sort((a,b) => sortMode === "helpful" ? (likes[b.id]||0) - (likes[a.id]||0) : new Date("1 "+b.date) - new Date("1 "+a.date));

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageQs = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const jobs = [...new Set(QUESTIONS.map(q=>q.job))];
  const types = ["Technical","HR","Background","Behavioral"];
  const exps = ["Fresher","1-3 Years","3-5 Years","Senior"];
  const diffs = ["Easy","Medium","Hard"];

  const filterSelectStyle = {
    background:"var(--card)", border:"1px solid var(--border)", color:"var(--text2)",
    padding:"7px 28px 7px 11px", borderRadius:8, fontSize:12, fontFamily:"var(--font)",
    cursor:"pointer", outline:"none", appearance:"none",
    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat:"no-repeat", backgroundPosition:"right 9px center",
  };

  if (!loaded) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text)" }}>
        <style>{css}</style>
        <Spinner />
        <p style={{ marginTop: 16, fontFamily: "var(--font)", color: "var(--text2)" }}>Connecting to Backend...</p>
      </div>
    );
  }

  return (
    <>
      <style>{css}</style>

      {/* Header */}
      <header style={{
        position:"sticky", top:0, zIndex:500,
        background:"rgba(11,13,19,0.95)", backdropFilter:"blur(20px)",
        borderBottom:"1px solid var(--border)", padding:"0 28px",
        display:"flex", alignItems:"center", gap:14, height:58,
      }}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <div style={{width:30, height:30, display:"grid", gridTemplateColumns:"1fr 1fr", gap:3, transform:"rotate(45deg)"}}>
            {["#e84b3a","#3d7de8","#3d7de8","#e84b3a"].map((c,i)=><span key={i} style={{borderRadius:3, background:c}}/>)}
          </div>
          <span style={{fontSize:16, fontWeight:700, letterSpacing:"-0.5px"}}>Prep<span style={{color:"var(--red)"}}>Wise</span></span>
        </div>

        <div style={{marginLeft:"auto", display:"flex", alignItems:"center", gap:8}}>
          <button onClick={()=>setShowChat(true)} style={{...secondaryBtnStyle, flex:"none", padding:"7px 14px", fontSize:12, display:"flex", alignItems:"center", gap:6}}>
            💬 AI Simulator
          </button>
          <button onClick={()=>setShowMock(true)} style={{...secondaryBtnStyle, flex:"none", padding:"7px 14px", fontSize:12, display:"flex", alignItems:"center", gap:6}}>
            ⏱️ Mock Interview
          </button>
          <button onClick={()=>setShowBookmarks(v=>!v)} style={{
            ...secondaryBtnStyle, flex:"none", padding:"7px 14px", fontSize:12,
            display:"flex", alignItems:"center", gap:6,
            borderColor: showBookmarks ? "var(--red)" : "var(--border)",
            color: showBookmarks ? "var(--red)" : "var(--text2)",
          }}>
            🔖 Saved <span style={{background:"var(--red)", color:"#fff", fontSize:10, padding:"1px 6px", borderRadius:10, fontFamily:"var(--mono)"}}>{bookmarks.size}</span>
          </button>
        </div>
      </header>

      {/* Daily Banner */}
      <div style={{
        background:"linear-gradient(135deg,rgba(61,125,232,0.1),rgba(0,200,150,0.07))",
        borderBottom:"1px solid rgba(61,125,232,0.15)", padding:"11px 28px",
        display:"flex", alignItems:"center", gap:12,
      }}>
        <span style={{background:"var(--blue)", color:"#fff", fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:20, textTransform:"uppercase", letterSpacing:1, fontFamily:"var(--mono)", flexShrink:0}}>Today's Q</span>
        <span style={{fontSize:13, color:"var(--text2)"}}><strong style={{color:"var(--text)"}}>{dailyQ.text}</strong></span>
      </div>

      {/* Hero */}
      <div style={{padding:"36px 28px 24px", maxWidth:1240, margin:"0 auto"}}>
        <div style={{display:"flex", alignItems:"center", gap:16, marginBottom:16}}>
          <div style={{width:52, height:52, background:"#fff", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 20px rgba(232,75,58,0.2)"}}>
            <svg viewBox="0 0 100 100" width="38" height="38" fill="none">
              <path d="M20 20 L50 5 L80 20 L80 80 L50 95 L20 80 Z" fill="#e84b3a" opacity="0.9"/>
              <path d="M50 5 L80 20 L80 80 L50 65 Z" fill="#c0392b"/>
              <path d="M20 20 L50 35 L50 65 L20 80 Z" fill="#2563eb" opacity="0.9"/>
              <rect x="38" y="48" width="26" height="4" fill="white" rx="2"/>
              <rect x="38" y="42" width="15" height="4" fill="white" rx="2"/>
            </svg>
          </div>
          <div>
            <h1 style={{fontSize:20, fontWeight:700}}>Genpact</h1>
            <p style={{fontSize:12, color:"var(--muted)", marginTop:2}}>Global Professional Services · Digital Transformation · 100,000+ Employees</p>
          </div>
        </div>
        <h2 style={{fontSize:38, fontWeight:700, letterSpacing:"-1.5px", lineHeight:1.1, marginBottom:10}}>
          Crack Your <em style={{fontStyle:"normal", color:"var(--red)"}}>Genpact</em> Interview
        </h2>
        <p style={{fontSize:14, color:"var(--text2)", lineHeight:1.7, maxWidth:500}}>
          Real questions from actual Genpact interviews. Generate AI-powered human-like answers, practice with mock interviews, and chat with an AI interviewer.
        </p>
      </div>

      {/* Filters */}
      <div style={{padding:"0 28px 18px", maxWidth:1240, margin:"0 auto", display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>
        <span style={{fontSize:12, color:"var(--muted)"}}>Filter:</span>
        {[
          { val:filterJob, set:setFilterJob, opts:jobs, placeholder:"All Roles" },
          { val:filterType, set:setFilterType, opts:types, placeholder:"All Types" },
          { val:filterExp, set:setFilterExp, opts:exps, placeholder:"All Levels" },
          { val:filterDiff, set:setFilterDiff, opts:diffs, placeholder:"All Difficulty" },
        ].map(({val,set,opts,placeholder}) => (
          <select key={placeholder} value={val} onChange={e=>{set(e.target.value);setPage(1);}} style={filterSelectStyle}>
            <option value="">{placeholder}</option>
            {opts.map(o=><option key={o}>{o}</option>)}
          </select>
        ))}
        <div style={{position:"relative"}}>
          <svg style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:"var(--muted)"}} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
            placeholder="Search questions…"
            style={{...filterSelectStyle, paddingLeft:30, width:210, backgroundImage:"none"}}
          />
        </div>
        {(filterJob||filterType||filterExp||filterDiff||search) && (
          <button onClick={()=>{setFilterJob("");setFilterType("");setFilterExp("");setFilterDiff("");setSearch("");setPage(1);}} style={{
            background:"var(--red-dim)", border:"1px solid rgba(232,75,58,0.25)", color:"var(--red)",
            padding:"6px 12px", borderRadius:8, fontSize:12, cursor:"pointer", fontFamily:"var(--font)",
          }}>✕ Clear</button>
        )}
      </div>

      {/* Results bar */}
      <div style={{padding:"0 28px 14px", maxWidth:1240, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10}}>
        <span style={{fontSize:13, color:"var(--muted)"}}>
          Showing <strong style={{color:"var(--text)"}}>{pageQs.length}</strong> of <strong style={{color:"var(--text)"}}>{filtered.length}</strong> questions
        </span>
        <div style={{display:"flex", gap:8}}>
          {["helpful","recent"].map(m => (
            <button key={m} onClick={()=>{setSortMode(m);setPage(1);}} style={{
              background:"none", border:`1px solid ${sortMode===m?"var(--blue)":"var(--border)"}`,
              color: sortMode===m ? "var(--blue)" : "var(--text2)",
              padding:"6px 14px", borderRadius:8, fontSize:12, cursor:"pointer", fontFamily:"var(--font)",
              textTransform:"capitalize",
            }}>{m === "helpful" ? "🔥 Most Liked" : "🕐 Recent"}</button>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div style={{padding:"0 28px 80px", maxWidth:1240, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 280px", gap:20, alignItems:"start"}}>
        {/* Questions */}
        <div>
          {pageQs.length === 0 ? (
            <div style={{textAlign:"center", padding:64, color:"var(--muted)", fontSize:14}}>
              No questions match your filters.
            </div>
          ) : (
            <div style={{display:"flex", flexDirection:"column", gap:14}}>
              {pageQs.map((q,i) => (
                <div key={q.id} style={{animationDelay:`${i*40}ms`}} className="fadeUp">
                  <QuestionCard
                    q={q}
                    bookmarked={bookmarks.has(q.id)}
                    likes={likes[q.id] || 0}
                    onBookmark={onBookmark}
                    onLike={onLike}
                    showToast={showToast}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{display:"flex", gap:6, justifyContent:"center", marginTop:28, alignItems:"center"}}>
              {page > 1 && <button onClick={()=>setPage(p=>p-1)} style={pageBtn(false)}>←</button>}
              {Array.from({length:totalPages},(_,i)=>i+1).filter(p => p===1||p===totalPages||Math.abs(p-page)<=1).map((p,idx,arr) => (
                <>
                  {idx>0 && arr[idx-1]!==p-1 && <span key={`dots-${p}`} style={{color:"var(--muted)",padding:"0 4px",fontSize:12}}>…</span>}
                  <button key={p} onClick={()=>setPage(p)} style={pageBtn(p===page)}>{p}</button>
                </>
              ))}
              {page < totalPages && <button onClick={()=>setPage(p=>p+1)} style={pageBtn(false)}>→</button>}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside style={{display:"flex", flexDirection:"column", gap:14}}>
          {/* Quick Actions */}
          <div style={sideCard}>
            <h3 style={sideTitle}>Quick Actions</h3>
            {[
              { label:"⏱️ Mock Interview", action:()=>setShowMock(true) },
              { label:"💬 AI Chat Simulator", action:()=>setShowChat(true) },
              { label:"🔖 Saved Questions", action:()=>setShowBookmarks(v=>!v) },
            ].map(({label,action}) => (
              <button key={label} onClick={action} style={{
                width:"100%", marginBottom:8, padding:"9px 14px", borderRadius:9,
                background:"var(--card)", border:"1px solid var(--border)", color:"var(--text)",
                fontSize:12, fontFamily:"var(--font)", cursor:"pointer", textAlign:"left",
                transition:"border-color 0.2s",
              }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="var(--blue)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}
              >{label}</button>
            ))}
          </div>

          {/* Interview Process */}
          <div style={sideCard}>
            <h3 style={sideTitle}>Interview Process</h3>
            {[
              {n:"1", h:"Online Assessment", p:"MCQs + Coding on HackerRank. DSA, OS, DBMS, OOPs."},
              {n:"2", h:"Technical Round", p:"In-depth tech questions, problem solving, code writing."},
              {n:"3", h:"HR Round", p:"Behavioral, culture fit, salary discussion & offer."},
            ].map(({n,h,p}) => (
              <div key={n} style={{display:"flex", gap:10, paddingBottom:12, marginBottom:12, borderBottom:"1px solid var(--border)"}}>
                <div style={{width:22, height:22, borderRadius:"50%", background:"var(--card)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"var(--blue)", fontFamily:"var(--mono)", flexShrink:0}}>{n}</div>
                <div><div style={{fontSize:12, fontWeight:600, marginBottom:2}}>{h}</div><div style={{fontSize:11, color:"var(--muted)", lineHeight:1.5}}>{p}</div></div>
              </div>
            ))}
          </div>

          {/* Difficulty split */}
          <div style={sideCard}>
            <h3 style={sideTitle}>Difficulty Split</h3>
            {[{l:"Easy",v:42,c:"var(--green)"},{l:"Medium",v:41,c:"var(--yellow)"},{l:"Hard",v:17,c:"var(--red)"}].map(({l,v,c}) => (
              <div key={l} style={{marginBottom:10}}>
                <div style={{display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4}}>
                  <span style={{color:"var(--text2)"}}>{l}</span>
                  <span style={{color:"var(--text)", fontFamily:"var(--mono)", fontWeight:600}}>{v}%</span>
                </div>
                <div style={{height:4, background:"var(--border)", borderRadius:2, overflow:"hidden"}}>
                  <div style={{height:"100%", width:`${v}%`, background:c, borderRadius:2}}/>
                </div>
              </div>
            ))}
          </div>

          {/* Pro Tips */}
          <div style={sideCard}>
            <h3 style={sideTitle}>Pro Tips</h3>
            {[
              "Research Genpact's digital transformation services",
              "Be strong in Java, Python, SQL and CS fundamentals",
              "Use STAR format for behavioral questions naturally",
              "Know Genpact's 30+ countries, 100K+ workforce",
              "Practice speaking answers out loud before interview",
            ].map((tip,i) => (
              <div key={i} style={{display:"flex", gap:8, fontSize:12, color:"var(--muted)", lineHeight:1.6, marginBottom:8}}>
                <span style={{color:"var(--green)", flexShrink:0, marginTop:1}}>→</span>
                {tip}
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Modals */}
      {showMock && <MockInterview onClose={()=>setShowMock(false)} />}
      {showChat && <ChatSimulator onClose={()=>setShowChat(false)} />}
      {showBookmarks && (
        <BookmarksPanel
          bookmarks={bookmarks}
          onClose={()=>setShowBookmarks(false)}
          onRemove={onBookmark}
        />
      )}

      <Toast msg={toast.msg} visible={toast.visible} />
    </>
  );
}

// Sidebar styles
const sideCard = {
  background:"var(--card)", border:"1px solid var(--border)", borderRadius:14, padding:18,
};
const sideTitle = {
  fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:1,
  color:"var(--muted)", marginBottom:14, fontFamily:"var(--mono)",
};
const pageBtn = (active) => ({
  width:34, height:34, background: active ? "var(--red)" : "var(--card)",
  border:`1px solid ${active ? "var(--red)" : "var(--border)"}`,
  borderRadius:8, color: active ? "#fff" : "var(--text2)", fontSize:12,
  cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
  fontFamily:"var(--font)",
});
