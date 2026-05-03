import { Link } from "react-router-dom";
import { Mail, Phone, ShieldCheck, MessageCircle } from "lucide-react";
import { FiInstagram } from "react-icons/fi";

const SUPPORT_PHONE = "0546 945 944";
const SUPPORT_PHONE_TEL = "+233546945944";
const BUSINESS_EMAIL = "hello@campusconnect.com";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-app bg-surface mt-16">
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Adjusted grid: 1 column on tiny screens, 2 on small, 4 on medium+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-10">
          {/* About */}
          <div className="sm:col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-7 h-7 rounded-md gradient-brand grid place-items-center">
                <span className="text-[hsl(var(--primary-fg))] font-black text-xs">
                  C
                </span>
              </div>
              <span className="text-base font-bold tracking-tight text-main">
                CampusConnect
              </span>
            </Link>
            <p className="text-xs text-muted mt-3 leading-relaxed max-w-xs">
              The marketplace built for the University of Cape Coast. Buy, sell,
              and find services on campus — safer, faster, and made by students
              for students.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-faint mb-3">
              Quick links
            </p>
            <ul className="space-y-2 text-sm">
              <FooterLink to="/">Home</FooterLink>
              <FooterLink to="/browse">Browse all listings</FooterLink>
              <FooterLink to="/create">Sell something</FooterLink>
              <FooterLink to="/account">Account settings</FooterLink>
              <FooterLink to="/help">FAQ &amp; Help</FooterLink>
              <FooterLink to="/safety">Safety tips</FooterLink>
              <FooterLink to="/refund-policy">Refund &amp; Disputes</FooterLink>
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-faint mb-3">
              Customer support
            </p>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href={`tel:${SUPPORT_PHONE_TEL}`}
                  className="flex items-start gap-2 text-muted hover:text-main transition-colors"
                >
                  <Phone size={14} className="mt-0.5 text-brand" />
                  <span>
                    <span className="block text-[10px] uppercase tracking-widest text-faint">
                      Call us
                    </span>
                    <span className="font-medium">{SUPPORT_PHONE}</span>
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${BUSINESS_EMAIL}`}
                  className="flex items-start gap-2 text-muted hover:text-main transition-colors"
                >
                  <Mail size={14} className="mt-0.5 text-brand" />
                  <span>
                    <span className="block text-[10px] uppercase tracking-widest text-faint">
                      Email
                    </span>
                    <span className="font-medium whitespace-nowrap">
                      {BUSINESS_EMAIL}
                    </span>
                  </span>
                </a>
              </li>
              <li>
                <Link
                  to="/support"
                  className="inline-flex items-center gap-1.5 text-brand hover:underline text-xs font-semibold"
                >
                  <MessageCircle size={13} /> Open support form
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-faint mb-3">
              Connect
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://instagram.com/campusconnect.gh"
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted hover:text-main transition-colors flex items-center gap-2"
                >
                  <FiInstagram size={14} /> Instagram
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${SUPPORT_PHONE_TEL.replace("+", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted hover:text-main transition-colors flex items-center gap-2"
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-muted hover:text-main transition-colors flex items-center gap-2"
                >
                  <ShieldCheck size={14} /> Privacy
                </Link>
              </li>
              <li>
                <div className="flex flex-col gap-2 mt-1">
                  <Link
                    to="/refund-policy"
                    className="text-muted hover:text-main transition-colors"
                  >
                    Refund Policy
                  </Link>
                  <Link
                    to="/terms"
                    className="text-muted hover:text-main transition-colors"
                  >
                    Terms of service
                  </Link>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-6 border-t border-app flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-[11px] text-faint text-center sm:text-left">
            © {year} CampusConnect. Built with care in Cape Coast.
          </p>

          <a
            href="https://kenzyverse.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-[11px] text-muted hover:text-main transition-colors"
            aria-label="Powered by Kenzyverse"
          >
            <span className="opacity-70">Powered by</span>
            {/* New Kenzyverse Logo Image */}
            <img
              src="/kenzyverse-logo.png"
              alt="Kenzyverse"
              className="h-5 w-auto block object-contain"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }) {
  return (
    <li>
      <Link to={to} className="text-muted hover:text-main transition-colors">
        {children}
      </Link>
    </li>
  );
}
