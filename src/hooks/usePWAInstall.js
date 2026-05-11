/**
 * usePWAInstall — captures the browser's "beforeinstallprompt" event
 * so we can show our own install UI at the right moment.
 *
 * Usage:
 *   const { canInstall, install, dismiss } = usePWAInstall();
 *   if (canInstall) <PWAInstallBanner onInstall={install} onDismiss={dismiss} />
 *
 * Notes:
 *   - Only fires on Chrome/Edge Android and Chrome Desktop
 *   - iOS Safari has no programmatic prompt; user must use Share → Add to Home Screen
 *   - Once dismissed, we suppress it for 7 days
 */
import { useState, useEffect, useCallback } from "react";

const DISMISSED_KEY = "cc.pwa_install_dismissed_until";

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Already running as installed PWA?
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // iOS detection
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIos(ios);

    // Check suppression timer
    const until = localStorage.getItem(DISMISSED_KEY);
    if (until && Date.now() < Number(until)) return;

    // Listen for Chrome/Edge install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // On iOS, show our manual guide after a short delay (no native prompt)
    if (ios && !standalone) {
      const t = setTimeout(() => setCanInstall(true), 4000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setCanInstall(false);
      if (outcome === "dismissed") {
        localStorage.setItem(
          DISMISSED_KEY,
          String(Date.now() + 7 * 24 * 3600 * 1000),
        );
      }
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setCanInstall(false);
    setDeferredPrompt(null);
    // Suppress for 7 days
    localStorage.setItem(
      DISMISSED_KEY,
      String(Date.now() + 7 * 24 * 3600 * 1000),
    );
  }, []);

  return { canInstall, install, dismiss, isIos, isStandalone };
}
