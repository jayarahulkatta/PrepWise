import React, { useState } from "react";

const getBadgeStyle = (rating) => {
  const base = {
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-block",
    userSelect: "none",
    transition: "all 0.2s"
  };
  
  if (rating === "Poor") return { ...base, background: "rgba(239,68,68,0.15)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.3)" };
  if (rating === "Average") return { ...base, background: "rgba(245,158,11,0.15)", color: "var(--yellow)", border: "1px solid rgba(245,158,11,0.3)" };
  if (rating === "Good") return { ...base, background: "rgba(16,185,129,0.15)", color: "var(--green)", border: "1px solid rgba(16,185,129,0.3)" };
  if (rating === "Excellent") return { ...base, background: "rgba(59,130,246,0.15)", color: "var(--blue)", border: "1px solid rgba(59,130,246,0.3)" };
  
  return { ...base, background: "var(--card-highest)", color: "var(--muted)", border: "1px solid var(--border)" };
};

export default function RatingBadge({ rating, onRate, questionId }) {
  const [showOptions, setShowOptions] = useState(false);

  const handleSelect = (r) => {
    onRate(r);
    localStorage.setItem(`prepwise_expert_rating_${questionId}`, r);
    setShowOptions(false);
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div 
        style={getBadgeStyle(rating)} 
        onClick={() => setShowOptions(!showOptions)}
      >
        🎯 {rating === 'Unrated' ? 'Unrated' : rating}
      </div>
      
      {showOptions && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          marginTop: 8,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 8,
          display: "flex",
          gap: 8,
          zIndex: 10,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          whiteSpace: "nowrap"
        }}>
          {["Poor", "Average", "Good", "Excellent"].map(r => (
            <div 
              key={r}
              style={{...getBadgeStyle(r), fontSize: 11, padding: "4px 10px"}}
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
