import { AlertTriangle, Shield, Lock, Users, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function Safety() {
  const tips = [
    {
      icon: Users,
      title: "Meeting in Person",
      items: [
        "Always meet in a public place with other people around.",
        "Tell a friend or family member where you're going and when you expect to be back.",
        "Consider bringing a friend with you, especially for high-value transactions.",
        "Avoid meeting at your home or the seller's/buyer's home.",
        "Meet during daylight hours when possible.",
      ],
    },
    {
      icon: Lock,
      title: "Transaction Safety",
      items: [
        "Inspect items thoroughly before purchasing.",
        "Use secure payment methods. Avoid sharing personal financial information.",
        "Be wary of deals that seem too good to be true.",
        "Never give out your bank account details, credit card numbers, or other sensitive financial information.",
        "Request proof of ownership for high-value items.",
      ],
    },
    {
      icon: Shield,
      title: "Personal Information",
      items: [
        "Do not share unnecessary personal information (e.g., home address, daily schedule) with strangers.",
        "Communicate through the app's messaging system initially.",
        "Verify seller information before making large purchases.",
        "Be cautious of requests for personal identification details.",
        "Keep your password secure and never share it with anyone.",
      ],
    },
    {
      icon: AlertTriangle,
      title: "Red Flags to Watch For",
      items: [
        "Sellers requesting payment before showing the item.",
        "Requests to wire money or use untraceable payment methods.",
        "Sellers unwilling to meet in public places.",
        "Listings with suspiciously low prices.",
        "Sellers pressuring you to make quick decisions.",
        "Requests for personal information beyond what's necessary.",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-12">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Safety & Trust
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Stay Safe on CampusConnect
          </h1>
          <p className="text-lg text-slate-400">
            Your safety is our top priority. Follow these guidelines to ensure a secure and positive experience.
          </p>
        </header>

        {/* Tips Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {tips.map((tip, idx) => {
            const Icon = tip.icon;
            return (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-colors"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <Icon size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-white">{tip.title}</h2>
                </div>
                <ul className="space-y-2">
                  {tip.items.map((item, i) => (
                    <li key={i} className="flex gap-3 text-slate-300 text-sm">
                      <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Reporting Section */}
        <section className="bg-gradient-to-br from-indigo-600/20 to-slate-900 border border-indigo-500/30 rounded-2xl p-8 mb-12">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-indigo-400 mt-1 shrink-0" size={24} />
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Report Suspicious Activity</h2>
              <p className="text-slate-300 mb-4">
                If you encounter any suspicious behavior, fraudulent listings, or feel unsafe, please report it to us immediately. Your report helps us keep the community safe for everyone.
              </p>
              <Link
                to="/support"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </section>

        {/* Best Practices */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Best Practices for Sellers</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold text-indigo-400 mb-3">✓ Do's</h3>
              <ul className="space-y-2 text-slate-300">
                <li>• Provide clear, accurate descriptions of your items</li>
                <li>• Take high-quality photos from multiple angles</li>
                <li>• Respond promptly to buyer inquiries</li>
                <li>• Be honest about item condition</li>
                <li>• Meet in safe, public locations</li>
                <li>• Verify payment before handing over items</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-400 mb-3">✗ Don'ts</h3>
              <ul className="space-y-2 text-slate-300">
                <li>• Don't accept payment before meeting</li>
                <li>• Don't meet alone in isolated areas</li>
                <li>• Don't share personal contact details too early</li>
                <li>• Don't accept suspicious payment methods</li>
                <li>• Don't pressure buyers into quick decisions</li>
                <li>• Don't list items you don't have</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
