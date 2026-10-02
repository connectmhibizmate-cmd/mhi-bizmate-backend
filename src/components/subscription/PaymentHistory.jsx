import React from "react";
import { cn } from "@/lib/utils";
import { formatMoney, timeAgo } from "@/lib/biz";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

const STATUS = {
  PENDING: { label: "Pending", style: "bg-warning/15 text-warning border-warning/40", icon: Clock },
  APPROVED: { label: "Verified", style: "bg-success/15 text-success border-success/40", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", style: "bg-destructive/15 text-destructive border-destructive/40", icon: XCircle }
};

export default function PaymentHistory({ records, loading }) {
  if (loading) return <p className="text-xs text-muted-foreground text-center py-4">Loading history…</p>;
  if (!records || records.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">No payments yet.</p>;
  }
  return (
    <div className="space-y-2">
      {records.map((r) => {
        const s = STATUS[r.status] || STATUS.PENDING;
        const Icon = s.icon;
        return (
          <div key={r.id} className="rounded-xl bg-card border border-border p-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">{r.plan_type}</span>
                <span className="text-xs text-muted-foreground">• {formatMoney(r.amount)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">Txn: {r.transaction_id} • {timeAgo(r.created_date)}</p>
            </div>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0", s.style)}>
              <Icon className="w-3 h-3" /> {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}