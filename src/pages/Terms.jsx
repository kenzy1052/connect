import { FileText, Mail } from "lucide-react";
export default function Terms() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content:
        "By accessing and using CampusConnect, you agree to be bound by these Terms of Service. If you do not agree to abide by the above, please do not use this service.",
    },
    {
      title: "2. User Responsibilities",
      content: `You agree to:
• Provide accurate and truthful information when creating your account
• Use the platform only for lawful purposes
• Not engage in any conduct that restricts or inhibits anyone's use or enjoyment of the platform
• Not post or transmit hateful, threatening, abusive, defamatory, obscene, or otherwise objectionable material
• Not list items that are illegal or violate community standards
• Respect intellectual property rights of others`,
    },
    {
      title: "3. Prohibited Items",
      content: `The following items are strictly prohibited:
• Illegal substances or controlled items
• Weapons or explosives
• Counterfeit or stolen goods
• Items that violate copyright or trademark laws
• Hazardous materials
• Adult content or services
• Any items that violate local laws`,
    },
    {
      title: "4. Listing Guidelines",
      content: `When posting listings, you must:
• Provide accurate descriptions and photos
• Disclose any defects or issues with items
• Price items fairly and honestly
• Not engage in spam or duplicate listings
• Not use the platform for commercial purposes without permission
• Comply with all applicable laws`,
    },
    {
      title: "5. Transactions",
      content: `CampusConnect facilitates connections between buyers and sellers but:
• Is not responsible for the quality of items or services
• Does not guarantee the completion of transactions
• Recommends meeting in public places for safety
• Advises verifying items before payment
• Is not liable for disputes between users`,
    },
    {
      title: "6. Trust Score & Reputation",
      content: `Your trust score is based on:
• Transaction history and ratings
• Community feedback and reviews
• Account age and activity
• Compliance with community guidelines
• Maintaining a trust score helps build credibility and improves visibility`,
    },
    {
      title: "7. Suspension & Termination",
      content: `CampusConnect reserves the right to:
• Suspend or terminate accounts that violate these terms
• Remove listings that violate community standards
• Ban users from the platform for serious violations
• Report illegal activity to appropriate authorities
• Enforce these terms at our sole discretion`,
    },
    {
      title: "8. Limitation of Liability",
      content: `CampusConnect is provided "as is" without warranties. We are not liable for:
• Indirect, incidental, or consequential damages
• Loss of data or profits
• Issues arising from user interactions
• Third-party content or actions
• Service interruptions or errors`,
    },
    {
      title: "9. Dispute Resolution",
      content: `In case of disputes:
• Users should attempt to resolve issues directly
• Contact our support team for assistance
• We will investigate and mediate disputes fairly
• Final decisions are at CampusConnect's discretion
• Users agree to accept our resolution`,
    },
    {
      title: "10. Changes to Terms",
      content: `We may update these terms at any time. Continued use of the platform constitutes acceptance of updated terms. We recommend reviewing these terms periodically.`,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-12">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Legal
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-lg text-slate-400">
            By using CampusConnect, you agree to trade honestly, list real
            items, and respect fellow students. Please read these terms
            carefully.
          </p>
        </header>

        {/* Last Updated */}
        <div className="premium-card p-4 mb-8">
          <p className="text-sm text-muted">
            <span className="font-bold text-main">Last Updated:</span> April 28,
            2026
          </p>
        </div>

        {/* Terms Sections */}
        <div className="space-y-6">
          {sections.map((section, idx) => (
            <section
              key={idx}
              className="premium-card p-6 hover:border-brand/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <FileText size={15} className="text-brand shrink-0" />
                <h2 className="text-base font-bold text-brand">
                  {section.title}
                </h2>
              </div>
              <p className="text-muted whitespace-pre-line leading-relaxed text-sm">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        {/* Contact */}
        <section
          className="premium-card p-8 mt-12"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary)/0.08), hsl(var(--surface)))",
            borderColor: "hsl(var(--primary)/0.2)",
          }}
        >
          <h2 className="text-xl font-bold text-main mb-3">Questions?</h2>
          <p className="text-muted text-sm">
            If you have any questions about these Terms of Service, please
            contact us at{" "}
            <a
              href="mailto:hello@campusconnect.gh"
              className="text-brand hover:underline inline-flex items-center gap-1"
            >
              <Mail size={13} />
              hello@campusconnect.gh
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
