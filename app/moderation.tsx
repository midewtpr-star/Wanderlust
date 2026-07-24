import { View, ScrollView, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMyProfile } from "@/hooks/use-profile";
import { useModeration } from "@/hooks/use-moderation";
import { SUBJECT_KIND_LABEL, REPORT_REASONS } from "@/lib/safety";
import type { ModerationReport } from "@/types";

const REASON_LABEL = Object.fromEntries(REPORT_REASONS.map((r) => [r.key, r.label]));

function ReportCard({
  report,
  onResolve,
}: {
  report: ModerationReport;
  onResolve: (id: string, action: "dismiss" | "remove_content" | "suspend_user") => void;
}) {
  return (
    <Card className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text variant="heading">{REASON_LABEL[report.reason] ?? report.reason}</Text>
        <Text variant="caption">{new Date(report.created_at).toLocaleDateString()}</Text>
      </View>
      <Text variant="muted">
        {SUBJECT_KIND_LABEL[report.subject_kind]}
        {report.subject_user_name ? ` · ${report.subject_user_name}` : ""}
        {report.reporter_name ? ` · reported by ${report.reporter_name}` : ""}
      </Text>
      {report.detail ? <Text>{report.detail}</Text> : null}
      <View className="flex-row flex-wrap gap-2 pt-1">
        <Button label="Dismiss" size="sm" variant="ghost" onPress={() => onResolve(report.id, "dismiss")} />
        <Button label="Remove content" size="sm" variant="outline" onPress={() => onResolve(report.id, "remove_content")} />
        {report.subject_user_id ? (
          <Button label="Suspend user" size="sm" variant="destructive" onPress={() => onResolve(report.id, "suspend_user")} />
        ) : null}
      </View>
    </Card>
  );
}

export default function ModerationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isModerator, loading: profileLoading } = useMyProfile();
  const { reports, loading, error, resolve } = useModeration();

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: "Moderation", headerShown: true }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
        {profileLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator />
          </View>
        ) : !isModerator ? (
          <View className="items-center gap-3 py-16 px-4">
            <Text variant="display-lg" className="text-center">
              Not available
            </Text>
            <Text variant="muted" className="text-center">
              This area is for the Trippl moderation team.
            </Text>
            <Button label="Back" variant="outline" onPress={() => router.back()} />
          </View>
        ) : (
          <>
            <Text variant="muted">
              {loading ? "Loading…" : reports.length === 0 ? "No open reports. All clear." : `${reports.length} open`}
            </Text>
            {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
            {reports.map((r) => (
              <ReportCard key={r.id} report={r} onResolve={resolve} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
