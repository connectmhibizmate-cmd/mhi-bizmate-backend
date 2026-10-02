import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/lib/SupabaseAuthContext";
import { ordersApi, notificationsApi } from "@/api";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import { formatMoney, greeting, displayName, ORDER_STATUSES, STATUS_STYLES, timeAgo } from "@/lib/biz";
import StatCard from "@/components/StatCard";
import FilterTabs from "@/components/FilterTabs";
import EmptyState, { LoadingState, ErrorState } from "@/components/EmptyState";
import AppIcon from "@/components/AppIcon";
import { Bell, Plus, ShoppingBag, TrendingUp, Wallet, Truck, Sparkles, ChevronRight, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const RANGES = ["Today", "This Month", "All Time"];

function inRange(dateStr, range) {
  if (!dateStr) return range === "All Time";
  const d = new Date(dateStr);
  const now = new Date();
  if (range === "All Time") return true;
  if (range === "Today") return d.toDateString() === now.toDateString();
  if (range === "This Month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return true;
}

export default function Home() {
  const { user } = useSupabaseAuth();
  const { assistantName, profile } = useBusinessProfile();
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(false);
  const [range, setRange] = useState("Today");

  const load = async () => {
    setError(false);
    try {
      const [o, n] = await Promise.all([
        ordersApi.list("-created_date", 500),
        notificationsApi.filter({ read: false }, "-created_date", 20).catch(() => []),
      ]);
      setOrders(o || []);
      setNotifications(n || []);
    } catch (e) {
      console.error(e);
      setError(true);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (orders || []).filter((o) => inRange(o.order_date || o.created_date, range)),
    [orders, range]
  );

  const kpis = useMemo(() => {
    const valid = filtered.filter((o) => o.status !== "Cancelled");
    const totalSales = valid.reduce((s, o) => s + Number(o.total || 0), 0);
    const orderCount = valid.length;
    const profit = valid.reduce((s, o) => s + Number(o.profit || 0), 0);
    const pending = filtered.filter((o) => ["Pending", "On the Way"].includes(o.status)).length;
    return { totalSales, orderCount, profit, pending };
  }, [filtered]);

  // Real comparison vs the previous equivalent period (yesterday / last month)
  const prevKpis = useMemo(() => {
    if (range === "All Time") return null;
    const now = new Date();
    return (orders || []).filter((o) => {
      if (o.status === "Cancelled") return false;
      const d = new Date(o.order_date || o.created_date);
      if (isNaN(d.getTime())) return false;
      if (range === "Today") {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return d.toDateString() === y.toDateString();
      }
      const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === pm.getMonth() && d.getFullYear() === pm.getFullYear();
    }).reduce((acc, o) => ({
      sales: acc.sales + Number(o.total || 0),
      count: acc.count + 1,
      profit: acc.profit + Number(o.profit || 0),
    }), { sales: 0, count: 0, profit: 0 });
  }, [orders, range]);

  const trendPct = (current, previous) => {
    if (!prevKpis || !previous) return undefined;
    return Math.round(((current - previous) / previous) * 100);
  };

  const recent = useMemo(() => (orders || []).slice(0, 5), [orders]);

  const ownerName = displayName(user);
  const businessName = profile?.business_name?.trim() || "";

  return (
    <div className="px-4 pt-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AppIcon size="sm" glow />
          <h1 className="text-base font-bold text-foreground tracking-tight">MHI BizMate</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/notifications")}
            className="relative w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate("/my-profile")}
            aria-label="Settings"
            className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Greeting */}
      <div className="mt-5 mb-5">
        <h2 className="text-2xl font-bold text-foreground leading-tight">{greeting()}, {ownerName}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {businessName ? `Here's what's happening with ${businessName} today.` : "Here's what's happening today."}
        </p>
      </div>

      {/* Range filter */}
      <FilterTabs tabs={RANGES} value={range} onChange={setRange} className="mb-4" />

      {/* KPIs */}
      {error ? (
        <ErrorState onRetry={load} />
      ) : !orders ? (
        <LoadingState label="Loading dashboard…" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <StatCard label="Total Sales" value={formatMoney(kpis.totalSales)} icon={Wallet} trend={trendPct(kpis.totalSales, prevKpis?.sales)} accent="primary" />
            <StatCard label="Orders" value={kpis.orderCount} icon={ShoppingBag} trend={trendPct(kpis.orderCount, prevKpis?.count)} accent="accent" />
            <StatCard label="Profit" value={formatMoney(kpis.profit)} icon={TrendingUp} trend={trendPct(kpis.profit, prevKpis?.profit)} accent="success" />
            <StatCard label="Pending Delivery" value={kpis.pending} icon={Truck} accent="warning" />
          </div>

          {/* AI Assistant */}
          <button
            onClick={() => navigate("/ask-bizmate")}
            className="w-full text-left rounded-2xl bg-gradient-to-br from-card to-background border border-primary/30 p-4 mb-5 hover:border-primary/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Ask {assistantName}</p>
                <p className="text-[11px] text-muted-foreground">Your AI business assistant</p>
              </div>
              <ChevronRight className="w-4 h-4 text-primary shrink-0" />
            </div>
          </button>

          {/* Recent Orders */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Orders</h2>
            <Link to="/orders" className="text-xs text-primary font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No orders yet"
              description="To get started, add a few products and at least one customer, then create your first order to track sales and profit."
              action={
                <button onClick={() => navigate("/orders/new")} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 glow-cyan-soft">
                  <Plus className="w-4 h-4" /> New Order
                </button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {recent.map((o) => (
                <Link
                  key={o.id}
                  to="/orders"
                  className="block rounded-2xl bg-card border border-border p-3.5 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">{o.customer_name || "Customer"}</span>
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", STATUS_STYLES[o.status] || "border-border text-muted-foreground")}>
                      {o.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{o.order_number} • {o.items_count || 0} items • {timeAgo(o.order_date || o.created_date)}</span>
                    <span className="text-primary font-semibold">{formatMoney(o.total)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}