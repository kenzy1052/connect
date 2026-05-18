// src/components/Admin/Reports/ReporterItem.jsx
//
// TASK 4 FIX — Theming:
//  Before: Avatar used bg-indigo-600/20 border-indigo-500/20 text-indigo-300
//          False Report button used border-red-500/40 bg-red-500/5 text-red-400
//  After:  All colors use CSS theme variables (--primary, --danger).

import { AlertTriangle } from "lucide-react";

function timeAgo(ts) {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const REASON_LABELS = {
  spam: "Spam or misleading",
  fake: "Fake or counterfeit item",
  prohibited: "Prohibited item",
  wrong_price: "Incorrect / fraudulent pricing",
  already_sold: "Already sold but still listed",
  other: "Other",
};

export default function ReporterItem({ report, onFalseReport }) {
  const name = report.reporter_name ?? "Anonymous";

  return (
    <div className="flex items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-surface-2/40 transition-colors">
      {/* Avatar — brand-primary tint, theme-aware */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-black text-[12px] shrink-0"
        style={{
          background: "hsl(var(--primary)/0.12)",
          border: "1px solid hsl(var(--primary)/0.2)",
          color: "hsl(var(--primary))",
        }}
      >
        {name.charAt(0).toUpperCase()}
      </div>

      {/* Name + reason + details */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-main leading-tight truncate">
          {name}
        </p>
        <p className="text-[11px] text-muted leading-tight truncate">
          {REASON_LABELS[report.reason] ?? report.reason}
          {report.details && (
            <span className="text-faint hidden sm:inline">
              {" "}
              · {report.details}
            </span>
          )}
        </p>
      </div>

      {/* Timestamp */}
      <p className="text-[10px] text-faint shrink-0 hidden md:block whitespace-nowrap">
        {timeAgo(report.created_at)}
      </p>

      {/* False Report button — danger tint, theme-aware */}
      <button
        onClick={() =>
          onFalseReport({
            reportId: report.report_id,
            reporterId: report.reporter_id,
            reporterName: name,
          })
        }
        className="shrink-0 flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg
          text-[10px] font-black transition-colors whitespace-nowrap"
        style={{
          background: "hsl(var(--danger)/0.06)",
          border: "1px solid hsl(var(--danger)/0.35)",
          color: "hsl(var(--danger))",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "hsl(var(--danger)/0.14)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "hsl(var(--danger)/0.06)";
        }}
      >
        <AlertTriangle size={9} />
        False Report (−2)
      </button>
    </div>
  );
}
