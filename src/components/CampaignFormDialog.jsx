import React, { useState, useEffect } from "react";
import { marketingApi } from "@/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const STATUSES = ["Active", "Scheduled", "Completed", "Paused"];

export default function CampaignFormDialog({ open, onOpenChange, onSaved, campaign }) {
  const isEdit = !!campaign;
  const [form, setForm] = useState({ name: "", channel: "", budget: "", spent: "", status: "Active", start_date: "", end_date: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setForm(campaign ? {
        name: campaign.name || "",
        channel: campaign.channel || "",
        budget: campaign.budget ?? "",
        spent: campaign.spent ?? "",
        status: campaign.status || "Active",
        start_date: campaign.start_date || "",
        end_date: campaign.end_date || "",
        notes: campaign.notes || "",
      } : { name: "", channel: "", budget: "", spent: "", status: "Active", start_date: "", end_date: "", notes: "" });
    }
  }, [open, campaign]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Campaign name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        budget: Number(form.budget) || 0,
        spent: Number(form.spent) || 0,
      };
      if (isEdit) await marketingApi.update(campaign.id, payload);
      else await marketingApi.create(payload);
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(err.message || "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Campaign" : "New Campaign"}</DialogTitle>
        </DialogHeader>
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label>Campaign Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="bg-background border-border" placeholder="Eid Sale, Booster Post…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Input value={form.channel} onChange={(e) => set("channel", e.target.value)} className="bg-background border-border" placeholder="Facebook, SMS…" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/60">
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Budget (৳)</Label>
              <Input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} className="bg-background border-border" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Spent (৳)</Label>
              <Input type="number" value={form.spent} onChange={(e) => set("spent", e.target.value)} className="bg-background border-border" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} className="bg-background border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} className="bg-background border-border" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="bg-background border-border resize-none" rows={2} placeholder="Optional notes" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={saving} className="glow-cyan-soft">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isEdit ? "Save Changes" : "Create Campaign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}