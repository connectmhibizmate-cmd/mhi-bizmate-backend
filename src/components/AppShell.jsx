import React from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-md mx-auto min-h-screen pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}