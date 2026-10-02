import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/api";
import { useSupabaseAuth } from "@/lib/SupabaseAuthContext";
import { isSuperAdmin, PLATFORM_ROLE, PLATFORM_ROLE_LABEL } from "@/lib/roles";
import { SectionCard, Spinner, AdminError, AdminEmpty, timeAgo } from "@/components/admin/adminUi";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_BLURB = {
  SUPER_ADMIN: "Application owner. Full Global Admin Panel control.",
  ADMIN: "Global Admin Panel access. Manages users and payment verification.",
  MANAGER: "Global Admin Panel access. Permitted user & subscription management.",
};

const ASSIGNABLE = [PLATFORM_ROLE.ADMIN, PLATFORM_ROLE.MANAGER];

export default function AdminTeam() {
  const { user } = useSupabaseAuth();
  const canManage = isSuperAdmin(user?.platformRole);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState("");
  const { toast } = useToast();

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await adminApi.listPlatformUsers();
      setItems(res?.items || []);
    } catch (e) { setError(true); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setRole = async (userId, role) => {
    setBusy(userId + (role || "none"));
    try {
      await adminApi.setPlatformRole(userId, role);
      toast({ title: role ? `${PLATFORM_ROLE_LABEL[role]} assigned` : "Admin access revoked" });
      load();
    } catch (e) {
      toast({ title: "Update failed", description: e?.message, variant: "destructive" });
    } finally { setBusy(""); }
  };

  if (error) return <AdminError onRetry={load} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Admin Team</h1>
        <p className="text-sm text-muted-foreground">Global administrative access (Super Admin / Admin / Manager)</p>
      </div>

      <SectionCard title="Global Roles" description="Independent from Workspace roles. Enforced server-side.">
        <div className="grid sm:grid-cols-3 gap-3">
          {[PLATFORM_ROLE.SUPER_ADMIN, PLATFORM_ROLE.ADMIN, PLATFORM_ROLE.MANAGER].map((r) => (
            <div key={r} className="rounded-xl bg-background/40 border border-border p-4">
              <div className="flex items-center gap-2">
                {r === PLATFORM_ROLE.SUPER_ADMIN ? <Crown className="w-4 h-4 text-warning" /> : <ShieldCheck className="w-4 h-4 text-primary" />}
                <p className="text-sm font-semibold text-foreground">{PLATFORM_ROLE_LABEL[r]}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">{ROLE_BLURB[r]}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="People" description={canManage ? "Assign Admin or Manager access" : "Users with global admin access"}>
        {!items ? <Spinner /> : items.length === 0 ? <AdminEmpty title="No users found" /> : (
          <div className="space-y-2.5">
            {items.map((m) => {
              const isOwner = m.platform_role === PLATFORM_ROLE.SUPER_ADMIN;
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-xl bg-background/40 border border-border px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">{(m.full_name || m.email || "A").charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {m.full_name || "Unnamed"} {isOwner && <Crown className="inline w-3.5 h-3.5 text-warning ml-1 -mt-0.5" />}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      <span className="text-primary/80 font-mono">#{m.display_id ?? "—"}</span> · {m.email} · joined {timeAgo(m.created_at)}
                    </p>
                  </div>
                  {isOwner ? (
                    <span className="h-9 px-3 rounded-lg bg-warning/15 text-warning border border-warning/40 text-xs font-semibold flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5" /> {PLATFORM_ROLE_LABEL.SUPER_ADMIN}
                    </span>
                  ) : canManage ? (
                    <select
                      value={m.platform_role || ""}
                      disabled={!!busy}
                      onChange={(e) => setRole(m.id, e.target.value || null)}
                      className="h-9 px-2.5 rounded-lg bg-background border border-border text-xs font-medium focus:outline-none focus:border-primary/50 capitalize"
                    >
                      <option value="">No access</option>
                      {ASSIGNABLE.map((r) => <option key={r} value={r}>{PLATFORM_ROLE_LABEL[r]}</option>)}
                    </select>
                  ) : (
                    <span className={cn("h-9 px-3 rounded-lg border text-xs font-semibold flex items-center", m.platform_role ? "bg-primary/15 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border")}>
                      {m.platform_role ? PLATFORM_ROLE_LABEL[m.platform_role] : "Normal User"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {!canManage && (
        <p className="text-[11px] text-muted-foreground">Only the Super Admin can assign or revoke global admin roles.</p>
      )}
    </div>
  );
}