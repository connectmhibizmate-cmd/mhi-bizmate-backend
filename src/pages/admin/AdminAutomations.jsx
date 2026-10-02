import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/api";
import { SectionCard, Spinner, AdminError, StatusPill } from "@/components/admin/adminUi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Cpu } from "lucide-react";

export default function AdminAutomations() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await adminApi.control({ action: "automations" });
      setItems((res?.data || res)?.items || []);
    } catch (e) { setError(true); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <AdminError onRetry={load} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Automations</h1>
        <p className="text-sm text-muted-foreground">What automated processes are running?</p>
      </div>

      {!items ? <Spinner /> : (
        <SectionCard title="BizMate Automations" description="Aggregate status across all workspaces">
          <div className="space-y-2.5">
            {items.map((a) => (
              <button key={a.id} onClick={() => setActive(a)} className="w-full flex items-center justify-between rounded-xl bg-background/40 border border-border px-4 py-3 hover:border-primary/40 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Cpu className="w-4 h-4" /></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground">Enabled in {a.enabled}/{a.total} workspaces</p>
                  </div>
                </div>
                <StatusPill status={a.status === "running" ? "running" : a.status === "partial" ? "partial" : "paused"} label={a.status} />
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Cpu className="w-4 h-4 text-primary" /> {active?.name}</DialogTitle></DialogHeader>
          {active && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Status</span><StatusPill status={active.status === "running" ? "running" : active.status === "partial" ? "partial" : "paused"} label={active.status} /></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Workspaces enabled</span><span className="text-foreground">{active.enabled} / {active.total}</span></div>
              <p className="text-xs text-muted-foreground pt-2">Detailed per-workspace execution logs are available in Audit Logs (action <span className="font-mono">ai_action_executed</span>).</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}