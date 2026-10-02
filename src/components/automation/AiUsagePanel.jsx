import React, { useState, useEffect } from "react";
import { automationApi } from "@/api";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

const PLAN_BADGES = { TRIAL: "Free Trial", FREEMIUM: "Freemium", STARTER: "Starter", BUSINESS: "Business", BUSINESS_PRO: "Business Pro" };

// Server-verified AI usage for the current subscription period. Quota is
// total for the entire period — this panel only displays what the backend reports.
export default function AiUsagePanel() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    automationApi
      .usage({ action: "report" })
      .then((d) => setData(d))
      .catch(() => setFailed(true));
  }, []);

  if (failed || !data || !Array.isArray(data.items)) return null;

  const planTotal = data.plan_ai_total;
  const totalUsed = data.total_used || 0;
  const totalAllocated = data.total_allocated || 0;
  const isTrial = data.plan === "TRIAL";
  const remaining = planTotal ? Math.max(0, planTotal - totalUsed) : 0;

  return (
    <div className="rounded-2xl bg-card border border-border p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">AI Actions</p>
            <p className="text-[11px] text-muted-foreground">{isTrial ? "Total for your free trial" : "Total quota for your subscription period"}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/40 shrink-0">
          {PLAN_BADGES[data.plan] || data.plan}
        </span>
      </div>

      {planTotal !== null && planTotal > 0 && (
        <div className="mb-3 rounded-xl bg-primary/5 border border-primary/20 px-3 py-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Total</span>
            <span className="text-foreground font-semibold">{planTotal.toLocaleString()} AI Actions</span>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-1">
            <span className="text-muted-foreground">Used</span>
            <span className="text-foreground font-semibold">{totalUsed.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-1">
            <span className="text-muted-foreground">Remaining</span>
            <span className={cn("font-semibold", remaining === 0 ? "text-warning" : "text-primary")}>{remaining.toLocaleString()}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
            <div className={cn("h-full rounded-full", remaining === 0 ? "bg-warning" : "bg-primary")} style={{ width: `${Math.min(100, Math.round((totalUsed / planTotal) * 100))}%` }} />
          </div>
          {!isTrial && totalAllocated < planTotal && (
            <p className="text-[10px] text-muted-foreground mt-1">{(planTotal - totalAllocated).toLocaleString()} AI Actions not yet allocated</p>
          )}
          {isTrial && remaining === 0 && (
            <p className="text-[10px] text-warning mt-1">Trial AI Actions exhausted — upgrade to a paid plan to continue.</p>
          )}
        </div>
      )}

      <div className="space-y-2.5">
        {data.items.map((u) => {
          if (isTrial) {
            return (
              <div key={u.key}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-foreground truncate">{u.label}</span>
                  <span className="text-muted-foreground font-medium shrink-0 ml-2">{u.usage_count || 0} used</span>
                </div>
              </div>
            );
          }
          const unlimited = u.usage_limit === null || u.usage_limit === undefined;
          const reached = !unlimited && u.usage_limit > 0 && u.usage_count >= u.usage_limit;
          const pct = unlimited ? 100 : Math.min(100, Math.round((u.usage_count / Math.max(1, u.usage_limit)) * 100));
          return (
            <div key={u.key}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-foreground truncate">{u.label}</span>
                <span className={cn("font-medium shrink-0 ml-2", reached ? "text-warning" : "text-muted-foreground")}>
                  {unlimited ? "Unlimited" : u.usage_limit === 0 ? "Not allocated" : `${u.usage_count}/${u.usage_limit}`}
                </span>
              </div>
              {!unlimited && u.usage_limit > 0 && (
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full", reached ? "bg-warning" : "bg-primary")} style={{ width: `${pct}%` }} />
                </div>
              )}
              {reached && <p className="text-[10px] text-warning mt-1">Allocated limit reached</p>}
            </div>
          );
        })}
      </div>
      {data.plan === "FREEMIUM" && (
        <p className="text-[11px] text-muted-foreground mt-3">AI automations are available on paid plans. Upgrade to get started.</p>
      )}
    </div>
  );
}