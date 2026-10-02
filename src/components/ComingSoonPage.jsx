import React from "react";
import PageHeader from "@/components/PageHeader";
import { Clock } from "lucide-react";

export default function ComingSoonPage({ title, subtitle, description }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} back />
      <div className="px-4 pt-10 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4 glow-cyan-soft">
          <Clock className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Coming Soon</h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">{description}</p>
      </div>
    </div>
  );
}