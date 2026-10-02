import React from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/lib/SupabaseAuthContext";
import MoreMenuItem from "@/components/MoreMenuItem";
import { isGlobalAdmin } from "@/lib/roles";
import SectionLabel from "@/components/SectionLabel";
import QuranMotivationCard from "@/components/QuranMotivationCard";
import { BarChart3, FileText, Wallet, Truck, Megaphone, MessageCircle, Shield, Facebook, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function More() {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const isAdmin = isGlobalAdmin(user?.platformRole);

  return (
    <div>
      <PageHeader title="More" subtitle="Business and Insights" back={false} />

      <div className="px-4 pt-4 pb-6">
      <div className="space-y-6">
        {isAdmin && (
          <section>
            <SectionLabel>Administration</SectionLabel>
            <div className="space-y-2.5">
              <MoreMenuItem icon={Shield} label="Admin Panel" description="Manage users & platform" to="/admin-panel" />
            </div>
          </section>
        )}

        <section>
          <SectionLabel>Workspace</SectionLabel>
          <div className="space-y-2.5">
            <MoreMenuItem icon={Users} label="Team & Members" description="Manage members, roles & activity" to="/workspace-team" />
          </div>
        </section>

        <section>
          <SectionLabel>Communication</SectionLabel>
          <div className="space-y-2.5">
            <QuranMotivationCard />
            <MoreMenuItem icon={Facebook} label="Facebook Product Post" description="Post products to your Facebook Page" to="/facebook-product-post" />
            <MoreMenuItem icon={MessageCircle} label="Inbox" description="Facebook Messenger chats" to="/inbox" />
          </div>
        </section>

        <section>
          <SectionLabel>Business Operations</SectionLabel>
          <div className="space-y-2.5">
            <MoreMenuItem icon={Truck} label="Sourcing" description="Suppliers & purchases" to="/sourcing" />
            <MoreMenuItem icon={Wallet} label="Accounting" description="Income, expenses & balance" to="/accounting" />
          </div>
        </section>

        <section>
          <SectionLabel>Insights</SectionLabel>
          <div className="space-y-2.5">
            <MoreMenuItem icon={BarChart3} label="Analytics" description="Sales trends & insights" to="/analytics" />
            <MoreMenuItem icon={FileText} label="Reports" description="Sales, order & profit reports" to="/reports" />
          </div>
        </section>

        <section>
          <SectionLabel>Growth</SectionLabel>
          <div className="space-y-2.5">
            <MoreMenuItem icon={Megaphone} label="Marketing" description="Campaigns & promotions" to="/marketing" />
          </div>
        </section>
      </div>

      <p className="text-center text-[11px] text-muted-foreground mt-8">MHI BizMate • v1.0</p>
      </div>
    </div>
  );
}