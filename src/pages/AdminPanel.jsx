import React, { useState, useEffect, useCallback } from "react";
import { adminApi } from "@/api";
import PageHeader from "@/components/PageHeader";
import AdminStats from "@/components/admin/AdminStats";
import UserDetailDrawer from "@/components/admin/UserDetailDrawer";
import SearchBar from "@/components/SearchBar";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import { ChevronRight, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

function planBadge(plan) {
  const paid = ["STARTER", "BUSINESS", "BUSINESS_PRO"];
  if (plan === "TRIAL") return "bg-primary/15 text-primary border-primary/30";
  if (plan === "FREEMIUM") return "bg-muted text-muted-foreground border-border";
  if (paid.includes(plan)) return "bg-success/15 text-success border-success/30";
  return "bg-muted text-muted-foreground border-border";
}

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await adminApi.panel({ action: "stats" });
      setStats(res?.data || res);
    } catch (e) {}
  }, []);

  const loadUsers = useCallback(async (q) => {
    setLoading(true);
    try {
      const res = await adminApi.panel({ action: "users", search: q || "" });
      const d = res?.data || res;
      setUsers(d?.users || []);
    } catch (e) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadUsers("");
  }, [loadStats, loadUsers]);

  useEffect(() => {
    const t = setTimeout(() => loadUsers(search), 300);
    return () => clearTimeout(t);
  }, [search, loadUsers]);

  return (
    <div>
      <PageHeader title="Admin Panel" subtitle="Platform management" />
      <div className="px-4 pt-4 space-y-4 pb-4">
        {/* Stats */}
        {stats ? <AdminStats stats={stats} /> : <LoadingState label="Loading stats…" />}

        {/* Users */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">Users</h2>
          <div className="mb-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Search by email…" />
          </div>
          {loading ? (
            <LoadingState label="Loading users…" />
          ) : users.length === 0 ? (
            <EmptyState title="No users found" description="Try a different search." />
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedId(u.id)}
                  className="w-full rounded-2xl bg-card border border-border p-3 flex items-center gap-3 hover:border-primary/40 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {(u.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                      {u.plan !== "FREEMIUM" && u.plan !== "TRIAL" && <Crown className="w-3.5 h-3.5 text-warning shrink-0" />}
                      {u.blocked && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30">BLOCKED</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", planBadge(u.plan))}>{u.plan}</span>
                      <span className="text-[10px] text-muted-foreground">{u.connected_pages} pages · {u.total_messages} msgs</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedId && (
        <UserDetailDrawer
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => { loadStats(); loadUsers(search); }}
        />
      )}
    </div>
  );
}