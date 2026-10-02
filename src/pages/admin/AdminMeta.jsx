import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/api";
import { SectionCard, AdminTable, Spinner, AdminError, AdminEmpty, StatusPill } from "@/components/admin/adminUi";
import { timeAgo } from "@/components/admin/adminUi";

export default function AdminMeta() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await adminApi.control({ action: "meta" });
      setItems((res?.data || res)?.items || []);
    } catch (e) { setError(true); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <AdminError onRetry={load} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Meta Integrations</h1>
        <p className="text-sm text-muted-foreground">Are Facebook integrations healthy?</p>
      </div>

      <SectionCard title="Connected Facebook Pages" description="Connection and token status per workspace" bodyClassName="p-0">
        {!items ? <Spinner /> : items.length === 0 ? <AdminEmpty title="No connected pages" description="Facebook connections will appear here." /> : (
          <AdminTable
            columns={[
              { key: "pageName", label: "Page", render: (c) => (<div><p className="font-medium text-foreground">{c.pageName || "Unnamed"}</p><p className="text-[11px] text-muted-foreground font-mono">{c.pageId}</p></div>) },
              { key: "userId", label: "Workspace", render: (c) => <span className="font-mono text-xs">{c.userId}</span> },
              { key: "status", label: "Connection", render: (c) => <StatusPill status={c.status === "connected" ? "operational" : "down"} label={c.status} /> },
              { key: "needsReconnect", label: "Token", render: (c) => (c.needsReconnect ? <StatusPill status="degraded" label="Reconnect needed" /> : <StatusPill status="operational" label="Valid" />) },
              { key: "connectedAt", label: "Connected", render: (c) => <span className="text-xs text-muted-foreground">{timeAgo(c.connectedAt)}</span> }
            ]}
            rows={items}
          />
        )}
      </SectionCard>
    </div>
  );
}