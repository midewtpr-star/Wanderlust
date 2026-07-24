import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ProfileSearchResult } from "@/types";

// Debounced discovery search over PUBLIC profiles only (private profiles are
// never discoverable; self + blocked are excluded server-side). Needs ≥2 chars.
export function useProfileSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const run = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const mine = ++seq.current;
    setSearching(true);
    const { data, error } = await supabase.rpc("search_profiles", { _q: trimmed });
    if (mine !== seq.current) return; // a newer query superseded this one
    if (!error) setResults((data as ProfileSearchResult[]) ?? []);
    setSearching(false);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => run(query), 280);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, run]);

  return { query, setQuery, results, searching };
}
