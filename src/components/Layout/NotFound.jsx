import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6">
          <Compass size={28} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
          404 — page not found
        </p>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          You wandered off campus.
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed mb-8">
          The page you were looking for doesn't exist or has been moved. Let's
          get you back to something useful.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
          >
            Browse the feed
          </Link>
          <Link
            to="/account"
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
          >
            My account
          </Link>
        </div>
      </div>
    </div>
  );
}
