import React, { useState, useEffect } from "react";
import { transactionsApi } from "@/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function TransactionFormDialog({ open, onOpenChange, onSaved, transaction }) {
  const isEdit = !!transaction;
  const [form, setForm] = useState({ type: "Income", category: "", amount: "", description: "", date: localToday() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setForm(transaction ? {
        type: transaction.type || "Income",
        category: transaction.category || "",
        amount: transaction.amount ?? "",
        description: transaction.description || "",
        date: transaction.date || localToday(),
      } : { type: "Income", category: "", amount: "", description: "", date: localToday() });
    }
  }, [open, transaction]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) { setError("Enter a valid amount"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, amount: Number(form.amount) || 0 };
      if (isEdit) await transactionsApi.update(transaction.id, payload);
      else await transactionsApi.create(payload);
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(err.message || "Failed to save transaction");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
        </DialogHeader>
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/60">
                <option>Income</option>
                <option>Expense</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => set("category", e.target.value)} className="bg-background border-border" placeholder="Sales, Rent, Salary…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (৳) *</Label>
              <Input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} className="bg-background border-border" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="bg-background border-border" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="bg-background border-border resize-none" rows={2} placeholder="Optional notes" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={saving} className="glow-cyan-soft">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isEdit ? "Save Changes" : "Add Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}