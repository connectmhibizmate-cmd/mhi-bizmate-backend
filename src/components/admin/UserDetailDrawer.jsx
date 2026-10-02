import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Loader2, X, Crown, Ban, Trash2, Eye, Package, MessageCircle, Facebook, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function planBadge(plan) {
  const paid = ["STARTER", "BUSINESS", "BUSINESS_PRO"];
  if (plan === "TRIAL") return "bg-primary/15 text-primary border-primary/30";
  if (plan === "FREEMIUM") return "bg-muted text-muted-foreground border-border";
  if (paid.includes(plan)) return "bg-success/15 text-success border-success/30";
  return "bg-muted text-muted-foreground border-border";
}

export default function UserDetailDrawer({ userId, onClose, onChanged }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.panel({ action: "userDetail", user_id: userId });
      setDetail(res?.data || res);
    } catch (e) {
      toast({ title: "Failed to load user", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId]);

  const runAction = async (action, payload, successMsg) => {
    setBusy(true);
    try {
      const res = await adminApi.panel({ action, ...payload });
      const d = res?.data || res;
      if (d?.error) throw new Error(d.error);
      toast({ title: successMsg });
      await load();
      onChanged?.();
    } catch (e) {
      toast({ title: "Action failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleMakePro = () => {
    if (window.confirm("Activate Business Pro plan for this user?")) {
      runAction("makePro", { user_id: userId, plan_type: "BUSINESS_PRO" }, "User upgraded to Business Pro");
    }
  };
  const handleBlock = () => {
    const next = !detail?.user?.blocked;
    if (window.confirm(next ? "Block this user? They will lose app access." : "Unblock this user?")) {
      runAction(next ? "block" : "unblock", { user_id: userId }, next ? "User blocked" : "User unblocked");
    }
  };
  const handleDelete = () => {
    if (window.confirm("Permanently delete this user and ALL their data (including Facebook/Messenger)? This cannot be undone.")) {
      runAction("deleteUser", { user_id: userId }, "User deleted");
      setTimeout(onClose, 800);
    }
  };

  const u = detail?.user || {};

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl bg-card border-t border-border safe-bottom">
        <div className="sticky top-0 bg-card/95 backdrop-blur-md border-b border-border px-4 h-14 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground truncate">User Details</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading || !detail ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            {/* Identity */}
            <div className="rounded-2xl bg-background/50 border border-border p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-foreground">{u.name}</p>
                {u.blocked && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30">Blocked</span>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${planBadge(detail.plan)}`}>{detail.plan}</span>
                <span className="text-[10px] text-muted-foreground">Joined {u.created_date ? new Date(u.created_date).toLocaleDateString("en-GB") : "—"}</span>
              </div>
            </div>

            {/* Business Profile */}
            <div className="rounded-2xl bg-background/50 border border-border p-4">
              <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-primary" /><h4 className="text-xs font-semibold text-foreground">Business Profile</h4></div>
              {detail.business_profile ? (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><span className="text-foreground font-medium">{detail.business_profile.business_name || "—"}</span></p>
                  <p>{detail.business_profile.category || ""} {detail.business_profile.phone || ""}</p>
                  <p>{detail.business_profile.address || ""}</p>
                </div>
              ) : <p className="text-xs text-muted-foreground">No business profile set.</p>}
            </div>

            {/* Inventory */}
            <div className="rounded-2xl bg-background/50 border border-border p-4">
              <div className="flex items-center gap-2 mb-2"><Package className="w-4 h-4 text-primary" /><h4 className="text-xs font-semibold text-foreground">Inventory ({detail.inventory_count})</h4></div>
              {detail.inventory?.length ? (
                <div className="space-y-1">
                  {detail.inventory.slice(0, 6).map((p) => (
                    <div key={p.id} className="flex justify-between text-xs">
                      <span className="text-foreground truncate">{p.name}</span>
                      <span className="text-muted-foreground">{p.stock} in stock</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground">No products.</p>}
            </div>

            {/* Conversations */}
            <div className="rounded-2xl bg-background/50 border border-border p-4">
              <div className="flex items-center gap-2 mb-2"><MessageCircle className="w-4 h-4 text-primary" /><h4 className="text-xs font-semibold text-foreground">Recent Conversations</h4></div>
              {detail.recent_conversations?.length ? (
                <div className="space-y-1.5">
                  {detail.recent_conversations.slice(0, 6).map((c) => (
                    <div key={c.id} className="text-xs">
                      <span className="text-foreground">{c.name || "FB User"}</span>
                      <span className="text-muted-foreground"> — {c.last_message || "—"}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground">No conversations.</p>}
            </div>

            {/* Facebook connection */}
            <div className="rounded-2xl bg-background/50 border border-border p-4">
              <div className="flex items-center gap-2 mb-2"><Facebook className="w-4 h-4 text-primary" /><h4 className="text-xs font-semibold text-foreground">Facebook Page</h4></div>
              {detail.facebook_connection ? (
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">{detail.facebook_connection.page_name || "Page"}</span> — {detail.facebook_connection.status}
                </p>
              ) : <p className="text-xs text-muted-foreground">Not connected.</p>}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="outline" className="border-border" onClick={handleMakePro} disabled={busy}>
                <Crown className="w-4 h-4" /> Make Pro
              </Button>
              <Button variant="outline" className={u.blocked ? "border-success/40 text-success" : "border-warning/40 text-warning"} onClick={handleBlock} disabled={busy}>
                <Ban className="w-4 h-4" /> {u.blocked ? "Unblock" : "Block"}
              </Button>
              <Button variant="outline" className="border-border" onClick={() => navigate(`/admin-panel/user/${userId}`)} disabled={busy}>
                <Eye className="w-4 h-4" /> View as User
              </Button>
              <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}