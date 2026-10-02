import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/api";
import { SectionCard, KpiCard, StatusPill, Spinner, AdminError, timeAgo } from "@/components/admin/adminUi";
import { Users, Building2, Clock, Crown, DollarSign, Cpu, Activity, AlertTriangle } from "lucide-react";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [health, setHealth] = useState(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [d, h] = await Promise.all([
        adminApi.control({ action: "dashboard" }),
        adminApi.control({ action: "systemHealth" })
      ]);
      setData(d?.data || d);
      setHealth((h?.data || h));
    } catch (e) { setError(true); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <AdminError onRetry={load} />;
  if (!data) return <Spinner label="Loading control center…" />;

  const k = data.kpis;
  const maxG = Math.max(1, ...data.userGrowth.map((g) => g.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">How is BizMate performing right now?</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Total Users" value={k.totalUsers} icon={Users} />
        <KpiCard label="Active Workspaces" value={k.activeWorkspaces} icon={Building2} />
        <KpiCard label="Trial Users" value={k.trialUsers} icon={Clock} accent="text-warning" />
        <KpiCard label="Paid Subscribers" value={k.paidSubscribers} icon={Crown} accent="text-success" />
        <KpiCard label="MRR" value={`৳${k.mrr.toLocaleString()}`} icon={DollarSign} accent="text-success" />
        <KpiCard label="AI Actions" value={k.aiActions} icon={Cpu} />
      </div>

      {/* Two-column overview */}
      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="User & Subscription Overview" description="Growth, conversion and active subscriptions">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">User growth (last 7 days)</p>
              <div className="flex items-end gap-2 h-24">
                {data.userGrowth.map((g, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-md bg-gradient-to-t from-accent/40 to-primary" style={{ height: `${(g.count / maxG) * 100}%`, minHeight: 4 }} />
                    <span className="text-[9px] text-muted-foreground">{g.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-background/40 border border-border px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Trial</p>
                <p className="text-lg font-semibold text-warning">{data.conversion.trial}</p>
              </div>
              <div className="rounded-xl bg-background/40 border border-border px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Paid</p>
                <p className="text-lg font-semibold text-success">{data.conversion.paid}</p>
              </div>
              <div className="rounded-xl bg-background/40 border border-border px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Expired</p>
                <p className="text-lg font-semibold text-muted-foreground">{data.conversion.expired}</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="AI Operations" description="Action volume and system status">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-background/40 border border-border px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">{data.aiOps.total}</p>
              </div>
              <div className="rounded-xl bg-background/40 border border-border px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Successful</p>
                <p className="text-lg font-semibold text-success">{data.aiOps.success}</p>
              </div>
              <div className="rounded-xl bg-background/40 border border-border px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Failed</p>
                <p className="text-lg font-semibold text-destructive">{data.aiOps.failed}</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background/40 border border-border px-3 py-2.5">
              <span className="text-xs text-muted-foreground">AI system status</span>
              <StatusPill status={data.aiOps.status} />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* System health */}
      <SectionCard title="System Health" description="Core platform services">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {(health?.items || []).map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl bg-background/40 border border-border px-3.5 py-3">
              <span className="text-sm text-foreground">{s.name}</span>
              <StatusPill status={s.status} />
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Recent Activity" description="Latest audited events">
          <ul className="space-y-3">
            {(data.recentActivity || []).map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground capitalize">{(a.action || "").replace(/_/g, " ")}</p>
                  <p className="text-[11px] text-muted-foreground">{a.label || a.actor} · {timeAgo(a.time)}</p>
                </div>
                {a.result === "failure" && <StatusPill status="failed" />}
              </li>
            ))}
            {(!data.recentActivity || data.recentActivity.length === 0) && <p className="text-sm text-muted-foreground">No recent activity.</p>}
          </ul>
        </SectionCard>

        <SectionCard title="Critical Alerts" description="Items requiring attention">
          {(data.alerts || []).length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-success">
              <Activity className="w-4 h-4" />
              <span>All systems nominal — no critical alerts.</span>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.alerts.map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground capitalize">{(a.action || "").replace(/_/g, " ")}</p>
                    <p className="text-[11px] text-muted-foreground">{a.label} · {timeAgo(a.time)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}