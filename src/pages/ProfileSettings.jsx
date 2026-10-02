import React from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/lib/SupabaseAuthContext";
import PageHeader from "@/components/PageHeader";
import MoreMenuItem from "@/components/MoreMenuItem";
import SoonItem from "@/components/SoonItem";
import SubscriptionManageCard from "@/components/profile/SubscriptionManageCard";
import { initials } from "@/lib/biz";
import { UserCog, Store, Facebook, Bot, Landmark, LogOut } from "lucide-react";

export default function ProfileSettings() {
  const navigate = useNavigate();
  const { user, logout } = useSupabaseAuth();

  return (
    <div>
      <PageHeader title="Profile & Settings" />
      <div className="px-4 pt-4 space-y-4 pb-4">
        <div className="rounded-2xl bg-gradient-to-br from-card to-background border border-primary/30 p-5 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent mx-auto flex items-center justify-center text-primary-foreground font-bold text-3xl">
            {initials(user?.full_name || user?.email || "U") || "U"}
          </div>
          <h2 className="mt-3 text-lg font-bold text-foreground">{user?.full_name || "Owner"}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <span className="inline-block mt-2 text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 capitalize">{user?.role || "user"}</span>
        </div>

        <SubscriptionManageCard />

        <div className="space-y-2.5">
          <MoreMenuItem icon={UserCog} label="My Profile" description="Name, phone & photo" to="/my-profile" />
          <MoreMenuItem icon={Store} label="Business Profile" description="Business details & AI assistant" to="/business-profile" />
          <SoonItem icon={Facebook} label="Facebook Connection" description="Connect your page" />
          <SoonItem icon={Bot} label="AI Automation" description="Automations & toggles" />
          <SoonItem icon={Landmark} label="Merchant Account" description="Payment settings" />
        </div>

        <div className="pt-2">
          <MoreMenuItem icon={LogOut} label="Logout" danger onClick={() => logout(false)} />
        </div>
      </div>
    </div>
  );
}