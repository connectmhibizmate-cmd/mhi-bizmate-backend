import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/api";
import { SectionCard, Spinner, AdminError, Field } from "@/components/admin/adminUi";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { BookOpen, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminKnowledge() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ role: "", instructions: "", rules: [] });
  const [ruleDraft, setRuleDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await adminApi.control({ action: "knowledge" });
      setItems((res?.data || res)?.items || []);
    } catch (e) { setError(true); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = async (it) => {
    try {
      const res = await adminApi.control({ action: "knowledgeDetail", id: it.id });
      const k = (res?.data || res)?.knowledge;
      setEditing(it);
      setForm({ role: k.role || "", instructions: k.instructions || "", rules: k.rules || [] });
    } catch (e) {}
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminApi.control({ action: "updateKnowledge", id: editing.id, role: form.role, instructions: form.instructions, rules: form.rules });
      toast({ title: "Knowledge updated", description: `New version v${(res?.data || res)?.version}` });
      setEditing(null);
      load();
    } catch (e) { toast({ title: "Update failed", variant: "destructive" }); } finally { setSaving(false); }
  };

  if (error) return <AdminError onRetry={load} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Knowledge & Context</h1>
        <p className="text-sm text-muted-foreground">What defines each AI employee?</p>
      </div>

      {!items ? <Spinner /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((it) => (
            <div key={it.id} className="rounded-2xl bg-card border border-border p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><BookOpen className="w-4 h-4" /></div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{it.role}</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted/40 border border-border text-muted-foreground">v{it.version}</span>
              </div>
              <p className="mt-3 text-xs text-foreground/80 line-clamp-2">{it.instructions}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => openEdit(it)}>Edit context</Button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-xl bg-card border-border max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> {editing.name} — Context</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Field label="Employee role"><input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary/50" /></Field>
              <Field label="System instructions"><textarea value={form.instructions} onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))} rows={5} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary/50" /></Field>
              <Field label="Business rules">
                <div className="space-y-2">
                  {form.rules.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex-1 text-sm text-foreground/90 rounded-lg bg-muted/30 border border-border px-3 py-1.5">{r}</span>
                      <button onClick={() => setForm((f) => ({ ...f, rules: f.rules.filter((_, x) => x !== i) }))} className="text-destructive text-xs">Remove</button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input value={ruleDraft} onChange={(e) => setRuleDraft(e.target.value)} placeholder="Add a rule…" className="flex-1 h-9 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-primary/50" />
                    <Button variant="outline" size="sm" onClick={() => { if (ruleDraft.trim()) { setForm((f) => ({ ...f, rules: [...f.rules, ruleDraft.trim()] })); setRuleDraft(""); } }}>Add</Button>
                  </div>
                </div>
              </Field>
              <p className="text-[11px] text-muted-foreground">Saving creates a new versioned context (e.g. v1.1) and is recorded in Audit Logs.</p>
              <Button onClick={save} disabled={saving} className="glow-cyan-soft"><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save new version"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}