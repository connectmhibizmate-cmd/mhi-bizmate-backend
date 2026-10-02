import React from "react";
import { cn } from "@/lib/utils";

export default function SectionLabel({ children, className }) {
  return (
    <h3 className={cn("text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em] px-1 mb-2", className)}>
      {children}
    </h3>
  );
}