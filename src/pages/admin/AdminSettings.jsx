import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/api";
import { SectionCard, Spinner, AdminError, Field } from "@/components/admin/adminUi";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Save } from "lucide-react";

export default function AdminSettings() {
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await adminApi.control({ action: "settings" });
      setCfg((res?.data || res)?.config);
    } catch (e) { setError(true); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.control({ action: "updateSettings", config: cfg });
      toast({ title: "Settings saved" });
      load();
    } catch (e) { toast({ title: "Save failed", variant: "destructive" }); } finally { setSaving(false); }
  };

  if (error) return <AdminError onRetry={load} />;
  if (!cfg) return <Spinner label="Loading settings…" />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">How is the platform configured?</p>
      </div>

      <SectionCard title="Platform" description="Core platform configuration">
        <div className="space-y-4">
          <Field label="Platform name"><input value={cfg.platformName || ""} onChange={(e) => setCfg({ ...cfg, platformName: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary/50" /></Field>
          <Field label="Support email"><input value={cfg.supportEmail || ""} onChange={(e) => setCfg({ ...cfg, supportEmail: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary/50" /></Field>
          <Field label="Trial duration (days)"><input type="number" value={cfg.trialDays || 0} onChange={(e) => setCfg({ ...cfg, trialDays: Number(e.target.value) })} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary/50" /></Field>
          <div className="flex items-center justify-between rounded-xl bg-background/40 border border-border px-4 py-3">
            <div><p className="text-sm font-medium text-foreground">Maintenance mode</p><p className="text-[11px] text-muted-foreground">Temporarily block customer access while you resolve an incident</p></div>
            <button onClick={() => setCfg({ ...cfg, maintenanceMode: !cfg.maintenanceMode })} className={`relative w-11 h-6 rounded-full transition-colors ${cfg.maintenanceMode ? "bg-primary" : "bg-muted"}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${cfg.maintenanceMode ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <Button onClick={save} disabled={saving} className="glow-cyan-soft"><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save settings"}</Button>
        </div>
      </SectionCard>
    </div>
  );
}