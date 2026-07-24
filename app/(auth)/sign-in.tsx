import { useEffect, useState } from "react";
import { View, ActivityIndicator, Pressable } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/screen";
import { LogoSlot } from "@/components/logo-slot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-provider";

// Phone-first (decisions.md D4) with a working email fallback.
// On success, onAuthStateChange flips the session; the effect below routes to the
// ?redirect= target (e.g. back to a /join/<code> invite) or home.
type Mode = "phone" | "email";

export default function SignInScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ redirect?: string }>();

  const [mode, setMode] = useState<Mode>("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Once signed in, leave the auth flow — honoring a deep-link redirect if present.
  useEffect(() => {
    if (!session) return;
    const target =
      typeof params.redirect === "string" && params.redirect
        ? params.redirect
        : "/";
    router.replace(target);
  }, [session, params.redirect, router]);

  // phone
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");

  // email
  const [emailMode, setEmailMode] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const reset = () => {
    setError(null);
    setNotice(null);
  };

  // === Phone OTP =============================================================
  // ⚠️ REQUIRES AN SMS PROVIDER. Connect Twilio (or another provider) in the
  // Supabase Dashboard → Authentication → Providers → Phone: enable Phone auth and
  // add your Twilio Account SID / Auth Token / Message Service SID. Until then,
  // signInWithOtp({ phone }) returns an error and no SMS is sent — use email below.
  async function sendPhoneCode() {
    reset();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) setError(error.message);
    else {
      setOtpSent(true);
      setNotice("We sent a 6-digit code to your phone.");
    }
  }

  async function verifyPhoneCode() {
    reset();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: "sms",
    });
    setLoading(false);
    if (error) setError(error.message);
  }

  // === Email + password (works now, no SMS needed) ==========================
  async function submitEmail() {
    reset();
    setLoading(true);
    if (emailMode === "signUp") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name || email.split("@")[0] } },
      });
      setLoading(false);
      if (error) return setError(error.message);
      if (!data.session) {
        setNotice(
          "Account created. Check your email to confirm, then sign in. " +
            "(For instant testing, disable “Confirm email” in Supabase → Authentication → Providers → Email.)",
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (error) setError(error.message);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Sign in" }} />
      <Screen
        title="Sign in to Trippl"
        subtitle={
          mode === "phone"
            ? "Phone-first (D4). SMS needs Twilio connected — use email to test now."
            : "Email fallback — works without SMS."
        }
      >
        <LogoSlot className="mb-2" />
        <View className="w-full max-w-sm gap-3">
          {mode === "phone" ? (
            <>
              {!otpSent ? (
                <>
                  <Input
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+1 555 123 4567"
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                  />
                  <Button label="Send code" onPress={sendPhoneCode} />
                </>
              ) : (
                <>
                  <Input
                    value={code}
                    onChangeText={setCode}
                    placeholder="6-digit code"
                    keyboardType="number-pad"
                  />
                  <Button label="Verify" onPress={verifyPhoneCode} />
                  <Pressable
                    onPress={() => {
                      setOtpSent(false);
                      setCode("");
                      reset();
                    }}
                  >
                    <Text variant="muted" className="text-center">
                      Use a different number
                    </Text>
                  </Pressable>
                </>
              )}
              <Pressable
                onPress={() => {
                  setMode("email");
                  reset();
                }}
              >
                <Text className="text-center text-primary">Use email instead</Text>
              </Pressable>
            </>
          ) : (
            <>
              {emailMode === "signUp" ? (
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  autoCapitalize="words"
                />
              ) : null}
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry
              />
              <Button
                label={emailMode === "signUp" ? "Create account" : "Sign in"}
                onPress={submitEmail}
              />
              <Pressable
                onPress={() => {
                  setEmailMode(emailMode === "signUp" ? "signIn" : "signUp");
                  reset();
                }}
              >
                <Text variant="muted" className="text-center">
                  {emailMode === "signUp"
                    ? "Already have an account? Sign in"
                    : "New here? Create an account"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setMode("phone");
                  reset();
                }}
              >
                <Text className="text-center text-primary">Use phone instead</Text>
              </Pressable>
            </>
          )}

          {loading ? (
            <View className="mt-1 items-center">
              <ActivityIndicator />
            </View>
          ) : null}
          {error ? (
            <Text className="text-center text-destructive">{error}</Text>
          ) : null}
          {notice ? (
            <Text variant="muted" className="text-center">
              {notice}
            </Text>
          ) : null}
        </View>
      </Screen>
    </>
  );
}
