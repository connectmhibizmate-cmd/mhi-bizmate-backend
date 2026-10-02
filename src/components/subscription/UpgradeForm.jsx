import React, { useState } from "react";
import { subscriptionsApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { formatMoney } from "@/lib/biz";
import { cn } from "@/lib/utils";
import { Loader2, Phone, Send } from "lucide-react";

const METHODS = ["bKash", "Nagad", "Rocket", "Bank Transfer"];

const PLAN_OPTIONS = [
  { key: "PREMIUM", label: "Premium", price: 1499, desc: "Up to 4,500 AI actions/month" },
  { key: "BUSINESS", label: "Business", price: 2499, desc: "Up to 13,500 AI actions/month" },
  { key: "CUSTOM", label: "Custom", price: null, desc: "Custom pricing & custom AI limits" }
];

export default function UpgradeForm({ subscription, onSubmitted }) {
  const paid = ["PREMIUM", "BUSINESS", "CUSTOM"].includes(subscription.effective_plan);
  const [plan, setPlan] = useState("PREMIUM");
  const [method, setMethod] = useState(METHODS[0]);
  const [reference, setReference] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = PLAN_OPTIONS.find((p) => p.key === plan);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reference.trim()) {
      toast({ title: "Reference required", description: "Enter the transaction ID / reference from your payment.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await subscriptionsApi.upgrade({
        plan_type: plan,
        payment_method: method,
        payment_reference: reference,
        payment_amount: plan === "CUSTOM" ? Number(customAmount) || 0 : selected.price,
      });
      toast({
        title: plan === "CUSTOM" ? "Custom plan requested" : "Payment submitted",
        description:
          plan === "CUSTOM"
            ? "An admin will contact you to confirm pricing and activate your Custom plan."
            : "Your plan will be activated after an admin verifies the payment.",
      });
      setReference("");
      setCustomAmount("");
      onSubmitted?.();
    } catch (err) {
      const message = err?.response?.data?.error || err?.data?.error || err?.message || "Submission failed — try again.";
      toast({ title: "Submission failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-card border border-border p-4 space-y-3.5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{paid ? "Change Plan" : "Upgrade"}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Choose a plan — the price is fixed per plan and set on the server.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PLAN_OPTIONS.map((p) => (
          <button
            type="button"
            key={p.key}
            onClick={() => setPlan(p.key)}
            className={cn(
              "rounded-xl border p-2.5 text-left transition-colors",
              plan === p.key ? "bg-primary/10 border-primary/50" : "bg-background border-border"
            )}
          >
            <div className="text-xs font-semibold text-foreground">{p.label}</div>
            <div className="text-[11px] text-primary font-bold mt-0.5">
              {p.price === null ? "Custom" : `${formatMoney(p.price)}/mo`}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs bg-background border border-border rounded-xl px-3 py-2.5">
        <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-muted-foreground">Send payment to</span>
        <a href="tel:01947440422" className="text-primary font-semibold">{subscription.payment_number || "01947440422"}</a>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Payment Method</Label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/60">
            {METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          {plan === "CUSTOM" ? (
            <>
              <Label>Agreed Amount (৳, optional)</Label>
              <Input type="number" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} className="bg-background border-border" placeholder="0" />
            </>
          ) : (
            <>
              <Label>Plan Price (৳)</Label>
              <div className="h-10 px-3 rounded-lg bg-muted/40 border border-border text-sm font-semibold text-foreground flex items-center">
                {formatMoney(selected.price)}/month
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Payment Reference / Transaction ID *</Label>
        <Input value={reference} onChange={(e) => setReference(e.target.value)} className="bg-background border-border" placeholder="e.g. TrxID from the payment" />
      </div>

      <Button type="submit" disabled={submitting} className="w-full h-11 font-semibold glow-cyan-soft">
        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
        {plan === "CUSTOM" ? "Request Custom Plan" : `Submit ${selected.label} Payment`}
      </Button>
      <p className="text-[11px] text-muted-foreground">Your plan activates only after an admin verifies your payment — not on submit.</p>
    </form>
  );
}