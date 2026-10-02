import React, { useEffect, useState, useCallback } from "react";
import { adminApi, subscriptionsApi } from "@/api";
import { SectionCard, AdminTable, Spinner, AdminError, AdminEmpty, StatusPill, KpiCard } from "@/components/admin/adminUi";
import { Clock, Crown, AlertCircle, DollarSign, Check, X, Power } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AdminSubscriptionsBilling() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState("");
  const { toast } = useToast();

  const load = useCallback(async () => {
    setError(false);
    try {
      const [subRes, verRes] = await Promise.all([
        adminApi.control({ action: "subscriptions" }),
        subscriptionsApi.adminVerify({ action: "list" })
      ]);
      const subs = (subRes?.data || subRes)?.items || [];
      const pending = (subRes?.data || subRes)?.pendingVerifications || [];
      const allVerifications = (verRes?.data || verRes)?.items || [];
      setData({ subs, pending, allVerifications });
    } catch (e) { setError(true); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const verify = async (id, approve) => {
    setBusy(id + String(approve));
    try {
      await subscriptionsApi.adminVerify({ action: "verify", id, approve });
      load();
    } finally { setBusy(""); }
  };

  const toggleActive = async (sub) => {
    setBusy(sub.id + "toggle");
    try {
      await adminApi.control({ action: "toggleSubscription", id: sub.id, active: !sub.active });
      setData((d) => ({ ...d, subs: d.subs.map((s) => (s.id === sub.id ? { ...s, active: !s.active } : s)) }));
      toast({ title: sub.active ? "Subscription deactivated" : "Subscription activated" });
    } catch (e) {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally { setBusy(""); }
  };

  if (error) return <AdminError onRetry={load} />;
  if (!data) return <Spinner label="Loading billing…" />;

  const trial = data.subs.filter((s) => s.status === "TRIAL_ACTIVE").length;
  const active = data.subs.filter((s) => ["STARTER", "BUSINESS", "BUSINESS_PRO"].includes(s.status)).length;
  const expired = data.subs.filter((s) => s.status === "EXPIRED").length;
  const revenue = data.subs.filter((s) => ["STARTER", "BUSINESS", "BUSINESS_PRO"].includes(s.status)).reduce((a, s) => a + (s.price || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Subscriptions & Billing</h1>
        <p className="text-sm text-muted-foreground">Who is paying, and who is on trial?</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Trial Users" value={trial} icon={Clock} accent="text-warning" />
        <KpiCard label="Active Subscribers" value={active} icon={Crown} accent="text-success" />
        <KpiCard label="Expired" value={expired} icon={AlertCircle} accent="text-muted-foreground" />
        <KpiCard label="Revenue (active)" value={`৳${revenue.toLocaleString()}`} icon={DollarSign} accent="text-success" />
      </div>

      {data.pending.length > 0 && (
        <SectionCard title="Pending Payment Verifications" description="Approve to activate a paid plan">
          <div className="space-y-2.5">
            {data.pending.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-warning/40 bg-warning/5 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.user_email || r.user_id}</p>
                  <p className="text-[11px] text-muted-foreground">{r.plan_type} · ৳{r.amount} · Txn {r.transaction_id}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => verify(r.id, false)} disabled={!!busy} className="h-8 px-3 rounded-lg border border-destructive/40 text-destructive text-xs font-medium flex items-center gap-1 disabled:opacity-50">
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button onClick={() => verify(r.id, true)} disabled={!!busy} className="h-8 px-3 rounded-lg bg-success text-white text-xs font-medium flex items-center gap-1 disabled:opacity-50">
                    <Check className="w-3.5 h-3.5" /> Verify
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Subscriptions" description="All subscription records" bodyClassName="p-0">
        {data.subs.length === 0 ? <AdminEmpty title="No subscriptions" /> : (
          <AdminTable
            columns={[
              { key: "user", label: "User", render: (s) => (
                <div className="min-w-0">
                  <p className="text-xs text-foreground truncate">{s.user_email || s.userId}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{s.userId}</p>
                </div>
              ) },
              { key: "plan", label: "Plan", render: (s) => <StatusPill status={["STARTER", "BUSINESS", "BUSINESS_PRO"].includes(s.plan) ? "success" : s.plan === "TRIAL" ? "warning" : "muted"} label={s.plan} dot={false} /> },
              { key: "status", label: "Status", render: (s) => <span className="text-xs">{s.status}</span> },
              { key: "price", label: "Price", align: "right", render: (s) => <span className="text-xs">৳{s.price || 0}</span> },
              { key: "end", label: "Ends", render: (s) => <span className="text-xs text-muted-foreground">{s.end ? new Date(s.end).toLocaleDateString() : "—"}</span> },
              { key: "active", label: "Active", align: "right", render: (s) => (
                <button
                  onClick={() => toggleActive(s)}
                  disabled={!!busy}
                  className={s.active
                    ? "h-7 px-2.5 rounded-lg bg-success/15 text-success border border-success/40 text-[11px] font-medium flex items-center gap-1 disabled:opacity-50"
                    : "h-7 px-2.5 rounded-lg bg-muted text-muted-foreground border border-border text-[11px] font-medium flex items-center gap-1 disabled:opacity-50"}
                >
                  <Power className="w-3 h-3" /> {s.active ? "Active" : "Inactive"}
                </button>
              ) }
            ]}
            rows={data.subs}
          />
        )}
      </SectionCard>
    </div>
  );
}