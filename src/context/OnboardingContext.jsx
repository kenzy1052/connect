// src/context/OnboardingContext.jsx
//
// Wraps useOnboardingTour's state in Context so multiple components share
// ONE tour instance — the overlay rendered in MainApp, and the "Replay app
// tour" button in Settings → Customization, must both control the same
// active/stepIndex state rather than each getting their own local copy.

import { createContext, useContext } from "react";
import { useOnboardingTour as useOnboardingTourState } from "../hooks/useOnboardingTour";

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const value = useOnboardingTourState();
  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingTour() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error(
      "useOnboardingTour must be used inside <OnboardingProvider>",
    );
  }
  return ctx;
}
