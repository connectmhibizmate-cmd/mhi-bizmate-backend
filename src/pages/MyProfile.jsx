import React, { useState, useEffect } from "react";
import { integrationsApi, adminApi, authApi } from "@/api";
import { useSupabaseAuth } from "@/lib/SupabaseAuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { User, Store, Facebook, Bot, CreditCard, Landmark, Trash2, ShieldCheck, LogOut, Loader2, Users } from "lucide-react";
import MoreMenuItem from "@/components/MoreMenuItem";
import SoonItem from "@/components/SoonItem";
import SectionLabel from "@/components/SectionLabel";
import { initials } from "@/lib/biz";

export default function MyProfile() {
  const { user, logout } = useSupabaseAuth();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [fbConnected, setFbConnected] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const conns = await integrationsApi.connections({}, "-updated_date", 5);
        setFbConnected((conns || []).some((c) => c.status === "connected"));
      } catch (e) { /* non-fatal */ }
    })();
  }, []);

  const planKey = subscription?.effective_plan || subscription?.plan_type || "";
  const planLabel = planKey === "BUSINESS_PRO" ? "PRO" : planKey || "FREE";
  const planTone = planKey === "TRIAL" ? "warning" : planKey === "FREEMIUM" || !planKey ? "muted" : "primary";

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await adminApi.deleteAccount();
      await authApi.logout();
      window.location.href = "/login";
    } catch (e) {
      console.error(e);
      setDeleting(false);
      setShowDelete(false);
      setConfirmText("");
      toast({ title: "Could not delete account", description: "Please try again or contact support.", variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Profile & app settings" />
      <div className="px-4 pt-4 space-y-5 pb-6">
        {/* Profile summary */}
        <div className="rounded-2xl bg-gradient-to-br from-card to-background border border-primary/30 p-5 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent mx-auto flex items-center justify-center text-primary-foreground font-bold text-3xl">
            {initials(user?.full_name || user?.email || "U") || "U"}
          </div>
          <h2 className="mt-3 text-lg font-bold text-foreground">{user?.full_name || "Owner"}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          {user?.displayId && (
            <p className="mt-1.5 inline-block text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
              #{user.displayId}
            </p>
          )}
          <span className="inline-block mt-2 text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 capitalize">{user?.role || "user"}</span>
        </div>

        {/* APP SETTINGS */}
        <section>
          <SectionLabel>App Settings</SectionLabel>
          <div className="space-y-2.5">
            <MoreMenuItem icon={User} label="Profile" description="Name • phone • photo" to="/profile" />
            <MoreMenuItem icon={Store} label="Business Profile" description="Company details & verification" to="/business-profile" />
          </div>
        </section>

        {/* INTEGRATIONS & AUTOMATION */}
        <section>
          <SectionLabel>Integrations & Automation</SectionLabel>
          <div className="space-y-2.5">
            <MoreMenuItem
              icon={Facebook}
              label="Facebook Connection"
              description="Connected Facebook Page"
              to="/facebook-connection"
              badge={{ text: fbConnected ? "ACTIVE" : "INACTIVE", tone: fbConnected ? "success" : "muted" }}
            />
            <MoreMenuItem icon={Bot} label="AI Automation" description="Automated replies & workflows" to="/automation" />
          </div>
        </section>

        {/* BILLING & PLAN */}
        <section>
          <SectionLabel>Billing & Plan</SectionLabel>
          <div className="space-y-2.5">
            <MoreMenuItem
              icon={CreditCard}
              label="Subscription"
              description="Current plan & subscription"
              to="/subscription"
              badge={{ text: planLabel, tone: planTone }}
            />
            {user?.role === "FOUNDER" && (
              <MoreMenuItem icon={ShieldCheck} label="Verify & Manage Your Subscription" description="Approve premium subscriptions" to="/admin/subscriptions" />
            )}
            <SoonItem icon={Landmark} label="Merchant Account" description="Merchant account & payment settings" />
          </div>
        </section>

        {/* ACCOUNT ACTIONS */}
        <section>
          <SectionLabel>Account Actions</SectionLabel>
          <div className="space-y-2.5">
            <MoreMenuItem icon={LogOut} label="Logout" description="Sign out of your account" onClick={() => logout(false)} />
          </div>
        </section>

        {/* DANGER ZONE */}
        <section>
          <SectionLabel>Danger Zone</SectionLabel>
          <div className="space-y-2.5">
            <MoreMenuItem
              icon={Trash2}
              label="Delete Account"
              description="Permanently delete account & data"
              danger
              onClick={() => setShowDelete(true)}
            />
          </div>
        </section>
      </div>

      <Dialog open={showDelete} onOpenChange={(open) => { setShowDelete(open); if (!open) setConfirmText(""); }}>
        <DialogContent className="max-w-sm bg-card border-destructive/40 text-foreground">
          <DialogHeader><DialogTitle className="text-destructive">Delete Account?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action is permanent and cannot be undone. Your business data will be removed.</p>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Type <span className="font-bold text-destructive">DELETE</span> to confirm
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="bg-background border-border"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">All your business data will be permanently deleted immediately. This cannot be undone.</p>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline" className="border-border" disabled={deleting}>Cancel</Button></DialogClose>
            <Button variant="destructive" disabled={confirmText !== "DELETE" || deleting} onClick={handleDeleteAccount}>
              {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</> : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}