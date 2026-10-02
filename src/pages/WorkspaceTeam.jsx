import React, { useEffect, useState, useCallback } from "react";
import { useSupabaseAuth } from "@/lib/SupabaseAuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { workspaceApi } from "@/api";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Crown, UserPlus, Trash2, History } from "lucide-react";

const ROLE_OPTIONS = ["CO_FOUNDER", "MODERATOR", "MEMBER"];
const ROLE_LABEL = { FOUNDER: "Founder", CO_FOUNDER: "Co-Founder", MODERATOR: "Moderator", MEMBER: "Member" };

export default function WorkspaceTeam() {
  const { user } = useSupabaseAuth();
  const { workspace, workspaceId } = useWorkspace();
  const isFounder = user?.role === "FOUNDER";
  const [members, setMembers] = useState(null);
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteToken, setInviteToken] = useState(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setError(false);
    try {
      const [m, l] = await Promise.all([
        workspaceApi.listMembers(workspaceId),
        workspaceApi.listAuditLogs(workspaceId),
      ]);
      setMembers(m?.items || []);
      setLogs(l?.items || []);
    } catch (e) { setError(true); }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const changeRole = async (memberId, role) => {
    setBusy(memberId + role);
    try { await workspaceApi.updateMemberRole(memberId, role); toast({ title: "Role updated" }); load(); }
    catch (e) { toast({ title: "Failed", description: e?.message, variant: "destructive" }); }
    finally { setBusy(""); }
  };
  const toggleStatus = async (member) => {
    const next = member.status === "active" ? "disabled" : "active";
    setBusy(member.id + "status");
    try { await workspaceApi.setMemberStatus(member.id, next); toast({ title: next === "active" ? "Member enabled" : "Member disabled" }); load(); }
    catch (e) { toast({ title: "Failed", description: e?.message, variant: "destructive" }); }
    finally { setBusy(""); }
  };
  const remove = async (member) => {
    if (!window.confirm(`Remove ${member.email} from the workspace?`)) return;
    setBusy(member.id + "remove");
    try { await workspaceApi.removeMember(member.id); toast({ title: "Member removed" }); load(); }
    catch (e) { toast({ title: "Failed", description: e?.message, variant: "destructive" }); }
    finally { setBusy(""); }
  };
  const sendInvite = async () => {
    setInviteBusy(true); setInviteToken(null);
    try {
      const res = await workspaceApi.createInvitation(inviteEmail, inviteRole);
      setInviteToken(res?.token || null);
      toast({ title: "Invitation created" });
      load();
    } catch (e) { toast({ title: "Failed", description: e?.message, variant: "destructive" }); }
    finally { setInviteBusy(false); }
  };

  if (!workspaceId) {
    return (
      <div>
        <PageHeader title="Team & Members" back />
        <div className="px-4 pt-10 text-center text-sm text-muted-foreground">You are not part of a workspace.</div>
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <PageHeader title="Team & Members" back />
        <div className="px-4 pt-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">Failed to load team.</p>
          <Button onClick={load} size="sm">Retry</Button>
        </div>
      </div>
    );
  }

  const inviteUrl = inviteToken ? `${window.location.origin}/register?invite=${inviteToken}` : null;

  return (
    <div>
      <PageHeader title="Team & Members" subtitle={workspace?.name} back />
      <div className="px-4 pt-4 pb-8 space-y-6">
        {isFounder && (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setInviteOpen(true); setInviteToken(null); setInviteEmail(""); setInviteRole("MEMBER"); }}>
              <UserPlus className="w-4 h-4 mr-1.5" /> Invite Member
            </Button>
          </div>
        )}

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-2">Members</h2>
          <div className="space-y-2.5">
            {!members ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : members.map((m) => {
              const isOwner = m.role === "FOUNDER";
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                    {(m.full_name || m.email || "A").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {m.full_name || "Unnamed"} {isOwner && <Crown className="inline w-3.5 h-3.5 text-warning ml-1 -mt-0.5" />}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{m.email} · {m.status}</p>
                  </div>
                  {isOwner ? (
                    <span className="text-xs font-semibold text-warning">{ROLE_LABEL.FOUNDER}</span>
                  ) : isFounder ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={m.role}
                        disabled={!!busy}
                        onChange={(e) => changeRole(m.id, e.target.value)}
                        className="h-8 px-2 rounded-lg bg-background border border-border text-xs font-medium focus:outline-none focus:border-primary/50"
                      >
                        {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => toggleStatus(m)} className="h-8">
                        {m.status === "active" ? "Disable" : "Enable"}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => remove(m)} className="h-8 text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">{ROLE_LABEL[m.role] || m.role}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <History className="w-4 h-4" /> Activity Log
          </h2>
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            {!logs ? (
              <div className="p-4 text-sm text-muted-foreground">Loading…</div>
            ) : logs.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No activity yet.</div>
            ) : logs.map((l) => (
              <div key={l.id} className="px-4 py-2.5">
                <p className="text-xs text-foreground">
                  <span className="font-medium">{l.actor_email || "System"}</span> · <span className="text-muted-foreground">{l.action}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">{new Date(l.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite a member</DialogTitle></DialogHeader>
          {inviteToken ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Invitation created. Share this link with the invitee (expires in 7 days):</p>
              <Input readOnly value={inviteUrl || ""} onFocus={(e) => e.target.select()} />
              <Button size="sm" onClick={() => { navigator.clipboard?.writeText(inviteUrl || ""); toast({ title: "Link copied" }); }}>Copy link</Button>
              <p className="text-[11px] text-muted-foreground">The invitee signs up with this email, then accepts the invitation to join the workspace.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Email</Label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@example.com" />
              </div>
              <div>
                <Label>Role</Label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="mt-1.5 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm">
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            {!inviteToken && <Button onClick={sendInvite} disabled={inviteBusy || !inviteEmail}>{inviteBusy ? "Creating…" : "Create invitation"}</Button>}
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}