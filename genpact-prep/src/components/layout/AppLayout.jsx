import { useState } from "react";
import Sidebar from "./Sidebar";

export default function AppLayout({
  children,
  navItems,
  view,
  setView,
  userRoleLabel,
  roleDetails,
  extraNavItems,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        navItems={navItems}
        view={view}
        setView={setView}
        userRoleLabel={userRoleLabel}
        roleDetails={roleDetails}
        extraNavItems={extraNavItems}
      />
      
      <main className="app-main">
        <button 
          className="mobile-menu-btn" 
          onClick={() => setSidebarOpen(true)} 
          style={{ 
            background: "var(--card)", 
            border: "1px solid var(--border)", 
            borderRadius: 10, 
            width: 40, 
            height: 40, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            cursor: "pointer", 
            fontSize: 18, 
            marginBottom: 16, 
            color: "var(--text)" 
          }}
        >
          ☰
        </button>
        {children}
      </main>
    </div>
  );
}
