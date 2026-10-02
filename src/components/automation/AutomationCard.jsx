import React from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function AutomationCard({
  icon: Icon,
  label,
  description,
  enabled,
  requiresFacebook,
  facebookConnected,
  onToggle,
  loading,
  usageCount = 0,
  quotaValue,
  onQuotaChange,
  showQuota = false
}) {
  const disabled = requiresFacebook && !facebookConnected;

  return (
    <div
      className={cn(
        "rounded-2xl bg-card border p-4 transition-colors",
        enabled && !disabled ? "border-primary/40 glow-cyan-soft" : "border-border"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            enabled && !disabled ? "bg-primary/15" : "bg-muted/50"
          )}
        >
          <Icon className={cn("w-5 h-5", enabled && !disabled ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">{label}</h3>
            <Switch
              checked={!!enabled && !disabled}
              disabled={disabled || loading}
              onCheckedChange={onToggle}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          {disabled && (
            <p className="text-[11px] text-warning mt-1.5">Requires Facebook Page connection</p>
          )}
          {enabled && !disabled && (
            <p className="text-[11px] text-success mt-1.5">● Active</p>
          )}
        </div>
      </div>
      {showQuota && !disabled && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-foreground">AI Action Quota</p>
              <p className="text-[10px] text-muted-foreground">{usageCount.toLocaleString()} used</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                value={quotaValue || ""}
                onChange={(e) => onQuotaChange(Number(e.target.value) || 0)}
                className="w-24 h-8 bg-background border-border text-sm text-right"
                placeholder="0"
              />
              <span className="text-[10px] text-muted-foreground shrink-0">actions</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}