import { Heart, Users, Zap, Shield } from "lucide-react";

export default function About() {
  const values = [
    {
      icon: Heart,
      title: "Student-First",
      description: "Built by students, for students. We understand campus life and its unique challenges.",
    },
    {
      icon: Users,
      title: "Community-Driven",
      description: "We believe in the power of peer-to-peer commerce and building trust within our community.",
    },
    {
      icon: Zap,
      title: "Fast & Easy",
      description: "Simple, intuitive design that gets out of your way so you can focus on buying or selling.",
    },
    {
      icon: Shield,
      title: "Safe & Secure",
      description: "Your safety matters. We implement trust scores, verification, and community guidelines.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-12">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            About Us
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            CampusConnect
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed max-w-2xl">
            The student-first marketplace for the University of Cape Coast. Built by students, for students — to make buying, selling, and finding services on campus safer and easier.
          </p>
        </header>

        {/* Mission */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
          <p className="text-slate-300 leading-relaxed">
            We're on a mission to transform how students buy, sell, and connect on campus. CampusConnect removes the friction from peer-to-peer commerce by providing a trusted, intuitive platform where students can discover opportunities, build reputation, and support each other. Whether you're looking for textbooks, electronics, services, or just connecting with peers, CampusConnect makes it simple and safe.
          </p>
        </section>

        {/* Values */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Our Values</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value, idx) => {
              const Icon = value.icon;
              return (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <Icon size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-white">{value.title}</h3>
                  </div>
                  <p className="text-slate-400">{value.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Story */}
        <section className="bg-gradient-to-br from-indigo-600/10 to-slate-900 border border-indigo-500/20 rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Our Story</h2>
          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>
              CampusConnect was born from a simple observation: students at the University of Cape Coast were struggling to find a safe, easy way to buy and sell items on campus. Facebook groups were cluttered, WhatsApp chats were chaotic, and there was no way to build trust or verify sellers.
            </p>
            <p>
              We decided to build the platform we wished existed. A marketplace designed specifically for students, with features like trust scores, verified profiles, and a community-first approach. Today, CampusConnect is home to thousands of students buying, selling, and connecting every day.
            </p>
            <p>
              We're just getting started. Our vision is to expand to more campuses and create the go-to platform for student commerce across Ghana and beyond.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="grid md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Active Users", value: "25,000+" },
            { label: "Listings Posted", value: "50,000+" },
            { label: "Transactions", value: "100,000+" },
            { label: "Trust Score Average", value: "4.8/5" },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center"
            >
              <p className="text-3xl font-black text-indigo-400 mb-1">{stat.value}</p>
              <p className="text-sm text-slate-400">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Contact */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Get in Touch</h2>
          <p className="text-slate-300 mb-6">
            Have questions, feedback, or want to collaborate? We'd love to hear from you.
          </p>
          <div className="space-y-3">
            <p className="text-slate-300">
              <span className="font-bold">Email:</span>{" "}
              <a href="mailto:hello@campusconnect.gh" className="text-indigo-400 hover:underline">
                hello@campusconnect.gh
              </a>
            </p>
            <p className="text-slate-300">
              <span className="font-bold">WhatsApp:</span>{" "}
              <a
                href="https://wa.me/233546945944"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline"
              >
                +233 546 945 944
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
