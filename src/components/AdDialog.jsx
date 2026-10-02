import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Megaphone, Sparkles } from "lucide-react";

// Ad slot for Freemium users. Eligibility is decided by the backend subscription
// status (ad_eligible), not by local state. When a real ad provider is
// configured, the live ad renders inside the slot below — until then this safe
// fallback is shown and no fake ad success is claimed.
export default function AdDialog({ open, onOpenChange, onUpgrade }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Megaphone className="w-4 h-4 text-primary" /> Sponsored
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-xl border border-dashed border-border bg-background p-5 text-center">
          <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Ad space</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ads keep BizMate free on the Freemium plan. No ad provider is configured yet — nothing was served.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-border" onClick={() => onOpenChange(false)}>Close</Button>
          <Button className="glow-cyan-soft" onClick={() => { onOpenChange(false); onUpgrade?.(); }}>Remove Ads — Upgrade</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}