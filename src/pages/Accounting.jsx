import React, { useState, useEffect, useMemo } from "react";
import { transactionsApi } from "@/api";
import { formatMoney } from "@/lib/biz";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import FilterTabs from "@/components/FilterTabs";
import EmptyState, { LoadingState, ErrorState } from "@/components/EmptyState";
import TransactionFormDialog from "@/components/TransactionFormDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, Receipt, TrendingUp, Landmark, ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = ["All", "Income", "Expense"];

export default function Accounting() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setError(false);
    try {
      const list = await transactionsApi.list("-created_date", 500);
      setItems(list || []);
    } catch (e) {
      console.error(e);
      setError(true);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = items || [];
    if (tab !== "All") list = list.filter((t) => t.type === tab);
    return list;
  }, [items, tab]);

  const stats = useMemo(() => {
    const list = items || [];
    const moneyIn = list.filter((t) => t.type === "Income").reduce((s, t) => s + Number(t.amount || 0), 0);
    const moneyOut = list.filter((t) => t.type === "Expense").reduce((s, t) => s + Number(t.amount || 0), 0);
    return { moneyIn, moneyOut, net: moneyIn - moneyOut };
  }, [items]);

  const confirmDelete = async () => {
    if (!deleting) return;
    await transactionsApi.remove(deleting.id);
    setDeleting(null);
    load();
  };

  return (
    <div>
      <PageHeader title="Accounting" subtitle="Income, expenses & balance"
        right={
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium glow-cyan-soft">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        }
      />
      <div className="px-4 pt-4 pb-4">
        {error ? (
          <ErrorState onRetry={load} />
        ) : !items ? (
          <LoadingState label="Loading transactions…" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard label="Money In" value={formatMoney(stats.moneyIn)} icon={Wallet} accent="success" />
              <StatCard label="Money Out" value={formatMoney(stats.moneyOut)} icon={Receipt} accent="warning" />
              <StatCard label="Net Profit" value={formatMoney(stats.net)} icon={TrendingUp} accent="primary" />
              <StatCard label="Balance" value={formatMoney(stats.net)} icon={Landmark} accent="accent" />
            </div>

            <FilterTabs tabs={TABS} value={tab} onChange={setTab} className="mb-4" />

            {filtered.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title={items.length === 0 ? "No transactions yet" : "No matches found"}
                description={items.length === 0 ? "Add income and expenses to track your money and balance." : "Try a different filter."}
                action={items.length === 0 ? (
                  <button onClick={() => { setEditing(null); setShowForm(true); }} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 glow-cyan-soft">
                    <Plus className="w-4 h-4" /> Add Transaction
                  </button>
                ) : undefined}
              />
            ) : (
              <div className="space-y-2.5">
                {filtered.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border shrink-0", t.type === "Income" ? "bg-success/10 border-success/30 text-success" : "bg-destructive/10 border-destructive/30 text-destructive")}>
                      {t.type === "Income" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{t.category || t.type}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{t.description || "—"} • {t.date || ""}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn("text-sm font-bold", t.type === "Income" ? "text-success" : "text-destructive")}>
                        {t.type === "Income" ? "+" : "-"}{formatMoney(t.amount)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => { setEditing(t); setShowForm(true); }} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleting(t)} className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <TransactionFormDialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) setEditing(null); }} onSaved={load} transaction={editing} />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm bg-card border-destructive/40 text-foreground">
          <DialogHeader><DialogTitle className="text-destructive">Delete Transaction?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete this {deleting?.type?.toLowerCase()} of {formatMoney(deleting?.amount)}.</p>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline" className="border-border">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}