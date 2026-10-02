import React, { useState, useEffect, useMemo } from "react";
import { marketingApi } from "@/api";
import { formatMoney, STATUS_STYLES } from "@/lib/biz";
import PageHeader from "@/components/PageHeader";
import SearchBar from "@/components/SearchBar";
import FilterTabs from "@/components/FilterTabs";
import EmptyState, { LoadingState, ErrorState } from "@/components/EmptyState";
import CampaignFormDialog from "@/components/CampaignFormDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Plus, Megaphone, Pencil, Trash2, ChevronRight, Mail, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = ["All", "Active", "Scheduled", "Completed", "Paused"];
const CAMPAIGN_STATUSES = ["Active", "Scheduled", "Completed", "Paused"];

export default function Marketing() {
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showAds, setShowAds] = useState(false);

  const load = async () => {
    setError(false);
    try {
      const list = await marketingApi.list("-created_date", 500);
      setCampaigns(list || []);
    } catch (e) {
      console.error(e);
      setError(true);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = campaigns || [];
    if (tab !== "All") list = list.filter((c) => c.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => (c.name || "").toLowerCase().includes(q) || (c.channel || "").toLowerCase().includes(q));
    }
    return list;
  }, [campaigns, tab, search]);

  const changeStatus = async (id, status) => {
    try {
      await marketingApi.update(id, { status });
      load();
    } catch (e) {
      toast({ title: "Failed to update status", description: e.message, variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await marketingApi.remove(deleting.id);
    setDeleting(null);
    load();
  };

  return (
    <div>
      <PageHeader title="Marketing" subtitle="Campaigns & promotions"
        right={
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium glow-cyan-soft">
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        }
      />
      <div className="px-4 pt-4 pb-4">
        {/* Facebook Ads — promotional option */}
        <button
          onClick={() => setShowAds(true)}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-br from-card to-background border border-primary/30 glow-cyan-soft mb-4 text-left hover:border-primary/60 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">📢 Contact Us for Facebook Ads</div>
            <div className="text-[11px] text-muted-foreground">Run Facebook Ads for your business · 15% OFF for MHI BizMate users</div>
          </div>
          <ChevronRight className="w-4 h-4 text-primary shrink-0" />
        </button>

        <div className="space-y-3 mb-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search campaigns…" />
          <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
        </div>

        {error ? (
          <ErrorState onRetry={load} />
        ) : !campaigns ? (
          <LoadingState label="Loading campaigns…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={campaigns.length === 0 ? "No campaigns yet" : "No matches found"}
            description={campaigns.length === 0 ? "Create your first marketing campaign to track budget and results." : "Try a different filter or search."}
            action={campaigns.length === 0 ? (
              <button onClick={() => { setEditing(null); setShowForm(true); }} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 glow-cyan-soft">
                <Plus className="w-4 h-4" /> New Campaign
              </button>
            ) : undefined}
          />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((c) => (
              <div key={c.id} className="rounded-2xl bg-card border border-border p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{c.channel || "—"} • Budget {formatMoney(c.budget)}</div>
                    <div className="text-[11px] text-muted-foreground">Spent {formatMoney(c.spent)}{c.start_date ? ` • ${c.start_date}` : ""}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => { setEditing(c); setShowForm(true); }} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleting(c)} className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <span className="text-[11px] text-muted-foreground">Status</span>
                  <select
                    value={c.status}
                    onChange={(e) => changeStatus(c.id, e.target.value)}
                    className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full border bg-transparent focus:outline-none cursor-pointer", STATUS_STYLES[c.status] || "border-border text-muted-foreground")}
                  >
                    {CAMPAIGN_STATUSES.map((s) => <option key={s} value={s} className="bg-card text-foreground">{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CampaignFormDialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) setEditing(null); }} onSaved={load} campaign={editing} />

      <Dialog open={showAds} onOpenChange={setShowAds}>
        <DialogContent className="max-w-sm bg-card border-primary/40 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Contact Us for Facebook Ads</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Button asChild className="w-full glow-cyan-soft">
              <a href="mailto:connectmhibizmate@gmail.com?subject=Facebook%20Ads%20Service%20Inquiry" className="flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" /> Email
              </a>
            </Button>
            <Button asChild className="w-full glow-cyan-soft">
              <a href="https://wa.me/8801947440422?text=Hi%2C%20I%27m%20interested%20in%20the%20Facebook%20Ads%20service%20for%20my%20business" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" /> Whatsapp
              </a>
            </Button>
            <DialogClose asChild>
              <Button variant="outline" className="w-full border-border">Cancel</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm bg-card border-destructive/40 text-foreground">
          <DialogHeader><DialogTitle className="text-destructive">Delete Campaign?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete {deleting?.name}.</p>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline" className="border-border">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}