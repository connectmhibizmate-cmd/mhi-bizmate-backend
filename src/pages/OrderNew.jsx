import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { customersApi, productsApi, ordersApi } from "@/api";
import { formatMoney, ORDER_STATUSES } from "@/lib/biz";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Package, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function OrderNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetCustomer = params.get("customer");

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([]); // { product_id, product_name, quantity, price, cost }
  const [discount, setDiscount] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState("Unpaid");
  const [status, setStatus] = useState("Pending");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [c, p] = await Promise.all([
          customersApi.list("-created_date", 500),
          productsApi.filter({ status: "active" }, "-created_date", 500),
        ]);
        setCustomers(c || []);
        setProducts(p || []);
        if (presetCustomer) setCustomerId(presetCustomer);
      } catch (e) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, [presetCustomer]);

  const subtotal = useMemo(() => items.reduce((s, it) => s + it.price * it.quantity, 0), [items]);
  const costTotal = useMemo(() => items.reduce((s, it) => s + it.cost * it.quantity, 0), [items]);
  const total = Math.max(0, subtotal - Number(discount || 0) + Number(deliveryCharge || 0));
  const realProfit = total - costTotal;

  const addItem = (productId) => {
    const p = products.find((x) => x.id === productId);
    if (!p || items.some((it) => it.product_id === p.id)) return;
    setItems([...items, { product_id: p.id, product_name: p.name, quantity: 1, price: Number(p.price) || 0, cost: Number(p.cost) || 0, stock: Number(p.stock) || 0 }]);
  };

  const updateItem = (id, field, value) => {
    setItems(items.map((it) => (it.product_id === id ? { ...it, [field]: field === "quantity" ? Math.max(1, Number(value) || 1) : value } : it)));
  };

  const removeItem = (id) => setItems(items.filter((it) => it.product_id !== id));

  const handleSave = async () => {
    setError("");
    if (!customerId) { setError("Please select a customer"); return; }
    if (items.length === 0) { setError("Add at least one product"); return; }
    setSaving(true);
    try {
      // Order creation (with server-side stock validation) happens atomically
      // in the backend function — the client no longer writes stock/order data.
      const data = await ordersApi.create({
        customer_id: customerId,
        items: items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: it.quantity,
          price: it.price,
          cost: it.cost,
        })),
        discount: Number(discount) || 0,
        delivery_charge: Number(deliveryCharge) || 0,
        payment_status: paymentStatus,
        status,
        notes,
      });
      toast({ title: "Order created", description: `Order ${data.order_number || ""} has been saved.` });
      navigate("/orders");
    } catch (e) {
      setError(e?.data?.error || e?.error || e?.message || "Failed to create order. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div><PageHeader title="New Order" /><div className="pt-10"><div className="w-7 h-7 mx-auto border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div></div>;
  }

  return (
    <div>
      <PageHeader title="New Order" subtitle="Create a new order" />
      <div className="px-4 pt-4 space-y-4 pb-4">
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

        {/* Customer */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-1.5">
          <Label>Customer *</Label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/60"
          >
            <option value="">Select a customer…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `• ${c.phone}` : ""}</option>)}
          </select>
          {customers.length === 0 && <p className="text-xs text-warning">No customers yet — add one from the Customers tab first.</p>}
        </div>

        {/* Products */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <Label>Products</Label>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">No products added yet.</p>
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.product_id} className="flex items-center gap-2 p-2.5 rounded-xl bg-background border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{it.product_name}</div>
                    <div className="text-[11px] text-muted-foreground">{formatMoney(it.price)} / unit</div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={it.quantity}
                    onChange={(e) => updateItem(it.product_id, "quantity", e.target.value)}
                    className="w-16 h-9 px-2 rounded-lg bg-card border border-border text-sm text-center text-foreground focus:outline-none focus:border-primary/60"
                  />
                  <span className="text-sm font-semibold text-primary w-16 text-right">{formatMoney(it.price * it.quantity)}</span>
                  <button onClick={() => removeItem(it.product_id)} className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <select
            value=""
            onChange={(e) => { if (e.target.value) addItem(e.target.value); e.target.value = ""; }}
            className="w-full h-11 px-3 rounded-xl bg-background border border-border text-sm text-muted-foreground focus:outline-none focus:border-primary/60"
          >
            <option value="">+ Add a product…</option>
            {products.filter((p) => !items.some((it) => it.product_id === p.id)).map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {formatMoney(p.price)} ({p.stock} stock)</option>
            ))}
          </select>
          {products.length === 0 && <p className="text-xs text-warning">No active products — add products first.</p>}
        </div>

        {/* Charges */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Discount (৳)</Label>
              <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/60" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Delivery (৳)</Label>
              <input type="number" value={deliveryCharge} onChange={(e) => setDeliveryCharge(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/60" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment</Label>
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/60">
                <option>Unpaid</option><option>Partial</option><option>Paid</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Order Status</Label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/60">
                {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="bg-background border-border resize-none" placeholder="Optional notes" />
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-2xl bg-gradient-to-br from-card to-background border border-primary/30 p-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">{formatMoney(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount</span><span className="text-destructive">-{formatMoney(discount)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery</span><span className="text-foreground">{formatMoney(deliveryCharge)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cost</span><span className="text-muted-foreground">{formatMoney(costTotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Est. Profit</span><span className="text-success font-medium">{formatMoney(realProfit)}</span></div>
          <div className="flex justify-between pt-2 border-t border-border"><span className="text-sm font-semibold text-foreground">Total</span><span className="text-xl font-bold text-primary">{formatMoney(total)}</span></div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full h-12 text-base font-semibold glow-cyan">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save Order
        </Button>
      </div>
    </div>
  );
}