import { useState, useEffect, useRef } from "react";
import { TypingDots, ScoreBar } from "../ui";
import { callAI, apiFetch, API_BASE } from "../../utils/api";
import { scoreColor } from "../../utils/constants";

export default function ChatSimulator({ onClose, company, getToken }) {
  const [messages, setMessages] = useState([{
    role: "ai",
    text: `Hi! I'm your ${company || "company"} interviewer today. Tell me about yourself and why you're interested in ${company || "this role"}?`
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("chat"); // chat | debriefing | debrief
  const [debrief, setDebrief] = useState(null);
  const bottomRef = useRef(null);
  const exchangeCount = messages.filter(m => m.role === "user").length;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async () => {
    const text = input.trim(); if (!text || loading) return; setInput("");
    const updated = [...messages, { role: "user", text }]; setMessages(updated); setLoading(true);
    const apiMsgs = updated.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
    const sys = `You are a professional ${company || "company"} interviewer for a software/analyst role.\nRules:\n- Stay in character, never say you're AI\n- Ask ONE follow-up based on what candidate said\n- Be encouraging but probe deeper\n- After 5-7 exchanges, conclude and give initial impressions\n- Keep to 2-4 sentences\n- React specifically to what was said`;
    try {
      const reply = await callAI([{ role: "system", content: sys }, { role: "assistant", content: "Understood." }, ...apiMsgs], "generate");
      setMessages(prev => [...prev, { role: "ai", text: reply }]);
    } catch { setMessages(prev => [...prev, { role: "ai", text: "Sorry, technical issue. Please continue." }]); }
    setLoading(false);
  };

  const endInterview = async () => {
    setPhase("debriefing");
    try {
      // Generate debrief
      const debriefResult = await callAI(null, "debrief", { messages, company });
      setDebrief(debriefResult);

      // Save chat session
      try {
        const token = await getToken();
        await apiFetch(`${API_BASE}/user/chat-sessions`, {
          method: "POST",
          body: JSON.stringify({ company, messages, debrief: debriefResult }),
        }, token);
      } catch (e) { console.error("Failed to save chat session:", e); }
    } catch {
      setDebrief({
        overallScore: 6, communicationClarity: 6, technicalDepth: 5, confidence: 6,
        strongMoments: ["Engaged in the conversation"],
        weakMoments: ["Could not assess — AI analysis unavailable"],
        hireSignal: "lean_hire", hireExplanation: "Candidate participated fully.",
        recommendedPractice: ["Practice with STAR method", "Add metrics to answers"],
      });
    }
    setPhase("debrief");
  };

  const hireSignalConfig = {
    strong_hire: { color: "var(--green)", bg: "var(--green-dim)", icon: "✅", label: "Strong Hire" },
    lean_hire: { color: "var(--green)", bg: "var(--green-dim)", icon: "👍", label: "Lean Hire" },
    lean_no_hire: { color: "var(--yellow)", bg: "rgba(245,158,11,0.1)", icon: "⚠️", label: "Lean No Hire" },
    strong_no_hire: { color: "var(--red)", bg: "var(--red-dim)", icon: "❌", label: "Strong No Hire" },
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 24,
        width: "100%", maxWidth: 650, height: "85vh", maxHeight: 750,
        display: "flex", flexDirection: "column", position: "relative", overflow: "hidden",
        boxShadow: "var(--shadow)", animation: "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 22px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 14, flexShrink: 0, background: "var(--card-highest)",
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: "linear-gradient(135deg,var(--blue-bright),var(--blue))",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            boxShadow: "0 4px 16px rgba(37,99,235,0.25)",
          }}>🤵</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{company || "Company"} Interviewer</div>
            <div style={{ fontSize: 11, color: "var(--green)", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block", animation: "pulse 2s infinite" }} />
              {phase === "chat" ? "Live — AI Simulator" : phase === "debriefing" ? "Generating Debrief…" : "Interview Complete"}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            {phase === "chat" && exchangeCount >= 2 && (
              <button onClick={endInterview} style={{
                background: "var(--blue-dim)", border: "1px solid rgba(59,130,246,0.3)",
                color: "var(--blue)", padding: "6px 14px", borderRadius: 8,
                fontSize: 11, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 600,
              }}>End & Get Debrief</button>
            )}
            <button onClick={onClose} className="modal-close" style={{ position: "static" }}>×</button>
          </div>
        </div>

        {/* Chat or Debrief */}
        {phase !== "debrief" ? (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 10, flexDirection: m.role === "user" ? "row-reverse" : "row", animation: `fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both` }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: m.role === "ai" ? "var(--card)" : "var(--blue)",
                    border: m.role === "ai" ? "1px solid var(--border)" : "none",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
                    boxShadow: m.role === "user" ? "0 2px 8px rgba(59,130,246,0.3)" : "none",
                  }}>{m.role === "ai" ? "🤵" : "😊"}</div>
                  <div style={{
                    maxWidth: "80%", padding: "12px 16px", borderRadius: 14, fontSize: 13, lineHeight: 1.7,
                    background: m.role === "ai" ? "var(--card)" : "linear-gradient(135deg,var(--blue),#2563eb)",
                    border: m.role === "ai" ? "1px solid var(--border)" : "none",
                    color: m.role === "ai" ? "var(--text)" : "#fff",
                    borderBottomLeftRadius: m.role === "ai" ? 4 : 14,
                    borderBottomRightRadius: m.role === "user" ? 4 : 14,
                  }}>{m.text}</div>
                </div>
              ))}
              {(loading || phase === "debriefing") && (
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤵</div>
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, borderBottomLeftRadius: 4, padding: "14px 18px" }}>
                    <TypingDots />
                    {phase === "debriefing" && <span style={{ marginLeft: 8, fontSize: 12, color: "var(--muted)" }}>Preparing your debrief…</span>}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            {phase === "chat" && (
              <div style={{ padding: 16, borderTop: "1px solid var(--border)", display: "flex", gap: 10, flexShrink: 0, background: "var(--card-highest)" }}>
                <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Type your answer… (Enter to send)" style={{ flex: 1, background: "var(--card-highest)", border: "1px solid transparent", color: "var(--text)", padding: "10px 14px", borderRadius: 12, fontSize: 13, fontFamily: "var(--font)", resize: "none", height: 44, outline: "none", lineHeight: 1.6 }} />
                <button className="btn-glow" onClick={send} disabled={loading || !input.trim()} style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),#2563eb)", border: "none", color: "#fff", cursor: loading || !input.trim() ? "not-allowed" : "pointer", opacity: loading || !input.trim() ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>➤</button>
              </div>
            )}
          </>
        ) : (
          /* DEBRIEF VIEW */
          <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>📋</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>Interview Debrief</h2>
              <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>{messages.filter(m => m.role === "user").length} exchanges with {company} interviewer</p>
            </div>

            {debrief && <>
              {/* Hire Signal */}
              {debrief.hireSignal && <div style={{
                padding: 20, borderRadius: 16, marginBottom: 20, textAlign: "center",
                background: hireSignalConfig[debrief.hireSignal]?.bg || "var(--card)",
                border: `1px solid ${hireSignalConfig[debrief.hireSignal]?.color || "var(--border)"}40`,
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{hireSignalConfig[debrief.hireSignal]?.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: hireSignalConfig[debrief.hireSignal]?.color }}>{hireSignalConfig[debrief.hireSignal]?.label}</div>
                <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>{debrief.hireExplanation}</p>
              </div>}

              {/* Scores */}
              <div style={{ padding: 20, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, marginBottom: 20 }}>
                <h3 style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted)", marginBottom: 16, fontFamily: "var(--mono)" }}>Performance</h3>
                <ScoreBar value={(debrief.overallScore || 0) * 10} color={scoreColor((debrief.overallScore || 0) * 10)} label="Overall" icon="⭐" />
                <ScoreBar value={(debrief.communicationClarity || 0) * 10} color={scoreColor((debrief.communicationClarity || 0) * 10)} label="Communication" icon="🗣️" />
                <ScoreBar value={(debrief.technicalDepth || 0) * 10} color={scoreColor((debrief.technicalDepth || 0) * 10)} label="Technical Depth" icon="🔬" />
                <ScoreBar value={(debrief.confidence || 0) * 10} color={scoreColor((debrief.confidence || 0) * 10)} label="Confidence" icon="💪" />
              </div>

              {/* Strong moments */}
              {debrief.strongMoments?.length > 0 && <div style={{ padding: 16, background: "var(--green-dim)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 14, marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: 1 }}>Strong Moments</span>
                {debrief.strongMoments.map((s, i) => <div key={i} style={{ fontSize: 12, color: "var(--text2)", marginTop: 6, display: "flex", gap: 6 }}><span style={{ color: "var(--green)" }}>✓</span>{s}</div>)}
              </div>}

              {/* Weak moments */}
              {debrief.weakMoments?.length > 0 && <div style={{ padding: 16, background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--red)", textTransform: "uppercase", letterSpacing: 1 }}>Areas to Improve</span>
                {debrief.weakMoments.map((w, i) => <div key={i} style={{ fontSize: 12, color: "var(--text2)", marginTop: 6, display: "flex", gap: 6 }}><span style={{ color: "var(--red)" }}>→</span>{w}</div>)}
              </div>}

              {/* Recommended Practice */}
              {debrief.recommendedPractice?.length > 0 && <div style={{ padding: 16, background: "var(--blue-dim)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 14, marginBottom: 20 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--blue)", textTransform: "uppercase", letterSpacing: 1 }}>Next Steps</span>
                {debrief.recommendedPractice.map((r, i) => <div key={i} style={{ fontSize: 12, color: "var(--text2)", marginTop: 6, display: "flex", gap: 6 }}><span style={{ color: "var(--blue)" }}>📌</span>{r}</div>)}
              </div>}
            </>}

            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn-glow" onClick={() => { setMessages([{ role: "ai", text: `Hi! I'm your ${company || "company"} interviewer. Tell me about yourself.` }]); setDebrief(null); setPhase("chat"); }} style={{ padding: "10px 22px", borderRadius: 12, background: "linear-gradient(135deg, var(--blue), #2563eb)", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "var(--font)", cursor: "pointer" }}>Practice Again</button>
              <button className="btn-secondary-hover" onClick={onClose} style={{ padding: "10px 22px", borderRadius: 12, background: "var(--card)", border: "1px solid var(--border)", color: "var(--text2)", fontSize: 13, fontWeight: 500, fontFamily: "var(--font)", cursor: "pointer" }}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
