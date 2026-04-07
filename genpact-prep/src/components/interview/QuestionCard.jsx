import { useState, useRef, useCallback } from "react";
import { Badge, Spinner, TypingDots } from "../ui";
import { callAI } from "../../utils/api";
import { TONES } from "../../utils/constants";

const filterSS = {
  background: "var(--card-highest)", border: "1px solid transparent",
  color: "var(--text)", padding: "9px 30px 9px 14px", borderRadius: 12,
  fontSize: 13, fontFamily: "var(--font)", cursor: "pointer",
  outline: "none", appearance: "none", transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
};

export default function QuestionCard({ q, bookmarked, liked, onBookmark, onLike, onDelete, showToast, userRole }) {
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
    const prompt = `You're a job candidate being interviewed at ${company}. Answer this interview question in first person, naturally.\n\nQuestion: "${q.text}"\nRole: ${q.job}\nType: ${q.type}\n\nRules:\n- Write as someone would SPEAK — conversational\n- Use natural transitions\n- First person throughout\n- No bullet points, no headers, no markdown\n- 150–220 words, conversational but substantive\n- End with a confident closer${feedbackNote}\n\nWrite the answer directly.`;
    try {
      const text = await callAI([{ role: "user", content: prompt }], "generate", { tone, questionType: q.type, role: q.job, company });
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
  const canDelete = userRole === 'admin' || userRole === 'domain';

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
      background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24,
      borderLeft: showAnswer ? "3px solid var(--green)" : "3px solid transparent",
      transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Badge label={q.type} cls={`tag-${q.type}`} />
          <Badge label={q.diff} cls={`diff-${q.diff}`} />
          <span style={{ fontSize: 11, color: "var(--muted)", margin: "0 2px" }}>·</span>
          <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500 }}>{q.job}</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", flexShrink: 0, opacity: 0.7 }}>{q.date}</span>
      </div>
      <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.7, color: "var(--text)", marginBottom: 20, letterSpacing: "-0.2px" }}>{q.text}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <select value={tone} onChange={e => setTone(e.target.value)} style={{ ...filterSS, padding: "7px 30px 7px 10px", fontSize: 12, width: "auto" }}>
          {Object.entries(TONES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-glow" onClick={() => generate()} disabled={generating} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 10,
          background: "linear-gradient(135deg,#1e3a6e,#162d5a)",
          border: "1px solid rgba(59,130,246,0.35)", color: "#60a5fa",
          fontSize: 12, fontWeight: 600, fontFamily: "var(--font)",
          cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.7 : 1,
        }}>
          {generating ? <><Spinner /> Generating…</> : <>⚡ {answer ? "Regenerate" : "Generate Answer"}</>}
        </button>
        {canDelete && onDelete && <button onClick={() => onDelete(q.id)} title="Delete" style={iconBtn(false, "var(--red)", "var(--red-dim)")}>🗑️</button>}
        <button onClick={() => onBookmark(q.id)} title="Bookmark" style={iconBtn(bookmarked, "var(--red)", "var(--red-dim)")}>🔖</button>
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
              AI Answer{isTyping && !generating && <TypingDots />}
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
