import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { customersApi } from "@/api";
import { formatMoney, initials } from "@/lib/biz";
import SearchBar from "@/components/SearchBar";
import FilterTabs from "@/components/FilterTabs";
import EmptyState, { LoadingState, ErrorState } from "@/components/EmptyState";
import CustomerFormDialog from "@/components/CustomerFormDialog";
import { Plus, Users, ChevronRight, Phone, ShoppingBag } from "lucide-react";

const TYPE_TABS = ["All", "Individual", "Retailer", "Wholesaler", "Distributor"];

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setError(false);
    try {
      const list = await customersApi.list("-created_date", 500);
      setCustomers(list || []);
    } catch (e) {
      console.error(e);
      setError(true);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = customers || [];
    if (tab !== "All") list = list.filter((c) => c.type === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q) || (c.email || "").toLowerCase().includes(q));
    }
    return list;
  }, [customers, tab, search]);

  return (
    <div className="px-4 pt-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Customers</h1>
          <p className="text-xs text-muted-foreground">{customers?.length ?? 0} total customers</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium glow-cyan-soft">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="space-y-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search customers…" />
        <FilterTabs tabs={TYPE_TABS} value={tab} onChange={setTab} />
      </div>

      {error ? (
        <ErrorState onRetry={load} />
      ) : !customers ? (
        <LoadingState label="Loading customers…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={customers.length === 0 ? "No customers yet" : "No matches found"}
          description={customers.length === 0 ? "Add your first customer to start managing orders and sales." : "Try a different search or filter."}
          action={customers.length === 0 ? (
            <button onClick={() => setShowForm(true)} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 glow-cyan-soft">
              <Plus className="w-4 h-4" /> Add Customer
            </button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/customers/${c.id}`)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center text-primary font-bold overflow-hidden">
                {c.photo_url ? <img src={c.photo_url} alt="" className="w-full h-full object-cover" /> : initials(c.name) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> {c.phone || "No phone"}
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> {c.total_orders || 0} orders</span>
                  <span>•</span>
                  <span className="text-success font-medium">{formatMoney(c.total_spent)}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      <CustomerFormDialog open={showForm} onOpenChange={setShowForm} onSaved={load} />
    </div>
  );
}