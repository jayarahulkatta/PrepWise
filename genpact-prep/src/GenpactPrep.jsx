import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import AuthPage from "./AuthPage";
import { QuestionCard, Badge, Spinner, TypingDots, Toast, css, apiFetch, callAI, primaryBtn, secondaryBtn, selectSt, sideCard, sideTitle, filterSS, API_BASE, PAGE_SIZE } from "./Components";

// ─── MOCK INTERVIEW ─────────────────────────────────────────────────────────
function MockInterview({ onClose, allQuestions, company }) {
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
  const timerRef = useRef(null);
  const shuffle = arr => [...arr].sort(() => Math.random()-0.5);

  const start = () => {
    let pool = role ? allQuestions.filter(q => q.job === role) : allQuestions;
    if (pool.length < count) pool = allQuestions;
    setQuestions(shuffle(pool).slice(0, count));
    setIdx(0); setUserAnswer(""); setFeedback(null); setScores([]); setTimeLeft(timeLimit); setPhase("active");
  };

  useEffect(() => {
    if (phase !== "active" || feedback) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); submitAnswer(); return 0; } return t-1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, idx, feedback]);

  const submitAnswer = async () => {
    clearInterval(timerRef.current); setLoadingFeedback(true);
    const q = questions[idx]; const ans = userAnswer.trim();
    try {
      const raw = await callAI([{ role:"user", content:`You are an experienced ${company||"company"} interviewer. Evaluate this answer.\nQuestion: "${q.text}"\nRole: ${q.job}\nAnswer: "${ans||"(no answer)"}"\n\nRespond ONLY with valid JSON, no markdown:\n{"completeness":75,"clarity":80,"relevance":70,"feedback":"2-3 sentence feedback. Mention one strength and one improvement."}` }], "evaluate");
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      setScores(prev=>[...prev,{...parsed,qid:q.id}]); setFeedback(parsed);
    } catch { const fb={completeness:60,clarity:60,relevance:60,feedback:"Could not get feedback. Keep practicing!"}; setScores(prev=>[...prev,fb]); setFeedback(fb); }
    setLoadingFeedback(false);
  };

  const next = () => { if(idx+1>=questions.length){setPhase("results");return;} setIdx(idx+1);setUserAnswer("");setFeedback(null);setTimeLeft(timeLimit); };
  const avg = k => scores.length?Math.round(scores.reduce((s,x)=>s+(x[k]||0),0)/scores.length):0;
  const sc = v => v>=70?"var(--green)":v>=50?"var(--yellow)":"var(--red)";
  const m=Math.floor(timeLeft/60), s=timeLeft%60;
  const tc = timeLeft<=30?"var(--red)":timeLeft<=60?"var(--yellow)":"var(--text)";
  const q=questions[idx];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="fadeUp" style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:20,width:"100%",maxWidth:680,maxHeight:"90vh",overflowY:"auto",padding:32,position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute",top:16,right:16,width:32,height:32,borderRadius:8,background:"var(--card)",border:"1px solid var(--border)",color:"var(--text2)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        {phase==="setup"&&<div>
          <h2 style={{fontSize:22,fontWeight:700,marginBottom:8}}>⏱️ Mock Interview {company&&`— ${company}`}</h2>
          <p style={{fontSize:13,color:"var(--text2)",marginBottom:24}}>Answer under timed conditions. Get AI scoring.</p>
          {[{label:"Role",el:<select value={role} onChange={e=>setRole(e.target.value)} style={selectSt}><option value="">Any Role</option>{[...new Set(allQuestions.map(q=>q.job))].map(j=><option key={j}>{j}</option>)}</select>},
            {label:"Time per question",el:<select value={timeLimit} onChange={e=>setTimeLimit(+e.target.value)} style={selectSt}><option value={120}>2 min</option><option value={180}>3 min</option><option value={300}>5 min</option></select>},
            {label:"Questions",el:<select value={count} onChange={e=>setCount(+e.target.value)} style={selectSt}><option value={3}>3</option><option value={5}>5</option><option value={10}>10</option></select>}
          ].map(({label,el})=><div key={label} style={{marginBottom:16}}><label style={{fontSize:12,color:"var(--text2)",display:"block",marginBottom:6}}>{label}</label>{el}</div>)}
          <div style={{display:"flex",gap:10,marginTop:24}}><button onClick={start} style={{...primaryBtn,flex:1}}>Start Interview</button><button onClick={onClose} style={{...secondaryBtn,flex:1}}>Cancel</button></div>
        </div>}
        {phase==="active"&&q&&<div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><div style={{flex:1,height:4,background:"var(--border)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:"var(--green)",borderRadius:2,width:`${(idx/questions.length)*100}%`,transition:"width 0.5s"}}/></div><span style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)"}}>{idx+1}/{questions.length}</span></div>
          <div style={{fontSize:48,fontWeight:700,fontFamily:"var(--mono)",textAlign:"center",color:tc,marginBottom:16,animation:timeLeft<=30?"pulse 1s infinite":"none"}}>{m}:{String(s).padStart(2,"0")}</div>
          <div style={{display:"flex",gap:6,marginBottom:12}}><Badge label={q.type} cls={`tag-${q.type}`}/><Badge label={q.diff} cls={`diff-${q.diff}`}/></div>
          <p style={{fontSize:16,fontWeight:500,lineHeight:1.6,marginBottom:18}}>{q.text}</p>
          <textarea value={userAnswer} onChange={e=>setUserAnswer(e.target.value)} placeholder="Type your answer…" style={{width:"100%",background:"var(--card)",border:"1px solid var(--border)",color:"var(--text)",borderRadius:10,padding:14,fontSize:13,fontFamily:"var(--font)",resize:"vertical",minHeight:130,outline:"none",lineHeight:1.7}}/>
          {!feedback&&!loadingFeedback&&<div style={{display:"flex",gap:10,marginTop:14}}><button onClick={submitAnswer} style={{...primaryBtn,flex:1}}>Submit & Get Feedback</button><button onClick={next} style={{...secondaryBtn,flex:1}}>Skip →</button></div>}
          {loadingFeedback&&<div style={{marginTop:16,textAlign:"center",color:"var(--text2)",fontSize:13}}><TypingDots/> Analyzing…</div>}
          {feedback&&<div className="fadeIn" style={{marginTop:18,padding:18,background:"var(--card)",border:"1px solid var(--border)",borderRadius:12}}>
            <div style={{display:"flex",gap:12,marginBottom:14}}>{["completeness","clarity","relevance"].map(k=><div key={k} style={{flex:1,textAlign:"center",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:12}}><div style={{fontSize:26,fontWeight:700,fontFamily:"var(--mono)",color:sc(feedback[k])}}>{feedback[k]}</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2,textTransform:"capitalize"}}>{k}</div></div>)}</div>
            <p style={{fontSize:13,lineHeight:1.7,color:"var(--text2)"}}>{feedback.feedback}</p>
            <div style={{display:"flex",gap:10,marginTop:14}}><button onClick={next} style={{...primaryBtn,flex:1}}>{idx+1>=questions.length?"See Results":"Next →"}</button><button onClick={onClose} style={{...secondaryBtn,flex:1}}>End</button></div>
          </div>}
        </div>}
        {phase==="results"&&<div style={{textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:12}}>🎉</div><h2 style={{fontSize:22,marginBottom:8}}>Session Complete!</h2>
          <p style={{fontSize:13,color:"var(--text2)",marginBottom:24}}>You completed {questions.length} questions.</p>
          <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:24}}>{["completeness","clarity","relevance"].map(k=><div key={k} style={{textAlign:"center",background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 24px"}}><div style={{fontSize:32,fontWeight:700,fontFamily:"var(--mono)",color:sc(avg(k))}}>{avg(k)}</div><div style={{fontSize:11,color:"var(--muted)",marginTop:4,textTransform:"capitalize"}}>{k}</div></div>)}</div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}><button onClick={()=>{setPhase("setup");setScores([])}} style={primaryBtn}>Practice Again</button><button onClick={onClose} style={secondaryBtn}>Close</button></div>
        </div>}
      </div>
    </div>
  );
}

// ─── CHAT SIMULATOR ─────────────────────────────────────────────────────────
function ChatSimulator({ onClose, company }) {
  const [messages, setMessages] = useState([{ role:"ai", text:`Hi! I'm your ${company||"company"} interviewer today. Tell me about yourself and why you're interested in ${company||"this role"}?` }]);
  const [input, setInput] = useState(""); const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"})},[messages,loading]);

  const send = async () => {
    const text=input.trim(); if(!text||loading) return; setInput("");
    const updated=[...messages,{role:"user",text}]; setMessages(updated); setLoading(true);
    const apiMsgs=updated.map(m=>({role:m.role==="ai"?"assistant":"user",content:m.text}));
    const sys=`You are a professional ${company||"company"} interviewer for a software/analyst role.\nRules:\n- Stay in character, never say you're AI\n- Ask ONE follow-up based on what candidate said\n- Be encouraging but probe deeper\n- After 5-7 exchanges, conclude and give impressions\n- Keep to 2-4 sentences\n- React specifically to what was said`;
    try {
      const reply = await callAI([{role:"user",content:sys},{role:"assistant",content:"Understood."}, ...apiMsgs], "generate");
      setMessages(prev=>[...prev,{role:"ai",text:reply}]);
    } catch { setMessages(prev=>[...prev,{role:"ai",text:"Sorry, technical issue. Please continue."}]); }
    setLoading(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="fadeUp" style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:20,width:"100%",maxWidth:580,height:"80vh",maxHeight:650,display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--green))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🤵</div>
          <div><div style={{fontSize:14,fontWeight:600}}>{company||"Company"} Interviewer</div><div style={{fontSize:11,color:"var(--green)"}}>● Live — AI Simulator</div></div>
          <button onClick={onClose} style={{marginLeft:"auto",width:32,height:32,borderRadius:8,background:"var(--card)",border:"1px solid var(--border)",color:"var(--text2)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:20,display:"flex",flexDirection:"column",gap:12}}>
          {messages.map((m,i)=><div key={i} style={{display:"flex",gap:10,flexDirection:m.role==="user"?"row-reverse":"row"}}>
            <div style={{width:30,height:30,borderRadius:8,background:m.role==="ai"?"var(--card)":"var(--blue)",border:m.role==="ai"?"1px solid var(--border)":"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{m.role==="ai"?"🤵":"😊"}</div>
            <div style={{maxWidth:"80%",padding:"11px 14px",borderRadius:12,fontSize:13,lineHeight:1.65,background:m.role==="ai"?"var(--card)":"var(--blue)",border:m.role==="ai"?"1px solid var(--border)":"none",color:m.role==="ai"?"var(--text)":"#fff",borderBottomLeftRadius:m.role==="ai"?4:12,borderBottomRightRadius:m.role==="user"?4:12}}>{m.text}</div>
          </div>)}
          {loading&&<div style={{display:"flex",gap:10}}><div style={{width:30,height:30,borderRadius:8,background:"var(--card)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🤵</div><div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,borderBottomLeftRadius:4,padding:"12px 16px"}}><TypingDots/></div></div>}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:14,borderTop:"1px solid var(--border)",display:"flex",gap:8,flexShrink:0}}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Type your answer… (Enter to send)" style={{flex:1,background:"var(--card)",border:"1px solid var(--border)",color:"var(--text)",padding:"9px 12px",borderRadius:10,fontSize:13,fontFamily:"var(--font)",resize:"none",height:42,outline:"none",lineHeight:1.6}}/>
          <button onClick={send} disabled={loading||!input.trim()} style={{width:42,height:42,borderRadius:10,background:"var(--blue)",border:"none",color:"#fff",cursor:loading||!input.trim()?"not-allowed":"pointer",opacity:loading||!input.trim()?0.6:1,display:"flex",alignItems:"center",justifyContent:"center"}}>➤</button>
        </div>
      </div>
    </div>
  );
}

// ─── SUBMIT QUESTION MODAL ──────────────────────────────────────────────────
function SubmitQuestionModal({ onClose, companies, selectedCompany, getToken, showToast }) {
  const [form, setForm] = useState({ company:selectedCompany||"Genpact", job:"", type:"Technical", diff:"Medium", exp:"Fresher", text:"" });
  const [submitting, setSubmitting] = useState(false);
  const update = (k,v) => setForm(prev=>({...prev,[k]:v}));

  const submit = async (e) => {
    e.preventDefault(); if(!form.text.trim()||!form.job.trim()) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await apiFetch(`${API_BASE}/questions/submit`, { method:"POST", body:JSON.stringify(form) }, token);
      showToast("Question submitted for review!"); onClose();
    } catch { showToast("Failed to submit. Try again."); }
    setSubmitting(false);
  };

  const inputSt = { width:"100%",padding:"10px 14px",borderRadius:10,background:"var(--card)",border:"1px solid var(--border)",color:"var(--text)",fontSize:13,fontFamily:"var(--font)",outline:"none" };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="fadeUp" style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:20,width:"100%",maxWidth:520,padding:32,position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute",top:16,right:16,width:32,height:32,borderRadius:8,background:"var(--card)",border:"1px solid var(--border)",color:"var(--text2)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        <h2 style={{fontSize:20,fontWeight:700,marginBottom:6}}>📝 Submit a Question</h2>
        <p style={{fontSize:12,color:"var(--text2)",marginBottom:24}}>Share a real interview question you've encountered. It will be reviewed before publishing.</p>
        <form onSubmit={submit}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div><label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:4}}>Company</label><select value={form.company} onChange={e=>update("company",e.target.value)} style={selectSt}>{companies.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:4}}>Job Role</label><input value={form.job} onChange={e=>update("job",e.target.value)} placeholder="e.g. Software Engineer" required style={inputSt}/></div>
            <div><label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:4}}>Type</label><select value={form.type} onChange={e=>update("type",e.target.value)} style={selectSt}>{["Technical","HR","Behavioral","Background"].map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:4}}>Difficulty</label><select value={form.diff} onChange={e=>update("diff",e.target.value)} style={selectSt}>{["Easy","Medium","Hard"].map(d=><option key={d}>{d}</option>)}</select></div>
          </div>
          <div style={{marginBottom:14}}><label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:4}}>Experience Level</label><select value={form.exp} onChange={e=>update("exp",e.target.value)} style={selectSt}>{["Fresher","1-3 Years","3-5 Years","Senior"].map(x=><option key={x}>{x}</option>)}</select></div>
          <div style={{marginBottom:20}}><label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:4}}>Question</label><textarea value={form.text} onChange={e=>update("text",e.target.value)} placeholder="Type the interview question here…" required rows={3} style={{...inputSt,resize:"vertical",lineHeight:1.6}}/></div>
          <div style={{display:"flex",gap:10}}><button type="submit" disabled={submitting} style={{...primaryBtn,flex:1,opacity:submitting?0.7:1}}>{submitting?"Submitting…":"Submit Question"}</button><button type="button" onClick={onClose} style={{...secondaryBtn,flex:1}}>Cancel</button></div>
        </form>
      </div>
    </div>
  );
}

