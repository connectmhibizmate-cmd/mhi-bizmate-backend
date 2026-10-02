import React, { useState, useEffect } from "react";
import { useBusinessProfile } from "@/hooks/useBusinessProfile";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Check, Bot } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function BusinessProfile() {
  const { profile, loading, update } = useBusinessProfile();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) setForm({
      business_name: profile.business_name || "",
      phone: profile.phone || "",
      email: profile.email || "",
      address: profile.address || "",
      category: profile.category || "",
      assistant_name: profile.assistant_name || "BizMate",
    });
  }, [profile]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(form);
      setSaved(true);
      toast({ title: "Saved", description: "Business profile updated." });
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) return <div><PageHeader title="Business Profile" /><div className="pt-10"><div className="w-7 h-7 mx-auto border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div></div>;

  return (
    <div>
      <PageHeader title="Business Profile" subtitle="Business details & AI assistant" />
      <div className="px-4 pt-4 space-y-4 pb-4">
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3.5">
          <div className="space-y-1.5">
            <Label>Business Name</Label>
            <Input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} className="bg-background border-border" placeholder="My Business" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="bg-background border-border" placeholder="01XXXXXXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => set("category", e.target.value)} className="bg-background border-border" placeholder="Retail" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Business Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="bg-background border-border" placeholder="business@email.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} rows={2} className="bg-background border-border resize-none" placeholder="Business address" />
          </div>
        </div>

        {/* AI Assistant */}
        <div className="rounded-2xl bg-gradient-to-br from-card to-background border border-primary/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">AI Assistant Name</p>
              <p className="text-[11px] text-muted-foreground">Used across the app (Home, chats)</p>
            </div>
          </div>
          <Input value={form.assistant_name} onChange={(e) => set("assistant_name", e.target.value)} className="bg-background border-border" placeholder="BizMate" />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full h-12 font-semibold glow-cyan">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}