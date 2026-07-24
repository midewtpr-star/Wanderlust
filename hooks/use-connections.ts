import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-provider";
import type { ConnectionRequest, ConnectionSummary } from "@/types";

// The signed-in user's friend graph: accepted connections + pending requests
// (both directions), with the actions to resolve them. All reads/writes go
// through the SECURITY DEFINER RPCs so a private counterpart's basic identity is
// still returned where the relationship warrants it (a request reveals a name;
// an accepted connection reveals the profile).
export function useConnections() {
  const { user } = useAuth();
  const userId = user?.id;
  const [connections, setConnections] = useState<ConnectionSummary[]>([]);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [conn, reqs] = await Promise.all([
      supabase.rpc("list_connections"),
      supabase.rpc("list_connection_requests"),
    ]);
    if (conn.error) setError(conn.error.message);
    else setConnections((conn.data as ConnectionSummary[]) ?? []);
    if (reqs.error) setError(reqs.error.message);
    else setRequests((reqs.data as ConnectionRequest[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Run one connection RPC, then refresh. Returns true on success.
  const call = useCallback(
    async (fn: string, args: Record<string, unknown>): Promise<boolean> => {
      setError(null);
      const { error } = await supabase.rpc(fn, args);
      if (error) {
        setError(error.message);
        return false;
      }
      await load();
      return true;
    },
    [load],
  );

  const incoming = requests.filter((r) => r.direction === "incoming");
  const outgoing = requests.filter((r) => r.direction === "outgoing");

  return {
    connections,
    requests,
    incoming,
    outgoing,
    loading,
    error,
    accept: (other: string) => call("respond_connection_request", { _other: other, _accept: true }),
    decline: (other: string) => call("respond_connection_request", { _other: other, _accept: false }),
    cancel: (other: string) => call("remove_connection", { _other: other }),
    remove: (other: string) => call("remove_connection", { _other: other }),
    block: (other: string) => call("set_connection_block", { _other: other, _blocked: true }),
    refresh: load,
  };
}
