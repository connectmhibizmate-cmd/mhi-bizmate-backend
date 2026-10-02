import React, { useState, useEffect } from "react";
import { subscriptionsApi } from "@/api";
import PageHeader from "@/components/PageHeader";
import { LoadingState, ErrorState } from "@/components/EmptyState";
import PlanCard from "@/components/subscription/PlanCard";
import PaymentForm from "@/components/subscription/PaymentForm";
import PaymentHistory from "@/components/subscription/PaymentHistory";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Sparkles, ShieldCheck, CheckCircle2 } from "lucide-react";

const PAYMENT_NUMBER = "01947440422";

function statusBadge(status) {
  const map = {
    TRIAL_ACTIVE: { label: "Trial Active", style: "bg-primary/15 text-primary border-primary/40" },
    FREEMIUM: { label: "Freemium", style: "bg-muted text-muted-foreground border-border" },
    STARTER: { label: "Starter Active", style: "bg-success/15 text-success border-success/40" },
    BUSINESS: { label: "Business Active", style: "bg-success/15 text-success border-success/40" },
    BUSINESS_PRO: { label: "Business Pro Active", style: "bg-success/15 text-success border-success/40" },
    PAYMENT_PENDING: { label: "Payment Pending", style: "bg-warning/15 text-warning border-warning/40" },
    EXPIRED: { label: "Expired", style: "bg-destructive/15 text-destructive border-destructive/40" }
  };
  return map[status] || { label: status || "—", style: "bg-muted text-muted-foreground border-border" };
}

function planLabel(key) {
  if (key === "TRIAL") return "Free Trial";
  if (key === "FREEMIUM") return "Freemium";
  if (!key) return "—";
  return key.charAt(0) + key.slice(1).toLowerCase();
}

export default function Subscription() {
  const [status, setStatus] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadStatus = async () => {
    setError(false);
    try {
      const data = await subscriptionsApi.status();
      setStatus(data);
      setPlans(data?.plans || []);
    } catch (e) {
      console.error(e);
      setError(true);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const recs = await subscriptionsApi.paymentVerifications("-created_date", 20);
      setHistory(recs || []);
    } catch (e) {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadHistory();
  }, []);

  const handleSubmit = async ({ plan_type, payment_amount, transaction_id }) => {
    setSubmitting(true);
    setSuccess(false);
    try {
      await subscriptionsApi.upgrade({ plan_type, payment_amount, transaction_id });
      toast({ title: "Payment submitted", description: "Verification usually takes up to 3 minutes." });
      setSuccess(true);
      setSelectedPlan(null);
      loadStatus();
      loadHistory();
    } catch (e) {
      toast({ title: "Submission failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const currentPlanKey = status?.effective_plan;
  const badge = status ? statusBadge(status.status) : null;

  return (
    <div>
      <PageHeader title="Subscription" subtitle="Plans & billing" back />
      <div className="px-4 pt-4 pb-6 space-y-5">
        {/* Current status */}
        {error ? (
          <ErrorState onRetry={loadStatus} />
        ) : !status ? (
          <LoadingState label="Loading subscription…" />
        ) : (
          <div className="rounded-2xl bg-gradient-to-br from-card to-background border border-primary/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current plan</p>
                  <p className="text-sm font-bold text-foreground">{planLabel(currentPlanKey)}</p>
                </div>
              </div>
              <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border", badge.style)}>{badge.label}</span>
            </div>
            {status.remaining_trial_days > 0 && (
              <>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {status.remaining_trial_days} trial days remaining
                </p>
                <div className="mt-2 rounded-xl bg-primary/5 border border-primary/20 px-3 py-2 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-[11px] text-foreground font-medium">
                    14 Days Free Trial • {(status.ai_quota_total || 1200).toLocaleString()} AI Actions
                  </span>
                </div>
              </>
            )}
            {status.subscription_end_at && status.status !== "PAYMENT_PENDING" && !status.remaining_trial_days && (
              <p className="text-[11px] text-muted-foreground mt-2">Active until {new Date(status.subscription_end_at).toLocaleDateString("en-GB")}</p>
            )}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="rounded-2xl bg-success/10 border border-success/40 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Payment submitted successfully</p>
              <p className="text-xs text-muted-foreground mt-0.5">Verification usually takes up to 3 minutes. We'll notify you once your plan is activated.</p>
            </div>
          </div>
        )}

        {/* Plan selection */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Step 1 — Select a plan</p>
          <div className="space-y-2.5">
            {plans.map((p) => (
              <PlanCard
                key={p.key}
                plan={p}
                selected={selectedPlan === p.key}
                current={currentPlanKey === p.key}
                onSelect={() => {
                  setSelectedPlan(selectedPlan === p.key ? null : p.key);
                  setSuccess(false);
                }}
              />
            ))}
          </div>
        </div>

        {/* Payment form */}
        {selectedPlan && (
          <PaymentForm
            plan={plans.find((p) => p.key === selectedPlan)}
            paymentNumber={PAYMENT_NUMBER}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        )}

        {/* Payment history */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Your Payments</h2>
          </div>
          <PaymentHistory records={history} loading={historyLoading} />
        </div>
      </div>
    </div>
  );
}