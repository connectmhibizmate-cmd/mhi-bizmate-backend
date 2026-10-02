import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { subscriptionsApi } from "@/api";
import { Sparkles, ShieldCheck, AlertCircle, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_BADGE = {
  TRIAL_ACTIVE: { label: "Trial Active", style: "bg-primary/15 text-primary border-primary/40" },
  FREEMIUM: { label: "Freemium", style: "bg-muted text-muted-foreground border-border" },
  STARTER: { label: "Starter Active", style: "bg-success/15 text-success border-success/40" },
  BUSINESS: { label: "Business Active", style: "bg-success/15 text-success border-success/40" },
  BUSINESS_PRO: { label: "Business Pro Active", style: "bg-success/15 text-success border-success/40" },
  PAYMENT_PENDING: { label: "Payment Pending", style: "bg-warning/15 text-warning border-warning/40" },
  EXPIRED: { label: "Expired", style: "bg-destructive/15 text-destructive border-destructive/40" },
};

const VERIFY_BADGE = {
  VERIFIED: { label: "Verified", style: "bg-success/15 text-success border-success/40", icon: ShieldCheck },
  PENDING: { label: "Pending Verification", style: "bg-warning/15 text-warning border-warning/40", icon: Clock },
  REJECTED: { label: "Rejected", style: "bg-destructive/15 text-destructive border-destructive/40", icon: AlertCircle },
  NONE: { label: "No Payment", style: "bg-muted text-muted-foreground border-border", icon: AlertCircle },
};

function planLabel(key) {
  if (key === "TRIAL") return "Free Trial";
  if (key === "FREEMIUM") return "Freemium";
  if (!key) return "—";
  return key.charAt(0) + key.slice(1).toLowerCase();
}

export default function SubscriptionManageCard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    subscriptionsApi.status().then(setStatus).catch(() => {});
  }, []);

  if (!status) return null;

  const badge = STATUS_BADGE[status.status] || { label: status.status || "—", style: "bg-muted text-muted-foreground border-border" };
  const verify = VERIFY_BADGE[status.payment_status] || VERIFY_BADGE.NONE;
  const VerifyIcon = verify.icon;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-card to-background border border-primary/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Current Plan</p>
            <p className="text-sm font-bold text-foreground">{planLabel(status.effective_plan)}</p>
          </div>
        </div>
        <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border", badge.style)}>{badge.label}</span>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-background/40 border border-border px-3 py-2.5 mb-3">
        <VerifyIcon className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-foreground font-medium">Payment:</span>
        <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border", verify.style)}>{verify.label}</span>
      </div>

      {status.remaining_trial_days > 0 && (
        <p className="text-[11px] text-muted-foreground mb-3">{status.remaining_trial_days} trial days remaining · {(status.ai_quota_total || 0).toLocaleString()} AI actions</p>
      )}
      {status.subscription_end_at && status.status !== "PAYMENT_PENDING" && !status.remaining_trial_days && (
        <p className="text-[11px] text-muted-foreground mb-3">Active until {new Date(status.subscription_end_at).toLocaleDateString("en-GB")}</p>
      )}

      <button
        onClick={() => navigate("/subscription")}
        className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-1.5 glow-cyan-soft"
      >
        Verify & Manage Subscription <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}