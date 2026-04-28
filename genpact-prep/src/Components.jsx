import { useState, useRef, useCallback } from "react";

const API_BASE = process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5000/api";
const PAGE_SIZE = 8;

// ─── API HELPERS ────────────────────────────────────────────────────────────
async function apiFetch(url, options = {}, token = null) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function callAI(messages, endpoint = "generate") {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.content;
}

// ─── PREMIUM CSS DESIGN SYSTEM ──────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
:root {
  /* Aura Obsidian Design Tokens */
  --bg: #08090d; /* Deep base */
  --surface: #121317; /* Main canvas / surface */
  --card: #1e1f24; /* Active layer (surface-container) */
  --card-hover: #292a2e; /* surface-container-high */
  --card-highest: #343439; /* surface-container-highest */
  --border: rgba(67, 70, 85, 0.2); /* outline_variant ghost border */
  --border-hover: rgba(67, 70, 85, 0.4);
  --red: #ef4444; /* Human passion accent */
  --red-dim: rgba(239,68,68,0.1);
  --blue: #2563eb; /* primary_container / AI logic */
  --blue-bright: #b4c5ff; /* primary */
  --blue-dim: rgba(37,99,235,0.1);
  --green: #10b981;
  --green-dim: rgba(16,185,129,0.08);
  --yellow: #f59e0b;
  --purple: #6366f1; /* Tertiary indigo */
  --text: #e3e2e8; /* on_surface */
  --text2: #c3c6d7; /* on_surface_variant */
  --muted: #8d90a0; /* outline */
  --font: 'Inter', -apple-system, sans-serif;
  --mono: 'JetBrains Mono', monospace;
  --shadow: 0 16px 40px rgba(0,0,0,0.4);
  --shadow-glow: 0 0 40px rgba(180, 197, 255, 0.08); /* Ambient glow */
  --radius: 16px;
  --glass: rgba(52, 52, 57, 0.4); /* surface-container-highest at 40% */
  --glass-border: rgba(67, 70, 85, 0.15);
}
html { scroll-behavior: smooth; }
body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Background pulse & dots textures */
body::before {
  content: ""; position: fixed; inset: 0; z-index: -2;
  background: 
    radial-gradient(circle at 10% 20%, rgba(37,99,235,0.08) 0%, transparent 400px),
    radial-gradient(circle at 90% 80%, rgba(239,68,68,0.06) 0%, transparent 400px);
  animation: pulseBg 15s ease-in-out infinite alternate; pointer-events: none;
}
body::after {
  content: ""; position: fixed; inset: 0; z-index: -1;
  background-image: radial-gradient(rgba(141,144,160,0.05) 1px, transparent 1px);
  background-size: 16px 16px; pointer-events: none;
}
@keyframes pulseBg { 0% { opacity: 0.8; } 100% { opacity: 1.2; transform: scale(1.05); } }


/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--muted); }

