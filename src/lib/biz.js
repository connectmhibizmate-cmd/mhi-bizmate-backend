// Shared business helpers for MHI BizMate

export const CURRENCY = "৳";

export function formatMoney(n) {
  const v = Number(n || 0);
  return CURRENCY + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function formatNumber(n) {
  return Number(n || 0).toLocaleString("en-US");
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 15) return "Good Noon";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

export function displayName(user) {
  return (
    user?.display_name ||
    user?.full_name ||
    (user?.email || "").split("@")[0] ||
    "Owner"
  );
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function genOrderNumber() {
  return "ORD-" + Date.now().toString().slice(-6);
}

export const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "On the Way",
  "Delivered",
  "Cancelled",
];

export const STATUS_STYLES = {
  Pending: "bg-warning/15 text-warning border-warning/40",
  Confirmed: "bg-primary/15 text-primary border-primary/40",
  Processing: "bg-accent/15 text-accent border-accent/40",
  "On the Way": "bg-accent/15 text-accent border-accent/40",
  Delivered: "bg-success/15 text-success border-success/40",
  Cancelled: "bg-destructive/15 text-destructive border-destructive/40",
  Paid: "bg-success/15 text-success border-success/40",
  Unpaid: "bg-warning/15 text-warning border-warning/40",
  Partial: "bg-accent/15 text-accent border-accent/40",
  Active: "bg-success/15 text-success border-success/40",
  Scheduled: "bg-warning/15 text-warning border-warning/40",
  Completed: "bg-primary/15 text-primary border-primary/40",
  Paused: "bg-muted text-muted-foreground border-border",
};