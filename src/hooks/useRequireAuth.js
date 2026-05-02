import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

/**
 * Returns a `gate(action)` function:
 * - if the user is signed in, it runs `action()`
 * - if not, it triggers a toast and redirects to /signin after a short delay
 */
export function useRequireAuth() {
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (action) => {
    if (user) {
      // If we have a user, proceed as normal
      if (typeof action === "function") {
        action();
      }
      return true;
    }

    // 1. Alert the user
    toast.error("Please sign in to continue", {
      id: "auth-gate-toast", // ID prevents duplicate toasts if they double-click
      icon: "🔒",
    });

    // 2. Short delay (500ms) so the toast is readable before the redirect
    setTimeout(() => {
      navigate("/signin", {
        state: { from: location.pathname + location.search },
      });
    }, 500);

    return false;
  };
}
