import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Smartphone } from "lucide-react";
import { formatMoney } from "@/lib/biz";

export default function PaymentForm({ plan, paymentNumber, submitting, onSubmit }) {
  const [amount, setAmount] = useState("");
  const [txnId, setTxnId] = useState("");
  const [copied, setCopied] = useState(false);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(paymentNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };

  const submit = (e) => {
    e.preventDefault();
    onSubmit({ plan_type: plan.key, payment_amount: Number(amount), transaction_id: txnId.trim() });
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <p className="text-xs font-medium text-muted-foreground mb-1">Step 2 — Pay & confirm</p>
      <p className="text-sm text-foreground mb-3">
        Send <span className="font-bold">{formatMoney(plan.price)}</span> to this number via bKash / Nagad / Rocket.
      </p>

      <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/30 px-3.5 py-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground">Payment number</p>
            <p className="text-base font-bold text-foreground tracking-wide">{paymentNumber}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={copyNumber}
          className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">Paid Amount (৳)</label>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 1499"
            required
            min="1"
            className="w-full h-11 rounded-xl bg-background border border-border px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">Transaction ID</label>
          <input
            type="text"
            value={txnId}
            onChange={(e) => setTxnId(e.target.value)}
            placeholder="e.g. 9XK4F2LQ7"
            required
            maxLength={100}
            autoCapitalize="characters"
            className="w-full h-11 rounded-xl bg-background border border-border px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <Button type="submit" disabled={submitting} className="w-full h-11 glow-cyan-soft">
          {submitting ? "Submitting…" : "Submit Payment"}
        </Button>
      </form>
    </div>
  );
}