import { ArrowLeft, ShieldCheck, RefreshCw, AlertTriangle, MessageCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Section({ icon: Icon, title, children }) {
  return (
    <section className="border border-app rounded-xl bg-surface p-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-brand-soft border border-[hsl(var(--primary)/0.2)] grid place-items-center shrink-0">
          <Icon className="w-4.5 h-4.5 text-brand" size={18} />
        </span>
        <h2 className="text-base font-bold text-main">{title}</h2>
      </div>
      <div className="text-sm text-muted leading-relaxed space-y-3 pl-1">{children}</div>
    </section>
  );
}

function Rule({ icon: Icon = CheckCircle2, color = "text-emerald-400", children }) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon size={15} className={`${color} shrink-0 mt-0.5`} />
      <span>{children}</span>
    </li>
  );
}

export default function RefundPolicy() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-main transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand">
          Buyer & Seller Protection
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-main">
          Refund & Dispute Policy
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          CampusConnect facilitates peer-to-peer transactions between students.
          Because we are a marketplace — not a direct seller — all transactions
          are ultimately between the buyer and seller. This policy explains your
          rights and how we help resolve problems.
        </p>
        <p className="text-xs text-faint">Last updated: May 2026</p>
      </header>

      {/* Important notice */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 flex gap-3">
        <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-200/80 leading-relaxed">
          <strong className="text-amber-200">Important:</strong> CampusConnect
          does not hold, process, or release payments. Money is exchanged
          directly between buyer and seller (cash, MoMo, etc.). This means we
          cannot issue refunds on your behalf — but we can mediate disputes and
          take action against bad actors.
        </p>
      </div>

      <Section icon={RefreshCw} title="When You May Be Entitled to a Refund">
        <p>
          You can request a refund directly from the seller if any of the
          following apply:
        </p>
        <ul className="space-y-2 mt-2">
          <Rule>The item received is significantly different from the listing description.</Rule>
          <Rule>The item is broken, damaged, or non-functional and was not disclosed.</Rule>
          <Rule>The seller agreed in writing (chat) to a refund before or after the sale.</Rule>
          <Rule>The listing was fraudulent or the item was counterfeit.</Rule>
        </ul>
        <p>
          Refunds are <strong className="text-main">not guaranteed</strong> for
          change-of-mind purchases, items described accurately as used or
          damaged, or disputes arising more than <strong className="text-main">7 days</strong> after delivery.
        </p>
      </Section>

      <Section icon={ShieldCheck} title="Raising a Dispute">
        <p>
          If you cannot resolve an issue directly with the other party, you can
          open a dispute with CampusConnect. Here is how:
        </p>
        <ol className="space-y-3 mt-2 list-none">
          {[
            { step: "1", text: 'Use the "Report" button on the listing page to flag the transaction and explain the problem.' },
            { step: "2", text: "Our team will contact both parties within 2 business days." },
            { step: "3", text: "Provide evidence: screenshots of your chat, photos of the item, and any receipts or MoMo transaction IDs." },
            { step: "4", text: "We will review and issue a finding within 5 business days of receiving evidence from both sides." },
          ].map(({ step, text }) => (
            <li key={step} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-soft border border-[hsl(var(--primary)/0.3)] text-brand text-xs font-bold grid place-items-center shrink-0">
                {step}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section icon={Clock} title="Timeframes">
        <ul className="space-y-2">
          <Rule icon={Clock} color="text-blue-400">
            <strong className="text-main">7 days</strong> — window to raise a dispute after receiving an item.
          </Rule>
          <Rule icon={Clock} color="text-blue-400">
            <strong className="text-main">2 business days</strong> — response time from our team after you report.
          </Rule>
          <Rule icon={Clock} color="text-blue-400">
            <strong className="text-main">5 business days</strong> — resolution time once evidence is submitted by both parties.
          </Rule>
          <Rule icon={XCircle} color="text-red-400">
            Disputes submitted more than 7 days after delivery may not be
            accepted unless fraud is alleged.
          </Rule>
        </ul>
      </Section>

      <Section icon={AlertTriangle} title="What CampusConnect Can Do">
        <p>
          While we cannot force a refund or recover money on your behalf, we can
          take the following actions against sellers found to be acting in bad
          faith:
        </p>
        <ul className="space-y-2 mt-2">
          <Rule>Issue a formal warning and reduce the seller's trust score.</Rule>
          <Rule>Temporarily suspend or permanently ban the seller's account.</Rule>
          <Rule>Remove fraudulent listings immediately.</Rule>
          <Rule>Escalate repeated fraud cases to university authorities where applicable.</Rule>
        </ul>
      </Section>

      <Section icon={XCircle} title="What We Cannot Do">
        <ul className="space-y-2">
          <Rule icon={XCircle} color="text-red-400">
            We cannot issue or guarantee refunds — money is exchanged between
            students directly.
          </Rule>
          <Rule icon={XCircle} color="text-red-400">
            We cannot intervene in disputes where no evidence is provided.
          </Rule>
          <Rule icon={XCircle} color="text-red-400">
            We cannot recover items that have been physically handed over.
          </Rule>
          <Rule icon={XCircle} color="text-red-400">
            We cannot take action on disputes filed after the 7-day window
            (except in cases of clear fraud).
          </Rule>
        </ul>
      </Section>

      <Section icon={MessageCircle} title="Contact Us">
        <p>
          If you have a dispute or question about this policy, reach out via our{" "}
          <a href="/support" className="text-brand underline underline-offset-2 hover:brightness-110 transition">
            Customer Support
          </a>{" "}
          page or through the in-app help centre at{" "}
          <a href="/help" className="text-brand underline underline-offset-2 hover:brightness-110 transition">
            Help &amp; FAQ
          </a>
          .
        </p>
        <p className="text-xs text-faint mt-2">
          For urgent fraud cases, please include "URGENT FRAUD" in your support
          message subject so our team can prioritise your case.
        </p>
      </Section>
    </div>
  );
}
