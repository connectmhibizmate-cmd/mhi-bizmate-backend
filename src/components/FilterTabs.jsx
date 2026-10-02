import React from "react";
import { cn } from "@/lib/utils";

export default function FilterTabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto no-scrollbar", className)}>
      {tabs.map((t) => {
        const v = typeof t === "string" ? t : t.value;
        const label = typeof t === "string" ? t : t.label;
        const active = v === value;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all",
              active
                ? "bg-primary text-primary-foreground border-primary glow-cyan-soft"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}