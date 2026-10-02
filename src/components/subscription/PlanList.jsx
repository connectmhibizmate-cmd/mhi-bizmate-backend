import React from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/biz";
import { Check, Phone } from "lucide-react";

const PLAN_CARDS = [
  {
    key: "TRIAL",
    name: "Free Trial",
    price: "14 Days Free",
    features: ["All services included", "No Ads"]
  },
  {
    key: "PREMIUM",
    name: "Premium",
    price: `${formatMoney(1499)}/month`,
    features: ["Up to 4,500 AI actions/month", "No Ads"]
  },
  {
    key: "BUSINESS",
    name: "Business",
    price: `${formatMoney(2499)}/month`,
    features: ["Up to 13,500 AI actions/month", "No Ads"]
  },
  {
    key: "CUSTOM",
    name: "Custom",
    price: "Custom Pricing",
    features: ["Custom AI usage", "Custom business requirements"],
    cta: "Contact for Custom Plan"
  }
];

export default function PlanList({ currentPlan, paymentNumber }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Subscription Plans</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Pick the plan that fits your business.</p>
      </div>
      <div className="space-y-2">
        {PLAN_CARDS.map((p) => {
          const active = currentPlan === p.key;
          return (
            <div
              key={p.key}
              className={cn("rounded-xl border p-3", active ? "bg-primary/10 border-primary/40" : "bg-background border-border")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  {p.name}
                </span>
                <span className="text-sm font-bold text-primary shrink-0">{p.price}</span>
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {p.features.map((f) => (
                  <li key={f} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-primary/70 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {p.cta && (
                <a
                  href={`tel:${paymentNumber || "01947440422"}`}
                  className="mt-2.5 w-full h-9 rounded-lg bg-primary/15 border border-primary/40 text-primary text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" /> {p.cta}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}