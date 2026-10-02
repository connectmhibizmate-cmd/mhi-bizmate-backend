import React from "react";
import { cn } from "@/lib/utils";

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-xs mb-5">{description}</p>}
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
      <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function ErrorState({ message = "Something went wrong", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center mb-4">
        <span className="text-2xl">⚠️</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          Try again
        </button>
      )}
    </div>
  );
}

export function Card({ className, children, ...props }) {
  return (
    <div className={cn("rounded-2xl bg-card border border-border p-4", className)} {...props}>
      {children}
    </div>
  );
}