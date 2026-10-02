import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/api";
import { SectionCard, Spinner, AdminError, StatusPill } from "@/components/admin/adminUi";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminSystemHealth() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await adminApi.control({ action: "systemHealth" });
      setData(res?.data || res);
    } catch (e) { setError(true); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <AdminError onRetry={load} />;
  if (!data) return <Spinner label="Checking services…" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">System Health</h1>
          <p className="text-sm text-muted-foreground">Is the infrastructure healthy?</p>
        </div>
        <StatusPill status={data.overall} label={`Overall: ${data.overall}`} />
      </div>

      <SectionCard title="Services" description="Core platform components">
        <div className="grid sm:grid-cols-2 gap-3">
          {data.items.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl bg-background/40 border border-border px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center",
                  s.status === "operational" ? "bg-success/15 text-success" : s.status === "degraded" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive")}>
                  <Activity className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-foreground">{s.name}</span>
              </div>
              <StatusPill status={s.status} />
            </div>
          ))}
        </div>
      </SectionCard>

      <p className="text-xs text-muted-foreground">Incidents and errors are surfaced on the Dashboard under Critical Alerts and recorded in Audit Logs.</p>
    </div>
  );
}