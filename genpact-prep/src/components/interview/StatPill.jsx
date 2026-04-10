import React, { useState } from "react";
import "./Chip.css";

export default function StatPill({ rating, onRate, questionId }) {
  const [showOptions, setShowOptions] = useState(false);

  // The rating color variants defined in the spec
  const getPillStyle = (r) => {
    switch (r) {
      case "Poor": return { color: "#f87171", border: "1px solid #4a1f1f", background: "#1f1010" };
      case "Average": return { color: "#fb923c", border: "1px solid #4a3010", background: "#1f1808" };
      case "Good": return { color: "#4ade80", border: "1px solid #1a4a28", background: "#0f1f10" };
      case "Excellent": return { color: "#a5b4fc", border: "1px solid #2e2e80", background: "#10102a" };
      default: return { color: "#555", border: "1px solid #1e1e30", background: "#161624" };
    }
  };

  const handleSelect = (r) => {
    onRate(r);
    localStorage.setItem(`prepwise_expert_rating_${questionId}`, r);
    setShowOptions(false);
  };

  return (
    <div className="tone-dropdown-container">
      <div 
        className="stat-pill" 
        style={{...getPillStyle(rating), cursor: "pointer"}}
        onClick={() => setShowOptions(!showOptions)}
      >
        {rating}
      </div>
      
      {showOptions && (
        <div className="tone-dropdown-list" style={{display: "flex", gap: "6px", padding: "8px", flexDirection: "row", top: "calc(100% + 4px)", minWidth: "100%"}}>
          {["Poor", "Average", "Good", "Excellent"].map(r => (
            <div 
              key={r}
              className="stat-pill"
              style={{...getPillStyle(r), fontSize: "11px", cursor: "pointer", padding: "3px 10px"}}
              onClick={() => handleSelect(r)}
            >
              {r}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
