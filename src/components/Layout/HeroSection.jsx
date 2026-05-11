import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Tag,
  Laptop,
  BookOpen,
  Shirt,
  GraduationCap,
  UtensilsCrossed,
  Wrench,
  WashingMachine,
} from "lucide-react";

/**
 * These match the SLUGS in the categories table.
 * MainApp translates slug → UUID when setting categoryId.
 */
const QUICK_CATEGORIES = [
  { label: "Electronics", slug: "electronics", icon: Laptop },
  { label: "Books", slug: "books-study", icon: BookOpen },
  { label: "Clothing", slug: "clothing", icon: Shirt },
  { label: "Tutoring", slug: "tutoring", icon: GraduationCap },
  { label: "Food", slug: "food-snacks", icon: UtensilsCrossed },
  { label: "Tech Help", slug: "tech-services", icon: Wrench },
  { label: "Beauty", slug: "beauty-personal", icon: Sparkles },
  { label: "Laundry", slug: "laundry", icon: WashingMachine },
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
          "linear-gradient(145deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--bg)) 55%, hsl(var(--primary) / 0.08) 100%)",
        borderBottom: "1px solid hsl(var(--border))",
      }}
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--text) / 0.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Glow blobs */}
      <div
        className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full pointer-events-none blur-3xl"
        style={{ background: "hsl(var(--primary) / 0.12)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-[320px] h-[320px] rounded-full pointer-events-none blur-3xl"
        style={{ background: "hsl(var(--primary) / 0.08)" }}
      />

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-18 flex flex-col items-center text-center gap-5">
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
          UCC Student Marketplace
        </div>

        {/* Headline */}
        <div>
          <h1
            className="text-4xl sm:text-5xl md:text-[56px] font-black tracking-tight leading-[1.05]"
            style={{ color: "hsl(var(--text))" }}
          >
            Buy &amp; Sell
            <br />
            <span style={{ color: "hsl(var(--primary))" }}>on Campus</span>
          </h1>
          <p
            className="text-sm md:text-base mt-3 max-w-sm mx-auto leading-relaxed"
            style={{ color: "hsl(var(--text-muted))" }}
          >
            The fastest way to trade with fellow UCC students — phones, books,
            services &amp; more.
          </p>
        </div>

        {/* ── Search bar ─────────────────────────────────────────────── */}
        <form
          onSubmit={handleSearch}
          className="w-full max-w-xl flex items-center gap-2 rounded-2xl p-1.5"
          style={{
            background: "hsl(var(--surface))",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 8px 32px hsl(var(--primary) / 0.15)",
          }}
        >
          <Search
            size={16}
            className="ml-2.5 shrink-0"
            style={{ color: "hsl(var(--text-faint))" }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search listings, services, sellers…"
            className="flex-1 bg-transparent text-sm outline-none py-2.5 pr-1"
            style={{ color: "hsl(var(--text))" }}
          />
          <button
            type="submit"
            className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97] hover:brightness-110"
            style={{ background: "hsl(var(--primary))", color: "white" }}
          >
            <span className="hidden sm:inline">Search</span>
            <ArrowRight size={14} />
          </button>
        </form>

        {/* ── CTAs ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97] hover:brightness-110"
            style={{ background: "hsl(var(--primary))", color: "white" }}
          >
            <ShoppingBag size={14} />
            Browse Listings
          </Link>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-[0.97]"
            style={{
              background: "hsl(var(--surface))",
              border: "1px solid hsl(var(--border))",
              color: "hsl(var(--text-muted))",
            }}
          >
            <Tag size={14} />
            Start Selling
          </Link>
        </div>

        {/* ── Category chips ──────────────────────────────────────────── */}
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
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-[0.97]"
                style={{
                  background: "hsl(var(--surface-2))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--text-muted))",
                }}
              >
                {/* Render the Lucide icon component dynamically */}
                <c.icon size={14} className="opacity-80" />
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
