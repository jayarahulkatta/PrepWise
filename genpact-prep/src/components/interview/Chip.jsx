import React from "react";
import "./Chip.css";

export default function Chip({ 
  variant = "neutral", 
  onClick, 
  children, 
  title, 
  style = {},
  disabled = false
}) {
  const className = `chip ${variant === "primary" ? "chip-primary" : variant === "stop" ? "chip-stop" : "chip-neutral"}`;
  
  return (
    <button 
      className={className} 
      onClick={onClick} 
      title={title}
      style={style}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
