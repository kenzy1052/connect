/**
 * PWAInstallPrompt — floating banner prompting users to install CampusConnect
 * as a PWA on their device.
 *
 * Renders automatically when:
 *   - Chrome/Edge Android: native "beforeinstallprompt" event is available
 *   - iOS Safari: after 4 seconds, shows manual "Share → Add to Home Screen" guide
 *
 * Add to App.jsx or MainApp.jsx:
 *   import PWAInstallPrompt from "./components/PWAInstallPrompt";
 *   ...
 *   <PWAInstallPrompt />
 */
import { usePWAInstall } from "../hooks/usePWAInstall";
import { Share, Download, X, Smartphone } from "lucide-react";

export default function PWAInstallPrompt() {
  const { canInstall, install, dismiss, isIos } = usePWAInstall();

  if (!canInstall) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-[360px] z-[9000] animate-in slide-in-from-bottom-4 fade-in duration-500"
      role="dialog"
      aria-label="Install CampusConnect app"
    >
      <div
        className="rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          background: "hsl(var(--surface))",
          borderColor: "hsl(var(--primary) / 0.3)",
          boxShadow: "0 20px 60px hsl(var(--primary) / 0.2)",
        }}
      >
        {/* Top accent bar */}
        <div
          className="h-1 w-full"
          style={{
            background:
              "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-2, var(--primary))))",
          }}
        />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* App icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-2, var(--primary))))",
              }}
            >
              <Smartphone size={22} className="text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-black text-main text-sm">
                Install CampusConnect
              </p>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">
                {isIos
                  ? "Add to your Home Screen for instant access"
                  : "Get the full app experience — works offline too"}
              </p>
            </div>

            <button
              onClick={dismiss}
              className="p-1.5 rounded-full hover:bg-surface-2 text-faint hover:text-main transition-colors shrink-0 -mt-0.5 -mr-0.5"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>

          {isIos ? (
            /* iOS manual guide */
            <div
              className="mt-3 p-3 rounded-xl text-xs space-y-1.5"
              style={{ background: "hsl(var(--surface-2))" }}
            >
              <p className="text-main font-bold">
                How to install on iPhone / iPad:
              </p>
              <p className="text-muted flex items-center gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                  1
                </span>
                Tap the <Share size={13} className="inline mx-0.5 shrink-0" />{" "}
                Share button at the bottom of Safari
              </p>
              <p className="text-muted flex items-center gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                  2
                </span>
                Scroll down and tap "Add to Home Screen"
              </p>
              <p className="text-muted flex items-center gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                  3
                </span>
                Tap "Add" in the top right corner
              </p>
            </div>
          ) : (
            /* Chrome/Edge native prompt */
            <button
              onClick={install}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] hover:brightness-110"
              style={{
                background: "hsl(var(--primary))",
                color: "hsl(var(--primary-fg, 255 255 255))",
              }}
            >
              <Download size={15} />
              Install App
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
