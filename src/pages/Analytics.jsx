import React, { useState, useEffect, useMemo } from "react";
import { ordersApi, customersApi } from "@/api";
import { formatMoney, formatNumber } from "@/lib/biz";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import FilterTabs from "@/components/FilterTabs";
import EmptyState, { LoadingState, ErrorState } from "@/components/EmptyState";
import { Wallet, ShoppingBag, TrendingUp, Users } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart,
} from "recharts";

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

export default function Analytics() {
  const [orders, setOrders] = useState(null);
  const [customers, setCustomers] = useState(0);
  const [error, setError] = useState(false);
  const [range, setRange] = useState("This Month");

  const load = async () => {
    setError(false);
    try {
      const [o, c] = await Promise.all([
        ordersApi.list("-created_date", 500),
        customersApi.list("-created_date", 500),
      ]);
      setOrders(o || []);
      setCustomers((c || []).length);
    } catch (e) {
      setError(true);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => (orders || []).filter((o) => o.status !== "Cancelled" && inRange(o.order_date || o.created_date, range)),
    [orders, range]
  );

  const kpis = useMemo(() => {
    const totalSales = filtered.reduce((s, o) => s + Number(o.total || 0), 0);
    const orderCount = filtered.length;
    const profit = filtered.reduce((s, o) => s + Number(o.profit || 0), 0);
    return { totalSales, orderCount, profit, customers };
  }, [filtered, customers]);

  // Build trend data by day (last 14 entries in range)
  const trend = useMemo(() => {
    const map = {};
    filtered.forEach((o) => {
      const key = (o.order_date || o.created_date || "").slice(0, 10);
      if (!key) return;
      map[key] = (map[key] || 0) + Number(o.total || 0);
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, sales]) => ({ date: date.slice(5), sales }));
  }, [filtered]);

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Sales trends & insights" />
      <div className="px-4 pt-4 pb-4">
        <FilterTabs tabs={RANGES} value={range} onChange={setRange} className="mb-4" />

        {error ? (
          <ErrorState onRetry={load} />
        ) : !orders ? (
          <LoadingState label="Loading analytics…" />
        ) : (
          <>
            {/* Trend chart */}
            <div className="rounded-2xl bg-card border border-border p-4 mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Sales Trend</h3>
              {trend.length === 0 ? (
                <EmptyState icon={TrendingUp} title="No data yet" description="Sales will appear here once you have orders." />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(188 100% 48%)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(188 100% 48%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(200 60% 26% / 0.4)" />
                    <XAxis dataKey="date" stroke="hsl(211 30% 66%)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(211 30% 66%)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(212 74% 14%)", border: "1px solid hsl(200 60% 26%)", borderRadius: 12, color: "#fff", fontSize: 12 }}
                      formatter={(v) => [formatMoney(v), "Sales"]}
                    />
                    <Area type="monotone" dataKey="sales" stroke="hsl(188 100% 48%)" strokeWidth={2} fill="url(#salesGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total Sales" value={formatMoney(kpis.totalSales)} icon={Wallet} accent="primary" />
              <StatCard label="Orders" value={formatNumber(kpis.orderCount)} icon={ShoppingBag} accent="accent" />
              <StatCard label="Profit" value={formatMoney(kpis.profit)} icon={TrendingUp} accent="success" />
              <StatCard label="Customers" value={formatNumber(kpis.customers)} icon={Users} accent="warning" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}