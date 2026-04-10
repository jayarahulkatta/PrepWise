import React from "react";
import "./Chip.css";

export default function StatPill({ label, rating, onClick }) {
  // Mapping rating to color variants
  const getPillStyle = (r) => {
    switch (r) {
      case "Poor": return { color: "#f87171", border: "1px solid #4a1f1f", background: "#1f1010" };
      case "Average": return { color: "#fb923c", border: "1px solid #4a3010", background: "#1f1808" };
      case "Good": return { color: "#4ade80", border: "1px solid #1a4a28", background: "#0f1f10" };
      case "Excellent": return { color: "#a5b4fc", border: "1px solid #2e2e80", background: "#10102a" };
      case "Unrated": return { color: "#555", border: "1px solid #1e1e30", background: "#161624" };
      default: return { color: "#555", border: "1px solid #1e1e30", background: "#161624" };
    }
  };

  const style = getPillStyle(rating || "default");
  if (onClick) style.cursor = "pointer";

  return (
    <div 
      className="stat-pill" 
      style={style}
      onClick={onClick}
    >
      {label}
    </div>
  );
}
