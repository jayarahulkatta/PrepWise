import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import AuthPage from "./AuthPage";
import { QuestionCard, Badge, Spinner, TypingDots, Toast, SkeletonCard, css, apiFetch, callAI, primaryBtn, secondaryBtn, selectSt, sideCard, sideTitle, filterSS, API_BASE, PAGE_SIZE } from "./Components";

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

  const modalOverlay = {position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20};
  const modalCard = {background:"var(--surface)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:24,width:"100%",maxWidth:700,maxHeight:"90vh",overflowY:"auto",padding:36,position:"relative",boxShadow:"0 24px 80px rgba(0,0,0,0.6)",animation:"fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both"};
  const closeBtn = {position:"absolute",top:18,right:18,width:34,height:34,borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid var(--border)",color:"var(--muted)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"};

  return (
    <div style={modalOverlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={modalCard}>
        <button onClick={onClose} style={closeBtn} onMouseEnter={e=>{e.currentTarget.style.color="var(--red)";e.currentTarget.style.borderColor="var(--red)"}} onMouseLeave={e=>{e.currentTarget.style.color="var(--muted)";e.currentTarget.style.borderColor="var(--border)"}}>×</button>
        {phase==="setup"&&<div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
            <span style={{fontSize:28}}>⏱️</span>
            <div><h2 style={{fontSize:22,fontWeight:700,letterSpacing:"-0.5px"}}>Mock Interview {company&&`— ${company}`}</h2>
            <p style={{fontSize:13,color:"var(--text2)",marginTop:4}}>Answer under timed conditions. Get AI scoring.</p></div>
          </div>
          <div style={{marginTop:24,display:"grid",gap:16}}>
            {[{label:"Role",el:<select value={role} onChange={e=>setRole(e.target.value)} style={selectSt}><option value="">Any Role</option>{[...new Set(allQuestions.map(q=>q.job))].map(j=><option key={j}>{j}</option>)}</select>},
              {label:"Time per question",el:<select value={timeLimit} onChange={e=>setTimeLimit(+e.target.value)} style={selectSt}><option value={120}>2 min</option><option value={180}>3 min</option><option value={300}>5 min</option></select>},
              {label:"Questions",el:<select value={count} onChange={e=>setCount(+e.target.value)} style={selectSt}><option value={3}>3</option><option value={5}>5</option><option value={10}>10</option></select>}
            ].map(({label,el})=><div key={label}><label style={{fontSize:12,color:"var(--text2)",display:"block",marginBottom:6,fontWeight:500}}>{label}</label>{el}</div>)}
          </div>
          <div style={{display:"flex",gap:10,marginTop:28}}><button className="btn-glow" onClick={start} style={{...primaryBtn,flex:1}}>Start Interview</button><button className="btn-secondary-hover" onClick={onClose} style={{...secondaryBtn,flex:1}}>Cancel</button></div>
        </div>}
        {phase==="active"&&q&&<div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}><div style={{flex:1,height:4,background:"var(--border)",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",background:"linear-gradient(90deg,var(--blue),var(--green))",borderRadius:4,width:`${(idx/questions.length)*100}%`,transition:"width 0.6s cubic-bezier(0.16,1,0.3,1)"}}/></div><span style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)",fontWeight:500}}>{idx+1}/{questions.length}</span></div>
          <div style={{fontSize:52,fontWeight:800,fontFamily:"var(--mono)",textAlign:"center",color:tc,marginBottom:20,letterSpacing:"-2px",textShadow:timeLeft<=30?"0 0 20px var(--red)":"none",transition:"all 0.3s"}}>{m}:{String(s).padStart(2,"0")}</div>
          <div style={{display:"flex",gap:6,marginBottom:14}}><Badge label={q.type} cls={`tag-${q.type}`}/><Badge label={q.diff} cls={`diff-${q.diff}`}/></div>
          <p style={{fontSize:16,fontWeight:500,lineHeight:1.7,marginBottom:20,letterSpacing:"-0.2px"}}>{q.text}</p>
          <textarea value={userAnswer} onChange={e=>setUserAnswer(e.target.value)} placeholder="Type your answer…" style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid var(--border)",color:"var(--text)",borderRadius:14,padding:16,fontSize:13,fontFamily:"var(--font)",resize:"vertical",minHeight:140,outline:"none",lineHeight:1.8,transition:"border-color 0.2s"}}/>
          {!feedback&&!loadingFeedback&&<div style={{display:"flex",gap:10,marginTop:16}}><button className="btn-glow" onClick={submitAnswer} style={{...primaryBtn,flex:1}}>Submit & Get Feedback</button><button className="btn-secondary-hover" onClick={next} style={{...secondaryBtn,flex:1}}>Skip →</button></div>}
          {loadingFeedback&&<div style={{marginTop:18,textAlign:"center",color:"var(--text2)",fontSize:13,padding:12}}><TypingDots/> <span style={{marginLeft:8}}>Analyzing your answer…</span></div>}
          {feedback&&<div className="fadeUp" style={{marginTop:20,padding:20,background:"rgba(255,255,255,0.02)",border:"1px solid var(--border)",borderRadius:16}}>
            <div style={{display:"flex",gap:12,marginBottom:16}}>{["completeness","clarity","relevance"].map(k=><div key={k} style={{flex:1,textAlign:"center",background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,padding:16,transition:"all 0.3s"}}><div style={{fontSize:28,fontWeight:800,fontFamily:"var(--mono)",color:sc(feedback[k]),animation:"countUp 0.5s cubic-bezier(0.16,1,0.3,1) both",letterSpacing:"-1px"}}>{feedback[k]}</div><div style={{fontSize:10,color:"var(--muted)",marginTop:4,textTransform:"uppercase",letterSpacing:1,fontWeight:600}}>{k}</div></div>)}</div>
            <p style={{fontSize:13,lineHeight:1.8,color:"var(--text2)"}}>{feedback.feedback}</p>
            <div style={{display:"flex",gap:10,marginTop:16}}><button className="btn-glow" onClick={next} style={{...primaryBtn,flex:1}}>{idx+1>=questions.length?"See Results":"Next →"}</button><button className="btn-secondary-hover" onClick={onClose} style={{...secondaryBtn,flex:1}}>End</button></div>
          </div>}
        </div>}
        {phase==="results"&&<div style={{textAlign:"center"}}>
          <div style={{fontSize:56,marginBottom:14,animation:"float 2s ease-in-out infinite"}}>🎉</div>
          <h2 style={{fontSize:24,fontWeight:800,marginBottom:8,letterSpacing:"-0.5px"}}>Session Complete!</h2>
          <p style={{fontSize:13,color:"var(--text2)",marginBottom:28}}>You completed {questions.length} questions.</p>
          <div style={{display:"flex",gap:14,justifyContent:"center",marginBottom:28}}>{["completeness","clarity","relevance"].map((k,i)=><div key={k} style={{textAlign:"center",background:"var(--card)",border:"1px solid var(--border)",borderRadius:16,padding:"20px 28px",animation:`fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) ${i*100}ms both`}}><div style={{fontSize:36,fontWeight:800,fontFamily:"var(--mono)",color:sc(avg(k)),letterSpacing:"-1px"}}>{avg(k)}</div><div style={{fontSize:10,color:"var(--muted)",marginTop:6,textTransform:"uppercase",letterSpacing:1,fontWeight:600}}>{k}</div></div>)}</div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}><button className="btn-glow" onClick={()=>{setPhase("setup");setScores([])}} style={primaryBtn}>Practice Again</button><button className="btn-secondary-hover" onClick={onClose} style={secondaryBtn}>Close</button></div>
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"var(--surface)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:24,width:"100%",maxWidth:600,height:"80vh",maxHeight:680,display:"flex",flexDirection:"column",position:"relative",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.6)",animation:"fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both"}}>
        <div style={{padding:"18px 22px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:14,flexShrink:0,background:"rgba(255,255,255,0.02)"}}>
          <div style={{width:42,height:42,borderRadius:14,background:"linear-gradient(135deg,var(--blue),var(--green))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 4px 16px rgba(59,130,246,0.25)"}}>🤵</div>
          <div><div style={{fontSize:14,fontWeight:600,letterSpacing:"-0.3px"}}>{company||"Company"} Interviewer</div><div style={{fontSize:11,color:"var(--green)",fontWeight:500,display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:"50%",background:"var(--green)",display:"inline-block",animation:"pulse 2s infinite"}}/>Live — AI Simulator</div></div>
          <button onClick={onClose} style={{marginLeft:"auto",width:34,height:34,borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid var(--border)",color:"var(--muted)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.color="var(--red)";e.currentTarget.style.borderColor="var(--red)"}} onMouseLeave={e=>{e.currentTarget.style.color="var(--muted)";e.currentTarget.style.borderColor="var(--border)"}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:22,display:"flex",flexDirection:"column",gap:14}}>
          {messages.map((m,i)=><div key={i} style={{display:"flex",gap:10,flexDirection:m.role==="user"?"row-reverse":"row",animation:`fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both`}}>
            <div style={{width:32,height:32,borderRadius:10,background:m.role==="ai"?"var(--card)":"var(--blue)",border:m.role==="ai"?"1px solid var(--border)":"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,boxShadow:m.role==="user"?"0 2px 8px rgba(59,130,246,0.3)":"none"}}>{m.role==="ai"?"🤵":"😊"}</div>
            <div style={{maxWidth:"80%",padding:"12px 16px",borderRadius:14,fontSize:13,lineHeight:1.7,background:m.role==="ai"?"var(--card)":"linear-gradient(135deg,var(--blue),#2563eb)",border:m.role==="ai"?"1px solid var(--border)":"none",color:m.role==="ai"?"var(--text)":"#fff",borderBottomLeftRadius:m.role==="ai"?4:14,borderBottomRightRadius:m.role==="user"?4:14,boxShadow:m.role==="user"?"0 4px 16px rgba(59,130,246,0.2)":"none"}}>{m.text}</div>
          </div>)}
          {loading&&<div style={{display:"flex",gap:10,animation:"fadeUp 0.3s ease both"}}><div style={{width:32,height:32,borderRadius:10,background:"var(--card)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🤵</div><div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,borderBottomLeftRadius:4,padding:"14px 18px"}}><TypingDots/></div></div>}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:16,borderTop:"1px solid var(--border)",display:"flex",gap:10,flexShrink:0,background:"rgba(255,255,255,0.02)"}}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Type your answer… (Enter to send)" style={{flex:1,background:"rgba(255,255,255,0.03)",border:"1px solid var(--border)",color:"var(--text)",padding:"10px 14px",borderRadius:12,fontSize:13,fontFamily:"var(--font)",resize:"none",height:44,outline:"none",lineHeight:1.6,transition:"border-color 0.2s"}}/>
          <button className="btn-glow" onClick={send} disabled={loading||!input.trim()} style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,var(--blue),#2563eb)",border:"none",color:"#fff",cursor:loading||!input.trim()?"not-allowed":"pointer",opacity:loading||!input.trim()?0.5:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 2px 12px rgba(59,130,246,0.3)"}}>➤</button>
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

  const inputSt = { width:"100%",padding:"11px 14px",borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid var(--border)",color:"var(--text)",fontSize:13,fontFamily:"var(--font)",outline:"none",transition:"border-color 0.2s" };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"var(--surface)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:24,width:"100%",maxWidth:540,padding:36,position:"relative",boxShadow:"0 24px 80px rgba(0,0,0,0.6)",animation:"fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both"}}>
        <button onClick={onClose} style={{position:"absolute",top:18,right:18,width:34,height:34,borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid var(--border)",color:"var(--muted)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.color="var(--red)";e.currentTarget.style.borderColor="var(--red)"}} onMouseLeave={e=>{e.currentTarget.style.color="var(--muted)";e.currentTarget.style.borderColor="var(--border)"}}>×</button>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
          <span style={{fontSize:28}}>📝</span>
          <div><h2 style={{fontSize:20,fontWeight:700,letterSpacing:"-0.5px"}}>Submit a Question</h2>
          <p style={{fontSize:12,color:"var(--text2)",marginTop:4}}>Share a real interview question. It will be reviewed before publishing.</p></div>
        </div>
        <form onSubmit={submit} style={{marginTop:24}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
            <div><label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:5,fontWeight:500}}>Company</label><select value={form.company} onChange={e=>update("company",e.target.value)} style={selectSt}>{companies.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:5,fontWeight:500}}>Job Role</label><input value={form.job} onChange={e=>update("job",e.target.value)} placeholder="e.g. Software Engineer" required style={inputSt}/></div>
            <div><label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:5,fontWeight:500}}>Type</label><select value={form.type} onChange={e=>update("type",e.target.value)} style={selectSt}>{["Technical","HR","Behavioral","Background"].map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:5,fontWeight:500}}>Difficulty</label><select value={form.diff} onChange={e=>update("diff",e.target.value)} style={selectSt}>{["Easy","Medium","Hard"].map(d=><option key={d}>{d}</option>)}</select></div>
          </div>
          <div style={{marginBottom:16}}><label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:5,fontWeight:500}}>Experience Level</label><select value={form.exp} onChange={e=>update("exp",e.target.value)} style={selectSt}>{["Fresher","1-3 Years","3-5 Years","Senior"].map(x=><option key={x}>{x}</option>)}</select></div>
          <div style={{marginBottom:24}}><label style={{fontSize:11,color:"var(--text2)",display:"block",marginBottom:5,fontWeight:500}}>Question</label><textarea value={form.text} onChange={e=>update("text",e.target.value)} placeholder="Type the interview question here…" required rows={3} style={{...inputSt,resize:"vertical",lineHeight:1.7}}/></div>
          <div style={{display:"flex",gap:10}}><button className="btn-glow" type="submit" disabled={submitting} style={{...primaryBtn,flex:1,opacity:submitting?0.7:1}}>{submitting?"Submitting…":"Submit Question"}</button><button className="btn-secondary-hover" type="button" onClick={onClose} style={{...secondaryBtn,flex:1}}>Cancel</button></div>
        </form>
      </div>
    </div>
  );
}

