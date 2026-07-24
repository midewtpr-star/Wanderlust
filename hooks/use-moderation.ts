import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ModerationActionKind, ModerationReport } from "@/types";

// The moderator queue: open reports + resolve actions. Every read/write is
// guarded server-side by is_moderator() (SECURITY DEFINER RPCs), so a non-mod
// simply gets an empty queue and rejected actions — this hook doesn't need to
// re-check the role, but the screen hides itself for non-mods anyway.
export function useModeration() {
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("list_open_reports");
    if (error) setError(error.message);
    else setReports((data as ModerationReport[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = useCallback(
    async (reportId: string, action: ModerationActionKind, note?: string): Promise<boolean> => {
      setError(null);
      const { error } = await supabase.rpc("moderate_resolve_report", {
        _report_id: reportId,
        _action: action,
        _note: note ?? null,
      });
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [load],
  );

  return { reports, loading, error, resolve, refresh: load };
}
