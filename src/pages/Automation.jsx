import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { integrationsApi, automationApi } from "@/api";
import { useAutomationSettings } from "@/hooks/useAutomationSettings";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import AiUsagePanel from "@/components/automation/AiUsagePanel";
import AutomationCard from "@/components/automation/AutomationCard";
import { LoadingState } from "@/components/EmptyState";
import {
  MessageSquare,
  Bot,
  PackageSearch,
  UserPlus,
  ShoppingCart,
  Clock,
  AlertTriangle,
  Facebook,
  Save,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

const AUTOMATIONS = [
  {
    key: "facebook_comment_reply",
    icon: MessageSquare,
    label: "Facebook Comment Auto Reply",
    description: "Automatically reply to comments on your Facebook Page posts.",
    requiresFacebook: true
  },
  {
    key: "messenger_ai_assistant",
    icon: Bot,
    label: "Messenger AI Assistant",
    description: "AI-powered customer support via Facebook Messenger.",
    requiresFacebook: true
  },
  {
    key: "product_qa",
    icon: PackageSearch,
    label: "Product Q&A",
    description: "Answer customer questions about your products using verified database data.",
    requiresFacebook: false
  },
  {
    key: "customer_info_collection",
    icon: UserPlus,
    label: "Customer Information Collection",
    description: "Collect and save customer details from conversations automatically.",
    requiresFacebook: false
  },
  {
    key: "order_confirmation",
    icon: ShoppingCart,
    label: "Order Confirmation",
    description: "Help customers place orders with verified product and stock data.",
    requiresFacebook: false
  },
  {
    key: "followup_12h",
    icon: Clock,
    label: "12-Hour Follow-up",
    description: "Automatically follow up with customers 12 hours after their last message.",
    requiresFacebook: true
  }
];

export default function Automation() {
  const { settings, loading, update } = useAutomationSettings();
  const [connection, setConnection] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [allocations, setAllocations] = useState({});
  const [savingAllocation, setSavingAllocation] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    integrationsApi
      .facebook({ action: "status" })
      .then((res) => setConnection(res?.connection || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    automationApi
      .usage({ action: "report" })
      .then((d) => {
        setUsageData(d);
        if (d?.items && Array.isArray(d.items)) {
          const init = {};
          d.items.forEach((u) => {
            init[u.key] = u.usage_limit || 0;
          });
          setAllocations(init);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggle = async (key, value) => {
    await update({ [key]: value });
  };

  const fbConnected = connection?.status === "connected";
  const isPaidPlan = ["STARTER", "BUSINESS", "BUSINESS_PRO"].includes(usageData?.plan);
  const planTotal = usageData?.plan_ai_total || 0;
  const totalAllocated = Object.values(allocations).reduce((s, v) => s + (Number(v) || 0), 0);
  const overQuota = totalAllocated > planTotal;

  const handleSaveAllocation = async () => {
    if (overQuota) {
      toast({
        title: "Total exceeds quota",
        description: `Reduce by ${(totalAllocated - planTotal).toLocaleString()} actions.`,
        variant: "destructive"
      });
      return;
    }
    setSavingAllocation(true);
    try {
      await automationApi.usage({ action: "allocate", allocations });
      toast({ title: "Allocation saved", description: `${totalAllocated.toLocaleString()} AI Actions allocated.` });
      const rep = await automationApi.usage({ action: "report" });
      setUsageData(rep);
    } catch (e) {
      toast({ title: "Failed to save", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSavingAllocation(false);
    }
  };

  return (
    <div>
      <PageHeader title="AI Automation" subtitle="Automations & AI controls" />
      <div className="px-4 pt-4 space-y-4 pb-4">
        {/* Facebook connection warning */}
        {!fbConnected && (
          <div className="rounded-2xl bg-warning/10 border border-warning/30 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Facebook Page Not Connected</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Some automations require a Facebook Page connection to work.
              </p>
              <Link
                to="/facebook-connection"
                className="inline-flex items-center gap-1.5 text-xs text-primary font-medium mt-2"
              >
                <Facebook className="w-3.5 h-3.5" />
                Connect Facebook Page
              </Link>
            </div>
          </div>
        )}

        {/* AI Usage Panel */}
        <AiUsagePanel />

        {/* Automation cards */}
        {loading ? (
          <LoadingState label="Loading automations…" />
        ) : (
          <div className="space-y-3">
            {AUTOMATIONS.map((a) => {
              const usageItem = usageData?.items?.find((u) => u.key === a.key);
              return (
                <AutomationCard
                  key={a.key}
                  icon={a.icon}
                  label={a.label}
                  description={a.description}
                  enabled={!!settings?.[a.key]}
                  requiresFacebook={a.requiresFacebook}
                  facebookConnected={fbConnected}
                  onToggle={(val) => handleToggle(a.key, val)}
                  loading={loading}
                  usageCount={usageItem?.usage_count || 0}
                  quotaValue={allocations[a.key] || 0}
                  onQuotaChange={(val) => setAllocations({ ...allocations, [a.key]: val })}
                  showQuota={isPaidPlan}
                />
              );
            })}
          </div>
        )}

        {/* Save allocation bar (paid plans) */}
        {isPaidPlan && (
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center justify-between text-[11px] mb-2">
              <span className="text-muted-foreground">Total Allocated</span>
              <span className={cn("font-semibold", overQuota ? "text-destructive" : "text-primary")}>
                {totalAllocated.toLocaleString()} / {planTotal.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
              <div
                className={cn("h-full rounded-full", overQuota ? "bg-destructive" : "bg-primary")}
                style={{ width: `${Math.min(100, Math.round((totalAllocated / Math.max(1, planTotal)) * 100))}%` }}
              />
            </div>
            <Button className="w-full glow-cyan-soft" onClick={handleSaveAllocation} disabled={savingAllocation || overQuota}>
              {savingAllocation ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Quota Allocation
                </>
              )}
            </Button>
            {overQuota && (
              <p className="text-[10px] text-destructive mt-2 text-center">
                Total exceeds plan quota by {(totalAllocated - planTotal).toLocaleString()} actions.
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}