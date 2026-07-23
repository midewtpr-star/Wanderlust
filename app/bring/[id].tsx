import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { View, ScrollView, Pressable, Modal } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BringRow } from "@/components/bring/bring-row";
import { BringItemModal } from "@/components/bring/bring-item-modal";
import { VerifiedAnimation } from "@/components/trip/verified-animation";
import { useAuth } from "@/lib/auth-provider";
import { TripThemeProvider } from "@/lib/trip-theme";
import { useTrip } from "@/hooks/use-trip";
import { useTripMembers } from "@/hooks/use-trip-members";
import {
  useBringList,
  useAddBringItem,
  useClaimItem,
  type BringItemView,
} from "@/hooks/use-bring-list";
import { cn } from "@/lib/utils";
import { fontFamily } from "@/constants/theme";
import type { BringItem, BringItemInput } from "@/types";

const neededFirst = (a: BringItemView, b: BringItemView) =>
  (a.priority === "needed" ? 0 : 1) - (b.priority === "needed" ? 0 : 1) ||
  (a.created_at < b.created_at ? -1 : 1);

export default function BringListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;

  const { trip, loading: tripLoading, notAuthorized } = useTrip(id);
  const members = useTripMembers(id);
  const bring = useBringList(id, userId);
  const addBring = useAddBringItem(id, userId);
  const claimItem = useClaimItem(id, userId);

  const [qName, setQName] = useState("");
  const [qNeeded, setQNeeded] = useState(false);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; item?: BringItem } | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const me = members.members.find((m) => m.user_id === userId);
  const isAdmin = me?.role === "host" || me?.role === "admin";
  const canEdit = (item: BringItemView) => item.created_by === userId || isAdmin;

  const unclaimed = useMemo(
    () => bring.items.filter((i) => !i.claimed).sort(neededFirst),
    [bring.items],
  );
  const claimed = useMemo(
    () => bring.items.filter((i) => i.claimed).sort(neededFirst),
    [bring.items],
  );

  // Light celebration when the last "needed" item gets claimed.
  const prevNeeded = useRef<number | null>(null);
  useEffect(() => {
    const n = bring.summary.neededRemaining;
    if (
      prevNeeded.current != null &&
      prevNeeded.current > 0 &&
      n === 0 &&
      bring.summary.neededTotal > 0
    ) {
      setCelebrate(true);
    }
    prevNeeded.current = n;
  }, [bring.summary.neededRemaining, bring.summary.neededTotal]);
  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setCelebrate(false), 2800);
    return () => clearTimeout(t);
  }, [celebrate]);

  const onClaim = useCallback(
    async (item: BringItemView) => {
      if (!userId) return;
      bring.applyClaimLocal(item.id, {
        user_id: userId,
        name: me?.display_name ?? null,
        avatar: me?.avatar_url ?? null,
        quantity: null,
      });
      await claimItem.claim(item.id);
      bring.refresh();
    },
    [userId, me?.display_name, me?.avatar_url, bring, claimItem],
  );

  const onUnclaim = useCallback(
    async (item: BringItemView) => {
      if (!userId) return;
      bring.applyUnclaimLocal(item.id, userId);
      await claimItem.unclaim(item.id);
      bring.refresh();
    },
    [userId, bring, claimItem],
  );

  async function quickAdd() {
    if (!qName.trim()) return;
    await addBring.addItem({
      name: qName.trim(),
      priority: qNeeded ? "needed" : "optional",
    });
    setQName("");
    setQNeeded(false);
    bring.refresh();
  }

  async function onModalSubmit(input: BringItemInput) {
    if (modal?.mode === "edit" && modal.item) {
      await addBring.updateItem(modal.item.id, input);
    } else {
      await addBring.addItem(input);
    }
    setModal(null);
    bring.refresh();
  }

  async function onModalDelete() {
    if (modal?.mode === "edit" && modal.item) {
      await addBring.removeItem(modal.item.id);
      setModal(null);
      bring.refresh();
    }
  }

  const { total, claimed: claimedCount, unclaimed: unclaimedCount, neededTotal, neededRemaining } =
    bring.summary;
  const headerTitle = trip?.title ? `${trip.title} · Bring list` : "Bring list";

  function renderRows(list: BringItemView[]) {
    return list.map((item) => (
      <BringRow
        key={item.id}
        item={item}
        meId={userId}
        canEdit={canEdit(item)}
        claiming={claimItem.busy}
        onClaim={() => onClaim(item)}
        onUnclaim={() => onUnclaim(item)}
        onEdit={() => setModal({ mode: "edit", item })}
      />
    ));
  }

  return (
    <TripThemeProvider tripId={id}>
      <Stack.Screen options={{ title: headerTitle }} />
      <View className="flex-1 bg-background">
        {tripLoading || bring.loading ? (
          <ListSkeleton />
        ) : notAuthorized ? (
          <Centered>
            <Text variant="heading">Not available</Text>
            <Text variant="muted" className="text-center">
              This trip doesn&apos;t exist or you&apos;re not a member.
            </Text>
            <Button label="Back to Trips" variant="outline" onPress={() => router.replace("/")} />
          </Centered>
        ) : (
          <>
            {/* quick-add bar */}
            <View className="border-b border-border px-4 py-3">
              <View className="flex-row items-center gap-2">
                <Input
                  value={qName}
                  onChangeText={setQName}
                  placeholder="Add an item…"
                  className="flex-1"
                  returnKeyType="done"
                  onSubmitEditing={quickAdd}
                />
                <Pressable
                  onPress={() => setQNeeded((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={qNeeded ? "Marked needed" : "Mark needed"}
                  className={cn(
                    "rounded-lg border px-2.5 py-2.5 active:opacity-80",
                    qNeeded ? "border-primary bg-accent-fill" : "border-border",
                  )}
                >
                  <Text
                    className={cn("text-xs", qNeeded ? "text-primary-foreground" : "text-muted-foreground")}
                    style={{ fontFamily: fontFamily("semibold") }}
                  >
                    Needed
                  </Text>
                </Pressable>
                <Button label="Add" size="sm" onPress={quickAdd} disabled={!qName.trim() || addBring.saving} />
              </View>
              <Pressable onPress={() => setModal({ mode: "create" })} className="mt-2 active:opacity-70">
                <Text variant="caption" className="text-primary">
                  ＋ More options (category, quantity, notes)
                </Text>
              </Pressable>
            </View>

            {bring.error ? (
              <View className="px-4 pt-3">
                <Text className="text-destructive">{bring.error}</Text>
              </View>
            ) : null}

            {total === 0 ? (
              <Centered>
                <Text variant="heading" className="text-center">
                  Nothing on the list yet
                </Text>
                <Text variant="muted" className="text-center">
                  Add what the group needs — speaker, grill, cooler, first-aid kit…
                </Text>
              </Centered>
            ) : (
              <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
                {/* progress summary */}
                <Text variant="muted" className="mb-1">
                  {total} item{total === 1 ? "" : "s"} · {claimedCount} claimed ·{" "}
                  {unclaimedCount} unclaimed
                </Text>
                {neededTotal > 0 && neededRemaining === 0 ? (
                  <View className="mb-3 mt-1 rounded-xl border border-primary bg-accent-fill px-3 py-2">
                    <Text
                      className="text-sm text-primary-foreground"
                      style={{ fontFamily: fontFamily("semibold") }}
                    >
                      🎒 You&apos;re fully packed — every needed item is claimed.
                    </Text>
                  </View>
                ) : neededRemaining > 0 ? (
                  <Text variant="caption" className="mb-3">
                    {neededRemaining} needed item{neededRemaining === 1 ? "" : "s"} still unclaimed
                  </Text>
                ) : (
                  <View className="mb-2" />
                )}

                {unclaimed.length ? (
                  <View className="mb-6 gap-3">
                    <Text variant="heading">Still to claim</Text>
                    {renderRows(unclaimed)}
                  </View>
                ) : null}

                {claimed.length ? (
                  <View className="gap-3">
                    <Text variant="heading">Claimed</Text>
                    {renderRows(claimed)}
                  </View>
                ) : null}
              </ScrollView>
            )}
          </>
        )}
      </View>

      <BringItemModal
        visible={!!modal}
        mode={modal?.mode ?? "create"}
        initial={modal?.item ?? null}
        onClose={() => setModal(null)}
        onSubmit={onModalSubmit}
        onDelete={onModalDelete}
        saving={addBring.saving}
      />

      {/* fully-packed celebration (light, auto-dismisses) */}
      <Modal visible={celebrate} transparent animationType="fade" onRequestClose={() => setCelebrate(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-8"
          onPress={() => setCelebrate(false)}
        >
          <View className="w-full max-w-sm items-center rounded-3xl bg-background p-6">
            <VerifiedAnimation label="You're fully packed 🎒" />
          </View>
        </Pressable>
      </Modal>
    </TripThemeProvider>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-8">{children}</View>
  );
}

function ListSkeleton() {
  return (
    <View className="gap-3 p-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={84} radius={16} />
      ))}
    </View>
  );
}
