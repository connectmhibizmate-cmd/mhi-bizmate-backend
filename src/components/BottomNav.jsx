import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, Package, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/products", label: "Products", icon: Package },
  { to: "/more", label: "More", icon: LayoutGrid },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border safe-bottom">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-xl transition-all",
                  active && "bg-primary/15 glow-cyan-soft"
                )}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className={cn("text-[10px] font-medium", active && "text-glow")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}