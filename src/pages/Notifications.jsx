import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { notificationsApi } from "@/api";
import PageHeader from "@/components/PageHeader";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import { timeAgo } from "@/lib/biz";
import { Bell, ShoppingBag, Boxes, Wallet, Info, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import AiEmployeesDialog from "@/components/AiEmployeesDialog";

const ICONS = { order: ShoppingBag, stock: Boxes, payment: Wallet, system: Info };
const COLORS = { order: "text-primary", stock: "text-warning", payment: "text-success", system: "text-accent" };

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [showAiEmployees, setShowAiEmployees] = useState(false);

  const load = async () => {
    try {
      const list = await notificationsApi.list("-created_date", 100);
      setItems(list || []);
    } catch (e) {
      setItems([]);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await notificationsApi.update(id, { read: true });
    load();
  };

  const markAll = async () => {
    const unread = (items || []).filter((n) => !n.read);
    await notificationsApi.bulkUpdate(unread.map((n) => ({ id: n.id, read: true })));
    load();
  };

  return (
    <div>
      <PageHeader title="Notifications" back
        right={items && items.some((n) => !n.read) ? (
          <button onClick={markAll} className="text-xs text-primary font-medium">Mark all read</button>
        ) : null}
      />
      <div className="px-4 pt-4 space-y-4">
        {/* Permanent notice */}
        <div className="rounded-2xl bg-primary/10 border border-primary/30 p-3.5">
          <p className="text-xs text-foreground leading-relaxed">
            অ্যাপ এর কোনো ফাংশন ব্যবহার করতে বা কোনো সার্ভিস Enable করতে প্রবলেম হলে হোমপেজ AI এর সাহায্য নিন অথবা Home Section এর Inbox থেকে MHI BizMate কে আপনার সমস্যা জানান।
          </p>
        </div>

        {/* Meet Your AI Employees & Services */}
        <button
          onClick={() => setShowAiEmployees(true)}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-br from-card to-background border border-primary/30 hover:border-primary/60 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">Meet Your AI Employees & Services</div>
          </div>
          <ChevronRight className="w-4 h-4 text-primary shrink-0" />
        </button>

        {/* Existing notifications */}
        {!items ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You'll see order, stock and payment updates here." />
        ) : (
          <div className="space-y-2.5">
            {items.map((n) => {
              const Icon = ICONS[n.type] || Info;
              return (
                <button
                  key={n.id}
                  onClick={() => { markRead(n.id); if (n.link) navigate(n.link); }}
                  className={cn(
                    "w-full flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-colors",
                    n.read ? "bg-card/50 border-border" : "bg-card border-primary/30"
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0", COLORS[n.type] || "text-muted-foreground")}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{n.body}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(n.created_date)}</div>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <AiEmployeesDialog open={showAiEmployees} onOpenChange={setShowAiEmployees} />
    </div>
  );
}