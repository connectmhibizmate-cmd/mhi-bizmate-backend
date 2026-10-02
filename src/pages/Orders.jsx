import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ordersApi } from "@/api";
import { formatMoney, timeAgo, ORDER_STATUSES, STATUS_STYLES, genOrderNumber } from "@/lib/biz";
import PageHeader from "@/components/PageHeader";
import SearchBar from "@/components/SearchBar";
import FilterTabs from "@/components/FilterTabs";
import EmptyState, { LoadingState, ErrorState } from "@/components/EmptyState";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Plus, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = ["All", "Pending", "Confirmed", "Processing", "On the Way", "Delivered", "Cancelled"];

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");
  const [pendingCancel, setPendingCancel] = useState(null);

  const load = async () => {
    setError(false);
    try {
      const list = await ordersApi.list("-created_date", 500);
      setOrders(list || []);
    } catch (e) {
      console.error(e);
      setError(true);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = orders || [];
    if (tab !== "All") list = list.filter((o) => o.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) => (o.order_number || "").toLowerCase().includes(q) || (o.customer_name || "").toLowerCase().includes(q));
    }
    return list;
  }, [orders, tab, search]);

  const changeStatus = async (id, status) => {
    try {
      // The Heart of BizMate backend handles status transitions atomically:
      // stock return/re-deduct, customer totals, and income transactions are
      // all synced in a single database transaction (heart_update_order_status).
      // The client no longer performs these side-effects to avoid double-counting.
      await ordersApi.update(id, { status });
      load();
    } catch (e) {
      toast({ title: "Failed to update order", description: e.message, variant: "destructive" });
    }
  };

  // Intercept cancellations with a confirmation dialog; all other status
  // changes apply immediately as before.
  const onStatusChange = (id, newStatus) => {
    const order = (orders || []).find((o) => o.id === id);
    if (newStatus === "Cancelled" && order?.status !== "Cancelled") {
      setPendingCancel({ id });
    } else {
      changeStatus(id, newStatus);
    }
  };

  const confirmCancel = async () => {
    const id = pendingCancel?.id;
    setPendingCancel(null);
    if (id) await changeStatus(id, "Cancelled");
  };

  return (
    <div>
      <PageHeader title="Orders" subtitle={`${orders?.length ?? 0} total orders`} back={false}
        right={
          <button onClick={() => navigate("/orders/new")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium glow-cyan-soft">
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        }
      />
      <div className="px-4 pt-4">
        <div className="space-y-3 mb-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by order ID or customer…" />
          <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
        </div>

        {error ? (
          <ErrorState onRetry={load} />
        ) : !orders ? (
          <LoadingState label="Loading orders…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title={orders.length === 0 ? "No orders yet" : "No orders found"}
            description={orders.length === 0 ? "Create your first order — select a real customer and products." : "Try a different filter or search."}
            action={orders.length === 0 ? (
              <button onClick={() => navigate("/orders/new")} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 glow-cyan-soft">
                <Plus className="w-4 h-4" /> New Order
              </button>
            ) : undefined}
          />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((o) => (
              <div key={o.id} className="rounded-2xl bg-card border border-border p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{o.customer_name || "Customer"}</div>
                    <div className="text-[11px] text-muted-foreground">{o.order_number} • {timeAgo(o.order_date || o.created_date)}</div>
                  </div>
                  <span className="text-base font-bold text-primary">{formatMoney(o.total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{o.items_count || 0} items • {o.payment_status}</span>
                  <select
                    value={o.status}
                    onChange={(e) => onStatusChange(o.id, e.target.value)}
                    className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full border bg-transparent focus:outline-none cursor-pointer", STATUS_STYLES[o.status] || "border-border text-muted-foreground")}
                  >
                    {ORDER_STATUSES.map((s) => <option key={s} value={s} className="bg-card text-foreground">{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingCancel} onOpenChange={(open) => { if (!open) setPendingCancel(null); }}>
        <AlertDialogContent className="max-w-sm bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-foreground">Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription className="text-left text-xs text-muted-foreground">
              Cancelling will reverse the related stock changes, customer totals, and accounting/income entries for this order. This action can be undone by changing the status back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="mt-0 sm:mt-0 border-border">Keep Order</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancel</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}