import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const BADGE_TONES = {
  success: "bg-success/15 text-success border-success/30",
  primary: "bg-primary/10 text-primary border-primary/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  muted: "bg-muted text-muted-foreground border-border",
};

export default function MoreMenuItem({ icon: Icon, label, description, to, onClick, danger, badge }) {
  const navigate = useNavigate();
  const handle = () => {
    if (onClick) onClick();
    else if (to) navigate(to);
  };
  return (
    <button
      onClick={handle}
      className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors text-left"
    >
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-xl border shrink-0",
          danger ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-primary/10 border-primary/30 text-primary"
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium", danger ? "text-destructive" : "text-foreground")}>{label}</div>
        {description && <div className="text-xs text-muted-foreground truncate">{description}</div>}
      </div>
      {badge && (
        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0", BADGE_TONES[badge.tone] || BADGE_TONES.muted)}>
          {badge.text}
        </span>
      )}
      <ChevronRight className={cn("w-4 h-4 shrink-0", danger ? "text-destructive/60" : "text-muted-foreground")} />
    </button>
  );
}