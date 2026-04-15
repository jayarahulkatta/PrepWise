import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

const tones = ["Humble", "Confident", "Story-driven", "Concise", "Technical"];

const ToneChip = ({ selectedTone, onToneChange }) => {
  const [toneOpen, setToneOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const chipRef = useRef(null);

  const handleChipClick = () => {
    if (!toneOpen) {
      const rect = chipRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: rect.left,
        zIndex: 99999,
        background: '#1a1a2e',
        border: '1px solid #2e2e44',
        borderRadius: '12px',
        minWidth: '160px',
        padding: '6px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      });
    }
    setToneOpen((prev) => !prev);
  };

  const handleToneSelect = (tone) => {
    onToneChange(tone);
    setToneOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (chipRef.current && !chipRef.current.contains(e.target)) {
        const dropdown = document.getElementById('tone-portal-dropdown');
        if (dropdown && dropdown.contains(e.target)) return;
        setToneOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (toneOpen && chipRef.current) {
        const rect = chipRef.current.getBoundingClientRect();
        setDropdownStyle((prev) => ({
          ...prev,
          top: rect.bottom + 6,
          left: rect.left,
        }));
      }
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [toneOpen]);

  const dropdown = toneOpen
    ? ReactDOM.createPortal(
        <div id="tone-portal-dropdown" style={dropdownStyle}>
          {tones.map((tone) => (
            <div
              key={tone}
              onMouseDown={(e) => {
                e.preventDefault();
                handleToneSelect(tone);
              }}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                color: selectedTone === tone ? '#a5b4fc' : '#aaa',
                background: selectedTone === tone ? '#1e1e40' : 'transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#25253a';
                e.currentTarget.style.color = '#d4d4ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  selectedTone === tone ? '#1e1e40' : 'transparent';
                e.currentTarget.style.color =
                  selectedTone === tone ? '#a5b4fc' : '#aaa';
              }}
            >
              {tone}
            </div>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={chipRef}
        className="chip chip-neutral"
        onClick={handleChipClick}
        style={{ position: 'relative' }}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"
             strokeWidth="1.5" width="13" height="13">
          <circle cx="8" cy="8" r="6"/>
          <path d="M6 7c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2M8 11v.5"/>
        </svg>
        {selectedTone}
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"
             strokeWidth="1.5" width="12" height="12">
          <path d="M4 6l4 4 4-4"/>
        </svg>
      </button>
      {dropdown}
    </>
  );
};

export default ToneChip;
