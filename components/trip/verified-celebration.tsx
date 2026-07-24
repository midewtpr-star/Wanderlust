import { useEffect, useState } from "react";
import { Modal, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VerifiedAnimation } from "./verified-animation";

// Plays ONCE, the first time the current user becomes fully verified. A per
// trip+user flag in AsyncStorage makes it once-only across sessions (so a reload
// while already verified doesn't replay it). Reset if they drop below verified.
export function VerifiedCelebration({
  verified,
  tripId,
  userId,
}: {
  verified: boolean;
  tripId: string;
  userId: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let active = true;
    const key = `verified-celebrated:${tripId}:${userId}`;
    (async () => {
      if (verified) {
        const seen = await AsyncStorage.getItem(key);
        if (!seen && active) {
          setShow(true);
          await AsyncStorage.setItem(key, "1");
        }
      } else {
        await AsyncStorage.removeItem(key);
      }
    })();
    return () => {
      active = false;
    };
  }, [verified, tripId, userId]);

  return (
    <Modal
      visible={show}
      transparent
      animationType="fade"
      onRequestClose={() => setShow(false)}
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-6">
        <Card className="w-full max-w-sm items-center gap-2">
          <VerifiedAnimation label="You're verified! 🎉" />
          <Text variant="muted" className="text-center">
            Travel proof + both payments done — you&apos;re locked in for the
            trip.
          </Text>
          <Button
            label="Let's go"
            className="mt-1 w-full"
            onPress={() => setShow(false)}
          />
        </Card>
      </View>
    </Modal>
  );
}
