import React, { useState, useEffect } from "react";
import { customersApi, filesApi } from "@/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UploadCloud } from "lucide-react";
import { initials } from "@/lib/biz";

const TYPES = ["Individual", "Retailer", "Wholesaler", "Distributor"];

export default function CustomerFormDialog({ open, onOpenChange, onSaved, customer }) {
  const isEdit = !!customer;
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", type: "Individual", notes: "", photo_url: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setForm(customer ? {
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        type: customer.type || "Individual",
        notes: customer.notes || "",
        photo_url: customer.photo_url || "",
      } : { name: "", phone: "", email: "", address: "", type: "Individual", notes: "", photo_url: "" });
    }
  }, [open, customer]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const file_url = await filesApi.uploadPublic(file);
      set("photo_url", file_url);
    } catch (err) {
      setError("Photo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!form.phone.trim()) { setError("Phone number is required"); return; }
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        await customersApi.syncUpdate(customer.id, form);
      } else {
        await customersApi.create(form);
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      const msg = err?.data?.error || err?.error || err?.message || "Failed to save customer";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Customer" : "Add Customer"}</DialogTitle>
        </DialogHeader>
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-2xl bg-muted border border-border flex items-center justify-center overflow-hidden text-primary font-bold text-xl">
              {form.photo_url ? <img src={form.photo_url} alt="" className="w-full h-full object-cover" /> : initials(form.name) || "?"}
            </div>
            <label className="text-xs text-primary flex items-center gap-1 cursor-pointer">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
              {form.photo_url ? "Change photo" : "Upload photo"}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
          </div>
          <div className="space-y-1.5">
            <Label>Customer Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="bg-background border-border" placeholder="Rahim Ahmed" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="bg-background border-border" placeholder="017XXXXXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/60">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="bg-background border-border" placeholder="customer@email.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} className="bg-background border-border" placeholder="House, Road, City" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="bg-background border-border resize-none" rows={2} placeholder="Optional notes" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={saving} className="glow-cyan-soft">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isEdit ? "Save Changes" : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}