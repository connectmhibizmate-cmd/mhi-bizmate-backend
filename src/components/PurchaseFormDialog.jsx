import React, { useState, useEffect } from "react";
import { sourcingApi } from "@/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/biz";

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function PurchaseFormDialog({ open, onOpenChange, onSaved, purchase, suppliers = [] }) {
  const isEdit = !!purchase;
  const [form, setForm] = useState({ supplier_id: "", product_name: "", quantity: "1", unit_cost: "", date: localToday(), notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setForm(purchase ? {
        supplier_id: purchase.supplier_id || "",
        product_name: purchase.product_name || "",
        quantity: String(purchase.quantity ?? 1),
        unit_cost: purchase.unit_cost ?? "",
        date: purchase.date || localToday(),
        notes: purchase.notes || "",
      } : { supplier_id: "", product_name: "", quantity: "1", unit_cost: "", date: localToday(), notes: "" });
    }
  }, [open, purchase]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const total = (Number(form.quantity) || 0) * (Number(form.unit_cost) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplier_id) { setError("Please select a supplier"); return; }
    if (!form.product_name.trim()) { setError("Product name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const supplier = suppliers.find((s) => s.id === form.supplier_id);
      const payload = {
        supplier_id: form.supplier_id,
        supplier_name: supplier?.name || purchase?.supplier_name || "",
        product_name: form.product_name,
        quantity: Number(form.quantity) || 1,
        unit_cost: Number(form.unit_cost) || 0,
        total,
        date: form.date,
        notes: form.notes,
      };
      if (isEdit) await sourcingApi.purchases.update(purchase.id, payload);
      else await sourcingApi.purchases.create(payload);
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(err.message || "Failed to save purchase");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Purchase" : "Add Purchase"}</DialogTitle>
        </DialogHeader>
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label>Supplier *</Label>
            <select value={form.supplier_id} onChange={(e) => set("supplier_id", e.target.value)} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/60">
              <option value="">Select a supplier…</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {suppliers.length === 0 && <p className="text-xs text-warning">No suppliers yet — add a supplier first.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Product Name *</Label>
            <Input value={form.product_name} onChange={(e) => set("product_name", e.target.value)} className="bg-background border-border" placeholder="Product purchased" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} className="bg-background border-border" placeholder="1" />
            </div>
            <div className="space-y-1.5">
              <Label>Unit Cost (৳)</Label>
              <Input type="number" value={form.unit_cost} onChange={(e) => set("unit_cost", e.target.value)} className="bg-background border-border" placeholder="0" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="bg-background border-border" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="bg-background border-border resize-none" rows={2} placeholder="Optional notes" />
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-border">
            <span className="text-muted-foreground">Total Cost</span>
            <span className="text-primary font-bold">{formatMoney(total)}</span>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={saving} className="glow-cyan-soft">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isEdit ? "Save Changes" : "Add Purchase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}