import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { customersApi, ordersApi } from "@/api";
import { formatMoney, initials, timeAgo, STATUS_STYLES } from "@/lib/biz";
import PageHeader from "@/components/PageHeader";
import EmptyState, { LoadingState, ErrorState } from "@/components/EmptyState";
import CustomerFormDialog from "@/components/CustomerFormDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Phone, Mail, MapPin, ShoppingBag, Wallet, Pencil, Trash2, Plus, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const c = await customersApi.get(id);
      setCustomer(c);
      const allOrders = await ordersApi.list("-created_date", 500);
      setOrders((allOrders || []).filter((o) => o.customer_id === id));
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    await customersApi.remove(id);
    navigate("/customers");
  };

  if (loading) return <div><PageHeader title="Customer" back /><LoadingState /></div>;
  if (error || !customer) return <div><PageHeader title="Customer" back /><ErrorState onRetry={load} /></div>;

  return (
    <div>
      <PageHeader title={customer.name} subtitle="Customer details" />
      <div className="px-4 pt-4 space-y-4">
        {/* Profile card */}
        <div className="rounded-2xl bg-card border border-border p-5 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/15 mx-auto flex items-center justify-center text-primary font-bold text-2xl overflow-hidden">
            {customer.photo_url ? <img src={customer.photo_url} alt="" className="w-full h-full object-cover" /> : initials(customer.name) || "?"}
          </div>
          <h2 className="mt-3 text-lg font-bold text-foreground">{customer.name}</h2>
          <span className="inline-block mt-1 text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">{customer.type || "Individual"}</span>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-background border border-border p-3">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 justify-center"><ShoppingBag className="w-3 h-3" /> Orders</div>
              <div className="text-lg font-bold text-foreground">{customer.total_orders || 0}</div>
            </div>
            <div className="rounded-xl bg-background border border-border p-3">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 justify-center"><Wallet className="w-3 h-3" /> Total Spent</div>
              <div className="text-lg font-bold text-success">{formatMoney(customer.total_spent)}</div>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Phone className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Phone:</span>
            <span className="text-foreground">{customer.phone || "—"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Email:</span>
            <span className="text-foreground truncate">{customer.email || "—"}</span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <MapPin className="w-4 h-4 text-primary mt-0.5" />
            <span className="text-muted-foreground">Address:</span>
            <span className="text-foreground">{customer.address || "—"}</span>
          </div>
          {customer.notes && (
            <div className="flex items-start gap-3 text-sm pt-2 border-t border-border">
              <FileText className="w-4 h-4 text-primary mt-0.5" />
              <span className="text-foreground">{customer.notes}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2.5">
          <Button variant="outline" className="border-border h-11 flex items-center gap-1.5" onClick={() => setShowEdit(true)}>
            <Pencil className="w-4 h-4" /> Edit
          </Button>
          <Button className="h-11 flex items-center gap-1.5 glow-cyan-soft" onClick={() => navigate(`/orders/new?customer=${id}`)}>
            <Plus className="w-4 h-4" /> Order
          </Button>
          <Button variant="outline" className="border-destructive/40 text-destructive h-11 flex items-center gap-1.5" onClick={() => setShowDelete(true)}>
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>

        {/* Order history */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2.5">Order History</h3>
          {orders.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="No orders yet" description="This customer has no orders." />
          ) : (
            <div className="space-y-2.5">
              {orders.map((o) => (
                <div key={o.id} className="rounded-2xl bg-card border border-border p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">{o.order_number}</span>
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", STATUS_STYLES[o.status] || "border-border text-muted-foreground")}>{o.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{o.items_count || 0} items • {timeAgo(o.order_date || o.created_date)}</span>
                    <span className="text-primary font-semibold">{formatMoney(o.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CustomerFormDialog open={showEdit} onOpenChange={setShowEdit} onSaved={load} customer={customer} />

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm bg-card border-destructive/40 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Customer?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete {customer.name} and cannot be undone. Their order records will remain.
          </p>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline" className="border-border">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}