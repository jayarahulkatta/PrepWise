import React from "react";
import { TONES } from "../../utils/constants";

const filterSS = {
  background: "var(--card-highest)", border: "1px solid transparent",
  color: "var(--text)", padding: "7px 30px 7px 10px", borderRadius: 12,
  fontSize: 12, fontFamily: "var(--font)", cursor: "pointer",
  outline: "none", appearance: "none", transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
  width: "auto"
};

export default function ToneSelector({ selectedTone, onToneChange }) {
  return (
    <select 
      value={selectedTone} 
      onChange={e => onToneChange(e.target.value)} 
      style={filterSS}
    >
      {Object.entries(TONES).map(([k, v]) => (
        <option key={k} value={k}>{v}</option>
      ))}
    </select>
  );
}
