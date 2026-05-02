import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  HelpCircle,
  MessageCircle,
  Info,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../context/ToastContext";
function InformationTab() {
  const toast = useToast();
  return (
    <div className="space-y-6">
      <p className="text-slate-400">
        Welcome to the CampusConnect Help Center. Here you can find answers to
        common questions and get support for any issues you might encounter.
      </p>
      <section>
        <h2 className="text-xl font-bold text-white mb-3">Getting Started</h2>
        <ul className="list-disc list-inside space-y-2 text-slate-300">
          <li>
            <Link to="/about" className="text-indigo-400 hover:underline">
              About CampusConnect
            </Link>
          </li>
          <li>
            <Link to="/terms" className="text-indigo-400 hover:underline">
              Terms of Service
            </Link>
          </li>
          <li>
            <Link to="/privacy" className="text-indigo-400 hover:underline">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link to="/safety" className="text-indigo-400 hover:underline">
              Safety Tips
            </Link>
          </li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-bold text-white mb-3">Contact Support</h2>
        <p className="text-slate-400">
          If you can't find what you're looking for, our support team is here to
          help. You can reach us via:
        </p>
        <ul className="list-disc list-inside space-y-2 text-slate-300">
          <li>
            Email:{" "}
            <a
              href="mailto:hello@campusconnect.gh"
              className="text-indigo-400 hover:underline"
            >
              hello@campusconnect.gh
            </a>
          </li>
          <li>
            WhatsApp:{" "}
            <a
              href="https://wa.me/233546945944"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline"
            >
              +233 546 945 944
            </a>
          </li>
          <li>
            Or visit our{" "}
            <Link to="/support" className="text-indigo-400 hover:underline">
              Customer Support page
            </Link>
            .
          </li>
        </ul>
      </section>
    </div>
  );
}

function FAQTab() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFAQs();
  }, []);

  async function fetchFAQs() {
    setLoading(true);
    const { data, error } = await supabase
      .from("faq_questions")
      .select("*")
      .not("answer", "is", null) // Only show answered questions
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching FAQs:", error);
    } else {
      setFaqs(data || []);
    }
    setLoading(false);
  }

  async function handleSubmitQuestion(e) {
    e.preventDefault();
    if (!question.trim()) {
      toast.error("Please enter your question.");
      return;
    }
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("faq_questions").insert({
        asker_id: user?.id || null,
        question: question.trim(),
      });

      if (error) throw error;

      toast.success(
        "Your question has been submitted! We'll get back to you soon.",
      );
      setQuestion("");
    } catch (error) {
      toast.error(error.message || "Failed to submit question.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-bold text-white mb-3">
          Frequently Asked Questions
        </h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : faqs.length === 0 ? (
          <p className="text-slate-400">
            No FAQs available yet. Ask a question below!
          </p>
        ) : (
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4"
              >
                <summary className="text-white font-bold cursor-pointer">
                  {faq.question}
                </summary>
                <p className="text-slate-400 text-sm mt-3">{faq.answer}</p>
              </details>
            ))}
          </div>
        )}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Have a question?</h2>
        <p className="text-slate-400">
          Can't find the answer you're looking for? Submit your question and
          we'll get back to you.
        </p>
        <form onSubmit={handleSubmitQuestion} className="space-y-4">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question here..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none min-h-[100px]"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
            {submitting ? "Submitting..." : "Submit Question"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default function NeedHelp() {
  const location = useLocation();
  const isInformationActive =
    location.pathname === "/help" || location.pathname === "/help/information";

  return (
    <div className="max-w-5xl mx-auto px-4">
      <header className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Support
        </p>
        <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
          How can we help?
        </h1>
      </header>

      <nav className="mb-6 border-b border-slate-800 flex gap-1 overflow-x-auto">
        <NavLink
          to="/help/information"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 md:px-4 py-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              isInformationActive
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-500 hover:text-slate-200"
            }`
          }
        >
          <Info size={15} />
          Information
        </NavLink>
        <NavLink
          to="/help/faq"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 md:px-4 py-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-500 hover:text-slate-200"
            }`
          }
        >
          <MessageSquare size={15} />
          FAQ
        </NavLink>
      </nav>

      <Outlet />
    </div>
  );
}

export { InformationTab, FAQTab };
