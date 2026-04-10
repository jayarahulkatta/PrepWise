import React from "react";

export default function AttemptsCounter({ count, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)", fontWeight: 500, padding: "6px 12px", background: "var(--card-highest)", borderRadius: 12, border: "1px solid var(--border)" }}>
      <span style={{ fontSize: 14 }}>👥</span> {label}
    </div>
  );
}
