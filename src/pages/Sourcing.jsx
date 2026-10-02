import React, { useState, useEffect, useMemo } from "react";
import { sourcingApi } from "@/api";
import { formatMoney } from "@/lib/biz";
import PageHeader from "@/components/PageHeader";
import SearchBar from "@/components/SearchBar";
import FilterTabs from "@/components/FilterTabs";
import EmptyState, { LoadingState, ErrorState } from "@/components/EmptyState";
import SupplierFormDialog from "@/components/SupplierFormDialog";
import PurchaseFormDialog from "@/components/PurchaseFormDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Truck, Building2, Package, Pencil, Trash2, Phone } from "lucide-react";

const TABS = ["Suppliers", "Purchases"];

export default function Sourcing() {
  const [tab, setTab] = useState("Suppliers");
  const [suppliers, setSuppliers] = useState(null);
  const [purchases, setPurchases] = useState(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setError(false);
    try {
      const [s, p] = await Promise.all([
        sourcingApi.suppliers.list("-created_date", 500),
        sourcingApi.purchases.list("-created_date", 500),
      ]);
      setSuppliers(s || []);
      setPurchases(p || []);
    } catch (e) {
      console.error(e);
      setError(true);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredSuppliers = useMemo(() => {
    let list = suppliers || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => (s.name || "").toLowerCase().includes(q) || (s.phone || "").includes(q));
    }
    return list;
  }, [suppliers, search]);

  const filteredPurchases = useMemo(() => {
    let list = purchases || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => (p.product_name || "").toLowerCase().includes(q) || (p.supplier_name || "").toLowerCase().includes(q));
    }
    return list;
  }, [purchases, search]);

  const openAdd = () => {
    if (tab === "Suppliers") { setEditingSupplier(null); setShowSupplierForm(true); }
    else { setEditingPurchase(null); setShowPurchaseForm(true); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    if (deleting.kind === "supplier") await sourcingApi.suppliers.remove(deleting.record.id);
    else await sourcingApi.purchases.remove(deleting.record.id);
    setDeleting(null);
    load();
  };

  return (
    <div>
      <PageHeader title="Sourcing" subtitle="Suppliers & purchases"
        right={
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium glow-cyan-soft">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        }
      />
      <div className="px-4 pt-4 pb-4">
        <div className="space-y-3 mb-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search suppliers or purchases…" />
          <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
        </div>

        {error ? (
          <ErrorState onRetry={load} />
        ) : !suppliers ? (
          <LoadingState label="Loading sourcing…" />
        ) : tab === "Suppliers" ? (
          filteredSuppliers.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={suppliers.length === 0 ? "No suppliers yet" : "No matches found"}
              description={suppliers.length === 0 ? "Add your suppliers to manage purchases and sourcing." : "Try a different search."}
              action={suppliers.length === 0 ? (
                <button onClick={() => { setEditingSupplier(null); setShowSupplierForm(true); }} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 glow-cyan-soft">
                  <Plus className="w-4 h-4" /> Add Supplier
                </button>
              ) : undefined}
            />
          ) : (
            <div className="space-y-2.5">
              {filteredSuppliers.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Phone className="w-3 h-3" /> {s.phone || "No phone"}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{s.address || "—"}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => { setEditingSupplier(s); setShowSupplierForm(true); }} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleting({ kind: "supplier", record: s })} className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          filteredPurchases.length === 0 ? (
            <EmptyState
              icon={Truck}
              title={purchases.length === 0 ? "No purchases yet" : "No matches found"}
              description={purchases.length === 0 ? "Record purchases from your suppliers to track sourcing costs." : "Try a different search."}
              action={purchases.length === 0 ? (
                <button onClick={() => { setEditingPurchase(null); setShowPurchaseForm(true); }} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 glow-cyan-soft">
                  <Plus className="w-4 h-4" /> Add Purchase
                </button>
              ) : undefined}
            />
          ) : (
            <div className="space-y-2.5">
              {filteredPurchases.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border">
                  <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/30 text-accent flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{p.product_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.supplier_name || "Supplier"}</div>
                    <div className="text-[11px] text-muted-foreground">{p.quantity || 0} × {formatMoney(p.unit_cost)} • {p.date || ""}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-primary">{formatMoney(p.total)}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => { setEditingPurchase(p); setShowPurchaseForm(true); }} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleting({ kind: "purchase", record: p })} className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <SupplierFormDialog open={showSupplierForm} onOpenChange={(o) => { setShowSupplierForm(o); if (!o) setEditingSupplier(null); }} onSaved={load} supplier={editingSupplier} />
      <PurchaseFormDialog open={showPurchaseForm} onOpenChange={(o) => { setShowPurchaseForm(o); if (!o) setEditingPurchase(null); }} onSaved={load} purchase={editingPurchase} suppliers={suppliers || []} />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm bg-card border-destructive/40 text-foreground">
          <DialogHeader><DialogTitle className="text-destructive">Delete {deleting?.kind === "supplier" ? "Supplier" : "Purchase"}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleting?.kind === "supplier"
              ? `This will permanently delete ${deleting?.record?.name}.`
              : `This will permanently delete the purchase of ${deleting?.record?.product_name}.`}
          </p>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline" className="border-border">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}