import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, ShoppingBag, Sparkles, ArrowRight, Zap } from "lucide-react";

const QUICK_CATEGORIES = [
  { label: "Electronics", slug: "electronics", emoji: "💻" },
  { label: "Books", slug: "books-study", emoji: "📚" },
  { label: "Clothing", slug: "clothing", emoji: "👕" },
  { label: "Tutoring", slug: "tutoring", emoji: "🎓" },
  { label: "Food & Snacks", slug: "food-snacks", emoji: "🍱" },
  { label: "Tech Services", slug: "tech-services", emoji: "🔧" },
  { label: "Beauty", slug: "beauty-personal", emoji: "✨" },
  { label: "Laundry", slug: "laundry", emoji: "🫧" },
];

export default function HeroSection() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
    else navigate("/browse");
  };

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--primary) / 0.18) 0%, hsl(var(--bg)) 50%, hsl(var(--primary-2, var(--primary)) / 0.12) 100%)",
        borderBottom: "1px solid hsl(var(--border))",
      }}
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--text)) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(var(--text)) 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
          opacity: 0.03,
        }}
      />

      {/* Glow blobs */}
      <div
        className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full pointer-events-none blur-3xl"
        style={{ background: "hsl(var(--primary) / 0.15)" }}
      />
      <div
        className="absolute -bottom-20 right-0 w-[400px] h-[400px] rounded-full pointer-events-none blur-3xl"
        style={{ background: "hsl(var(--primary-2, var(--primary)) / 0.10)" }}
      />

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-14 md:py-20 flex flex-col items-center text-center gap-6">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest"
          style={{
            background: "hsl(var(--primary) / 0.12)",
            border: "1px solid hsl(var(--primary) / 0.25)",
            color: "hsl(var(--primary))",
          }}
        >
          <Sparkles size={11} />
          <span>UCC Student Marketplace</span>
        </div>

        {/* Headline */}
        <div>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05]"
            style={{ color: "hsl(var(--text))" }}
          >
            Buy &amp; Sell
            <br />
            <span style={{ color: "hsl(var(--primary))" }}>on Campus</span>
          </h1>
          <p
            className="text-base md:text-lg mt-4 max-w-md mx-auto leading-relaxed"
            style={{ color: "hsl(var(--text-muted))" }}
          >
            The fastest way to trade with fellow UCC students — phones, books,
            services &amp; more.
          </p>
        </div>

        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <form
          onSubmit={handleSearch}
          className="w-full max-w-2xl flex items-center gap-2 rounded-2xl p-1.5 shadow-2xl"
          style={{
            background: "hsl(var(--surface))",
            border: "1px solid hsl(var(--border))",
          }}
        >
          <Search
            size={17}
            className="ml-2.5 shrink-0"
            style={{ color: "hsl(var(--text-faint))" }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search listings, services, or sellers…"
            className="flex-1 bg-transparent text-sm outline-none py-2.5 pr-1"
            style={{ color: "hsl(var(--text))" }}
          />
          <button
            type="submit"
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97] hover:brightness-110"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-fg, 255 255 255))",
            }}
          >
            <span className="hidden sm:inline">Search</span>
            <ArrowRight size={14} />
          </button>
        </form>

        {/* ── CTAs ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97] hover:brightness-110"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-fg, 255 255 255))",
            }}
          >
            <ShoppingBag size={14} />
            Browse Listings
          </Link>
          <Link
            to="/sell"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-[0.97]"
            style={{
              background: "hsl(var(--surface))",
              border: "1px solid hsl(var(--border))",
              color: "hsl(var(--text-muted))",
            }}
          >
            <Zap size={14} />
            Start Selling
          </Link>
        </div>

        {/* ── Quick categories ────────────────────────────────────────────── */}
        <div className="w-full pt-1">
          <p
            className="text-[10px] font-black uppercase tracking-widest mb-3"
            style={{ color: "hsl(var(--text-faint))" }}
          >
            Popular categories
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                to={`/browse?category=${c.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-[0.97]"
                style={{
                  background: "hsl(var(--surface-2))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--text-muted))",
                }}
              >
                <span role="img" aria-hidden="true">
                  {c.emoji}
                </span>
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
