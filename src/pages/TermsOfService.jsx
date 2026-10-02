import React from "react";
import { FileText, User, Facebook, Globe, Mail } from "lucide-react";

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

export default function TermsOfService() {
  const lastUpdated = "September 19, 2026";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground leading-tight">Terms of Service</h1>
            <p className="text-[11px] text-muted-foreground">MHI BizMate</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-20">
        {/* Intro card */}
        <div className="rounded-2xl bg-card border border-border p-5 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Terms of Service — MHi BizMate</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Last Updated: {lastUpdated}</p>
        </div>

        <Section icon={User} title="Use of the Service">
          <P>
            By using MHi BizMate, you agree to use the service for managing Facebook Pages and related
            business activities that you are authorized to manage.
          </P>
          <P>
            You are responsible for the content and activities associated with your Facebook Page.
          </P>
        </Section>

        <Section icon={Facebook} title="Third-Party Services">
          <P>
            MHi BizMate depends on third-party services including Meta/Facebook APIs. Service
            availability and functionality may be affected by changes, limitations, or downtime of
            those services.
          </P>
        </Section>

        <Section icon={Globe} title="Website">
          <P>
            <a
              href="https://mhi-bizmate51.base44.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              https://mhi-bizmate51.base44.app
            </a>
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