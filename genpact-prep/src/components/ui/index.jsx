export function Badge({ label, cls }) {
  return (
    <span
      style={{
        fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
        textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "var(--mono)",
        display: "inline-block", transition: "all 0.2s",
      }}
      className={cls}
    >{label}</span>
  );
}

export function Spinner() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" opacity="0.3" />
        <path d="M12 2v4" />
      </svg>
    </span>
  );
}

export function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center", padding: "2px 0" }}>
      {[0, 150, 300].map((d, i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%", background: "var(--green)",
          display: "inline-block", animation: `dotBounce 1.4s ease-in-out ${d}ms infinite`,
        }} />
      ))}
    </span>
  );
}

export function Toast({ msg, visible }) {
  return (
    <div className={visible ? "slideUp" : ""} style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 9999,
      background: "var(--card)", border: "1px solid rgba(16,185,129,0.3)",
      color: "var(--green)", padding: "12px 20px", borderRadius: 14,
      fontSize: 13, fontWeight: 500, fontFamily: "var(--font)",
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
      pointerEvents: "none", display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,185,129,0.1)",
      backdropFilter: "blur(16px)",
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: "50%", background: "var(--green-dim)",
        border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 10, flexShrink: 0,
      }}>✓</span>
      {msg}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16,
      padding: 24, borderLeft: "3px solid var(--border)",
    }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div className="skeleton" style={{ width: 70, height: 22 }} />
        <div className="skeleton" style={{ width: 55, height: 22 }} />
      </div>
      <div className="skeleton" style={{ width: "90%", height: 16, marginBottom: 10 }} />
      <div className="skeleton" style={{ width: "65%", height: 16, marginBottom: 20 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <div className="skeleton" style={{ width: 100, height: 34 }} />
        <div className="skeleton" style={{ width: 130, height: 34 }} />
      </div>
    </div>
  );
}

export function ScoreBar({ value, color, label, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      {icon && <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{icon}</span>}
      <span style={{ fontSize: 11, color: "var(--text2)", width: 100, fontWeight: 500 }}>{label}</span>
      <div className="score-bar">
        <div className="score-bar-fill" style={{ width: `${value}%`, background: color || "var(--blue)" }} />
      </div>
      <span style={{
        fontSize: 13, fontWeight: 700, fontFamily: "var(--mono)", color: color || "var(--text)",
        width: 32, textAlign: "right", letterSpacing: "-0.5px",
      }}>{value}</span>
    </div>
  );
}

export function StatCard({ value, label, color, icon }) {
  return (
    <div className="stat-card">
      {icon && <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>}
      <div className="stat-value" style={{ color: color || "var(--text)" }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
