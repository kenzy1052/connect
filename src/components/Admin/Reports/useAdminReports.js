import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";

export function useAdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("admin_listing_reports")
      .select("*")
      .order("latest_report_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setReports(data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, error, refetch: fetchReports };
}
