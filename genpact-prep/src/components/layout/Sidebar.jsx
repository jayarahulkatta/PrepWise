import { useAuth } from "../../AuthContext";

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  navItems,
  view,
  setView,
  userRoleLabel,
  roleDetails, // e.g., { level: { label, color }, score: 0 } or { description: "Interview Prep" }
  extraNavItems, // React node for extra items like Mock Interview, AI Chat
}) {
  const { user, signOut } = useAuth();

  return (
    <>
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 899 }} 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, paddingLeft: 4 }}>
          <div style={{ width: 28, height: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, transform: "rotate(45deg)" }}>
            {["#ef4444", "#2563eb", "#2563eb", "#ef4444"].map((c, i) => (
              <span key={i} style={{ borderRadius: 3, background: c }} />
            ))}
          </div>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Prep<span style={{ color: "var(--red)" }}>Wise</span></span>
        </div>
        
        {userRoleLabel && (
          <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, padding: "0 4px", marginBottom: 16, fontFamily: "var(--mono)" }}>
            {userRoleLabel}
          </div>
        )}

        {/* Dynamic Navigation Items */}
        {navItems.map(n => (
          <button 
            key={n.key} 
            className={`nav-link ${view === n.key ? "active" : ""}`} 
            onClick={() => { setView(n.key); setSidebarOpen(false); }}
          >
            <span className="nav-icon">{n.icon}</span>{n.label}
          </button>
        ))}

        {/* Extra Navigation Items (e.g. Modals) */}
        {extraNavItems && (
          <div style={{ borderTop: "1px solid var(--border)", margin: "12px 0", paddingTop: 12 }}>
            {extraNavItems}
          </div>
        )}

        {/* User Profile Area */}
        <div style={{ marginTop: "auto", padding: "16px 4px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,var(--blue-bright),var(--blue))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, overflow: "hidden" }}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                (user?.displayName?.[0] || "U")
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.displayName || "User"}
              </div>
              {roleDetails?.level ? (
                 <div style={{ fontSize: 10, color: roleDetails.level.color, fontWeight: 600 }}>{roleDetails.level.label}</div>
              ) : (
                 <div style={{ fontSize: 10, color: "var(--muted)" }}>{roleDetails?.description || "Interview Prep"}</div>
              )}
            </div>
          </div>
          <button 
            onClick={signOut} 
            style={{ width: "100%", background: "none", border: "1px solid var(--border)", color: "var(--red)", padding: "7px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500 }}
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
