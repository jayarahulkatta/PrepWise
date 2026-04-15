import { useState } from "react";
import { Spinner, Badge } from "../ui";
import { apiFetch } from "../../utils/api";
import Chip from "./Chip";

export default function CodingWorkspace({ q, onClose }) {
  const [language, setLanguage] = useState("java");
  const [code, setCode] = useState("");
  const [activeTab, setActiveTab] = useState("output"); // 'output' | 'ai'
  
  const [status, setStatus] = useState("idle"); // 'idle' | 'running' | 'done' | 'error'
  const [execResult, setExecResult] = useState(null);
  const [aiReview, setAiReview] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setStatus("running");
    setExecResult(null);
    setAiReview(null);
    setErrorMsg("");
    setActiveTab("output"); // Switch to output automatically to show running status

    try {
      const response = await apiFetch("/api/code/submit", {
        method: "POST",
        body: JSON.stringify({ question: q.text, code, language })
      });

      if (response.error) throw new Error(response.error);

      setExecResult(response.execution);
      setAiReview(response.evaluation);
      setStatus("done");
      
      // Auto switch to AI tab if execution was essentially successful
      if (response.evaluation && response.evaluation.correctness) {
        setTimeout(() => setActiveTab("ai"), 500);
      }
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong.");
      setStatus("error");
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, animation: "fadeIn 0.2s ease-out"
    }}>
      <div style={{
        background: "var(--bg)", width: "100%", maxWidth: 1200, height: "100%", maxHeight: 800,
        borderRadius: 20, border: "1px solid var(--border)", display: "flex", flexDirection: "column",
        overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.4)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--blue-dim)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, m: 0 }}>Java & DSA Workspace</h2>
            <Badge label={q.diff} cls={`diff-${q.diff}`} />
          </div>
          <button onClick={onClose} className="btn-secondary-hover" style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Main Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", flex: 1, overflow: "hidden" }}>
          
          {/* LEFT: Editor */}
          <div style={{ display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", padding: 20, gap: 14 }}>
            <div style={{ background: "var(--card)", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Question</h3>
              <p style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.6 }}>{q.text}</p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8 }}>
                {["java", "python"].map(lang => (
                  <button key={lang} onClick={() => setLanguage(lang)} style={{
                    background: language === lang ? "var(--blue-dim)" : "var(--card)",
                    border: `1px solid ${language === lang ? "rgba(59,130,246,0.5)" : "var(--border)"}`,
                    color: language === lang ? "var(--blue-bright)" : "var(--muted)",
                    padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    textTransform: "capitalize", fontFamily: "var(--font)", transition: "all 0.2s"
                  }}>
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", background: "#0c0d14", display: "flex" }}>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder={`// Write your ${language} solution here...`}
                spellCheck={false}
                style={{
                  width: "100%", height: "100%", background: "transparent", color: "#e2e8f0", padding: 20,
                  fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.6, border: "none", outline: "none",
                  resize: "none"
                }}
              />
            </div>
          </div>

          {/* RIGHT: Output & AI */}
          <div style={{ display: "flex", flexDirection: "column", padding: 20, background: "var(--card-highest)" }}>
            
            {/* Tabs */}
            <div style={{ display: "flex", gap: 24, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
              <button 
                onClick={() => setActiveTab("output")}
                style={{ 
                  background: "transparent", border: "none", padding: "0 0 12px 0", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, color: activeTab === "output" ? "var(--text)" : "var(--muted)",
                  borderBottom: activeTab === "output" ? "2px solid var(--blue)" : "2px solid transparent",
                  transition: "all 0.2s"
                }}
              >
                Execution Output
              </button>
              <button 
                onClick={() => setActiveTab("ai")}
                style={{ 
                  background: "transparent", border: "none", padding: "0 0 12px 0", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, color: activeTab === "ai" ? "var(--text)" : "var(--muted)",
                  borderBottom: activeTab === "ai" ? "2px solid var(--green)" : "2px solid transparent",
                  transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={activeTab === "ai" ? "var(--green)" : "currentColor"} strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2zM9.5 7h5a2 2 0 0 1 2 2v2M9.5 11h5M9.5 15h5v2a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1"/></svg>
                AI Review
              </button>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
              {status === "idle" && (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)", opacity: 0.6 }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" style={{ marginBottom: 16 }}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <p style={{ fontSize: 13 }}>Run your code to see output and AI feedback here.</p>
                </div>
              )}

              {status === "running" && (
                <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text2)", fontSize: 13 }}>
                    <Spinner size={16} /> <span>Executing code in Sandbox...</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)", fontSize: 13 }}>
                    <Spinner size={16} /> <span>Running deep AI review...</span>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div style={{ padding: 16, background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, color: "var(--red)", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  <strong>System Error:</strong><br/>{errorMsg}
                </div>
              )}

              {status === "done" && activeTab === "output" && execResult && (
                <div className="fadeUp" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Status Banner */}
                  <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, display: "flex", justifyContent: "space-between",
                    background: execResult.stderr ? "var(--red-dim)" : "var(--green-dim)",
                    color: execResult.stderr ? "var(--red)" : "var(--green)",
                    border: `1px solid ${execResult.stderr ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`
                  }}>
                    <span>{execResult.stderr ? "Execution Failed" : "Execution Successful"}</span>
                    <span>{execResult.time || "<1"}ms</span>
                  </div>

                  <div style={{ background: "#0c0d14", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--text2)", background: "var(--card)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>STDOUT</div>
                    <pre style={{ padding: 16, margin: 0, color: "#e2e8f0", fontSize: 13, fontFamily: "var(--mono)", minHeight: 80, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                      {execResult.stdout || <span style={{ color: "var(--muted)", fontStyle: "italic" }}>No output.</span>}
                    </pre>
                  </div>

                  {execResult.stderr && (
                    <div style={{ background: "#1a0b0b", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(239,68,68,0.3)", fontSize: 11, color: "var(--red)", background: "rgba(239,68,68,0.1)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>STDERR</div>
                      <pre style={{ padding: 16, margin: 0, color: "var(--red)", fontSize: 13, fontFamily: "var(--mono)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                        {execResult.stderr}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {status === "done" && activeTab === "ai" && aiReview && (
                <div className="fadeUp" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* AI Correctness Badge */}
                  <div style={{ padding: "16px", borderRadius: 12, border: `1px solid ${aiReview.correctness === "Correct" ? "rgba(16,185,129,0.3)" : aiReview.correctness === "Partially Correct" ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`, background: "var(--card)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{aiReview.correctness === "Correct" ? "✅" : aiReview.correctness === "Partially Correct" ? "⚠️" : "❌"}</span>
                      <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text)" }}>{aiReview.correctness}</h4>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, margin: 0 }}>{aiReview.explanation}</p>
                  </div>

                  {/* Complexity Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: "var(--card)", padding: 14, borderRadius: 12, border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 6 }}>Time Complexity</span>
                      <span style={{ fontFamily: "var(--mono)", color: "var(--blue-bright)", fontSize: 15, fontWeight: 600 }}>{aiReview.timeComplexity}</span>
                    </div>
                    <div style={{ background: "var(--card)", padding: 14, borderRadius: 12, border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 6 }}>Space Complexity</span>
                      <span style={{ fontFamily: "var(--mono)", color: "var(--blue-bright)", fontSize: 15, fontWeight: 600 }}>{aiReview.spaceComplexity}</span>
                    </div>
                  </div>

                  {/* Edge Cases */}
                  {aiReview.edgeCasesMissed && aiReview.edgeCasesMissed.length > 0 && (
                    <div style={{ background: "var(--card)", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
                      <h4 style={{ fontSize: 13, color: "var(--text)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        Edge Cases Missed
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--text2)", lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 6 }}>
                        {aiReview.edgeCasesMissed.map((ec, i) => <li key={i}>{ec}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Suggestions */}
                  {aiReview.suggestions && aiReview.suggestions.length > 0 && (
                    <div style={{ background: "var(--card)", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
                      <h4 style={{ fontSize: 13, color: "var(--text)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        Suggestions for Improvement
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--text2)", lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 6 }}>
                        {aiReview.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Bottom Panel Actions */}
            <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
              <Chip variant="primary" onClick={handleSubmit} disabled={status === "running" || !code.trim()} style={{ background: "var(--blue)", padding: "10px 24px", fontSize: 14 }}>
                {status === "running" ? <><Spinner /> Compiling...</> : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Run & Evaluate
                  </>
                )}
              </Chip>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
