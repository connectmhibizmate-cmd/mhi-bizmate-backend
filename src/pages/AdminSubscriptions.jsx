import React, { useState, useEffect } from "react";
import { useSupabaseAuth } from "@/lib/SupabaseAuthContext";
import { subscriptionsApi } from "@/api";
import PageHeader from "@/components/PageHeader";
import EmptyState, { LoadingState, ErrorState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { formatMoney, timeAgo } from "@/lib/biz";
import { cn } from "@/lib/utils";
import { ShieldCheck, Check, X } from "lucide-react";

export default function AdminSubscriptions() {
  const { user } = useSupabaseAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState("");

  const load = async () => {
    setError(false);
    try {
      const res = await subscriptionsApi.adminVerify({ action: "list" });
      setItems((res?.data ?? res)?.items || []);
    } catch (e) {
      console.error(e);
      setError(true);
    }
  };

  useEffect(() => {
    if (user?.role === "FOUNDER") load();
  }, [user]);

  const verify = async (id, approve) => {
    setBusy(id + String(approve));
    try {
      await subscriptionsApi.adminVerify({ action: "verify", id, approve });
      toast({ title: approve ? "Payment verified — plan activated" : "Payment rejected" });
      load();
    } catch (e) {
      toast({ title: "Action failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setBusy("");
    }
  };

  if (user?.role !== "FOUNDER") {
    return (
      <div>
        <PageHeader title="Verify Payments" back />
        <div className="px-4 pt-4">
          <EmptyState icon={ShieldCheck} title="Admins only" description="Only admin users can verify subscription payments." />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Verify Payments" subtitle="Premium subscription requests" back />
      <div className="px-4 pt-4 pb-4">
        {error ? (
          <ErrorState onRetry={load} />
        ) : !items ? (
          <LoadingState label="Loading requests…" />
        ) : items.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No payments yet" description="Payment requests will appear here when users submit them." />
        ) : (
          <div className="space-y-2.5">
            {items.map((r) => (
              <div key={r.id} className={cn("rounded-2xl bg-card border p-3.5", r.status === "PENDING" ? "border-warning/40" : "border-border")}>
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{r.user_email || r.user_id}</div>
                    <div className="text-[11px] text-muted-foreground">{r.plan_type} • {timeAgo(r.created_date)}</div>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0",
                    r.status === "PENDING" ? "bg-warning/15 text-warning border-warning/40" :
                    r.status === "APPROVED" ? "bg-success/15 text-success border-success/40" :
                    r.status === "REJECTED" ? "bg-destructive/15 text-destructive border-destructive/40" :
                    "bg-muted text-muted-foreground border-border")}>
                    {r.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Amount: <span className="text-foreground font-semibold">{formatMoney(r.amount)}</span></div>
                  <div>Transaction ID: <span className="text-foreground font-mono">{r.transaction_id}</span></div>
                </div>
                {r.status === "PENDING" && (
                  <div className="grid grid-cols-2 gap-2.5 mt-3">
                    <Button variant="outline" className="h-9 border-destructive/40 text-destructive" disabled={!!busy} onClick={() => verify(r.id, false)}>
                      <X className="w-3.5 h-3.5" /> Reject
                    </Button>
                    <Button className="h-9 glow-cyan-soft" disabled={!!busy} onClick={() => verify(r.id, true)}>
                      <Check className="w-3.5 h-3.5" /> Verify & Activate
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}