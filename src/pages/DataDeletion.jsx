import React from "react";
import { Trash2, Mail, FileText, Facebook } from "lucide-react";

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

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground leading-tight">Data Deletion</h1>
            <p className="text-[11px] text-muted-foreground">MHI BizMate</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-20">
        {/* Intro card */}
        <div className="rounded-2xl bg-card border border-border p-5 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">User Data Deletion Instructions</h2>
          </div>
          <P className="text-sm text-muted-foreground leading-relaxed">
            At MHi BizMate, we respect your privacy and your right to delete your data.
          </P>
        </div>

        <Section icon={Mail} title="How to Request Data Deletion">
          <P>
            If you have connected your Facebook account to MHi BizMate, you can request deletion of
            your data at any time.
          </P>
          <P>
            Please send an email to:{" "}
            <a
              href="mailto:support@mhi-bizmate51.base44.app"
              className="text-primary underline underline-offset-4"
            >
              support@mhi-bizmate51.base44.app
            </a>
          </P>
          <P>Subject: Data Deletion Request</P>
          <P>In the email, include your Facebook email or User ID.</P>
        </Section>

        <Section icon={FileText} title="What Happens After Request">
          <P>
            We will delete all your Facebook-related data (page messages, tokens, profile info) from
            our database within 7 business days.
          </P>
          <P>You will receive a confirmation email once deletion is complete.</P>
        </Section>

        <Section icon={Facebook} title="Remove via Facebook">
          <P>
            You can also remove our App from your Facebook settings: Facebook Settings &gt; Business
            Integrations &gt; Remove MHi BizMate.
          </P>
        </Section>

        <Section icon={Mail} title="Contact">
          <P>
            If you have any questions, contact us at{" "}
            <a
              href="mailto:support@mhi-bizmate51.base44.app"
              className="text-primary underline underline-offset-4"
            >
              support@mhi-bizmate51.base44.app
            </a>
          </P>
        </Section>

        <div className="border-t border-border pt-6 mt-8">
          <p className="text-xs text-muted-foreground text-center">
            Last Updated: September 19, 2026
          </p>
          <p className="text-xs text-muted-foreground text-center mt-2">
            © {new Date().getFullYear()} MHI BizMate. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}