// ─── BOOKMARKS PANEL ────────────────────────────────────────────────────────
function BookmarksPanel({ bookmarkedQuestions, onClose, onRemove }) {
  return (
    <div style={{position:"fixed",top:0,right:0,bottom:0,width:340,zIndex:800,background:"var(--surface)",borderLeft:"1px solid var(--border)",display:"flex",flexDirection:"column"}} className="fadeIn">
      <div style={{padding:20,borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <h2 style={{fontSize:16,fontWeight:700}}>🔖 Saved <span style={{fontSize:12,color:"var(--muted)",fontFamily:"var(--mono)"}}>({bookmarkedQuestions.length})</span></h2>
        <button onClick={onClose} style={{width:32,height:32,borderRadius:8,background:"var(--card)",border:"1px solid var(--border)",color:"var(--text2)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
        {bookmarkedQuestions.length===0?<div style={{textAlign:"center",color:"var(--muted)",fontSize:13,padding:"48px 16px"}}>No bookmarks yet.<br/>Click 🔖 on any question.</div>:
        bookmarkedQuestions.map(q=><div key={q.id} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,padding:14}}>
          <p style={{fontSize:13,fontWeight:500,lineHeight:1.5,marginBottom:10}}>{q.text}</p>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Badge label={q.type} cls={`tag-${q.type}`}/><Badge label={q.diff} cls={`diff-${q.diff}`}/>
            <span style={{fontSize:11,color:"var(--blue)",marginLeft:4}}>{q.company}</span>
            <button onClick={()=>onRemove(q.id)} style={{marginLeft:"auto",background:"none",border:"none",color:"var(--red)",cursor:"pointer",fontSize:11,fontFamily:"var(--font)"}}>Remove</button>
          </div>
        </div>)}
      </div>
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading: authLoading, signOut, getToken } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [companyMeta, setCompanyMeta] = useState(null);
  const selectedCompany = "Genpact";
  const companies = ["Genpact"];

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
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);

  // Toast
  const [toast, setToast] = useState({ msg:"", visible:false });
  const toastRef = useRef(null);
  const showToast = useCallback(msg => { clearTimeout(toastRef.current); setToast({msg,visible:true}); toastRef.current=setTimeout(()=>setToast(t=>({...t,visible:false})),2500); }, []);

  // Load company meta
  useEffect(() => {
    apiFetch(`${API_BASE}/companies/${selectedCompany}`).then(setCompanyMeta).catch(console.error);
  }, []);

  // Load questions (re-fetches when filters, page, sort, or fetchTrigger change)
  useEffect(() => {
    const params = new URLSearchParams({ company: selectedCompany, page, limit: PAGE_SIZE, sort: sortMode });
    if (filterJob) params.set("job", filterJob);
    if (filterType) params.set("type", filterType);
    if (filterExp) params.set("exp", filterExp);
    if (filterDiff) params.set("diff", filterDiff);
    if (search) params.set("search", search);
    apiFetch(`${API_BASE}/questions?${params}`).then(data => {
      setQuestions(data.questions); setTotalPages(data.totalPages); setTotal(data.total); setLoaded(true);
    }).catch(err => { console.error(err); setLoaded(true); });
  }, [filterJob, filterType, filterExp, filterDiff, search, sortMode, page]);

  // Load ALL questions for mock/chat
  useEffect(() => {
    apiFetch(`${API_BASE}/questions/all?company=${selectedCompany}`).then(setAllQuestions).catch(console.error);
  }, []);

  // Load user profile
  useEffect(() => {
    if (!user) { setBookmarks(new Set()); setLikes(new Set()); return; }
    (async () => {
      try {
        const token = await getToken();
        const profile = await apiFetch(`${API_BASE}/user/profile`, {}, token);
        setBookmarks(new Set(profile.bookmarks));
        setLikes(new Set(profile.likes));
      } catch {}
    })();
  }, [user, getToken]);

  const onBookmark = useCallback(async (id) => {
    if (!user) { showToast("Sign in to bookmark!"); return; }
    try {
      const token = await getToken();
      const res = await apiFetch(`${API_BASE}/user/bookmarks`, { method:"PUT", body:JSON.stringify({questionId:id}) }, token);
      setBookmarks(new Set(res.bookmarks));
    } catch { showToast("Failed to bookmark"); }
  }, [user, getToken, showToast]);

  const onLike = useCallback(async (id) => {
    if (!user) { showToast("Sign in to vote!"); return; }
    try {
      const token = await getToken();
      await apiFetch(`${API_BASE}/questions/${id}/vote`, { method:"POST", body:JSON.stringify({direction:"up"}) }, token);
      const res = await apiFetch(`${API_BASE}/user/likes`, { method:"PUT", body:JSON.stringify({questionId:id}) }, token);
      setLikes(new Set(res.likes));
      // Refresh questions to show updated vote count
      setPage(p => p);
    } catch { showToast("Failed to vote"); }
  }, [user, getToken, showToast]);

  const handleDelete = useCallback(async (id) => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      const token = await getToken();
      await apiFetch(`${API_BASE}/questions/${id}`, { method:"DELETE" }, token);
      setQuestions(prev => prev.filter(q => q.id !== id));
      setAllQuestions(prev => prev.filter(q => q.id !== id));
      setTotal(t => Math.max(0, t - 1));
      showToast("Question deleted");
    } catch { showToast("Failed to delete question"); }
  }, [user, getToken, showToast]);

  const resetFilters = () => { setFilterJob("");setFilterType("");setFilterExp("");setFilterDiff("");setSearch("");setPage(1); };

  // Show auth page if not logged in
  if (authLoading) return <><style>{css}</style><div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"}}><Spinner/></div></>;
  if (!user) return <AuthPage />;
  if (!loaded) return <><style>{css}</style><div style={{height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"var(--bg)",color:"var(--text)"}}><Spinner/><p style={{marginTop:16,fontFamily:"var(--font)",color:"var(--text2)"}}>Loading questions…</p></div></>;

  const dailyQ = allQuestions.length > 0 ? allQuestions[Math.floor(Date.now()/86400000)%allQuestions.length] : null;
  const jobs = [...new Set(allQuestions.map(q=>q.job))];
  const types = ["Technical","HR","Background","Behavioral"];
  const exps = ["Fresher","1-3 Years","3-5 Years","Senior"];
  const diffs = ["Easy","Medium","Hard"];
  const bookmarkedQs = allQuestions.filter(q => bookmarks.has(q.id));
  const pageBtn = active=>({width:34,height:34,background:active?"var(--red)":"var(--card)",border:`1px solid ${active?"var(--red)":"var(--border)"}`,borderRadius:8,color:active?"#fff":"var(--text2)",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font)"});

  return (
    <>
      <style>{css}</style>
      {/* Header */}
      <header style={{position:"sticky",top:0,zIndex:500,background:"rgba(11,13,19,0.95)",backdropFilter:"blur(20px)",borderBottom:"1px solid var(--border)",padding:"0 28px",display:"flex",alignItems:"center",gap:14,height:58}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,transform:"rotate(45deg)"}}>{["#e84b3a","#3d7de8","#3d7de8","#e84b3a"].map((c,i)=><span key={i} style={{borderRadius:3,background:c}}/>)}</div>
          <span style={{fontSize:16,fontWeight:700,letterSpacing:"-0.5px"}}>Prep<span style={{color:"var(--red)"}}>Wise</span></span>
        </div>
        {/* Genpact badge */}
        <span style={{marginLeft:16,fontSize:12,color:"var(--text2)",background:"var(--card)",padding:"6px 14px",borderRadius:8,border:"1px solid var(--border)"}}>🏢 Genpact</span>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>setShowSubmit(true)} style={{...secondaryBtn,flex:"none",padding:"7px 14px",fontSize:12,display:"flex",alignItems:"center",gap:6}}>📝 Submit Q</button>
          <button onClick={()=>setShowChat(true)} style={{...secondaryBtn,flex:"none",padding:"7px 14px",fontSize:12}}>💬 AI Chat</button>
          <button onClick={()=>setShowMock(true)} style={{...secondaryBtn,flex:"none",padding:"7px 14px",fontSize:12}}>⏱️ Mock</button>
          <button onClick={()=>setShowBookmarks(v=>!v)} style={{...secondaryBtn,flex:"none",padding:"7px 14px",fontSize:12,borderColor:showBookmarks?"var(--red)":"var(--border)",color:showBookmarks?"var(--red)":"var(--text2)"}}>🔖 {bookmarks.size}</button>
          {/* User menu */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:8}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"var(--blue)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,overflow:"hidden"}}>
              {user.photoURL?<img src={user.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:user.displayName?user.displayName[0].toUpperCase():"U"}
            </div>
            <button onClick={signOut} style={{background:"none",border:"1px solid var(--border)",color:"var(--red)",padding:"5px 10px",borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"var(--font)"}}>Sign Out</button>
          </div>
        </div>
      </header>

      {/* Daily Banner */}
      {dailyQ&&<div style={{background:"linear-gradient(135deg,rgba(61,125,232,0.1),rgba(0,200,150,0.07))",borderBottom:"1px solid rgba(61,125,232,0.15)",padding:"11px 28px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{background:"var(--blue)",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,textTransform:"uppercase",letterSpacing:1,fontFamily:"var(--mono)",flexShrink:0}}>Today's Q</span>
        <span style={{fontSize:13,color:"var(--text2)"}}><strong style={{color:"var(--text)"}}>{dailyQ.text}</strong></span>
      </div>}

      {/* Hero */}
      <div style={{padding:"36px 28px 24px",maxWidth:1240,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
          <div style={{width:52,height:52,background:"#fff",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 20px rgba(232,75,58,0.2)"}}>
            <svg viewBox="0 0 100 100" width="38" height="38" fill="none"><path d="M20 20 L50 5 L80 20 L80 80 L50 95 L20 80 Z" fill="#e84b3a" opacity="0.9"/><path d="M50 5 L80 20 L80 80 L50 65 Z" fill="#c0392b"/><path d="M20 20 L50 35 L50 65 L20 80 Z" fill="#2563eb" opacity="0.9"/><rect x="38" y="48" width="26" height="4" fill="white" rx="2"/><rect x="38" y="42" width="15" height="4" fill="white" rx="2"/></svg>
          </div>
          <div>
            <h1 style={{fontSize:20,fontWeight:700}}>{selectedCompany}</h1>
            <p style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{companyMeta?.tagline||""}</p>
          </div>
        </div>
        <h2 style={{fontSize:38,fontWeight:700,letterSpacing:"-1.5px",lineHeight:1.1,marginBottom:10}}>
          Crack Your <em style={{fontStyle:"normal",color:"var(--red)"}}>{selectedCompany}</em> Interview
        </h2>
        <p style={{fontSize:14,color:"var(--text2)",lineHeight:1.7,maxWidth:500}}>
          Real questions from actual interviews. AI-powered answers, mock interviews, and live AI practice — for {companies.length} top companies.
        </p>
      </div>

      {/* Filters */}
      <div style={{padding:"0 28px 18px",maxWidth:1240,margin:"0 auto",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:12,color:"var(--muted)"}}>Filter:</span>
        {[{val:filterJob,set:setFilterJob,opts:jobs,ph:"All Roles"},{val:filterType,set:setFilterType,opts:types,ph:"All Types"},{val:filterExp,set:setFilterExp,opts:exps,ph:"All Levels"},{val:filterDiff,set:setFilterDiff,opts:diffs,ph:"All Difficulty"}].map(({val,set,opts,ph})=>
          <select key={ph} value={val} onChange={e=>{set(e.target.value);setPage(1)}} style={filterSS}><option value="">{ph}</option>{opts.map(o=><option key={o}>{o}</option>)}</select>
        )}
        <div style={{position:"relative"}}>
          <svg style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:"var(--muted)"}} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search…" style={{...filterSS,paddingLeft:30,width:210,backgroundImage:"none"}}/>
        </div>
        {(filterJob||filterType||filterExp||filterDiff||search)&&<button onClick={resetFilters} style={{background:"var(--red-dim)",border:"1px solid rgba(232,75,58,0.25)",color:"var(--red)",padding:"6px 12px",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"var(--font)"}}>✕ Clear</button>}
      </div>

      {/* Results bar */}
      <div style={{padding:"0 28px 14px",maxWidth:1240,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <span style={{fontSize:13,color:"var(--muted)"}}>Showing <strong style={{color:"var(--text)"}}>{questions.length}</strong> of <strong style={{color:"var(--text)"}}>{total}</strong></span>
        <div style={{display:"flex",gap:8}}>
          {["helpful","recent"].map(m=><button key={m} onClick={()=>{setSortMode(m);setPage(1)}} style={{background:"none",border:`1px solid ${sortMode===m?"var(--blue)":"var(--border)"}`,color:sortMode===m?"var(--blue)":"var(--text2)",padding:"6px 14px",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"var(--font)"}}>{m==="helpful"?"🔥 Popular":"🕐 Recent"}</button>)}
        </div>
      </div>

      {/* Main layout */}
      <div style={{padding:"0 28px 80px",maxWidth:1240,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 280px",gap:20,alignItems:"start"}}>
        <div>
          {questions.length===0?<div style={{textAlign:"center",padding:64,color:"var(--muted)",fontSize:14}}>No questions match your filters.</div>:
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {questions.map((q,i)=><div key={q.id} style={{animationDelay:`${i*40}ms`}} className="fadeUp"><QuestionCard q={q} bookmarked={bookmarks.has(q.id)} liked={likes.has(q.id)} onBookmark={onBookmark} onLike={onLike} onDelete={handleDelete} showToast={showToast}/></div>)}
          </div>}
          {totalPages>1&&<div style={{display:"flex",gap:6,justifyContent:"center",marginTop:28,alignItems:"center"}}>
            {page>1&&<button onClick={()=>setPage(p=>p-1)} style={pageBtn(false)}>←</button>}
            {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1).map((p,idx,arr)=>
              <span key={p}>{idx>0&&arr[idx-1]!==p-1&&<span style={{color:"var(--muted)",padding:"0 4px",fontSize:12}}>…</span>}<button onClick={()=>setPage(p)} style={pageBtn(p===page)}>{p}</button></span>
            )}
            {page<totalPages&&<button onClick={()=>setPage(p=>p+1)} style={pageBtn(false)}>→</button>}
          </div>}
        </div>

        {/* Sidebar */}
        <aside style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={sideCard}><h3 style={sideTitle}>Quick Actions</h3>
            {[{label:"⏱️ Mock Interview",action:()=>setShowMock(true)},{label:"💬 AI Chat",action:()=>setShowChat(true)},{label:"📝 Submit Question",action:()=>setShowSubmit(true)},{label:"🔖 Saved Questions",action:()=>setShowBookmarks(v=>!v)}].map(({label,action})=>
              <button key={label} onClick={action} style={{width:"100%",marginBottom:8,padding:"9px 14px",borderRadius:9,background:"var(--card)",border:"1px solid var(--border)",color:"var(--text)",fontSize:12,fontFamily:"var(--font)",cursor:"pointer",textAlign:"left",transition:"border-color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--blue)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>{label}</button>
            )}
          </div>
          {companyMeta&&<div style={sideCard}><h3 style={sideTitle}>{selectedCompany} Interview Process</h3>
            {companyMeta.process?.map(({n,h,p})=><div key={n} style={{display:"flex",gap:10,paddingBottom:12,marginBottom:12,borderBottom:"1px solid var(--border)"}}><div style={{width:22,height:22,borderRadius:"50%",background:"var(--card)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"var(--blue)",fontFamily:"var(--mono)",flexShrink:0}}>{n}</div><div><div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{h}</div><div style={{fontSize:11,color:"var(--muted)",lineHeight:1.5}}>{p}</div></div></div>)}
          </div>}
          {companyMeta&&<div style={sideCard}><h3 style={sideTitle}>Pro Tips</h3>
            {companyMeta.tips?.map((tip,i)=><div key={i} style={{display:"flex",gap:8,fontSize:12,color:"var(--muted)",lineHeight:1.6,marginBottom:8}}><span style={{color:"var(--green)",flexShrink:0,marginTop:1}}>→</span>{tip}</div>)}
          </div>}
        </aside>
      </div>

      {/* Modals */}
      {showMock&&<MockInterview onClose={()=>setShowMock(false)} allQuestions={allQuestions} company={selectedCompany}/>}
      {showChat&&<ChatSimulator onClose={()=>setShowChat(false)} company={selectedCompany}/>}
      {showSubmit&&<SubmitQuestionModal onClose={()=>setShowSubmit(false)} companies={companies} selectedCompany={selectedCompany} getToken={getToken} showToast={showToast}/>}
      {showBookmarks&&<BookmarksPanel bookmarkedQuestions={bookmarkedQs} onClose={()=>setShowBookmarks(false)} onRemove={onBookmark}/>}
      <Toast msg={toast.msg} visible={toast.visible}/>
    </>
  );
}
