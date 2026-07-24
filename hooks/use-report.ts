import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ReportInput } from "@/types";

// Submit a report of any user-generated surface. Thin wrapper over the
// rate-limited submit_report RPC; the reason taxonomy lives in lib/safety.ts.
export function useReport() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = useCallback(async (input: ReportInput): Promise<boolean> => {
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.rpc("submit_report", {
      _subject_kind: input.subjectKind,
      _subject_id: input.subjectId ?? null,
      _subject_user_id: input.subjectUserId ?? null,
      _reason: input.reason,
      _detail: input.detail ?? null,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return false;
    }
    setDone(true);
    return true;
  }, []);

  const reset = useCallback(() => {
    setDone(false);
    setError(null);
  }, []);

  return { submit, submitting, error, done, reset };
}
