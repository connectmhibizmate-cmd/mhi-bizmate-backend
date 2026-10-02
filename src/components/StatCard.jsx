import React from "react";
import { cn } from "@/lib/utils";

export default function StatCard({ label, value, icon: Icon, trend, accent = "primary" }) {
  const accentMap = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    accent: "text-accent",
  };
  return (
    <div className="rounded-2xl bg-card border border-border p-3.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
        {Icon && <Icon className={cn("w-4 h-4", accentMap[accent])} />}
      </div>
      <div className={cn("text-xl font-bold", accentMap[accent])}>{value}</div>
      {trend !== undefined && trend !== null && (
        <div className="text-[11px] font-medium flex items-center gap-1">
          <span className={trend >= 0 ? "text-success" : "text-destructive"}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
          <span className="text-muted-foreground">vs last</span>
        </div>
      )}
    </div>
  );
}