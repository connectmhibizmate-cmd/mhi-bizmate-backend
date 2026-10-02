import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/api";
import { SectionCard, Spinner, AdminError, StatusPill, timeAgo, Field } from "@/components/admin/adminUi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Bot, Cpu, AlertTriangle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Role & Instructions", "Knowledge", "Tools & Permissions", "Model", "Activity", "Audit History"];

export default function AdminAiEmployees() {
  const [employees, setEmployees] = useState(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [saving, setSaving] = useState(false);
  const [model, setModel] = useState({ provider: "", model: "" });
  const { toast } = useToast();

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await adminApi.control({ action: "aiEmployees" });
      setEmployees((res?.data || res)?.employees || []);
    } catch (e) { setError(true); }
  }, []);

  const loadDetail = useCallback(async (id) => {
    setDetail(null);
    try {
      const res = await adminApi.control({ action: "aiEmployee", id });
      const d = res?.data || res;
      setDetail(d);
      setModel({ provider: d.employee.provider, model: d.employee.model });
    } catch (e) { setDetail({ error: true }); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = (e) => { setSelected(e); setTab("Overview"); loadDetail(e.id); };
  const close = () => { setSelected(null); setDetail(null); };

  const saveModel = async () => {
    setSaving(true);
    try {
      await adminApi.control({ action: "updateModel", id: selected.id, provider: model.provider, model: model.model });
      toast({ title: "Model updated", description: "The intelligence layer was replaced. Employee identity is unchanged." });
      loadDetail(selected.id);
      load();
    } catch (e) { toast({ title: "Update failed", description: e?.response?.data?.error || e?.message, variant: "destructive" }); } finally { setSaving(false); }
  };

  const toggle = async (e) => {
    try {
      await adminApi.control({ action: "toggleEmployee", id: e.id });
      load();
    } catch (err) {}
  };

  if (error) return <AdminError onRetry={load} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">AI Employees</h1>
        <p className="text-sm text-muted-foreground">What are the AI employees doing?</p>
      </div>

      {!employees ? <Spinner /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {employees.map((e) => (
            <button key={e.id} onClick={() => open(e)} className="text-left rounded-2xl bg-card border border-border p-5 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Bot className="w-5 h-5" /></div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.role}</p>
                  </div>
                </div>
                <StatusPill status={e.status} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-[10px] text-muted-foreground uppercase">Provider</p><p className="text-xs font-medium capitalize">{e.provider}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Actions</p><p className="text-xs font-medium">{e.actions}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Errors</p><p className="text-xs font-medium text-destructive">{e.errors}</p></div>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">Model: <span className="text-foreground font-mono">{e.model}</span> · Last active {timeAgo(e.lastActivity)}</p>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-2xl bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Bot className="w-4 h-4 text-primary" /> {selected?.name}</DialogTitle>
          </DialogHeader>
          {!detail ? <Spinner /> : detail.error ? <AdminError /> : (
            <>
              <div className="flex gap-1.5 flex-wrap border-b border-border pb-3 mb-4">
                {TABS.map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>{t}</button>
                ))}
              </div>

              {tab === "Overview" && (
                <div className="space-y-3 text-sm">
                  <Row label="Role" value={detail.employee.role} />
                  <Row label="Status" value={<StatusPill status={detail.employee.status} />} />
                  <Row label="Current provider" value={<span className="capitalize">{detail.employee.provider}</span>} />
                  <Row label="Current model" value={<span className="font-mono">{detail.employee.model}</span>} />
                  <Row label="AI actions" value={detail.employee.actions} />
                  <Row label="Errors" value={<span className="text-destructive">{detail.employee.errors}</span>} />
                  <Row label="Last activity" value={timeAgo(detail.employee.lastActivity)} />
                </div>
              )}
              {tab === "Role & Instructions" && (
                <div className="space-y-3 text-sm">
                  <Row label="Permanent role" value={detail.knowledge.role} />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">System instructions</p>
                    <p className="text-sm text-foreground/90 rounded-xl bg-muted/30 border border-border p-3">{detail.knowledge.instructions}</p>
                  </div>
                </div>
              )}
              {tab === "Knowledge" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Business rules</p>
                  <ul className="space-y-1.5">{(detail.knowledge.rules || []).map((r, i) => (
                    <li key={i} className="text-sm text-foreground/90 flex items-start gap-2"><span className="text-primary">•</span> {r}</li>
                  ))}</ul>
                  <p className="text-[11px] text-muted-foreground pt-2">Context version: <span className="font-mono text-foreground">v{detail.knowledge.version}</span></p>
                </div>
              )}
              {tab === "Tools & Permissions" && (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>This employee operates through the secure control layer. It may only request allowed actions — it has no unrestricted database access.</p>
                  <ul className="space-y-1.5 pt-2">
                    <li className="flex items-center gap-2"><Cpu className="w-3.5 h-3.5 text-primary" /> Read authorized account context</li>
                    <li className="flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-primary" /> Investigate supported issues</li>
                    <li className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-warning" /> Escalate to human admin when unsafe</li>
                  </ul>
                </div>
              )}
              {tab === "Model" && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">Changing the model replaces only the intelligence layer — the employee's role, context, knowledge, permissions and workflow stay the same.</p>
                  <Field label="Provider">
                    <select value={model.provider} onChange={(e) => { const p = detail.providers.find((x) => x.id === e.target.value); setModel({ provider: e.target.value, model: p ? p.models[0] : "" }); }}
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary/50">
                      {detail.providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Model">
                    <select value={model.model} onChange={(e) => setModel((m) => ({ ...m, model: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary/50">
                      {(detail.providers.find((p) => p.id === model.provider)?.models || []).map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                  <div className="flex items-center gap-2">
                    <Button onClick={saveModel} disabled={saving} className="glow-cyan-soft">{saving ? "Saving…" : "Update model"}</Button>
                    <Button variant="outline" onClick={() => toggle(selected)}>{detail.employee.status === "active" ? "Pause employee" : "Activate employee"}</Button>
                  </div>
                </div>
              )}
              {tab === "Activity" && (
                <div className="space-y-2 text-sm">
                  <Row label="Total actions" value={detail.employee.actions} />
                  <Row label="Errors" value={detail.employee.errors} />
                  <Row label="Last activity" value={timeAgo(detail.employee.lastActivity)} />
                </div>
              )}
              {tab === "Audit History" && (
                <p className="text-sm text-muted-foreground">Model and status changes for this employee are recorded in <span className="text-foreground font-medium">Audit Logs</span>, filtered by action <span className="font-mono">ai_model_changed</span> / <span className="font-mono">ai_employee_status_changed</span>.</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }) {
  return <div className="flex items-center justify-between border-b border-border/50 py-2"><span className="text-muted-foreground">{label}</span><span className="text-foreground font-medium text-right">{value}</span></div>;
}