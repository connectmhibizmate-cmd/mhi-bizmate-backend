import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function Spinner({ label }) {
  return (
    <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function AdminEmpty({ title = "Nothing here yet", description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mb-3">
        <span className="text-xl opacity-50">—</span>
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>}
    </div>
  );
}

export function AdminError({ message = "Something went wrong", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center mb-3 text-destructive">!</div>
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {onRetry && <button onClick={onRetry} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium">Retry</button>}
    </div>
  );
}

export function SectionCard({ title, description, action, children, className, bodyClassName }) {
  return (
    <section className={cn("rounded-2xl bg-card border border-border", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

const STATUS_STYLES = {
  operational: "bg-success/15 text-success border-success/30",
  running: "bg-success/15 text-success border-success/30",
  active: "bg-success/15 text-success border-success/30",
  standby: "bg-primary/15 text-primary border-primary/30",
  partial: "bg-warning/15 text-warning border-warning/30",
  degraded: "bg-warning/15 text-warning border-warning/30",
  paused: "bg-muted text-muted-foreground border-border",
  inactive: "bg-muted text-muted-foreground border-border",
  down: "bg-destructive/15 text-destructive border-destructive/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  denied: "bg-destructive/15 text-destructive border-destructive/30",
  failure: "bg-destructive/15 text-destructive border-destructive/30",
  success: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/15 text-warning border-warning/30"
};

const DOT = { operational: "bg-success", running: "bg-success", active: "bg-success", standby: "bg-primary", partial: "bg-warning", degraded: "bg-warning", paused: "bg-muted-foreground", inactive: "bg-muted-foreground", down: "bg-destructive", failed: "bg-destructive", pending: "bg-warning" };

export function StatusPill({ status, label, dot = true }) {
  const s = (status || "").toLowerCase();
  const cls = STATUS_STYLES[s] || "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize", cls)}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", DOT[s] || "bg-muted-foreground")} />}
      {label || status}
    </span>
  );
}

export function KpiCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
        {Icon && <Icon className={cn("w-4 h-4", accent || "text-primary")} />}
      </div>
      <span className="text-2xl font-bold text-foreground tracking-tight">{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function Stat({ label, value, tone }) {
  return (
    <div className="rounded-xl bg-background/40 border border-border px-4 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold mt-0.5", tone || "text-foreground")}>{value}</p>
    </div>
  );
}

export function AdminTable({ columns, rows, onRowClick, empty }) {
  if (!rows || rows.length === 0) return <AdminEmpty title={empty || "No records"} />;
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
            {columns.map((c) => <th key={c.key} className={cn("px-5 py-2.5 font-medium", c.align === "right" && "text-right")}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} onClick={() => onRowClick && onRowClick(r)} className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors", onRowClick && "cursor-pointer")}>
              {columns.map((c) => <td key={c.key} className={cn("px-5 py-3 text-foreground/90", c.align === "right" && "text-right", c.mono && "font-mono text-xs")}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="text-[11px] text-muted-foreground mt-1 block">{hint}</span>}
    </label>
  );
}

export function timeAgo(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}