import { useEffect, useRef, useState } from "react";

/**
 * NavShell — wraps TopNav + SecondaryBar as one sticky unit.
 *
 * Behaviour:
 *  • Always visible within the first 80px of scroll
 *  • Hides (slides up) when scrolling DOWN by more than 6px
 *  • Reappears instantly when scrolling UP by even 2px
 *  • Always visible when near the bottom of the page
 *
 * Why the previous version broke:
 *  overflow-x: hidden on <html> or <body> creates a new scroll container
 *  and breaks position:sticky on descendant elements. The fix is in
 *  index.css (removed overflow-x from html/body, use .app-root clip instead).
 */
export default function NavShell({ children }) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    // Initialise lastY so first tiny scroll doesn't misfire
    lastY.current = window.scrollY;

    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY.current;

        const nearBottom =
          y + window.innerHeight >= document.documentElement.scrollHeight - 100;

        if (y < 80) {
          // Always show near the top
          setHidden(false);
        } else if (dy > 6 && !nearBottom) {
          // Scrolling down — hide
          setHidden(true);
        } else if (dy < -2) {
          // Scrolling up even a tiny bit — show immediately
          setHidden(false);
        }

        lastY.current = y;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="sticky top-0 z-[120] will-change-transform"
      style={{
        transform: hidden ? "translateY(-100%)" : "translateY(0)",
        transition: hidden
          ? "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)" /* hide: fast ease-in */
          : "transform 0.22s cubic-bezier(0.0, 0, 0.2, 1)" /* show: snappier */,
      }}
    >
      {children}
    </div>
  );
}
