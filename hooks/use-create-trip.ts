import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CreateTripInput, Trip } from "@/types";

// Creates a trip and (optionally) its manual Airbnb options.
// The on_trip_created DB trigger seeds the host into trip_members (role host) and
// trip_admins, so we do NOT insert those from the client.
export function useCreateTrip() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createTrip(
    input: CreateTripInput,
    userId: string,
  ): Promise<Trip | null> {
    setSubmitting(true);
    setError(null);
    try {
      const { data: trip, error: tripErr } = await supabase
        .from("trips")
        .insert({
          host_id: userId,
          title: input.title.trim(),
          cover_url: input.cover_url,
          location_city: input.location_city.trim(),
          location_lat: input.location_lat ?? null,
          location_lng: input.location_lng ?? null,
          start_date: input.start_date,
          end_date: input.end_date,
          car_rental_ref: input.car_rental_ref?.trim() || null,
          status: "planning",
        })
        .select()
        .single();
      if (tripErr) throw tripErr;

      // GROUPPAD SEAM — insert manual Airbnb options. Replaced by the GroupPad module later.
      const opts = input.airbnb_options.filter(
        (o) => o.url.trim() || o.title.trim(),
      );
      if (opts.length > 0) {
        const { error: optErr } = await supabase.from("airbnb_options").insert(
          opts.map((o) => ({
            trip_id: trip.id,
            added_by: userId,
            title: o.title.trim() || null,
            url: o.url.trim() || null,
            total_cost: o.total_cost,
            image_url: o.image_url?.trim() || null,
          })),
        );
        if (optErr) throw optErr;
      }

      return trip as Trip;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the trip.");
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  return { createTrip, submitting, error };
}
