import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useSupabaseAuth } from "@/lib/SupabaseAuthContext";
import AppIcon from "@/components/AppIcon";
import { cn } from "@/lib/utils";
import { isSuperAdmin, PLATFORM_ROLE_LABEL } from "@/lib/roles";
import {
  LayoutDashboard, Inbox, Users, CreditCard, Bot, Network, BookOpen, Cpu,
  Facebook, Activity, ScrollText, ShieldCheck, Settings, LogOut, Menu, X, Search, Bell
} from "lucide-react";

const NAV = [
  { group: "Overview", items: [
    { to: "/admin-panel", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin-panel/inbox", label: "Inbox", icon: Inbox }
  ]},
  { group: "Business", items: [
    { to: "/admin-panel/users", label: "Users & Workspaces", icon: Users },
    { to: "/admin-panel/subscriptions", label: "Subscriptions & Billing", icon: CreditCard }
  ]},
  { group: "AI Operations", items: [
    { to: "/admin-panel/ai-employees", label: "AI Employees", icon: Bot },
    { to: "/admin-panel/ai-gateway", label: "AI Gateway", icon: Network },
    { to: "/admin-panel/knowledge", label: "Knowledge & Context", icon: BookOpen },
    { to: "/admin-panel/automations", label: "Automations", icon: Cpu }
  ]},
  { group: "Integrations", items: [
    { to: "/admin-panel/meta", label: "Meta Integrations", icon: Facebook }
  ]},
  { group: "System", items: [
    { to: "/admin-panel/system-health", label: "System Health", icon: Activity },
    { to: "/admin-panel/audit-logs", label: "Audit Logs", icon: ScrollText }
  ]},
  { group: "Administration", items: [
    { to: "/admin-panel/team", label: "Admin Team", icon: ShieldCheck, superAdminOnly: true },
    { to: "/admin-panel/settings", label: "Settings", icon: Settings, superAdminOnly: true }
  ]}
];

export default function AdminLayout() {
  const { user, logout } = useSupabaseAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const Sidebar = (
    <aside className="w-64 shrink-0 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-sidebar-border">
        <AppIcon size="sm" glow />
        <div className="leading-tight">
          <p className="text-sm font-bold text-foreground">MHI BizMate</p>
          <p className="text-[10px] text-primary font-medium tracking-wide uppercase">{PLATFORM_ROLE_LABEL[user?.platformRole] || "Admin"}</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-5">
        {NAV.filter((sec) => sec.items.some((it) => !it.superAdminOnly || isSuperAdmin(user?.platformRole))).map((sec) => (
          <div key={sec.group}>
            <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">{sec.group}</p>
            <div className="space-y-0.5">
              {sec.items.filter((it) => !it.superAdminOnly || isSuperAdmin(user?.platformRole)).map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors",
                    isActive ? "bg-sidebar-primary/15 text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                  )}
                >
                  <it.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{it.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
            {(user?.full_name || user?.email || "A").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{user?.full_name || "Admin"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button onClick={() => { logout(false); navigate("/login"); }} className="text-muted-foreground hover:text-destructive transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">{Sidebar}</div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10">{Sidebar}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 shrink-0 border-b border-border bg-background/80 backdrop-blur-md flex items-center gap-3 px-4 lg:px-6">
          <button className="lg:hidden text-muted-foreground" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden sm:block flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Search users, workspaces, logs…"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex-1 sm:hidden" />
          <button className="relative w-9 h-9 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors flex items-center justify-center">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
          </button>
          <Link to="/admin-panel/settings" className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
            {(user?.full_name || user?.email || "A").charAt(0).toUpperCase()}
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}