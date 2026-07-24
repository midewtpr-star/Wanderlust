import { useState } from "react";
import { View, Modal, Pressable, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/lib/theme-provider";
import { useReport } from "@/hooks/use-report";
import { REPORT_REASONS, SUBJECT_KIND_LABEL } from "@/lib/safety";
import type { ReportReason, ReportSubjectKind } from "@/types";

type Subject = {
  subjectKind: ReportSubjectKind;
  subjectId?: string | null;
  subjectUserId?: string | null;
};

// The controlled report sheet — a bottom sheet with the reason taxonomy, an
// optional detail, and a rate-limited submit. Drive it from any surface (e.g.
// a chat long-press) via `visible` / `onClose`, or use <ReportAction> below for
// a self-contained trigger + sheet.
export function ReportSheet({
  visible,
  onClose,
  subjectKind,
  subjectId,
  subjectUserId,
}: Subject & { visible: boolean; onClose: () => void }) {
  const { tokens: t } = useTheme();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const { submit, submitting, error, done, reset } = useReport();

  function close() {
    setReason(null);
    setDetail("");
    reset();
    onClose();
  }

  async function onSubmit() {
    if (!reason) return;
    const ok = await submit({ subjectKind, subjectId, subjectUserId, reason, detail });
    if (ok) setTimeout(close, 900);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        onPress={close}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.bg,
            borderTopLeftRadius: Math.max(t.radius, 16),
            borderTopRightRadius: Math.max(t.radius, 16),
            padding: 20,
            gap: 14,
            maxHeight: "86%",
          }}
        >
          <View className="gap-1">
            <Text variant="heading">Report this {SUBJECT_KIND_LABEL[subjectKind]}</Text>
            <Text variant="muted">
              Reports are private and reviewed by our team. To stop hearing from someone entirely, block them.
            </Text>
          </View>

          {done ? (
            <View className="py-6 items-center gap-1">
              <Text variant="heading">Thanks — we got it.</Text>
              <Text variant="muted">Our team will take a look.</Text>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
              {REPORT_REASONS.map((r) => {
                const active = reason === r.key;
                return (
                  <Pressable
                    key={r.key}
                    onPress={() => setReason(r.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: t.radius,
                      backgroundColor: active ? t.accentBg : t.cardBg,
                      borderWidth: t.cardBorder?.width ?? 1,
                      borderColor: active ? t.accent : t.cardBorder?.color ?? t.border,
                    }}
                  >
                    <Text style={{ color: active ? t.accentInk : t.text, fontWeight: active ? "700" : "500" }}>
                      {r.label}
                    </Text>
                  </Pressable>
                );
              })}
              <Input
                value={detail}
                onChangeText={setDetail}
                placeholder="Add any detail (optional)"
                multiline
                numberOfLines={3}
                style={{ height: 80, paddingTop: 10, textAlignVertical: "top" }}
              />
              {error ? <Text style={{ color: "#DC2626" }}>{error}</Text> : null}
              <View className="flex-row gap-2 pt-1">
                <Button label="Cancel" variant="ghost" className="flex-1" onPress={close} />
                <Button
                  label={submitting ? "Sending…" : "Submit report"}
                  className="flex-1"
                  disabled={!reason || submitting}
                  onPress={onSubmit}
                />
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// A self-contained "Report" affordance (underlined text trigger + sheet) for any
// user-generated surface. Keeps every surface one tap from a report (a locked B4
// rule) without each screen re-implementing the flow.
export function ReportAction({
  subjectKind,
  subjectId,
  subjectUserId,
  label = "Report",
}: Subject & { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" className="active:opacity-70">
        <Text variant="caption" style={{ textDecorationLine: "underline" }}>
          {label}
        </Text>
      </Pressable>
      <ReportSheet
        visible={open}
        onClose={() => setOpen(false)}
        subjectKind={subjectKind}
        subjectId={subjectId}
        subjectUserId={subjectUserId}
      />
    </>
  );
}