// ─── BOOKMARKS PANEL ────────────────────────────────────────────────────────
function BookmarksPanel({ bookmarkedQuestions, onClose, onRemove }) {
  return (
    <div className="slideInRight" style={{position:"fixed",top:0,right:0,bottom:0,width:360,zIndex:800,background:"var(--surface)",borderLeft:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",boxShadow:"-16px 0 64px rgba(0,0,0,0.5)",backdropFilter:"blur(16px)"}}>
      <div style={{padding:22,borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <h2 style={{fontSize:16,fontWeight:700,letterSpacing:"-0.3px"}}>🔖 Saved <span style={{fontSize:12,color:"var(--muted)",fontFamily:"var(--mono)",fontWeight:500}}>({bookmarkedQuestions.length})</span></h2>
        <button onClick={onClose} style={{width:34,height:34,borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid var(--border)",color:"var(--muted)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.color="var(--red)";e.currentTarget.style.borderColor="var(--red)"}} onMouseLeave={e=>{e.currentTarget.style.color="var(--muted)";e.currentTarget.style.borderColor="var(--border)"}}>×</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
        {bookmarkedQuestions.length===0?<div style={{textAlign:"center",color:"var(--muted)",fontSize:13,padding:"52px 20px",lineHeight:1.8}}>No bookmarks yet.<br/>Click 🔖 on any question.</div>:
        bookmarkedQuestions.map((q,i)=><div key={q.id} className="card-hover" style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,padding:16,animation:`fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) ${i*60}ms both`}}>
          <p style={{fontSize:13,fontWeight:500,lineHeight:1.6,marginBottom:12}}>{q.text}</p>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Badge label={q.type} cls={`tag-${q.type}`}/><Badge label={q.diff} cls={`diff-${q.diff}`}/>
            <span style={{fontSize:11,color:"var(--blue)",marginLeft:4,fontWeight:500}}>{q.company}</span>
            <button onClick={()=>onRemove(q.id)} style={{marginLeft:"auto",background:"none",border:"1px solid rgba(239,68,68,0.2)",color:"var(--red)",cursor:"pointer",fontSize:11,fontFamily:"var(--font)",padding:"3px 10px",borderRadius:6,fontWeight:500,transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.background="var(--red-dim)"}} onMouseLeave={e=>{e.currentTarget.style.background="none"}}>Remove</button>
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

  // Load questions
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

  // Auth states
  if (authLoading) return <><style>{css}</style><div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"}}><Spinner/></div></>;
  if (!user) return <AuthPage />;

  // Skeleton loading state
  if (!loaded) return (
    <><style>{css}</style>
    <div style={{minHeight:"100vh",background:"var(--bg)",color:"var(--text)"}}>
      {/* Skeleton header */}
      <div style={{height:60,background:"var(--surface)",borderBottom:"1px solid var(--border)"}}/>
      <div style={{maxWidth:1240,margin:"0 auto",padding:"40px 28px"}}>
        <div className="skeleton" style={{width:200,height:28,marginBottom:12}}/>
        <div className="skeleton" style={{width:400,height:42,marginBottom:10}}/>
        <div className="skeleton" style={{width:320,height:16,marginBottom:40}}/>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {[0,1,2,3].map(i=><div key={i} style={{animation:`fadeUp 0.4s ease ${i*100}ms both`}}><SkeletonCard/></div>)}
        </div>
      </div>
    </div>
    </>
  );

  const dailyQ = allQuestions.length > 0 ? allQuestions[Math.floor(Date.now()/86400000)%allQuestions.length] : null;
  const jobs = [...new Set(allQuestions.map(q=>q.job))];
  const types = ["Technical","HR","Background","Behavioral"];
  const exps = ["Fresher","1-3 Years","3-5 Years","Senior"];
  const diffs = ["Easy","Medium","Hard"];
  const bookmarkedQs = allQuestions.filter(q => bookmarks.has(q.id));

  const pageBtn = active => ({
    width:36, height:36, borderRadius:10,
    background: active ? "linear-gradient(135deg,var(--blue),#2563eb)" : "var(--card)",
    border: `1px solid ${active ? "transparent" : "var(--border)"}`,
    color: active ? "#fff" : "var(--text2)", fontSize:12, fontWeight:active?600:400,
    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
    fontFamily:"var(--font)", transition:"all 0.2s",
    boxShadow: active ? "0 2px 12px rgba(59,130,246,0.25)" : "none",
  });

  const headerBtn = (active) => ({
    ...secondaryBtn, flex:"none", padding:"8px 16px", fontSize:12, fontWeight:500,
    display:"flex", alignItems:"center", gap:6, borderRadius:10,
    borderColor: active ? "var(--blue)" : "var(--border)",
    color: active ? "var(--blue)" : "var(--text2)",
    background: active ? "var(--blue-dim)" : "var(--card)",
    transition:"all 0.2s",
  });

  return (
    <>
      <style>{css}</style>
      {/* ─── HEADER ─── */}
      <header className="glass" style={{position:"sticky",top:0,zIndex:500,borderBottom:"1px solid var(--border)",padding:"0 28px",display:"flex",alignItems:"center",gap:14,height:62}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,transform:"rotate(45deg)",filter:"drop-shadow(0 0 12px rgba(239,68,68,0.2))"}}>
            {["#ef4444","#3b82f6","#3b82f6","#ef4444"].map((c,i)=><span key={i} style={{borderRadius:4,background:c}}/>)}
          </div>
          <span style={{fontSize:17,fontWeight:700,letterSpacing:"-0.5px"}}>Prep<span style={{color:"var(--red)"}}>Wise</span></span>
        </div>
        <span style={{marginLeft:16,fontSize:12,color:"var(--text2)",background:"rgba(255,255,255,0.04)",padding:"6px 14px",borderRadius:10,border:"1px solid var(--border)",fontWeight:500}}>🏢 Genpact</span>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <button className="btn-secondary-hover" onClick={()=>setShowSubmit(true)} style={headerBtn(false)}>📝 Submit Q</button>
          <button className="btn-secondary-hover" onClick={()=>setShowChat(true)} style={headerBtn(false)}>💬 AI Chat</button>
          <button className="btn-secondary-hover" onClick={()=>setShowMock(true)} style={headerBtn(false)}>⏱️ Mock</button>
          <button className="btn-secondary-hover" onClick={()=>setShowBookmarks(v=>!v)} style={headerBtn(showBookmarks)}>🔖 {bookmarks.size}</button>
          <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:8}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,var(--blue),var(--purple))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,overflow:"hidden",border:"2px solid var(--border)",boxShadow:"0 2px 12px rgba(59,130,246,0.2)"}}>
              {user.photoURL?<img src={user.photoURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:user.displayName?user.displayName[0].toUpperCase():"U"}
            </div>
            <button onClick={signOut} style={{background:"none",border:"1px solid rgba(239,68,68,0.2)",color:"var(--red)",padding:"5px 12px",borderRadius:8,fontSize:11,cursor:"pointer",fontFamily:"var(--font)",fontWeight:500,transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.background="var(--red-dim)"}} onMouseLeave={e=>{e.currentTarget.style.background="none"}}>Sign Out</button>
          </div>
        </div>
      </header>

      {/* ─── DAILY BANNER ─── */}
      {dailyQ&&<div style={{background:"linear-gradient(135deg,rgba(59,130,246,0.06),rgba(16,185,129,0.04))",borderBottom:"1px solid rgba(59,130,246,0.1)",padding:"12px 28px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{background:"linear-gradient(135deg,var(--blue),var(--green))",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,textTransform:"uppercase",letterSpacing:1.2,fontFamily:"var(--mono)",flexShrink:0,boxShadow:"0 2px 8px rgba(59,130,246,0.25)"}}>Today's Q</span>
        <span style={{fontSize:13,color:"var(--text2)"}}><strong style={{color:"var(--text)",fontWeight:500}}>{dailyQ.text}</strong></span>
      </div>}

      {/* ─── HERO ─── */}
      <div style={{padding:"40px 28px 28px",maxWidth:1240,margin:"0 auto",position:"relative"}}>
        {/* Subtle ambient glow behind hero */}
        <div style={{position:"absolute",top:-40,left:-60,width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,0.04),transparent 70%)",pointerEvents:"none"}}/>
        <div style={{display:"flex",alignItems:"center",gap:18,marginBottom:18,position:"relative"}}>
          <div style={{width:56,height:56,background:"#fff",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 24px rgba(239,68,68,0.15), 0 0 0 1px rgba(255,255,255,0.1)"}}>
            <svg viewBox="0 0 100 100" width="40" height="40" fill="none"><path d="M20 20 L50 5 L80 20 L80 80 L50 95 L20 80 Z" fill="#ef4444" opacity="0.9"/><path d="M50 5 L80 20 L80 80 L50 65 Z" fill="#dc2626"/><path d="M20 20 L50 35 L50 65 L20 80 Z" fill="#3b82f6" opacity="0.9"/><rect x="38" y="48" width="26" height="4" fill="white" rx="2"/><rect x="38" y="42" width="15" height="4" fill="white" rx="2"/></svg>
          </div>
          <div>
            <h1 style={{fontSize:22,fontWeight:700,letterSpacing:"-0.5px"}}>{selectedCompany}</h1>
            <p style={{fontSize:12,color:"var(--muted)",marginTop:3}}>{companyMeta?.tagline||""}</p>
          </div>
        </div>
        <h2 style={{fontSize:42,fontWeight:800,letterSpacing:"-2px",lineHeight:1.1,marginBottom:12}}>
          Crack Your <em style={{fontStyle:"normal",background:"linear-gradient(135deg,var(--red),#f97316)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>{selectedCompany}</em> Interview
        </h2>
        <p style={{fontSize:15,color:"var(--text2)",lineHeight:1.8,maxWidth:520}}>
          Real questions from actual interviews. AI-powered answers, mock interviews, and live AI practice — for {companies.length} top companies.
        </p>
      </div>

      {/* ─── FILTERS ─── */}
      <div style={{padding:"0 28px 18px",maxWidth:1240,margin:"0 auto",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:12,color:"var(--muted)",fontWeight:500}}>Filter:</span>
        {[{val:filterJob,set:setFilterJob,opts:jobs,ph:"All Roles"},{val:filterType,set:setFilterType,opts:types,ph:"All Types"},{val:filterExp,set:setFilterExp,opts:exps,ph:"All Levels"},{val:filterDiff,set:setFilterDiff,opts:diffs,ph:"All Difficulty"}].map(({val,set,opts,ph})=>
          <select key={ph} value={val} onChange={e=>{set(e.target.value);setPage(1)}} style={filterSS}><option value="">{ph}</option>{opts.map(o=><option key={o}>{o}</option>)}</select>
        )}
        <div style={{position:"relative"}}>
          <svg style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:"var(--muted)"}} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search…" style={{...filterSS,paddingLeft:32,width:220,backgroundImage:"none"}}/>
        </div>
        {(filterJob||filterType||filterExp||filterDiff||search)&&<button onClick={resetFilters} style={{background:"var(--red-dim)",border:"1px solid rgba(239,68,68,0.2)",color:"var(--red)",padding:"6px 14px",borderRadius:10,fontSize:12,cursor:"pointer",fontFamily:"var(--font)",fontWeight:500,transition:"all 0.2s"}}>✕ Clear</button>}
      </div>

      {/* ─── RESULTS BAR ─── */}
      <div style={{padding:"0 28px 16px",maxWidth:1240,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <span style={{fontSize:13,color:"var(--muted)"}}>Showing <strong style={{color:"var(--text)"}}>{questions.length}</strong> of <strong style={{color:"var(--text)"}}>{total}</strong></span>
        <div style={{display:"flex",gap:8}}>
          {["helpful","recent"].map(m=><button key={m} className="btn-secondary-hover" onClick={()=>{setSortMode(m);setPage(1)}} style={{background:sortMode===m?"var(--blue-dim)":"transparent",border:`1px solid ${sortMode===m?"rgba(59,130,246,0.3)":"var(--border)"}`,color:sortMode===m?"var(--blue)":"var(--text2)",padding:"7px 16px",borderRadius:10,fontSize:12,cursor:"pointer",fontFamily:"var(--font)",fontWeight:500,transition:"all 0.2s"}}>{m==="helpful"?"🔥 Popular":"🕐 Recent"}</button>)}
        </div>
      </div>

      {/* ─── MAIN LAYOUT ─── */}
      <div style={{padding:"0 28px 80px",maxWidth:1240,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 300px",gap:24,alignItems:"start"}}>
        <div>
          {questions.length===0?<div style={{textAlign:"center",padding:72,color:"var(--muted)",fontSize:14}}>No questions match your filters.</div>:
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {questions.map((q,i)=><div key={q.id} style={{animationDelay:`${i*50}ms`}} className="fadeUp"><QuestionCard q={q} bookmarked={bookmarks.has(q.id)} liked={likes.has(q.id)} onBookmark={onBookmark} onLike={onLike} onDelete={handleDelete} showToast={showToast}/></div>)}
          </div>}
          {totalPages>1&&<div style={{display:"flex",gap:6,justifyContent:"center",marginTop:32,alignItems:"center"}}>
            {page>1&&<button onClick={()=>setPage(p=>p-1)} style={pageBtn(false)}>←</button>}
            {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1).map((p,idx,arr)=>
              <span key={p}>{idx>0&&arr[idx-1]!==p-1&&<span style={{color:"var(--muted)",padding:"0 4px",fontSize:12}}>…</span>}<button onClick={()=>setPage(p)} style={pageBtn(p===page)}>{p}</button></span>
            )}
            {page<totalPages&&<button onClick={()=>setPage(p=>p+1)} style={pageBtn(false)}>→</button>}
          </div>}
        </div>

        {/* ─── SIDEBAR ─── */}
        <aside style={{display:"flex",flexDirection:"column",gap:16}}>
          <div className="card-hover" style={sideCard}><h3 style={sideTitle}>Quick Actions</h3>
            {[{label:"⏱️ Mock Interview",action:()=>setShowMock(true)},{label:"💬 AI Chat",action:()=>setShowChat(true)},{label:"📝 Submit Question",action:()=>setShowSubmit(true)},{label:"🔖 Saved Questions",action:()=>setShowBookmarks(v=>!v)}].map(({label,action})=>
              <button key={label} className="sidebar-btn" onClick={action} style={{width:"100%",marginBottom:10,padding:"10px 16px",borderRadius:11,background:"rgba(255,255,255,0.02)",border:"1px solid var(--border)",color:"var(--text)",fontSize:12,fontFamily:"var(--font)",cursor:"pointer",textAlign:"left",fontWeight:500}}>{label}</button>
            )}
          </div>
          {companyMeta&&<div className="card-hover" style={sideCard}><h3 style={sideTitle}>{selectedCompany} Interview Process</h3>
            {companyMeta.process?.map(({n,h,p})=><div key={n} style={{display:"flex",gap:12,paddingBottom:14,marginBottom:14,borderBottom:"1px solid var(--border)"}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:"var(--blue-dim)",border:"1px solid rgba(59,130,246,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"var(--blue)",fontFamily:"var(--mono)",flexShrink:0}}>{n}</div>
              <div><div style={{fontSize:12,fontWeight:600,marginBottom:2,letterSpacing:"-0.2px"}}>{h}</div><div style={{fontSize:11,color:"var(--muted)",lineHeight:1.6}}>{p}</div></div>
            </div>)}
          </div>}
          {companyMeta&&<div className="card-hover" style={sideCard}><h3 style={sideTitle}>Pro Tips</h3>
            {companyMeta.tips?.map((tip,i)=><div key={i} style={{display:"flex",gap:8,fontSize:12,color:"var(--muted)",lineHeight:1.7,marginBottom:10}}><span style={{color:"var(--green)",flexShrink:0,marginTop:1,fontSize:10}}>→</span>{tip}</div>)}
          </div>}
        </aside>
      </div>

      {/* ─── MODALS ─── */}
      {showMock&&<MockInterview onClose={()=>setShowMock(false)} allQuestions={allQuestions} company={selectedCompany}/>}
      {showChat&&<ChatSimulator onClose={()=>setShowChat(false)} company={selectedCompany}/>}
      {showSubmit&&<SubmitQuestionModal onClose={()=>setShowSubmit(false)} companies={companies} selectedCompany={selectedCompany} getToken={getToken} showToast={showToast}/>}
      {showBookmarks&&<BookmarksPanel bookmarkedQuestions={bookmarkedQs} onClose={()=>setShowBookmarks(false)} onRemove={onBookmark}/>}
      <Toast msg={toast.msg} visible={toast.visible}/>
    </>
  );
}
