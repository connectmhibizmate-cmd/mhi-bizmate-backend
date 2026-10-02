import React, { useState, useEffect, useMemo } from "react";
import { productsApi } from "@/api";
import { formatMoney } from "@/lib/biz";
import SearchBar from "@/components/SearchBar";
import FilterTabs from "@/components/FilterTabs";
import EmptyState, { LoadingState, ErrorState } from "@/components/EmptyState";
import ProductFormDialog from "@/components/ProductFormDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Package, Pencil, Trash2, Boxes, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = ["All", "Active", "Archived"];

export default function Products() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setError(false);
    try {
      const list = await productsApi.list("-created_date", 500);
      setProducts(list || []);
    } catch (e) {
      console.error(e);
      setError(true);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = products || [];
    if (tab === "Active") list = list.filter((p) => p.status === "active");
    if (tab === "Archived") list = list.filter((p) => p.status === "archived");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => (p.name || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q));
    }
    return list;
  }, [products, tab, search]);

  const confirmDelete = async () => {
    if (!deleting) return;
    await productsApi.remove(deleting.id);
    setDeleting(null);
    load();
  };

  const lowStockCount = (products || []).filter((p) => Number(p.stock) < 5 && p.status === "active").length;

  return (
    <div className="px-4 pt-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Products</h1>
          <p className="text-xs text-muted-foreground">{products?.length ?? 0} products{lowStockCount > 0 && <span className="text-warning font-medium"> • {lowStockCount} low stock</span>}</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium glow-cyan-soft">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="space-y-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or SKU…" />
        <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {error ? (
        <ErrorState onRetry={load} />
      ) : !products ? (
        <LoadingState label="Loading products…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={products.length === 0 ? "No products yet" : "No matches found"}
          description={products.length === 0 ? "Add your first product to start selling and tracking stock." : "Try a different search or filter."}
          action={products.length === 0 ? (
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 glow-cyan-soft">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((p) => (
            <div key={p.id} className={cn("flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border", Number(p.stock) < 5 && p.status === "active" && "border-warning/60 bg-warning/5")}>
              <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{p.name}</div>
                <div className="text-[11px] text-muted-foreground">{p.sku || "No SKU"} • {p.category || "Uncategorized"}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-primary">{formatMoney(p.price)}</span>
                  <span className={cn("text-[11px] flex items-center gap-1", Number(p.stock) < 5 ? "text-warning font-semibold" : "text-muted-foreground")}>
                    {Number(p.stock) < 5 && <AlertTriangle className="w-3 h-3" />}
                    <Boxes className="w-3 h-3" /> {p.stock || 0} in stock
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => { setEditing(p); setShowForm(true); }} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleting(p)} className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductFormDialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) setEditing(null); }} onSaved={load} product={editing} />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm bg-card border-destructive/40 text-foreground">
          <DialogHeader><DialogTitle className="text-destructive">Delete Product?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete {deleting?.name}.</p>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline" className="border-border">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}