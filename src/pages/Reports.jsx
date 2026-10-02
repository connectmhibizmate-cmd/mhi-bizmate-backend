import React, { useState, useEffect, useMemo } from "react";
import { ordersApi, customersApi } from "@/api";
import { formatMoney, formatNumber, ORDER_STATUSES } from "@/lib/biz";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import FilterTabs from "@/components/FilterTabs";
import EmptyState, { LoadingState, ErrorState } from "@/components/EmptyState";
import { Label } from "@/components/ui/label";
import { Download, Wallet, ShoppingBag, TrendingUp, Users, Truck, XCircle, FileText, Percent } from "lucide-react";
import { jsPDF } from "jspdf";

const TYPES = ["Sales", "Orders", "Profit", "Customers", "Delivery"];

function localDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Reports() {
  const [orders, setOrders] = useState(null);
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState(false);
  const [type, setType] = useState("Sales");
  const [from, setFrom] = useState(() => localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [to, setTo] = useState(() => localDate(new Date()));

  const load = async () => {
    setError(false);
    try {
      const [o, c] = await Promise.all([
        ordersApi.list("-created_date", 500),
        customersApi.list("-created_date", 500),
      ]);
      setOrders(o || []);
      setCustomers(c || []);
    } catch (e) {
      console.error(e);
      setError(true);
    }
  };

  useEffect(() => { load(); }, []);

  const inRange = (o) => {
    const d = o.order_date || (o.created_date || "").slice(0, 10);
    if (!d) return false;
    return (!from || d >= from) && (!to || d <= to);
  };

  const { cards, rows } = useMemo(() => {
    const all = (orders || []).filter(inRange);
    const valid = all.filter((o) => o.status !== "Cancelled");
    const revenue = valid.reduce((s, o) => s + Number(o.total || 0), 0);
    const profitSum = valid.reduce((s, o) => s + Number(o.profit || 0), 0);
    const costSum = valid.reduce((s, o) => s + Number(o.cost_total || 0), 0);
    const itemsSold = valid.reduce((s, o) => s + Number(o.items_count || 0), 0);
    const deliveryCharges = valid.reduce((s, o) => s + Number(o.delivery_charge || 0), 0);
    const count = (st) => all.filter((o) => o.status === st).length;
    const buyingCustomers = new Set(valid.map((o) => o.customer_id)).size;

    if (type === "Sales") {
      return {
        cards: [
          { label: "Total Sales", value: formatMoney(revenue), icon: Wallet, accent: "primary" },
          { label: "Orders", value: formatNumber(valid.length), icon: ShoppingBag, accent: "accent" },
          { label: "Avg. Order Value", value: formatMoney(valid.length ? revenue / valid.length : 0), icon: TrendingUp, accent: "success" },
          { label: "Items Sold", value: formatNumber(itemsSold), icon: ShoppingBag, accent: "warning" },
        ],
        rows: valid.slice(0, 20).map((o) => ({ title: o.order_number, sub: `${o.customer_name || "Customer"} • ${o.order_date || ""}`, value: formatMoney(o.total) })),
      };
    }
    if (type === "Orders") {
      return {
        cards: [
          { label: "Total Orders", value: formatNumber(all.length), icon: ShoppingBag, accent: "primary" },
          { label: "Delivered", value: formatNumber(count("Delivered")), icon: Truck, accent: "success" },
          { label: "In Progress", value: formatNumber(["Pending", "Confirmed", "Processing", "On the Way"].reduce((s, st) => s + count(st), 0)), icon: TrendingUp, accent: "accent" },
          { label: "Cancelled", value: formatNumber(count("Cancelled")), icon: XCircle, accent: "warning" },
        ],
        rows: ORDER_STATUSES.map((st) => ({ title: st, sub: "", value: `${count(st)} orders` })),
      };
    }
    if (type === "Profit") {
      return {
        cards: [
          { label: "Revenue", value: formatMoney(revenue), icon: Wallet, accent: "primary" },
          { label: "Cost of Goods", value: formatMoney(costSum), icon: ShoppingBag, accent: "warning" },
          { label: "Net Profit", value: formatMoney(profitSum), icon: TrendingUp, accent: "success" },
          { label: "Profit Margin", value: `${revenue > 0 ? Math.round((profitSum / revenue) * 100) : 0}%`, icon: Percent, accent: "accent" },
        ],
        rows: valid.slice(0, 20).map((o) => ({ title: o.order_number, sub: `${o.customer_name || "Customer"} • ${o.order_date || ""}`, value: formatMoney(o.profit) })),
      };
    }
    if (type === "Customers") {
      return {
        cards: [
          { label: "Total Customers", value: formatNumber((customers || []).length), icon: Users, accent: "primary" },
          { label: "Buying Customers", value: formatNumber(buyingCustomers), icon: Users, accent: "accent" },
          { label: "Revenue", value: formatMoney(revenue), icon: Wallet, accent: "success" },
          { label: "Avg. per Customer", value: formatMoney(buyingCustomers ? revenue / buyingCustomers : 0), icon: TrendingUp, accent: "warning" },
        ],
        rows: (customers || []).slice().sort((a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0)).slice(0, 20).map((c) => ({ title: c.name, sub: `${c.total_orders || 0} orders`, value: formatMoney(c.total_spent) })),
      };
    }
    return {
      cards: [
        { label: "Delivered", value: formatNumber(count("Delivered")), icon: Truck, accent: "success" },
        { label: "On the Way", value: formatNumber(count("On the Way")), icon: Truck, accent: "accent" },
        { label: "Pending", value: formatNumber(count("Pending")), icon: ShoppingBag, accent: "warning" },
        { label: "Delivery Charges", value: formatMoney(deliveryCharges), icon: Wallet, accent: "primary" },
      ],
      rows: all.filter((o) => ["Pending", "On the Way", "Delivered"].includes(o.status)).slice(0, 20).map((o) => ({ title: o.order_number, sub: `${o.customer_name || "Customer"} • ${o.order_date || ""}`, value: o.status })),
    };
  }, [type, orders, customers, from, to]);

  const handleDownload = () => {
    const doc = new jsPDF();
    const clean = (s) => String(s ?? "").replace(/৳/g, "Tk ").replace(/•/g, "-");
    let y = 18;
    doc.setFontSize(16);
    doc.text(`${type} Report - MHI BizMate`, 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Period: ${from || "beginning"} to ${to || "today"}`, 14, y);
    y += 10;
    cards.forEach((c) => {
      doc.text(`${clean(c.label)}: ${clean(c.value)}`, 14, y);
      y += 6;
    });
    if (rows.length) {
      y += 4;
      doc.setFontSize(12);
      doc.text("Details", 14, y);
      y += 8;
      doc.setFontSize(10);
      rows.slice(0, 30).forEach((r) => {
        if (y > 285) { doc.addPage(); y = 18; }
        doc.text(clean(r.sub ? `${r.title} (${r.sub})` : r.title), 14, y);
        doc.text(clean(r.value), 195, y, { align: "right" });
        y += 7;
      });
    }
    doc.save(`${type.toLowerCase()}-report.pdf`);
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Sales, order & profit reports"
        right={
          <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium glow-cyan-soft">
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
        }
      />
      <div className="px-4 pt-4 pb-4">
        <FilterTabs tabs={TYPES} value={type} onChange={setType} className="mb-4" />

        <div className="rounded-2xl bg-card border border-border p-4 grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-1.5">
            <Label>From</Label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/60" />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/60" />
          </div>
        </div>

        {error ? (
          <ErrorState onRetry={load} />
        ) : !orders ? (
          <LoadingState label="Loading report…" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {cards.map((c) => (
                <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} accent={c.accent} />
              ))}
            </div>

            {rows.length === 0 ? (
              <EmptyState icon={FileText} title="No data for this period" description="Add orders in this date range and the report will fill in automatically." />
            ) : (
              <div className="space-y-2.5">
                {rows.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{r.title}</div>
                      {r.sub && <div className="text-[11px] text-muted-foreground truncate">{r.sub}</div>}
                    </div>
                    <div className="text-sm font-semibold text-primary shrink-0">{r.value}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}