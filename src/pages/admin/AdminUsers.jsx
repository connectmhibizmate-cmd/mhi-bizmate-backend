import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/api";
import { SectionCard, AdminTable, Spinner, AdminError, AdminEmpty, StatusPill } from "@/components/admin/adminUi";
import UserDetailDrawer from "@/components/admin/UserDetailDrawer";
import { Search } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async (q) => {
    setLoading(true);
    try {
      const res = await adminApi.panel({ action: "users", search: q || "" });
      setUsers((res?.data || res)?.users || []);
    } catch (e) { setUsers([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(""); }, [load]);
  useEffect(() => { const t = setTimeout(() => load(search), 300); return () => clearTimeout(t); }, [search, load]);

  const planTone = (p) => (["STARTER", "BUSINESS", "BUSINESS_PRO"].includes(p) ? "success" : p === "TRIAL" ? "warning" : "muted");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Users & Workspaces</h1>
        <p className="text-sm text-muted-foreground">Who is using BizMate?</p>
      </div>

      <SectionCard
        title="All Users"
        description={`${users.length} users`}
        action={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email…"
              className="h-9 pl-9 pr-3 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:border-primary/50 w-56" />
          </div>
        }
        bodyClassName="p-0"
      >
        {loading ? <Spinner /> : users.length === 0 ? <AdminEmpty title="No users found" /> : (
          <AdminTable
            onRowClick={(u) => setSelectedId(u.id)}
            columns={[
              { key: "name", label: "User", render: (u) => (<div><p className="font-medium text-foreground">{u.name}</p><p className="text-[11px] text-muted-foreground">{u.email}</p></div>) },
              { key: "role", label: "Role", render: (u) => <span className="text-xs capitalize text-muted-foreground">{u.role}</span> },
              { key: "plan", label: "Subscription", render: (u) => <StatusPill status={planTone(u.plan)} label={u.plan} dot={false} /> },
              { key: "status", label: "Status", render: (u) => (u.blocked ? <StatusPill status="down" label="Blocked" /> : <StatusPill status="active" label="Active" />) },
              { key: "connected_pages", label: "Connected Page", align: "right", render: (u) => <span className="text-xs text-muted-foreground">{u.connected_pages} page(s)</span> },
              { key: "total_messages", label: "Messages", align: "right", render: (u) => <span className="text-xs text-muted-foreground">{u.total_messages}</span> }
            ]}
            rows={users}
          />
        )}
      </SectionCard>

      {selectedId && (
        <UserDetailDrawer userId={selectedId} onClose={() => setSelectedId(null)} onChanged={() => load(search)} />
      )}
    </div>
  );
}