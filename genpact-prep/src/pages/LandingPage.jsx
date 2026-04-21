import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ParticleCanvas from "../components/ParticleCanvas";

/**
 * LandingPage — Pre-auth hero page for PrepWise.
 *
 * Props:
 *   onNavigate(destination) — called when user clicks a CTA.
 *     destination: "login" | "signup" | "domain_expert"
 */

// ─── Framer Motion Variants ──────────────────────────────────────────────────
const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.2 + 0.5, duration: 0.8, ease: "easeInOut" },
  }),
};

// ─── Sparkle SVG Icon (inline, stroke-based) ─────────────────────────────────
function SparkleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(191, 128, 255, 1)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
    </svg>
  );
}

export default function LandingPage({ onNavigate }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden", background: "#000" }}>
      {/* ─── Particle Canvas Background ─────────────────────────────────────── */}
      <ParticleCanvas />

      {/* ─── Navbar ─────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "16px 20px" : "16px 32px",
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-1px",
            fontFamily: "'Inter', -apple-system, sans-serif",
            cursor: "default",
          }}
        >
          Prep<span style={{ color: "#ef4444" }}>Wise</span>
        </div>

        {/* Nav Links */}
        <div style={{ display: "flex", gap: 10 }}>
          <NavPill label="Log In" onClick={() => onNavigate("login")} />
          <NavPill label="Sign Up" onClick={() => onNavigate("signup")} />
        </div>
      </nav>

      {/* ─── Hero Content ───────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: isMobile ? "100px 20px 60px" : "120px 32px 80px",
          textAlign: "center",
        }}
      >
        {/* Badge Pill */}
        <motion.div
          custom={0}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 18px",
            borderRadius: 999,
            border: "1px solid rgba(191, 128, 255, 0.25)",
            background: "rgba(191, 128, 255, 0.08)",
            marginBottom: 32,
          }}
        >
          <SparkleIcon />
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(191, 128, 255, 1)",
              letterSpacing: "0.2px",
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
          >
            AI-Powered Interview Prep
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          custom={1}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          style={{
            fontSize: isMobile ? "2.8rem" : "4.5rem",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            margin: "0 0 24px 0",
            fontFamily: "'Inter', -apple-system, sans-serif",
            background: "linear-gradient(to top, #9ca3af, #ffffff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Ace Your Next
          <br />
          Interview
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          custom={2}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          style={{
            fontSize: isMobile ? 15 : 17,
            lineHeight: 1.7,
            color: "#9ca3af",
            maxWidth: 560,
            margin: "0 auto 40px",
            fontFamily: "'Inter', -apple-system, sans-serif",
          }}
        >
          Practice with AI, get real-time feedback, and walk into your
          <br style={{ display: isMobile ? "none" : "block" }} />
          Genpact interview with complete confidence.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          custom={3}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: 14,
            marginBottom: 48,
            width: isMobile ? "100%" : "auto",
          }}
        >
          {/* Primary — Start Practicing */}
          <CTAButton
            label="Start Practicing  →"
            variant="primary"
            onClick={() => onNavigate("signup")}
            isMobile={isMobile}
          />
          {/* Secondary — Domain Expert Login */}
          <CTAButton
            label="Domain Expert Login"
            variant="secondary"
            onClick={() => onNavigate("domain_expert")}
            isMobile={isMobile}
          />
        </motion.div>

        {/* Stat Bar */}
        <motion.div
          custom={4}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 16 : 24,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <StatItem label="500+ Questions" />
          <StatDivider />
          <StatItem label="5 Tone Modes" />
          <StatDivider />
          <StatItem label="AI Feedback" />
        </motion.div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function NavPill({ label, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "transparent",
        border: hovered ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent",
        borderRadius: 999,
        padding: "8px 20px",
        color: "#fff",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "'Inter', -apple-system, sans-serif",
        transition: "all 0.3s ease",
        letterSpacing: "-0.1px",
      }}
    >
      {label}
    </button>
  );
}

function CTAButton({ label, variant, onClick, isMobile }) {
  const [hovered, setHovered] = useState(false);

  const isPrimary = variant === "primary";

  const baseStyle = {
    padding: "14px 32px",
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', -apple-system, sans-serif",
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    letterSpacing: "-0.2px",
    width: isMobile ? "100%" : "auto",
    textAlign: "center",
  };

  const primaryStyle = {
    ...baseStyle,
    background: hovered ? "#e5e5e5" : "#ffffff",
    color: "#000",
    border: "1px solid #ffffff",
    transform: hovered ? "translateY(-2px)" : "translateY(0)",
    boxShadow: hovered
      ? "0 8px 30px rgba(255,255,255,0.15)"
      : "0 4px 20px rgba(255,255,255,0.08)",
  };

  const secondaryStyle = {
    ...baseStyle,
    background: hovered ? "rgba(255,255,255,0.05)" : "transparent",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.3)",
    transform: hovered ? "translateY(-2px)" : "translateY(0)",
    boxShadow: hovered ? "0 8px 30px rgba(255,255,255,0.05)" : "none",
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={isPrimary ? primaryStyle : secondaryStyle}
    >
      {label}
    </button>
  );
}

function StatItem({ label }) {
  return (
    <span
      style={{
        fontSize: 13,
        color: "#6b7280",
        fontFamily: "'Inter', -apple-system, sans-serif",
        fontWeight: 500,
        letterSpacing: "-0.1px",
      }}
    >
      {label}
    </span>
  );
}

function StatDivider() {
  return (
    <span
      style={{
        width: 1,
        height: 16,
        background: "rgba(107, 114, 128, 0.4)",
        display: "inline-block",
      }}
    />
  );
}
