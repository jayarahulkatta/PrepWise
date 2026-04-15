import React, { useState, useRef, useEffect } from "react";
import "./Chip.css";

const tones = ["Humble", "Confident", "Story-driven", "Concise", "Technical"];

export default function ToneChip({ selectedTone, onToneChange }) {
  const [toneOpen, setToneOpen] = useState(false);
  const toneRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toneRef.current && !toneRef.current.contains(e.target)) {
        setToneOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToneSelect = (tone) => {
    onToneChange(tone);
    setToneOpen(false);
  };

  return (
    <div className="tone-dropdown-container" ref={toneRef} style={{ position: "relative", overflow: "visible", zIndex: toneOpen ? 9999 : "auto", display: "inline-block" }}>
      <button 
        className={`chip chip-neutral ${toneOpen ? "chip-active" : ""}`}
        onClick={() => setToneOpen(!toneOpen)}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13">
          <circle cx="8" cy="8" r="6"/>
          <path d="M6 7c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2M8 11v.5"/>
        </svg>
        {selectedTone}
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
          <path d="M4 6l4 4 4-4"/>
        </svg>
      </button>

      {toneOpen && (
        <div className="tone-dropdown">
          {tones.map((tone) => (
            <div
              key={tone}
              className={`tone-option ${selectedTone === tone ? "tone-option-active" : ""}`}
              onClick={() => handleToneSelect(tone)}
            >
              {tone}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
