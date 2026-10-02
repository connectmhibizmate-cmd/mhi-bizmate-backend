import React, { useState, useEffect } from "react";
import { adminApi } from "@/api";
import PageHeader from "@/components/PageHeader";
import { LoadingState } from "@/components/EmptyState";
import { Eye } from "lucide-react";

export default function AdminUserView() {
  const userId = window.location.pathname.split("/").pop();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.panel({ action: "viewAsUser", user_id: userId });
        setDetail(res?.data || res);
      } catch (e) {} finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading || !detail) {
    return (
      <div>
        <PageHeader title="View as User" subtitle="Read-only" />
        <LoadingState label="Loading user data…" />
      </div>
    );
  }

  const u = detail.user || {};
  return (
    <div>
      <PageHeader title="View as User" subtitle={u.email || ""} />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="rounded-2xl bg-warning/10 border border-warning/30 p-3 flex items-start gap-2">
          <Eye className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground">Read-only admin view of this user's business data. No changes are made to their account or session.</p>
        </div>

        <div className="rounded-2xl bg-card border border-border p-4">
          <p className="text-sm font-bold text-foreground">{u.name}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Plan: {detail.plan} · Joined {u.created_date ? new Date(u.created_date).toLocaleDateString("en-GB") : "—"}</p>
        </div>

        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Business Profile</h3>
          {detail.business_profile ? (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="text-foreground">{detail.business_profile.business_name || "—"}</p>
              <p>{detail.business_profile.category || ""}</p>
              <p>{detail.business_profile.phone || ""}</p>
              <p>{detail.business_profile.address || ""}</p>
            </div>
          ) : <p className="text-xs text-muted-foreground">Not set.</p>}
        </div>

        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Inventory ({detail.inventory_count})</h3>
          {detail.inventory?.length ? (
            <div className="space-y-1">
              {detail.inventory.map((p) => (
                <div key={p.id} className="flex justify-between text-xs">
                  <span className="text-foreground truncate">{p.name}</span>
                  <span className="text-muted-foreground">৳{p.price} · {p.stock} qty</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground">No products.</p>}
        </div>

        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Recent Conversations</h3>
          {detail.recent_conversations?.length ? (
            <div className="space-y-1.5">
              {detail.recent_conversations.map((c) => (
                <div key={c.id} className="text-xs">
                  <span className="text-foreground">{c.name || "FB User"}</span>
                  <span className="text-muted-foreground"> — {c.last_message || "—"}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground">No conversations.</p>}
        </div>

        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Facebook Page</h3>
          <p className="text-xs text-muted-foreground">
            {detail.facebook_connection ? `${detail.facebook_connection.page_name || "Page"} — ${detail.facebook_connection.status}` : "Not connected."}
          </p>
        </div>
      </div>
    </div>
  );
}