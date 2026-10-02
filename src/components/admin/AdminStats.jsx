import React from "react";
import { Users, Facebook, MessageSquare, Crown } from "lucide-react";

const CARDS = [
  { key: "total_users", label: "Total Users", icon: Users, tint: "bg-primary/15 text-primary" },
  { key: "total_connected_pages", label: "Connected Pages", icon: Facebook, tint: "bg-secondary/15 text-secondary" },
  { key: "total_messages_today", label: "Messages Today", icon: MessageSquare, tint: "bg-chart-3/15 text-chart-3" },
  { key: "pro_users", label: "Pro Users", icon: Crown, tint: "bg-warning/15 text-warning" }
];

export default function AdminStats({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {CARDS.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.key} className="rounded-2xl bg-card border border-border p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${c.tint}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-foreground">{stats?.[c.key] ?? 0}</div>
            <div className="text-[11px] text-muted-foreground">{c.label}</div>
          </div>
        );
      })}
    </div>
  );
}