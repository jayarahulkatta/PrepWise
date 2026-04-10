import { useState, useRef, useCallback } from "react";
import { Badge, Spinner, TypingDots } from "../ui";
import { callAI } from "../../utils/api";
import { useAuth } from "../../AuthContext";
import ToneSelector from "./ToneSelector";
import RatingBadge from "./RatingBadge";
import AttemptsCounter from "./AttemptsCounter";

export default function QuestionCard({ q, bookmarked, liked, onBookmark, onLike, onDelete, onEdit, onDuplicate, selectable, selected, onSelect, showToast, userRole }) {
  const { role } = useAuth();
  const isExpert = role === "domain_expert";

  const [answer, setAnswer] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [selectedTone, setSelectedTone] = useState("humble");
  const [showAnswer, setShowAnswer] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [rating, setRating] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [displayedAnswer, setDisplayedAnswer] = useState("");
  const typewriterRef = useRef(null);

  const [expertRating, setExpertRating] = useState(
    localStorage.getItem(`prepwise_expert_rating_${q.id}`) || "Unrated"
  );
  const [attempts, setAttempts] = useState(
    parseInt(localStorage.getItem(`prepwise_expert_attempts_${q.id}`)) || 0
  );

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

    if (isExpert && !feedback) {
      const newCount = attempts + 1;
      setAttempts(newCount);
      localStorage.setItem(`prepwise_expert_attempts_${q.id}`, newCount);
    }

    setGenerating(true); setShowAnswer(true); setDisplayedAnswer(""); setRating(null); setShowFeedback(false);
    const feedbackNote = feedback ? `\n\nUser feedback: "${feedback}". Address this specifically.` : "";
    const company = q.company || "Genpact";
    
    const toneInstructions = {
      humble: "Answer in a humble, self-aware tone. Acknowledge what you know and what you are still learning. Be honest about limitations.",
      confident: "Answer in a confident, assertive tone. State facts directly. No hedging language. Show command of the subject.",
      story: "Answer using a real-world story or scenario to illustrate the concept. Start with a brief anecdote, then explain the technical concept through it.",
      concise: "Answer in the most concise way possible. Maximum 3-4 sentences. No padding, no repetition. Every word must earn its place.",
      technical: "Answer with full technical depth. Include code snippets, proper terminology, edge cases, and implementation details.",
    };

    const fullPrompt = `You are an expert answering an interview question for a preparation platform.
Tone instruction: ${toneInstructions[selectedTone]}
Question: ${q.text}
Role context: ${q.job} — ${q.diff} level
Generate a high-quality answer following the tone instruction exactly.${feedbackNote}`;

    try {
      const text = await callAI([{ role: "user", content: fullPrompt }], "generate", { tone: selectedTone, questionType: q.type, role: q.job, company });
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
  const canDelete = userRole === 'admin' || userRole === 'domain' || userRole === 'domain_expert';

  const iconBtn = (active, activeColor, activeBg) => ({
    width: 34, height: 34, borderRadius: 10,
    background: active ? activeBg : "rgba(255,255,255,0.03)",
    border: `1px solid ${active ? activeColor : "var(--border)"}`,
    color: active ? activeColor : "var(--muted)",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, transition: "all 0.2s ease",
  });

  return (
    <div className="card-hover" style={{
      background: "var(--card)", border: selected ? "1px solid var(--blue)" : "1px solid var(--border)", borderRadius: 16, padding: 24,
      borderLeft: showAnswer ? "3px solid var(--green)" : selected ? "3px solid var(--blue)" : "3px solid transparent",
      boxShadow: selected ? "0 4px 20px rgba(59,130,246,0.15)" : "none",
      transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
      position: "relative",
    }}>
      {selectable && (
        <div style={{ position: "absolute", top: 20, right: 20, zIndex: 2 }}>
          <input 
            type="checkbox" 
            checked={selected} 
            onChange={() => onSelect(q.id)} 
            style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--blue)" }}
            title="Select question"
          />
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14, paddingRight: selectable ? 24 : 0 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Badge label={q.type} cls={`tag-${q.type}`} />
          <Badge label={q.diff} cls={`diff-${q.diff}`} />
          <span style={{ fontSize: 11, color: "var(--muted)", margin: "0 2px" }}>·</span>
          <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500 }}>{q.job}</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", flexShrink: 0, opacity: 0.7 }}>{q.date}</span>
      </div>
      <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, color: "var(--text)", marginBottom: 16, letterSpacing: "-0.2px" }}>{q.text}</p>
      
      {isExpert && (
        <div style={{ display: "flex", gap: 16, marginBottom: 20, padding: "8px 12px", background: "var(--card-highest)", borderRadius: 10, width: "fit-content" }}>
          {/* DOMAIN EXPERT ONLY — hidden in student portal */}
          <RatingBadge rating={expertRating} onRate={setExpertRating} questionId={q.id} />
          <div style={{ width: 1, background: "var(--border)" }} />
          <AttemptsCounter count={attempts} label={attempts === 1 ? "1 Attempt" : `${attempts} Attempts`} />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <ToneSelector selectedTone={selectedTone} onToneChange={setSelectedTone} />
        <button className="btn-glow" onClick={() => generate()} disabled={generating} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 10,
          background: "linear-gradient(135deg,#1e3a6e,#162d5a)",
          border: "1px solid rgba(59,130,246,0.35)", color: "#60a5fa",
          fontSize: 12, fontWeight: 600, fontFamily: "var(--font)",
          cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.7 : 1,
        }}>
          {generating ? <><Spinner /> Generating…</> : <>⚡ {answer ? "Regenerate" : "Generate Answer"}</>}
        </button>
        {canDelete && onEdit && <button onClick={() => onEdit(q)} title="Edit" style={iconBtn(false, "var(--blue)", "var(--blue-dim)")}>✏️</button>}
        {canDelete && onDuplicate && <button onClick={() => onDuplicate(q)} title="Duplicate" style={iconBtn(false, "var(--green)", "var(--green-dim)")}>📄</button>}
        {canDelete && onDelete && <button onClick={() => onDelete(q.id)} title="Delete" style={iconBtn(false, "var(--red)", "var(--red-dim)")}>🗑️</button>}
        {!selectable && <button onClick={() => onBookmark(q.id)} title="Bookmark" style={iconBtn(bookmarked, "var(--red)", "var(--red-dim)")}>🔖</button>}
        <button onClick={() => { navigator.clipboard.writeText(q.text); showToast("Question copied!"); }} title="Copy" style={iconBtn(false, "var(--text2)", "transparent")}>📋</button>
        <button onClick={() => onLike(q.id)} style={{
          display: "flex", alignItems: "center", gap: 5, marginLeft: "auto",
          background: liked ? "var(--blue-dim)" : "transparent",
          border: `1px solid ${liked ? "rgba(59,130,246,0.3)" : "transparent"}`,
          cursor: "pointer", color: liked ? "var(--blue)" : "var(--muted)",
          fontSize: 12, fontWeight: 500, fontFamily: "var(--font)",
          padding: "5px 10px", borderRadius: 8, transition: "all 0.2s",
        }}>
          👍 {q.upvotes || 0}
        </button>
      </div>
      {showAnswer && (
        <div className="fadeIn" style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--green)", fontFamily: "var(--mono)" }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "inline-block",
                animation: generating ? "pulse 1s infinite" : "none",
                boxShadow: generating ? "0 0 8px var(--green)" : "none",
              }} />
              AI Answer
              {!generating && <span style={{ marginLeft: 8, background: "rgba(16,185,129,0.15)", padding: "2px 8px", borderRadius: 4, color: "var(--green)", textTransform: "capitalize", fontSize: 11 }}>{selectedTone} answer</span>}
              {isTyping && !generating && <TypingDots />}
            </div>
            {answer && <div style={{ display: "flex", gap: 6 }}>
              <button className="btn-secondary-hover" onClick={handleTTS} style={{ background: ttsPlaying ? "var(--green-dim)" : "rgba(255,255,255,0.03)", border: `1px solid ${ttsPlaying ? "rgba(16,185,129,0.3)" : "var(--border)"}`, color: ttsPlaying ? "var(--green)" : "var(--text2)", padding: "5px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500, transition: "all 0.2s" }}>🔊 {ttsPlaying ? "Stop" : "Listen"}</button>
              <button className="btn-secondary-hover" onClick={() => { navigator.clipboard.writeText(answer); showToast("Copied!"); }} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "var(--text2)", padding: "5px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500, transition: "all 0.2s" }}>📋 Copy</button>
            </div>}
          </div>
          {generating && !displayedAnswer ? <div style={{ color: "var(--muted)", fontSize: 13, padding: "8px 0" }}><TypingDots /></div> :
            <p style={{ fontSize: 13.5, lineHeight: 1.85, color: "var(--text2)", whiteSpace: "pre-wrap", borderLeft: "2px solid var(--green)", paddingLeft: 16, margin: "4px 0" }}>
              {displayedAnswer}{isTyping && !generating && <span style={{ animation: "blink 0.7s step-end infinite", color: "var(--green)" }}>▋</span>}
            </p>}
          {answer && !generating && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Helpful?</span>
              <button onClick={() => { setRating("good"); setShowFeedback(false); showToast("Thanks!"); }} style={{ background: rating === "good" ? "var(--green-dim)" : "rgba(255,255,255,0.03)", border: `1px solid ${rating === "good" ? "rgba(16,185,129,0.3)" : "var(--border)"}`, color: rating === "good" ? "var(--green)" : "var(--text2)", padding: "5px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500, transition: "all 0.2s" }}>👍 Yes</button>
              <button onClick={() => { setRating("bad"); setShowFeedback(true); }} style={{ background: rating === "bad" ? "var(--red-dim)" : "rgba(255,255,255,0.03)", border: `1px solid ${rating === "bad" ? "rgba(239,68,68,0.3)" : "var(--border)"}`, color: rating === "bad" ? "var(--red)" : "var(--text2)", padding: "5px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500, transition: "all 0.2s" }}>👎 Improve</button>
              {showFeedback && <>
                <input value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="How to improve…" style={{ flex: 1, minWidth: 140, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "var(--text)", padding: "6px 12px", borderRadius: 8, fontSize: 11, fontFamily: "var(--font)", outline: "none", transition: "border-color 0.2s" }} />
                <button className="btn-glow" onClick={() => generate(feedbackText)} style={{ background: "var(--red)", border: "none", color: "#fff", padding: "6px 14px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 600 }}>Regenerate</button>
              </>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
