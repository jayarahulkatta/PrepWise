import React, { useState, useRef, useEffect } from "react";
import "./Chip.css";

const tones = ["Humble", "Confident", "Story-driven", "Concise", "Technical"];

export default function ToneChip({ selectedTone, onToneChange }) {
  const [toneOpen, setToneOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setToneOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Use the exact case requested, fallback to "Humble" if undefined
  const currentToneToDisplay = tones.find(t => t.toLowerCase() === selectedTone?.toLowerCase()) || "Humble";

  return (
    <div className="tone-dropdown-container" ref={dropdownRef}>
      <button 
        className="chip chip-neutral" 
        onClick={() => setToneOpen(!toneOpen)}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13">
          <circle cx="8" cy="8" r="6"/>
          <path d="M6 7c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2M8 11v.5"/>
        </svg>
        {currentToneToDisplay}
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
          <path d="M4 6l4 4 4-4"/>
        </svg>
      </button>

      {toneOpen && (
        <div className="tone-dropdown-list">
          {tones.map(t => {
            const isSelected = t.toLowerCase() === selectedTone?.toLowerCase();
            return (
              <div 
                key={t}
                className={`tone-dropdown-item ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onToneChange(t.toLowerCase()); // Passing down lowercase as existing backend setup expects
                  setToneOpen(false);
                }}
              >
                {t}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
