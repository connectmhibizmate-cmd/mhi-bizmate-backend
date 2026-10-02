import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/api";
import { SectionCard, Spinner, AdminError, AdminEmpty, StatusPill, timeAgo } from "@/components/admin/adminUi";

export default function AdminAuditLogs() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await adminApi.control({ action: "auditLogs" });
      setItems((res?.data || res)?.items || []);
    } catch (e) { setError(true); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <AdminError onRetry={load} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">What happened, and who did it?</p>
      </div>

      <SectionCard title="Activity Log" description="Immutable record of administrative and system actions" bodyClassName="p-0">
        {!items ? <Spinner /> : items.length === 0 ? <AdminEmpty title="No audit entries yet" /> : (
          <ul className="divide-y divide-border">
            {items.map((a) => (
              <li key={a.id} className="px-5 py-3.5 flex items-start gap-3">
                <StatusPill status={a.result === "failure" ? "failed" : a.result === "denied" ? "denied" : "success"} label={a.result} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground capitalize">{(a.action || "").replace(/_/g, " ")}</p>
                  <p className="text-[11px] text-muted-foreground">{a.actor_email} · {a.target_label || a.target_type || ""} · {timeAgo(a.created_date)}</p>
                  {(a.previous_value || a.new_value) && (
                    <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                      {a.previous_value ? `prev: ${a.previous_value.slice(0, 80)}` : ""} {a.new_value ? `→ new: ${a.new_value.slice(0, 80)}` : ""}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <p className="text-xs text-muted-foreground">Audit logs are immutable from the admin UI — they can only be written by the secure control layer.</p>
    </div>
  );
}