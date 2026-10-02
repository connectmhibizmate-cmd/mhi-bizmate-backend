import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/lib/SupabaseAuthContext";
import { Button } from "@/components/ui/button";
import { TrendingUp, Sparkles } from "lucide-react";
import AppIcon from "@/components/AppIcon";

export default function Splash() {
  const { isAuthenticated, authChecked } = useSupabaseAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authChecked && isAuthenticated) navigate("/home", { replace: true });
  }, [authChecked, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between px-6 py-12 max-w-md mx-auto relative overflow-hidden">
      {/* Ambient cyan glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-primary/15 blur-3xl" />

      <div className="flex-1 flex flex-col items-center justify-center text-center relative w-full">
        {/* Branding */}
        <AppIcon size="lg" glow className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl mb-4" />
        <h1 className="text-4xl font-bold text-foreground tracking-tight">MHI BizMate</h1>
        <p className="mt-2 text-sm text-primary text-glow font-medium">Your Personal Business Assistant</p>
        <p className="mt-2.5 text-[11px] text-muted-foreground tracking-[0.28em] uppercase">Manage • Grow • Succeed</p>

        {/* Growth card */}
        <div className="mt-9 w-full max-w-xs">
          <div className="relative rounded-3xl bg-gradient-to-br from-card to-background border border-primary/30 p-5 glow-cyan-soft overflow-hidden">
            <div className="absolute -top-3 -right-3 w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex items-end justify-center gap-1.5 h-24 pt-2">
              {[28, 44, 36, 60, 52, 80].map((h, i) => (
                <div
                  key={i}
                  className="w-5 rounded-t-md bg-gradient-to-t from-accent to-primary"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-success text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              <span>Your business is growing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="w-full space-y-3 mt-10 relative">
        <Button asChild className="w-full h-12 text-base font-semibold glow-cyan">
          <Link to="/register">Get Started</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="w-full h-12 text-base font-medium border-primary/40 text-primary bg-transparent hover:bg-primary/10"
        >
          <Link to="/login">Login</Link>
        </Button>
        <p className="text-center text-[11px] text-primary/70 font-medium tracking-wide pt-2 text-glow">
          Built to Simplify • Designed to Scale
        </p>
      </div>
    </div>
  );
}