import { View, ScrollView, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Boundary } from "@/components/ui/boundary";
import { PersonRow } from "@/components/profile/person-row";
import { useConnections } from "@/hooks/use-connections";
import { useProfileSearch } from "@/hooks/use-profile-search";

export default function ConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { connections, incoming, outgoing, loading, accept, decline, cancel } = useConnections();
  const { query, setQuery, results, searching } = useProfileSearch();

  const open = (id: string) => router.push(`/profile/${id}`);
  const showingSearch = query.trim().length >= 2;

  return (
    <Boundary variant="world">
      <Stack.Screen options={{ title: "Connections", headerShown: true }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 20 }}
      >
        {/* Discovery */}
        <View className="gap-2">
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Find travelers by name or @handle"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {showingSearch ? (
            <View className="gap-1">
              {searching && results.length === 0 ? (
                <Text variant="muted">Searching…</Text>
              ) : results.length === 0 ? (
                <Text variant="muted">No public profiles match “{query.trim()}”.</Text>
              ) : (
                results.map((r) => (
                  <PersonRow
                    key={r.id}
                    name={r.display_name}
                    handle={r.handle}
                    avatarUrl={r.avatar_url}
                    subtitle={r.home_city}
                    onPress={() => open(r.id)}
                  />
                ))
              )}
            </View>
          ) : (
            <Text variant="caption">Only public profiles are discoverable here.</Text>
          )}
        </View>

        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator />
          </View>
        ) : (
          <>
            {/* Incoming requests */}
            {incoming.length > 0 ? (
              <View className="gap-2">
                <Text variant="heading">Requests</Text>
                {incoming.map((r) => (
                  <PersonRow
                    key={r.id}
                    name={r.display_name}
                    handle={r.handle}
                    avatarUrl={r.avatar_url}
                    onPress={() => open(r.id)}
                    right={
                      <View className="flex-row gap-2">
                        <Button label="Accept" size="sm" onPress={() => accept(r.id)} />
                        <Button label="Decline" size="sm" variant="ghost" onPress={() => decline(r.id)} />
                      </View>
                    }
                  />
                ))}
              </View>
            ) : null}

            {/* Your connections */}
            <View className="gap-2">
              <Text variant="heading">
                Your connections{connections.length ? ` · ${connections.length}` : ""}
              </Text>
              {connections.length === 0 ? (
                <Text variant="muted">
                  No connections yet — search above, or open a profile to connect.
                </Text>
              ) : (
                connections.map((c) => (
                  <PersonRow
                    key={c.id}
                    name={c.display_name}
                    handle={c.handle}
                    avatarUrl={c.avatar_url}
                    subtitle={c.home_city}
                    onPress={() => open(c.id)}
                  />
                ))
              )}
            </View>

            {/* Outgoing pending */}
            {outgoing.length > 0 ? (
              <View className="gap-2">
                <Text variant="heading">Pending</Text>
                {outgoing.map((r) => (
                  <PersonRow
                    key={r.id}
                    name={r.display_name}
                    handle={r.handle}
                    avatarUrl={r.avatar_url}
                    subtitle="Request sent"
                    onPress={() => open(r.id)}
                    right={<Button label="Cancel" size="sm" variant="ghost" onPress={() => cancel(r.id)} />}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Boundary>
  );
}
