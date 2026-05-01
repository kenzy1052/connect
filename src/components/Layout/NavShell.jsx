import { useEffect, useRef, useState } from "react";

/**
 * NavShell — wraps TopNav + SecondaryBar so they hide/show as one unit.
 * Hides on scroll-down (after 80px), shows on scroll-up.
 * Sticky at top with translate animation.
 */
export default function NavShell({ children }) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      const nearBottom =
        y + window.innerHeight >= document.documentElement.scrollHeight - 80;
      if (y < 80) setHidden(false);
      else if (dy > 8 && !nearBottom) setHidden(true);
      else if (dy < -4) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`sticky top-0 z-[120] transition-transform duration-300 ease-out will-change-transform ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {children}
    </div>
  );
}
