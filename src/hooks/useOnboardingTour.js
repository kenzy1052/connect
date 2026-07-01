// src/hooks/useOnboardingTour.js
//
// Drives the first-visit product tour (see components/Onboarding/OnboardingTour.jsx).
//
// Behaviour:
//   - On first-ever visit (no localStorage flag), auto-starts ~900ms after
//     mount so the page has settled before we spotlight anything.
//   - Persists a "seen" flag once the tour is finished OR skipped, so it
//     never auto-shows again.
//   - Exposes `start()` so it can be replayed on demand from
//     Settings → Customization ("Replay app tour").
//   - Step list adapts to auth state: signed-out visitors get a "Sign in"
//     step instead of Post / Notifications / Account steps.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const STORAGE_KEY = "cc.onboarding.v1";

function buildSteps(user) {
  const steps = [
    {
      id: "welcome",
      title: "Welcome to CampusConnect 👋",
      body: "Here's a 30-second look at where everything lives. You can skip this anytime.",
    },
    {
      id: "search",
      target: "tour-search",
      title: "Search anything",
      body: "Look up listings, services or sellers right from here.",
    },
    {
      id: "browse",
      target: "tour-browse",
      title: "Browse all listings",
      body: "See everything for sale or on offer across campus, with filters.",
    },
  ];

  if (user) {
    steps.push(
      {
        id: "post",
        target: "tour-post",
        title: "Sell something",
        body: "Tap Post to list an item or service in under a minute.",
      },
      {
        id: "bell",
        target: "tour-bell",
        title: "Notifications",
        body: "Messages, offers, and updates land here — enable push alerts in Settings to get them instantly.",
      },
      {
        id: "account",
        target: "tour-account",
        title: "Your account",
        body: "Tap your avatar to manage your profile, listings, and settings.",
      },
    );
  } else {
    steps.push({
      id: "signin",
      target: "tour-signin",
      title: "Sign in to get started",
      body: "Create an account to post listings, message sellers, and save favourites.",
    });
  }

  steps.push(
    {
      id: "theme",
      target: "tour-theme",
      title: "Light or dark",
      body: "Switch the look anytime. More themes and fonts live in Settings → Customization.",
    },
    {
      id: "done",
      title: "You're all set 🎉",
      body: "You can replay this tour anytime from Settings → Customization.",
    },
  );

  return steps;
}

export function useOnboardingTour() {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo(() => buildSteps(user), [user]);

  // Auto-start once, on first-ever visit.
  useEffect(() => {
    let seen = true;
    try {
      seen = !!localStorage.getItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (seen) return;

    const t = setTimeout(() => {
      setStepIndex(0);
      setActive(true);
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const finish = useCallback(() => {
    setActive(false);
    markSeen();
  }, [markSeen]);

  const skip = useCallback(() => finish(), [finish]);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i + 1 >= steps.length) {
        finish();
        return i;
      }
      return i + 1;
    });
  }, [steps.length, finish]);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  return {
    active,
    steps,
    stepIndex,
    step: steps[stepIndex],
    isFirst: stepIndex === 0,
    isLast: stepIndex === steps.length - 1,
    next,
    back,
    skip,
    start,
    finish,
  };
}
