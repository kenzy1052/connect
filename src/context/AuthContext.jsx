import { createContext, useContext, useEffect, useState } from "react";
import { supabase, handleAuthError } from "../lib/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // undefined = not yet fetched; null = fetched but no row; object = loaded
  const [profile, setProfile] = useState(undefined);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        if (handleAuthError(error)) return;
        console.error("Profile fetch error:", error.message);
        setProfile(null);
        return;
      }

      if (data?.is_suspended) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        alert(
          "Your account has been suspended. Contact the admin if you believe this is a mistake.",
        );
        return;
      }

      setProfile(data || null);
    } catch (err) {
      if (handleAuthError(err)) return;
      console.error("Unexpected profile error:", err);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (handleAuthError(error)) return;

        const session = data?.session;
        if (!mounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null); // no user → no profile to wait for
        }
      } catch (err) {
        if (handleAuthError(err)) return;
        console.error("Init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          setProfile(undefined); // mark "loading again" before fetch
          fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // profileLoading is true while we still don't know who they are
  const profileLoading = !!user && profile === undefined;

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, profileLoading, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