/* ─── KEYFRAME ANIMATIONS ─────────────────────────────────────────────── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(100%); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes blink { 50% { opacity: 0; } }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes float {
  0%,100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}
@keyframes glow {
  0%,100% { box-shadow: 0 0 20px rgba(59,130,246,0.1); }
  50% { box-shadow: 0 0 40px rgba(59,130,246,0.2); }
}
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes countUp {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes ripple {
  0% { transform: scale(0); opacity: 0.5; }
  100% { transform: scale(4); opacity: 0; }
}
@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}
@keyframes borderGlow {
  0%,100% { border-color: var(--border); }
  50% { border-color: var(--blue); }
}
@keyframes skeletonPulse {
  0% { opacity: 0.05; }
  50% { opacity: 0.1; }
  100% { opacity: 0.05; }
}

/* ─── ANIMATION UTILITIES ─────────────────────────────────────────────── */
.fadeUp { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both; }
.fadeIn { animation: fadeIn 0.3s ease both; }
.slideInRight { animation: slideInRight 0.4s cubic-bezier(0.16,1,0.3,1) both; }
.slideUp { animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
.spin { animation: spin 0.7s linear infinite; display: inline-block; }
.float { animation: float 3s ease-in-out infinite; }
.glow { animation: glow 3s ease-in-out infinite; }

/* ─── TAG BADGES ──────────────────────────────────────────────────────── */
.tag-Technical { background: rgba(59,130,246,0.12); color: #60a5fa; border: 1px solid rgba(59,130,246,0.2); }
.tag-HR { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
.tag-Background { background: rgba(139,92,246,0.1); color: #a78bfa; border: 1px solid rgba(139,92,246,0.2); }
.tag-Behavioral { background: rgba(245,158,11,0.1); color: #fbbf24; border: 1px solid rgba(245,158,11,0.2); }
.diff-Easy { background: rgba(16,185,129,0.08); color: #34d399; border: 1px solid rgba(16,185,129,0.15); }
.diff-Medium { background: rgba(245,158,11,0.08); color: #fbbf24; border: 1px solid rgba(245,158,11,0.15); }
.diff-Hard { background: rgba(239,68,68,0.08); color: #f87171; border: 1px solid rgba(239,68,68,0.15); }

/* ─── TAG BADGES ──────────────────────────────────────────────────────── */
.tag-Technical { background: rgba(37,99,235,0.12); color: var(--blue-bright); border: none; }
.tag-HR { background: var(--red-dim); color: var(--red); border: none; }
.tag-Background { background: rgba(99,102,241,0.1); color: #818cf8; border: none; }
.tag-Behavioral { background: rgba(245,158,11,0.1); color: #fbbf24; border: none; }
.diff-Easy { background: var(--green-dim); color: var(--green); border: none; }
.diff-Medium { background: rgba(245,158,11,0.08); color: #fbbf24; border: none; }
.diff-Hard { background: var(--red-dim); color: var(--red); border: none; }

/* ─── INTERACTIVE ELEMENTS ────────────────────────────────────────────── */
.card-hover {
  transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
  will-change: transform, box-shadow, background;
}
.card-hover:hover {
  transform: translateY(-2px);
  background: var(--card-hover) !important;
  box-shadow: var(--shadow);
  border-color: var(--border-hover) !important;
}
.btn-glow {
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
}
.btn-glow:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
}
.btn-glow:active {
  transform: translateY(0);
}
.btn-secondary-hover {
  transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
}
.btn-secondary-hover:hover {
  border-color: var(--muted) !important;
  background: rgba(255,255,255,0.05) !important;
  color: var(--text) !important;
}
.sidebar-btn {
  transition: all 0.3s cubic-bezier(0.16,1,0.3,1) !important;
}
.sidebar-btn:hover {
  background: var(--card-highest) !important;
  transform: translateX(4px);
}

/* Skeleton loading */
.skeleton {
  background: linear-gradient(90deg, var(--card) 25%, rgba(255,255,255,0.04) 50%, var(--card) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 8px;
}

/* Glass effect */
.glass {
  background: var(--glass) !important;
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  border: 1px solid var(--glass-border) !important;
}

/* Focus styles */
input:focus, textarea:focus, select:focus {
  border-color: var(--blue) !important;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
  outline: none;
}
`;

// ─── SMALL COMPONENTS ───────────────────────────────────────────────────────
const Badge = ({ label, cls }) => (
  <span style={{ fontSize:10, fontWeight:600, padding:"3px 10px", borderRadius:20, textTransform:"uppercase", letterSpacing:"0.5px", fontFamily:"var(--mono)", display:"inline-block", transition:"all 0.2s" }} className={cls}>{label}</span>
);

const Spinner = () => (
  <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
    <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" opacity="0.3"/>
      <path d="M12 2v4"/>
    </svg>
  </span>
);

const TypingDots = () => (
  <span style={{display:"inline-flex",gap:3,alignItems:"center",padding:"2px 0"}}>
    {[0,150,300].map((d,i) => <span key={i} style={{ width:5,height:5,borderRadius:"50%",background:"var(--green)",display:"inline-block",animation:`dotBounce 1.4s ease-in-out ${d}ms infinite` }}/>)}
  </span>
);

const Toast = ({ msg, visible }) => (
  <div className={visible ? "slideUp" : ""} style={{
    position:"fixed", bottom:28, right:28, zIndex:9999,
    background:"var(--card)", border:"1px solid rgba(16,185,129,0.3)",
    color:"var(--green)", padding:"12px 20px", borderRadius:14,
    fontSize:13, fontWeight:500, fontFamily:"var(--font)",
    opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(20px)",
    transition:"all 0.4s cubic-bezier(0.16,1,0.3,1)",
    pointerEvents:"none", display:"flex", alignItems:"center", gap:10,
    boxShadow:"0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,185,129,0.1)",
    backdropFilter:"blur(16px)",
  }}>
    <span style={{width:20,height:20,borderRadius:"50%",background:"var(--green-dim)",border:"1px solid rgba(16,185,129,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0}}>✓</span>
    {msg}
  </div>
);

// Skeleton Card for loading states
const SkeletonCard = () => (
  <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:16,padding:24,borderLeft:"3px solid var(--border)"}}>
    <div style={{display:"flex",gap:8,marginBottom:16}}>
      <div className="skeleton" style={{width:70,height:22}}/>
      <div className="skeleton" style={{width:55,height:22}}/>
    </div>
    <div className="skeleton" style={{width:"90%",height:16,marginBottom:10}}/>
    <div className="skeleton" style={{width:"65%",height:16,marginBottom:20}}/>
    <div style={{display:"flex",gap:8}}>
      <div className="skeleton" style={{width:100,height:34}}/>
      <div className="skeleton" style={{width:130,height:34}}/>
    </div>
  </div>
);

const primaryBtn = {
  padding:"10px 22px", borderRadius:12,
  background:"linear-gradient(135deg, var(--blue), #2563eb)",
  border:"none", color:"#fff", fontSize:13, fontWeight:600,
  fontFamily:"var(--font)", cursor:"pointer",
  transition:"all 0.25s ease",
  boxShadow:"0 2px 12px rgba(59,130,246,0.25)",
};
const secondaryBtn = {
  padding:"10px 22px", borderRadius:12,
  background:"var(--card)", border:"1px solid var(--border)",
  color:"var(--text2)", fontSize:13, fontWeight:500,
  fontFamily:"var(--font)", cursor:"pointer",
  transition:"all 0.2s ease",
};
const selectSt = {
  background:"var(--card-highest)", border:"1px solid transparent",
  color:"var(--text)", padding:"9px 14px", borderRadius:10,
  fontSize:13, fontFamily:"var(--font)", width:"100%",
  outline:"none", cursor:"pointer", transition:"all 0.3s cubic-bezier(0.16,1,0.3,1)",
};
const sideCard = {
  background:"var(--card)", border:"1px solid transparent",
  borderRadius:16, padding:20,
  boxShadow:"var(--shadow)",
  transition:"all 0.4s cubic-bezier(0.16,1,0.3,1)",
};
const sideTitle = {
  fontSize:10, fontWeight:600, textTransform:"uppercase",
  letterSpacing:1.2, color:"var(--muted)", marginBottom:16,
  fontFamily:"var(--mono)",
};
const filterSS = {
  background:"var(--card-highest)", border:"1px solid transparent",
  color:"var(--text)", padding:"9px 30px 9px 14px", borderRadius:12,
  fontSize:13, fontFamily:"var(--font)", cursor:"pointer",
  outline:"none", appearance:"none", transition:"all 0.3s cubic-bezier(0.16,1,0.3,1)",
  backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center",
};

// ─── QUESTION CARD (PREMIUM) ────────────────────────────────────────────────
function QuestionCard({ q, bookmarked, liked, onBookmark, onLike, onDelete, showToast }) {
  const [answer, setAnswer] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [tone, setTone] = useState("confident");
  const [showAnswer, setShowAnswer] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [rating, setRating] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [displayedAnswer, setDisplayedAnswer] = useState("");
  const typewriterRef = useRef(null);

  const TONES = { confident:"💪 Confident", story:"📖 Story-driven", concise:"⚡ Concise", humble:"🙏 Humble", technical:"🔧 Technical" };
  const TONE_GUIDES = {
    confident:"Speak with confidence. Use 'I've found that...' and 'In my experience...'",
    story:"Weave a story with beginning, challenge, action, outcome. Feel natural.",
    concise:"Be crisp and direct. Under 120 words. No fluff.",
    humble:"Be genuine and modest. Show eagerness to grow.",
    technical:"Go deep technically. Use precise terminology. Include code if relevant.",
  };

  const typewrite = useCallback((text) => {
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    setDisplayedAnswer(""); let i = 0;
    typewriterRef.current = setInterval(() => {
      if (i < text.length) setDisplayedAnswer(text.slice(0, ++i));
      else clearInterval(typewriterRef.current);
    }, text.length > 600 ? 5 : 8);
  }, []);

  const generate = async (feedback = null) => { 
    if (generating) return;
    setGenerating(true); setShowAnswer(true); setDisplayedAnswer(""); setRating(null); setShowFeedback(false);
    const feedbackNote = feedback ? `\n\nUser feedback: "${feedback}". Address this specifically.` : "";
    const company = q.company || "Genpact";
    const prompt = `You're a job candidate being interviewed at ${company}. Answer this interview question in first person, naturally.\n\nQuestion: "${q.text}"\nRole: ${q.job}\nType: ${q.type}\nTone: ${TONE_GUIDES[tone]}\n\nRules:\n- Write as someone would SPEAK — conversational\n- Use natural transitions\n- First person throughout\n- No bullet points, no headers, no markdown\n- 150–220 words, conversational but substantive\n- End with a confident closer${feedbackNote}\n\nWrite the answer directly.`;
    try {
      const text = await callAI([{ role:"user", content:prompt }], "generate");
      setAnswer(text); typewrite(text);
    } catch { setDisplayedAnswer("⚠️ Could not connect to AI. Try again."); }
    setGenerating(false);
  };

  const handleTTS = () => {
    if (!answer && !displayedAnswer) return;
    if (ttsPlaying) { window.speechSynthesis.cancel(); setTtsPlaying(false); return; }
    const utt = new SpeechSynthesisUtterance(answer || displayedAnswer);
    utt.rate = 0.9; utt.onend = () => setTtsPlaying(false);
    window.speechSynthesis.speak(utt); setTtsPlaying(true);
  };

  const isTyping = generating || (displayedAnswer && displayedAnswer.length < (answer?.length || 0));
  const iconBtn = (active, activeColor, activeBg) => ({
    width:34, height:34, borderRadius:10,
    background: active ? activeBg : "rgba(255,255,255,0.03)",
    border:`1px solid ${active ? activeColor : "var(--border)"}`,
    color: active ? activeColor : "var(--muted)",
    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:14, transition:"all 0.2s ease",
  });

  return (
    <div className="card-hover" style={{
      background:"var(--card)", border:"1px solid var(--border)", borderRadius:16, padding:24,
      borderLeft: showAnswer ? "3px solid var(--green)" : "3px solid transparent",
      transition:"all 0.3s cubic-bezier(0.16,1,0.3,1)",
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <Badge label={q.type} cls={`tag-${q.type}`}/>
          <Badge label={q.diff} cls={`diff-${q.diff}`}/>
          <span style={{fontSize:11,color:"var(--muted)",margin:"0 2px"}}>·</span>
          <span style={{fontSize:12,color:"var(--text2)",fontWeight:500}}>{q.job}</span>
          {q.company && <><span style={{fontSize:11,color:"var(--muted)"}}>·</span><span style={{fontSize:11,color:"var(--blue)",fontWeight:500}}>{q.company}</span></>}
        </div>
        <span style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)",flexShrink:0,opacity:0.7}}>{q.date}</span>
      </div>
      <p style={{fontSize:15,fontWeight:500,lineHeight:1.7,color:"var(--text)",marginBottom:20,letterSpacing:"-0.2px"}}>{q.text}</p>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <select value={tone} onChange={e=>setTone(e.target.value)} style={{...filterSS,padding:"7px 30px 7px 10px",fontSize:12,width:"auto"}}>
          {Object.entries(TONES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-glow" onClick={()=>generate()} disabled={generating} style={{
          display:"flex",alignItems:"center",gap:7,padding:"8px 18px",borderRadius:10,
          background:"linear-gradient(135deg,#1e3a6e,#162d5a)",
          border:"1px solid rgba(59,130,246,0.35)",color:"#60a5fa",
          fontSize:12,fontWeight:600,fontFamily:"var(--font)",
          cursor:generating?"not-allowed":"pointer",opacity:generating?0.7:1,
        }}>
          {generating?<><Spinner/> Generating…</>:<>⚡ {answer?"Regenerate":"Generate Answer"}</>}
        </button>
        {onDelete && <button onClick={()=>onDelete(q.id)} title="Delete" style={iconBtn(false,"var(--red)","var(--red-dim)")}>🗑️</button>}
        <button onClick={()=>onBookmark(q.id)} title="Bookmark" style={iconBtn(bookmarked,"var(--red)","var(--red-dim)")}>🔖</button>
        <button onClick={()=>{navigator.clipboard.writeText(q.text);showToast("Question copied!")}} title="Copy" style={iconBtn(false,"var(--text2)","transparent")}>📋</button>
        <button onClick={()=>onLike(q.id)} style={{
          display:"flex",alignItems:"center",gap:5,marginLeft:"auto",
          background:liked?"var(--blue-dim)":"transparent",
          border:`1px solid ${liked?"rgba(59,130,246,0.3)":"transparent"}`,
          cursor:"pointer",color:liked?"var(--blue)":"var(--muted)",
          fontSize:12,fontWeight:500,fontFamily:"var(--font)",
          padding:"5px 10px",borderRadius:8,transition:"all 0.2s",
        }}>
          👍 {q.upvotes||0}
        </button>
      </div>
      {showAnswer && (
        <div className="fadeIn" style={{marginTop:18,borderTop:"1px solid var(--border)",paddingTop:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:10,fontWeight:600,letterSpacing:1.2,textTransform:"uppercase",color:"var(--green)",fontFamily:"var(--mono)"}}>
              <span style={{
                width:7,height:7,borderRadius:"50%",background:"var(--green)",display:"inline-block",
                animation:generating?"pulse 1s infinite":"none",
                boxShadow:generating?"0 0 8px var(--green)":"none",
              }}/>
              AI Answer{isTyping&&!generating&&<TypingDots/>}
            </div>
            {answer&&<div style={{display:"flex",gap:6}}>
              <button className="btn-secondary-hover" onClick={handleTTS} style={{background:ttsPlaying?"var(--green-dim)":"rgba(255,255,255,0.03)",border:`1px solid ${ttsPlaying?"rgba(16,185,129,0.3)":"var(--border)"}`,color:ttsPlaying?"var(--green)":"var(--text2)",padding:"5px 12px",borderRadius:8,fontSize:11,cursor:"pointer",fontFamily:"var(--font)",fontWeight:500,transition:"all 0.2s"}}>🔊 {ttsPlaying?"Stop":"Listen"}</button>
              <button className="btn-secondary-hover" onClick={()=>{navigator.clipboard.writeText(answer);showToast("Copied!")}} style={{background:"rgba(255,255,255,0.03)",border:"1px solid var(--border)",color:"var(--text2)",padding:"5px 12px",borderRadius:8,fontSize:11,cursor:"pointer",fontFamily:"var(--font)",fontWeight:500,transition:"all 0.2s"}}>📋 Copy</button>
            </div>}
          </div>
          {generating&&!displayedAnswer?<div style={{color:"var(--muted)",fontSize:13,padding:"8px 0"}}><TypingDots/></div>:
          <p style={{fontSize:13.5,lineHeight:1.85,color:"var(--text2)",whiteSpace:"pre-wrap",borderLeft:"2px solid var(--green)",paddingLeft:16,margin:"4px 0"}}>
            {displayedAnswer}{isTyping&&!generating&&<span style={{animation:"blink 0.7s step-end infinite",color:"var(--green)"}}>▋</span>}
          </p>}
          {answer&&!generating&&(
            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:16,paddingTop:14,borderTop:"1px solid var(--border)",flexWrap:"wrap"}}>
              <span style={{fontSize:12,color:"var(--muted)"}}>Helpful?</span>
              <button onClick={()=>{setRating("good");setShowFeedback(false);showToast("Thanks!")}} style={{background:rating==="good"?"var(--green-dim)":"rgba(255,255,255,0.03)",border:`1px solid ${rating==="good"?"rgba(16,185,129,0.3)":"var(--border)"}`,color:rating==="good"?"var(--green)":"var(--text2)",padding:"5px 14px",borderRadius:20,fontSize:11,cursor:"pointer",fontFamily:"var(--font)",fontWeight:500,transition:"all 0.2s"}}>👍 Yes</button>
              <button onClick={()=>{setRating("bad");setShowFeedback(true)}} style={{background:rating==="bad"?"var(--red-dim)":"rgba(255,255,255,0.03)",border:`1px solid ${rating==="bad"?"rgba(239,68,68,0.3)":"var(--border)"}`,color:rating==="bad"?"var(--red)":"var(--text2)",padding:"5px 14px",borderRadius:20,fontSize:11,cursor:"pointer",fontFamily:"var(--font)",fontWeight:500,transition:"all 0.2s"}}>👎 Improve</button>
              {showFeedback&&<>
                <input value={feedbackText} onChange={e=>setFeedbackText(e.target.value)} placeholder="How to improve…" style={{flex:1,minWidth:140,background:"rgba(255,255,255,0.03)",border:"1px solid var(--border)",color:"var(--text)",padding:"6px 12px",borderRadius:8,fontSize:11,fontFamily:"var(--font)",outline:"none",transition:"border-color 0.2s"}}/>
                <button className="btn-glow" onClick={()=>generate(feedbackText)} style={{background:"var(--red)",border:"none",color:"#fff",padding:"6px 14px",borderRadius:8,fontSize:11,cursor:"pointer",fontFamily:"var(--font)",fontWeight:600}}>Regenerate</button>
              </>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { QuestionCard, Badge, Spinner, TypingDots, Toast, SkeletonCard, css, apiFetch, callAI, primaryBtn, secondaryBtn, selectSt, sideCard, sideTitle, filterSS, API_BASE, PAGE_SIZE };
