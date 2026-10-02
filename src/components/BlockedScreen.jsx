import React from "react";
import { useSupabaseAuth } from "@/lib/SupabaseAuthContext";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BlockedScreen() {
  const { logout } = useSupabaseAuth();
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-destructive/15 flex items-center justify-center mx-auto mb-4">
          <Ban className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-lg font-bold text-foreground mb-2">Account Blocked</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Your account has been blocked. Please contact support to restore access.
        </p>
        <Button variant="outline" className="border-border" onClick={() => logout(true)}>
          Log out
        </Button>
      </div>
    </div>
  );
}