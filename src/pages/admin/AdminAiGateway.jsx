import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/api";
import { SectionCard, Spinner, AdminError, StatusPill, Field, Stat } from "@/components/admin/adminUi";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Network } from "lucide-react";

export default function AdminAiGateway() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [cfg, setCfg] = useState({ activeProvider: "", fallbackProvider: "", limits: { dailyActions: 0, perEmployee: 0 } });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await adminApi.control({ action: "gateway" });
      const d = res?.data || res;
      setData(d);
      setCfg({ activeProvider: d.config.activeProvider, fallbackProvider: d.config.fallbackProvider, limits: d.config.limits || { dailyActions: 0, perEmployee: 0 } });
    } catch (e) { setError(true); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.control({ action: "updateGateway", activeProvider: cfg.activeProvider, fallbackProvider: cfg.fallbackProvider, limits: cfg.limits });
      toast({ title: "AI Gateway updated" });
      load();
    } catch (e) { toast({ title: "Update failed", variant: "destructive" }); } finally { setSaving(false); }
  };

  if (error) return <AdminError onRetry={load} />;
  if (!data) return <Spinner label="Loading gateway…" />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">AI Gateway</h1>
        <p className="text-sm text-muted-foreground">Which AI infrastructure is running?</p>
      </div>

      <SectionCard title="Provider Health" description="Status of each connected AI provider">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.providers.map((p) => (
            <div key={p.id} className="rounded-xl bg-background/40 border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{p.name}</span>
                <StatusPill status={data.health[p.id]} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">{p.models.length} models available</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Routing" description="Active and fallback providers">
          <div className="space-y-4">
            <Field label="Active provider" hint="Primary intelligence layer for all AI employees">
              <select value={cfg.activeProvider} onChange={(e) => setCfg((c) => ({ ...c, activeProvider: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary/50">
                {data.providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Fallback provider" hint="Used automatically if the active provider fails">
              <select value={cfg.fallbackProvider} onChange={(e) => setCfg((c) => ({ ...c, fallbackProvider: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary/50">
                {data.providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Button onClick={save} disabled={saving} className="glow-cyan-soft">{saving ? "Saving…" : "Save routing"}</Button>
          </div>
        </SectionCard>

        <SectionCard title="Limits & Usage" description="Action caps and monitoring">
          <div className="space-y-4">
            <Field label="Daily action limit (platform-wide)">
              <input type="number" value={cfg.limits.dailyActions} onChange={(e) => setCfg((c) => ({ ...c, limits: { ...c.limits, dailyActions: Number(e.target.value) } }))}
                className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
            </Field>
            <Field label="Per-employee action limit">
              <input type="number" value={cfg.limits.perEmployee} onChange={(e) => setCfg((c) => ({ ...c, limits: { ...c.limits, perEmployee: Number(e.target.value) } }))}
                className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Active provider" value={<span className="capitalize">{data.config.activeProvider}</span>} />
              <Stat label="Fallback" value={<span className="capitalize">{data.config.fallbackProvider}</span>} tone="text-primary" />
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Available Models" description="Models exposed by each provider through the gateway">
        <div className="space-y-3">
          {data.providers.map((p) => (
            <div key={p.id} className="flex items-start gap-3">
              <Network className="w-4 h-4 text-primary mt-1 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {p.models.map((m) => <span key={m} className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted/40 border border-border text-muted-foreground">{m}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}