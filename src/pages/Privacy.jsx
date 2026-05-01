export default function Privacy() {
  const sections = [
    {
      title: "1. Information We Collect",
      content: `We collect information necessary to provide and improve our service:
• Account Information: Email, full name, phone number (optional), profile photo
• Listing Data: Item descriptions, photos, prices, categories, location
• Transaction Data: Purchase history, ratings, reviews, trust scores
• Usage Data: Pages visited, features used, device information, IP address
• Communication: Messages between buyers and sellers, support inquiries`,
    },
    {
      title: "2. How We Use Your Information",
      content: `We use your information to:
• Create and maintain your account
• Process transactions and payments
• Calculate trust scores and reputation
• Improve platform features and user experience
• Send important notifications and updates
• Prevent fraud and ensure platform safety
• Comply with legal obligations
• Respond to support inquiries`,
    },
    {
      title: "3. Data Security",
      content: `We take data security seriously:
• We use encryption for sensitive information
• Passwords are hashed and never stored in plain text
• Access to personal data is restricted to authorized personnel
• We regularly audit our security practices
• We comply with industry best practices
• However, no system is 100% secure; use strong passwords`,
    },
    {
      title: "4. Sharing Your Information",
      content: `We do NOT sell your personal information. We may share data:
• With other users (limited profile information for trust purposes)
• With service providers (payment processors, hosting providers)
• When legally required by law enforcement
• To prevent fraud or protect user safety
• With your consent for specific purposes`,
    },
    {
      title: "5. Third-Party Services",
      content: `Our platform uses third-party services:
• Supabase for authentication and database
• Payment processors for transactions
• Analytics services to understand usage patterns
• These services have their own privacy policies
• We recommend reviewing their policies`,
    },
    {
      title: "6. Your Rights",
      content: `You have the right to:
• Access your personal data
• Request corrections to inaccurate data
• Delete your account and associated data
• Opt-out of non-essential communications
• Request a copy of your data
• Contact us with privacy concerns`,
    },
    {
      title: "7. Cookies & Tracking",
      content: `We use cookies and similar technologies to:
• Remember your login information
• Understand how you use the platform
• Improve user experience
• You can disable cookies in your browser settings
• Some features may not work without cookies`,
    },
    {
      title: "8. Children's Privacy",
      content: `CampusConnect is intended for students aged 18 and above. We do not knowingly collect information from children under 13. If we become aware of such collection, we will delete the information and terminate the account.`,
    },
    {
      title: "9. Data Retention",
      content: `We retain your information:
• While your account is active
• For legal and compliance purposes
• For fraud prevention and security
• You can request deletion of inactive accounts
• Some data may be retained in backups`,
    },
    {
      title: "10. Changes to Privacy Policy",
      content: `We may update this policy periodically. We will notify you of significant changes via email or platform notification. Continued use of CampusConnect constitutes acceptance of updated policies.`,
    },
    {
      title: "11. Contact Us",
      content: `If you have privacy concerns or questions:
• Email: hello@campusconnect.gh
• WhatsApp: +233 546 945 944
• We will respond to privacy inquiries within 7 business days`,
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
            Privacy Policy
          </h1>
          <p className="text-lg text-slate-400">
            We collect only what we need to keep the marketplace safe and functional. We never sell your information.
          </p>
        </header>

        {/* Last Updated */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-8">
          <p className="text-sm text-slate-400">
            <span className="font-bold">Last Updated:</span> April 28, 2026
          </p>
        </div>

        {/* Privacy Sections */}
        <div className="space-y-6">
          {sections.map((section, idx) => (
            <section
              key={idx}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/30 transition-colors"
            >
              <h2 className="text-lg font-bold text-indigo-400 mb-3">{section.title}</h2>
              <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        {/* Key Commitments */}
        <section className="bg-gradient-to-br from-emerald-600/10 to-slate-900 border border-emerald-500/20 rounded-2xl p-8 mt-12">
          <h2 className="text-2xl font-bold text-white mb-4">Our Commitments</h2>
          <ul className="space-y-3 text-slate-300">
            <li className="flex gap-3">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>We will never sell your personal data to third parties</span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>We use industry-standard encryption to protect your information</span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>You have full control over your data and can request deletion</span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>We are transparent about how we collect and use data</span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>We comply with all applicable data protection laws</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
