import React from "react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/biz";

function durationLabel(days) {
  if (days === 45) return "45 Days";
  if (days === 180) return "6 Months";
  if (days === 365) return "12 Months";
  return `${days} Days`;
}

export default function PlanCard({ plan, selected, current, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-2xl border p-4 transition-all",
        selected ? "border-primary bg-primary/5 glow-cyan-soft" : "border-border bg-card hover:border-primary/40"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-bold text-foreground">{plan.label}</h3>
            {current && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-success/15 text-success border border-success/40">CURRENT</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatMoney(plan.price)} • {durationLabel(plan.duration_days)}
          </p>
        </div>
        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", selected ? "border-primary bg-primary" : "border-border")}>
          {selected && <Check className="w-3 h-3 text-primary-foreground" />}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] text-muted-foreground">
          {(plan.ai_total || 0).toLocaleString()} total AI actions
        </span>
      </div>
    </button>
  );
}