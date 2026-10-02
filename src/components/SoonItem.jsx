import React from "react";
import { useToast } from "@/components/ui/use-toast";

export default function SoonItem({ icon: Icon, label, description }) {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        toast({
          title: `${label} is coming soon`,
          description: "This feature is under development and will be available in a future update.",
        })
      }
      className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card/50 border border-border text-left transition-colors hover:border-primary/30"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-xl border bg-muted border-border text-muted-foreground">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        {description && <div className="text-[11px] text-muted-foreground/70 truncate">{description}</div>}
      </div>
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">SOON</span>
    </button>
  );
}