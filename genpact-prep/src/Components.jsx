import { useState, useRef, useCallback } from "react";

const API_BASE = "http://localhost:5000/api";
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

// ─── CSS ────────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
:root {
  --bg:#0b0d13;--surface:#111318;--card:#161921;--card-hover:#1c1f2a;
  --border:#222632;--border-hover:#2e3447;
  --red:#e84b3a;--red-dim:rgba(232,75,58,0.12);
  --blue:#3d7de8;--blue-dim:rgba(61,125,232,0.12);
  --green:#00c896;--green-dim:rgba(0,200,150,0.1);
  --yellow:#f5a623;--purple:#a855f7;
  --text:#eaedf5;--text2:#9aa3b8;--muted:#555f78;
  --font:'Sora',sans-serif;--mono:'IBM Plex Mono',monospace;
  --shadow:0 4px 24px rgba(0,0,0,0.5);--radius:12px;
}
body{font-family:var(--font);background:var(--bg);color:var(--text)}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes blink{50%{opacity:0}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
@keyframes dot1{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
.fadeUp{animation:fadeUp .35s ease both}
.fadeIn{animation:fadeIn .25s ease both}
.spin{animation:spin .8s linear infinite;display:inline-block}
.tag-Technical{background:rgba(61,125,232,0.14);color:#6ea8fe;border:1px solid rgba(61,125,232,0.25)}
.tag-HR{background:rgba(232,75,58,0.12);color:#f87171;border:1px solid rgba(232,75,58,0.25)}
.tag-Background{background:rgba(168,85,247,0.12);color:#c084fc;border:1px solid rgba(168,85,247,0.25)}
.tag-Behavioral{background:rgba(245,166,35,0.12);color:#fbbf24;border:1px solid rgba(245,166,35,0.25)}
.diff-Easy{background:rgba(0,200,150,0.1);color:#34d399;border:1px solid rgba(0,200,150,0.2)}
.diff-Medium{background:rgba(245,166,35,0.1);color:#fbbf24;border:1px solid rgba(245,166,35,0.2)}
.diff-Hard{background:rgba(232,75,58,0.1);color:#f87171;border:1px solid rgba(232,75,58,0.2)}
`;

// ─── SMALL COMPONENTS ───────────────────────────────────────────────────────
const Badge = ({ label, cls }) => (
  <span style={{ fontSize:10, fontWeight:600, padding:"3px 9px", borderRadius:20, textTransform:"uppercase", letterSpacing:"0.5px", fontFamily:"var(--mono)", display:"inline-block" }} className={cls}>{label}</span>
);
const Spinner = () => <span className="spin">⟳</span>;
const TypingDots = () => (
  <span style={{display:"inline-flex",gap:4,alignItems:"center",padding:"2px 0"}}>
    {[0,160,320].map((d,i) => <span key={i} style={{ width:6,height:6,borderRadius:"50%",background:"var(--green)",display:"inline-block",animation:`dot1 1.2s ease-in-out ${d}ms infinite` }}/>)}
  </span>
);
const Toast = ({ msg, visible }) => (
  <div style={{ position:"fixed",bottom:24,right:24,zIndex:9999,background:"var(--card)",border:"1px solid var(--green)",color:"var(--green)",padding:"11px 18px",borderRadius:10,fontSize:13,fontFamily:"var(--font)",opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(10px)",transition:"all 0.3s",pointerEvents:"none",display:"flex",alignItems:"center",gap:8 }}>✓ {msg}</div>
);

const primaryBtn = { padding:"10px 20px",borderRadius:10,background:"var(--blue)",border:"none",color:"#fff",fontSize:13,fontWeight:600,fontFamily:"var(--font)",cursor:"pointer" };
const secondaryBtn = { padding:"10px 20px",borderRadius:10,background:"var(--card)",border:"1px solid var(--border)",color:"var(--text)",fontSize:13,fontWeight:600,fontFamily:"var(--font)",cursor:"pointer" };
const selectSt = { background:"var(--card)",border:"1px solid var(--border)",color:"var(--text)",padding:"8px 14px",borderRadius:8,fontSize:13,fontFamily:"var(--font)",width:"100%",outline:"none",cursor:"pointer" };
const sideCard = { background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,padding:18 };
const sideTitle = { fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:"var(--muted)",marginBottom:14,fontFamily:"var(--mono)" };
const filterSS = { background:"var(--card)",border:"1px solid var(--border)",color:"var(--text2)",padding:"7px 28px 7px 11px",borderRadius:8,fontSize:12,fontFamily:"var(--font)",cursor:"pointer",outline:"none",appearance:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 9px center" };

// ─── QUESTION CARD ──────────────────────────────────────────────────────────
function QuestionCard({ q, bookmarked, liked, onBookmark, onLike, showToast }) {
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
    }, text.length > 600 ? 6 : 10);
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

  return (
    <div className="fadeUp" style={{ background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,padding:22,borderLeft:showAnswer?"3px solid var(--green)":"3px solid var(--border)",transition:"all 0.25s" }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:12}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <Badge label={q.type} cls={`tag-${q.type}`}/>
          <Badge label={q.diff} cls={`diff-${q.diff}`}/>
          <span style={{fontSize:11,color:"var(--muted)"}}>|</span>
          <span style={{fontSize:12,color:"var(--text2)"}}>{q.job}</span>
          {q.company && <><span style={{fontSize:11,color:"var(--muted)"}}>·</span><span style={{fontSize:11,color:"var(--blue)"}}>{q.company}</span></>}
        </div>
        <span style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)",flexShrink:0}}>{q.date}</span>
      </div>
      <p style={{fontSize:15,fontWeight:500,lineHeight:1.6,color:"var(--text)",marginBottom:18}}>{q.text}</p>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <select value={tone} onChange={e=>setTone(e.target.value)} style={{...filterSS,padding:"6px 28px 6px 10px",fontSize:12}}>
          {Object.entries(TONES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={()=>generate()} disabled={generating} style={{ display:"flex",alignItems:"center",gap:7,padding:"7px 16px",borderRadius:8,background:"linear-gradient(135deg,#1b3564,#152a50)",border:"1px solid rgba(61,125,232,0.45)",color:"#6ea8fe",fontSize:12,fontWeight:600,fontFamily:"var(--font)",cursor:generating?"not-allowed":"pointer",opacity:generating?0.7:1 }}>
          {generating?<><Spinner/> Generating…</>:<>⚡ {answer?"Regenerate":"Generate Answer"}</>}
        </button>
        <button onClick={()=>onBookmark(q.id)} title="Bookmark" style={{ width:32,height:32,borderRadius:8,background:bookmarked?"var(--red-dim)":"var(--surface)",border:`1px solid ${bookmarked?"var(--red)":"var(--border)"}`,color:bookmarked?"var(--red)":"var(--text2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>🔖</button>
        <button onClick={()=>{navigator.clipboard.writeText(q.text);showToast("Question copied!")}} title="Copy" style={{ width:32,height:32,borderRadius:8,background:"var(--surface)",border:"1px solid var(--border)",color:"var(--text2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>📋</button>
        <button onClick={()=>onLike(q.id)} style={{ display:"flex",alignItems:"center",gap:5,marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:liked?"var(--blue)":"var(--muted)",fontSize:12,fontFamily:"var(--font)",padding:"4px 8px",borderRadius:6 }}>
          👍 {q.upvotes||0}
        </button>
      </div>
      {showAnswer && (
        <div className="fadeIn" style={{marginTop:16,borderTop:"1px solid var(--border)",paddingTop:16}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6,fontSize:10,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"var(--green)",fontFamily:"var(--mono)"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"var(--green)",display:"inline-block",animation:generating?"pulse 1s infinite":"none"}}/>AI Answer{isTyping&&!generating&&<TypingDots/>}
            </div>
            {answer&&<div style={{display:"flex",gap:6}}>
              <button onClick={handleTTS} style={{background:ttsPlaying?"var(--green-dim)":"var(--surface)",border:`1px solid ${ttsPlaying?"var(--green)":"var(--border)"}`,color:ttsPlaying?"var(--green)":"var(--text2)",padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"var(--font)"}}>🔊 {ttsPlaying?"Stop":"Listen"}</button>
              <button onClick={()=>{navigator.clipboard.writeText(answer);showToast("Copied!")}} style={{background:"var(--surface)",border:"1px solid var(--border)",color:"var(--text2)",padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"var(--font)"}}>📋 Copy</button>
            </div>}
          </div>
          {generating&&!displayedAnswer?<div style={{color:"var(--muted)",fontSize:13}}><TypingDots/></div>:
          <p style={{fontSize:13.5,lineHeight:1.8,color:"var(--text2)",whiteSpace:"pre-wrap",borderLeft:"2px solid var(--green)",paddingLeft:14}}>
            {displayedAnswer}{isTyping&&!generating&&<span style={{animation:"blink 0.7s step-end infinite",color:"var(--green)"}}>▋</span>}
          </p>}
          {answer&&!generating&&(
            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:14,paddingTop:12,borderTop:"1px solid var(--border)",flexWrap:"wrap"}}>
              <span style={{fontSize:12,color:"var(--muted)"}}>Helpful?</span>
              <button onClick={()=>{setRating("good");setShowFeedback(false);showToast("Thanks!")}} style={{background:rating==="good"?"var(--green-dim)":"var(--surface)",border:`1px solid ${rating==="good"?"var(--green)":"var(--border)"}`,color:rating==="good"?"var(--green)":"var(--text2)",padding:"4px 12px",borderRadius:20,fontSize:11,cursor:"pointer",fontFamily:"var(--font)"}}>👍 Yes</button>
              <button onClick={()=>{setRating("bad");setShowFeedback(true)}} style={{background:rating==="bad"?"var(--red-dim)":"var(--surface)",border:`1px solid ${rating==="bad"?"var(--red)":"var(--border)"}`,color:rating==="bad"?"var(--red)":"var(--text2)",padding:"4px 12px",borderRadius:20,fontSize:11,cursor:"pointer",fontFamily:"var(--font)"}}>👎 Improve</button>
              {showFeedback&&<>
                <input value={feedbackText} onChange={e=>setFeedbackText(e.target.value)} placeholder="How to improve…" style={{flex:1,minWidth:140,background:"var(--surface)",border:"1px solid var(--border)",color:"var(--text)",padding:"5px 10px",borderRadius:6,fontSize:11,fontFamily:"var(--font)",outline:"none"}}/>
                <button onClick={()=>generate(feedbackText)} style={{background:"var(--red)",border:"none",color:"#fff",padding:"5px 12px",borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"var(--font)"}}>Regenerate</button>
              </>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { QuestionCard, Badge, Spinner, TypingDots, Toast, css, apiFetch, callAI, primaryBtn, secondaryBtn, selectSt, sideCard, sideTitle, filterSS, API_BASE, PAGE_SIZE };
