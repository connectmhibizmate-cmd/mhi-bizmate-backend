import React from "react";
import { Shield, FileText, Lock, Database, Trash2, Mail } from "lucide-react";

const Section = ({ icon: Icon, title, children }) => (
  <section className="mb-8">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    </div>
    <div className="text-sm leading-relaxed text-muted-foreground space-y-2 pl-12">
      {children}
    </div>
  </section>
);

const P = ({ children }) => <p>{children}</p>;

export default function PrivacyPolicy() {
  const lastUpdated = "September 19, 2026";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground leading-tight">Privacy Policy</h1>
            <p className="text-[11px] text-muted-foreground">MHI BizMate</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-20">
        {/* Intro card */}
        <div className="rounded-2xl bg-card border border-border p-5 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Privacy Policy — MHi BizMate</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Last Updated: {lastUpdated}</p>
        </div>

        <Section icon={Database} title="Data We Collect">
          <P>
            We respect your privacy. MHi BizMate collects only the necessary Facebook data required to
            provide Facebook Page and inbox management features, including Page ID, Page Access Token,
            and messages.
          </P>
        </Section>

        <Section icon={Lock} title="Data Usage">
          <P>We do not sell your data.</P>
          <P>
            Data is stored securely and protected using appropriate security measures.
          </P>
        </Section>

        <Section icon={Trash2} title="Data Deletion">
          <P>
            When you remove MHi BizMate from your Facebook account's business integrations, we will
            process deletion of the associated Facebook data according to our data-retention and
            deletion procedures.
          </P>
        </Section>

        <Section icon={Mail} title="Contact">
          <P>
            Contact:{" "}
            <a
              href="mailto:support@mhi-bizmate.com"
              className="text-primary underline underline-offset-4"
            >
              support@mhi-bizmate.com
            </a>
          </P>
        </Section>

        <div className="border-t border-border pt-6 mt-8">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} MHI BizMate. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}