import { View, ScrollView, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IdeaCard } from "./idea-card";
import { useNearbyIdeas } from "@/hooks/use-nearby-ideas";
import type { ActivityInput, Idea } from "@/types";

const CATEGORY_ORDER: { key: string; label: string }[] = [
  { key: "food", label: "Food & drink" },
  { key: "outdoors", label: "Outdoors" },
  { key: "nightlife", label: "Nightlife" },
  { key: "attractions", label: "Attractions" },
  { key: "events", label: "Events" },
];

function ideaToActivity(idea: Idea): ActivityInput {
  return {
    title: idea.name,
    location: idea.address,
    url: idea.url,
    description: idea.description,
  };
}

// Nearby ideas grouped by category. Gated on a resolved destination — the
// edge function geocodes on demand and returns { noDestination } / { configured
// = false } for graceful states.
export function LocalIdeas({
  tripId,
  lat,
  lng,
  onUseIdea,
}: {
  tripId: string;
  lat: number | null;
  lng: number | null;
  onUseIdea: (prefill: ActivityInput) => void;
}) {
  const { result, loading, error, refresh } = useNearbyIdeas(tripId, lat, lng);

  if (loading) {
    return (
      <Card>
        <View className="items-center py-6">
          <ActivityIndicator />
          <Text variant="muted" className="mt-2 text-xs">
            Finding things to do nearby…
          </Text>
        </View>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="gap-2">
        <Text className="text-destructive">{error}</Text>
        <Button label="Try again" variant="outline" onPress={refresh} />
      </Card>
    );
  }

  if (result?.noDestination) {
    return (
      <Card>
        <Text variant="muted" className="text-center">
          Add a destination to this trip to see nearby ideas.
        </Text>
      </Card>
    );
  }

  if (result && !result.configured) {
    return (
      <Card>
        <Text variant="muted" className="text-center">
          Local ideas aren&apos;t set up yet. (An admin adds a Google Places key
          to the nearby-ideas function.)
        </Text>
      </Card>
    );
  }

  const ideas = result?.ideas ?? [];
  const origin = result?.coords ?? { lat: lat ?? null, lng: lng ?? null };

  if (ideas.length === 0) {
    return (
      <Card className="gap-2">
        <Text variant="muted" className="text-center">
          No ideas found near the destination.
        </Text>
        {result?.note ? (
          <Text variant="muted" className="text-center text-xs">
            {result.note}
          </Text>
        ) : null}
        <Button label="Refresh" variant="outline" onPress={refresh} />
      </Card>
    );
  }

  return (
    <View className="gap-4">
      {CATEGORY_ORDER.map(({ key, label }) => {
        const group = ideas.filter((i) => i.category === key);
        if (group.length === 0) return null;
        return (
          <View key={key} className="gap-2">
            <Text className="font-semibold">{label}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 12 }}
            >
              {group.map((idea, i) => (
                <IdeaCard
                  key={`${idea.name}-${i}`}
                  idea={idea}
                  originLat={origin.lat}
                  originLng={origin.lng}
                  onUse={() => onUseIdea(ideaToActivity(idea))}
                />
              ))}
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}
