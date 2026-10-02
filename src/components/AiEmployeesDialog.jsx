import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AiEmployeesDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-primary/40 text-foreground max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Meet Your AI Employees & Services</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed">
          <p className="text-foreground">
            ✅ MHI BizMate শুধু একটি chatbot নয়; এটি আপনার business-এর repetitive কাজগুলো পরিচালনা করার জন্য তৈরি একটি Smart Business Management System, যা আপনাকে Business Growth ও Sales-এর দিকে আরও বেশি focus করার সুযোগ দেয়।
          </p>

          <div className="space-y-3">
            <div className="rounded-2xl bg-background/60 border border-border p-3.5">
              <p className="font-semibold text-foreground">💬 Facebook Comment AI</p>
              <p className="text-xs text-primary font-medium mt-0.5">Your Professional Business Page Comment Manager</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                আপনার Facebook Page-এর comments পরিচালনা করবে। Product-related প্রশ্নের উত্তর দেবে এবং প্রয়োজন হলে customer-কে Messenger AI-এর কাছে handover করবে।
              </p>
            </div>

            <div className="rounded-2xl bg-background/60 border border-border p-3.5">
              <p className="font-semibold text-foreground">📨 Messenger AI</p>
              <p className="text-xs text-primary font-medium mt-0.5">Your Sales Executive & Lead Manager</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                আপনার Messenger conversations পরিচালনা করবে। Customer-এর product-related প্রশ্নের উত্তর দেবে, interested customer-এর information সংগ্রহ করবে এবং app-এ একটি New Customer Profile তৈরি করে তার জন্য Pending Order প্রস্তুত করবে। Owner approval-এর পর customer-কে order confirmation message-ও পাঠাবে।
              </p>
            </div>

            <div className="rounded-2xl bg-background/60 border border-border p-3.5">
              <p className="font-semibold text-foreground">👨‍💼 Business Intelligence AI</p>
              <p className="text-xs text-primary font-medium mt-0.5">Your Managing Director & Head of Business Strategy</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                আপনার business-এর weak points, growth opportunities এবং potential risks identify করবে। Business-এর overall performance ও customer behaviour বিশ্লেষণ করে গুরুত্বপূর্ণ insights দেবে এবং growth ও improvement-এর জন্য actionable recommendations প্রদান করবে।
              </p>
            </div>

            <div className="rounded-2xl bg-background/60 border border-border p-3.5">
              <p className="font-semibold text-foreground">📊 Dashboard</p>
              <p className="text-xs text-primary font-medium mt-0.5">Your Business Overview</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                Sales, Orders, Customers, Products, Revenue এবং Profit-এর গুরুত্বপূর্ণ তথ্য এক জায়গায় দেখুন। আপনার business-এর বর্তমান performance, sales trends এবং গুরুত্বপূর্ণ business insights সহজেই বুঝতে পারবেন।
              </p>
            </div>

            <div className="rounded-2xl bg-background/60 border border-border p-3.5">
              <p className="font-semibold text-foreground">🚀 Your Plan</p>
              <p className="text-xs text-primary font-medium mt-0.5">AI Employees for More Business Growth</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                আপনি repetitive কাজগুলোর পেছনে সময় না দিয়ে Product Marketing এবং Sales-এ focus করুন।
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                আপনার AI Employees-এর smart assistance ও business support অব্যাহত রাখতে প্রয়োজন অনুযায়ী subscription চালু রাখুন।
              </p>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-border">
            <p className="text-base font-bold text-foreground">MHI BizMate</p>
            <p className="text-xs text-primary font-medium mt-0.5">Your Personal Business Assistant</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Built to Simplify | Designed to Scale</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}