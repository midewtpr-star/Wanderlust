import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { MemberRole, MemberWithRsvp, RsvpStatus } from "@/types";

type MemberJoin = {
  user_id: string;
  role: MemberRole;
  profile: { display_name: string | null; avatar_url: string | null } | null;
};

// The trip roster joined with each member's profile + current RSVP, for the wall.
export function useTripMembers(tripId: string | undefined) {
  const [members, setMembers] = useState<MemberWithRsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tripId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [memRes, rsvpRes] = await Promise.all([
      supabase
        .from("trip_members")
        .select("user_id, role, profile:profiles(display_name, avatar_url)")
        .eq("trip_id", tripId),
      supabase.from("rsvps").select("user_id, status").eq("trip_id", tripId),
    ]);
    if (memRes.error || rsvpRes.error) {
      setError((memRes.error ?? rsvpRes.error)!.message);
      setLoading(false);
      return;
    }
    const statusByUser = new Map<string, RsvpStatus>();
    ((rsvpRes.data ?? []) as { user_id: string; status: RsvpStatus }[]).forEach(
      (r) => statusByUser.set(r.user_id, r.status),
    );
    const merged: MemberWithRsvp[] = (
      (memRes.data ?? []) as unknown as MemberJoin[]
    ).map((m) => ({
      user_id: m.user_id,
      role: m.role,
      display_name: m.profile?.display_name ?? null,
      avatar_url: m.profile?.avatar_url ?? null,
      status: statusByUser.get(m.user_id) ?? null,
    }));
    setMembers(merged);
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  // Optimistically patch one member's RSVP for instant wall updates.
  const setLocalRsvp = useCallback((userId: string, status: RsvpStatus) => {
    setMembers((prev) =>
      prev.map((m) => (m.user_id === userId ? { ...m, status } : m)),
    );
  }, []);

  const groups = useMemo(
    () => ({
      going: members.filter((m) => m.status === "going"),
      maybe: members.filter((m) => m.status === "maybe"),
      not: members.filter((m) => m.status === "not"),
      invited: members.filter((m) => m.status === null),
    }),
    [members],
  );

  const counts = {
    going: groups.going.length,
    maybe: groups.maybe.length,
    not: groups.not.length,
    invited: groups.invited.length,
  };

  return { members, groups, counts, loading, error, refresh: load, setLocalRsvp };
}
