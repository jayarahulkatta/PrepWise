import React from "react";
import "./Chip.css";

export default function Chip({ 
  variant = 'neutral', 
  iconOnly = false, 
  title, 
  onClick, 
  disabled = false,
  children,
  style = {},
  className = ""
}) {
  const baseClass = variant === 'primary' ? 'chip-primary' : 'chip-neutral';
  const customPadding = iconOnly ? { padding: '7px 10px' } : {};
  
  return (
    <button 
      className={`chip ${baseClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ ...customPadding, opacity: disabled ? 0.7 : 1, cursor: disabled ? "not-allowed" : "pointer", ...style }}
    >
      {children}
    </button>
  );
}
