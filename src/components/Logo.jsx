import React from "react";
import { BarChart3 } from "lucide-react";

export default function Logo({ size = "md", glow = false }) {
  const dim = size === "lg" ? "w-14 h-14" : size === "sm" ? "w-9 h-9" : "w-11 h-11";
  const icon = size === "lg" ? "w-7 h-7" : size === "sm" ? "w-5 h-5" : "w-6 h-6";
  return (
    <div
      className={`${dim} rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center ${
        glow ? "glow-cyan" : ""
      }`}
    >
      <BarChart3 className={`${icon} text-primary-foreground`} />
    </div>
  );
}