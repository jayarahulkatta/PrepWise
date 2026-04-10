import { useState, useRef, useCallback } from "react";
import { Badge, Spinner, TypingDots } from "../ui";
import { callAI } from "../../utils/api";
import { useAuth } from "../../AuthContext";
import Chip from "./Chip";
import ToneChip from "./ToneChip";
import StatPill from "./StatPill";

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
      
      {/* DOMAIN EXPERT ONLY — hidden in student portal */}
      {isExpert && (
        <div className="stat-row">
          <StatPill rating={expertRating} onRate={setExpertRating} questionId={q.id} />
          <span className="stat-pill">{attempts === 1 ? "1 Attempt" : `${attempts} Attempts`}</span>
        </div>
      )}

      {/* Action chips row — visible in BOTH portals */}
      <div className="chip-row">
        <ToneChip selectedTone={selectedTone} onToneChange={setSelectedTone} />
        
        <button className="chip chip-primary" onClick={() => generate()} disabled={generating}>
          {!generating ? (
            <>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
                <path d="M3 8h10M8 3l5 5-5 5" strokeLinecap="round"/>
              </svg>
              Generate answer
            </>
          ) : (
            <><Spinner /> Generating…</>
          )}
        </button>

        {canDelete && onEdit && (
          <Chip variant="neutral" iconOnly title="Edit" onClick={() => onEdit(q)}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
              <path d="M11 2l3 3-8 8H3v-3l8-8z"/>
            </svg>
          </Chip>
        )}

        <Chip variant="neutral" iconOnly title="Copy" onClick={() => { navigator.clipboard.writeText(q.text); showToast("Question copied!"); }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
            <rect x="5" y="5" width="8" height="9" rx="1.5"/>
            <path d="M3 3h6v2"/>
          </svg>
        </Chip>

        {canDelete && onDelete && (
          <Chip variant="neutral" iconOnly title="Delete" onClick={() => onDelete(q.id)}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
              <path d="M3 4h10M6 4V3h4v1M5 4l1 9h4l1-9"/>
            </svg>
          </Chip>
        )}

        {canDelete && onDuplicate && (
          <Chip variant="neutral" iconOnly title="Details/Duplicate" onClick={() => onDuplicate(q)}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
              <rect x="3" y="2" width="10" height="12" rx="1.5"/>
              <path d="M6 6h4M6 9h4M6 12h2"/>
            </svg>
          </Chip>
        )}

        {!selectable && (
          <Chip variant="neutral" iconOnly title="Bookmark" onClick={() => onBookmark(q.id)}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14" style={{ color: bookmarked ? "var(--red)" : "inherit" }}>
              <path d="M3 2v13l5-3 5 3V2z"/>
            </svg>
          </Chip>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
          <Chip variant="neutral" title="Like" onClick={() => onLike(q.id)} style={liked ? { color: "var(--blue)", borderColor: "var(--blue)", background: "var(--blue-dim)" } : {}}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
              <path d="M6 7l2-5 1 1v3h4l-1 6H5V7H3V7h3z"/>
            </svg>
            {q.upvotes || 0}
          </Chip>
        </div>
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
              <button className="btn-secondary-hover" onClick={handleTTS} style={{ background: ttsPlaying ? "var(--green-dim)" : "rgba(255,255,255,0.03)", border: `1px solid ${ttsPlaying ? "rgba(16,185,129,0.3)" : "var(--border)"}`, color: ttsPlaying ? "var(--green)" : "var(--text2)", padding: "5px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500, transition: "all 0.2s" }}>
                {ttsPlaying ? "Stop" : "Listen"}
              </button>
              <button className="btn-secondary-hover" onClick={() => { navigator.clipboard.writeText(answer); showToast("Copied!"); }} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "var(--text2)", padding: "5px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500, transition: "all 0.2s", display: "flex", alignItems: "center", gap: "4px" }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
                  <rect x="5" y="5" width="8" height="9" rx="1.5"/>
                  <path d="M3 3h6v2"/>
                </svg>
                Copy
              </button>
            </div>}
          </div>
          {generating && !displayedAnswer ? <div style={{ color: "var(--muted)", fontSize: 13, padding: "8px 0" }}><TypingDots /></div> :
            <p style={{ fontSize: 13.5, lineHeight: 1.85, color: "var(--text2)", whiteSpace: "pre-wrap", borderLeft: "2px solid var(--green)", paddingLeft: 16, margin: "4px 0" }}>
              {displayedAnswer}{isTyping && !generating && <span style={{ animation: "blink 0.7s step-end infinite", color: "var(--green)" }}>▋</span>}
            </p>}
          {answer && !generating && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Helpful?</span>
              <button onClick={() => { setRating("good"); setShowFeedback(false); showToast("Thanks!"); }} style={{ background: rating === "good" ? "var(--green-dim)" : "rgba(255,255,255,0.03)", border: `1px solid ${rating === "good" ? "rgba(16,185,129,0.3)" : "var(--border)"}`, color: rating === "good" ? "var(--green)" : "var(--text2)", padding: "5px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500, transition: "all 0.2s", display: "flex", alignItems: "center", gap: "4px" }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
                  <path d="M6 7l2-5 1 1v3h4l-1 6H5V7H3V7h3z"/>
                </svg>
                Yes
              </button>
              <button onClick={() => { setRating("bad"); setShowFeedback(true); }} style={{ background: rating === "bad" ? "var(--red-dim)" : "rgba(255,255,255,0.03)", border: `1px solid ${rating === "bad" ? "rgba(239,68,68,0.3)" : "var(--border)"}`, color: rating === "bad" ? "var(--red)" : "var(--text2)", padding: "5px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500, transition: "all 0.2s" }}>
                Improve
              </button>
              {showFeedback && <>
                <input value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="How to improve…" style={{ flex: 1, minWidth: 140, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "var(--text)", padding: "6px 12px", borderRadius: 8, fontSize: 11, fontFamily: "var(--font)", outline: "none", transition: "border-color 0.2s" }} />
                <button className="chip chip-primary" onClick={() => generate(feedbackText)} style={{ padding: "6px 14px", fontSize: 11 }}>Regenerate</button>
              </>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
