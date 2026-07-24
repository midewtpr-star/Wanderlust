import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { LinkPreview } from "@/types";

// Fetch a rich preview for a pasted pin/link via the link-preview edge function
// (Pinterest oEmbed + OpenGraph fallback, cached server-side). Always resolves —
// a failure returns ok:false so the UI can fall back to the raw link.
export function useLinkPreview() {
  const [loading, setLoading] = useState(false);

  const fetchPreview = useCallback(
    async (url: string): Promise<LinkPreview> => {
      const fallback: LinkPreview = {
        ok: false,
        url,
        title: null,
        image_url: null,
        author: null,
        provider: "link",
      };
      if (!url.trim()) return fallback;
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke<LinkPreview>(
          "link-preview",
          { body: { url: url.trim() } },
        );
        return error || !data ? fallback : data;
      } catch {
        return fallback;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { fetchPreview, loading };
}
