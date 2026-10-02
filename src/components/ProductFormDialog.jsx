import React, { useState, useEffect } from "react";
import { productsApi } from "@/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UploadCloud, Package } from "lucide-react";
import { formatMoney } from "@/lib/biz";

export default function ProductFormDialog({ open, onOpenChange, onSaved, product }) {
  const isEdit = !!product;
  const [form, setForm] = useState({ name: "", sku: "", price: "", cost: "", stock: "", category: "", description: "", image_url: "", status: "active" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setForm(product ? {
        name: product.name || "",
        sku: product.sku || "",
        price: product.price ?? "",
        cost: product.cost ?? "",
        stock: product.stock ?? "",
        category: product.category || "",
        description: product.description || "",
        image_url: product.image_url || "",
        status: product.status || "active",
      } : { name: "", sku: "", price: "", cost: "", stock: "", category: "", description: "", image_url: "", status: "active" });
    }
  }, [open, product]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const file_url = await productsApi.uploadImage(file);
      set("image_url", file_url);
    } catch (err) {
      setError("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Product name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        cost: Number(form.cost) || 0,
        stock: Number(form.stock) || 0,
      };
      if (isEdit) await productsApi.update(product.id, payload);
      else await productsApi.create(payload);
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const margin = (Number(form.price) || 0) - (Number(form.cost) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-muted border border-border flex items-center justify-center overflow-hidden">
              {form.image_url ? <img src={form.image_url} alt="" className="w-full h-full object-cover" /> : <Package className="w-8 h-8 text-muted-foreground" />}
            </div>
            <label className="text-xs text-primary flex items-center gap-1 cursor-pointer">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
              {form.image_url ? "Change image" : "Upload image"}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
          </div>
          <div className="space-y-1.5">
            <Label>Product Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="bg-background border-border" placeholder="Product name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} className="bg-background border-border" placeholder="SKU-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => set("category", e.target.value)} className="bg-background border-border" placeholder="Category" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Selling Price (৳)</Label>
              <Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} className="bg-background border-border" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Cost Price (৳)</Label>
              <Input type="number" value={form.cost} onChange={(e) => set("cost", e.target.value)} className="bg-background border-border" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Stock</Label>
              <Input type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} className="bg-background border-border" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/60">
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          {margin > 0 && <p className="text-xs text-success">Profit margin: {formatMoney(margin)} per unit</p>}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="bg-background border-border resize-none" rows={2} placeholder="Optional description" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={saving} className="glow-cyan-soft">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isEdit ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}