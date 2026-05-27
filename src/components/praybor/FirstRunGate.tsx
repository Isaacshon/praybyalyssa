import type { Provider, User } from "@supabase/supabase-js";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Linking as NativeLinking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { BlessiLogo } from "@/components/praybor/BlessiLogo";
import { UtilityIcon } from "@/components/praybor/PrayborArtwork";
import { Colors, Fonts } from "@/constants/theme";
import {
  checkProfileAvailability,
  completeCurrentUserProfileConsent,
  sendEmailVerificationCode,
  signInWithEmail,
  signInWithOAuthProvider,
  signUpWithEmail,
  verifyEmailVerificationCode,
} from "@/lib/praybor/auth";
import { isBlessieGrowPreviewEnabled } from "@/lib/praybor/dev-preview";
import { requestPrayerReminderNotificationPermission } from "@/lib/praybor/reminders";
import { getAsyncStorage, getSupabaseRuntime } from "@/lib/praybor/session";

const ONBOARDING_COMPLETE_KEY = "blessie:first-run-complete:v1";
const VERIFICATION_CODE_TTL_SECONDS = 60;
const AVAILABILITY_CHECK_DELAY_MS = 650;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FirstRunGateProps = {
  children: React.ReactNode;
};

type TutorialSlide = {
  body: string;
  image: ImageSourcePropType;
  key: string;
  title: string;
};

type AvailabilityStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";
type VerificationStatus = "idle" | "checking" | "verified" | "error";

const tutorialSlides: TutorialSlide[] = [
  {
    key: "tutorial_1",
    image: require("../../../assets/images/praybor/tutorial/tutorial-1.png"),
    title: "Pray with people nearby",
    body: "Share a public prayer request with people inside your chosen neighborhood radius.",
  },
  {
    key: "tutorial_2",
    image: require("../../../assets/images/praybor/tutorial/tutorial-2.png"),
    title: "Post when words feel heavy",
    body: "Choose a feeling, write freely, or use prayer stickers when you need help asking.",
  },
  {
    key: "tutorial_3",
    image: require("../../../assets/images/praybor/tutorial/tutorial-3.png"),
    title: "Keep groups private",
    body: "Invite church, friends, family, or small groups with a code. Only members can see those prayers.",
  },
  {
    key: "tutorial_4",
    image: require("../../../assets/images/praybor/tutorial/tutorial-4.png"),
    title: "Let prayer grow slowly",
    body: "Each prayer you share or carry helps your seed grow into a tree over time.",
  },
  {
    key: "tutorial_5",
    image: require("../../../assets/images/praybor/tutorial/tutorial-5.png"),
    title: "Return with hope each day",
    body: "Look back, see who prayed with you, and keep a gentle record of how each prayer unfolds.",
  },
];

function isSignedInUser(user: User | null): user is User {
  return Boolean(user && !user.is_anonymous);
}

export function FirstRunGate({ children }: FirstRunGateProps) {
  const [ready, setReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const growPreviewEnabled = isBlessieGrowPreviewEnabled();

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    async function bootstrap() {
      const AsyncStorage = await getAsyncStorage();
      const [storedValue, runtime] = await Promise.all([AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY), getSupabaseRuntime()]);

      if (!isMounted) {
        return;
      }

      setOnboardingComplete(storedValue === "true");

      async function updateAuthenticatedState(nextUser: User | null) {
        setUser(nextUser);
        setProfileComplete(await hasCompletedProfileConsent(runtime, nextUser));
      }

      if (runtime.supabase) {
        try {
          const { data } = await runtime.supabase.auth.getSession();

          if (isMounted) {
            await updateAuthenticatedState(data.session?.user ?? null);
          }
        } catch (error) {
          console.warn("Could not restore Supabase session.", error);
        }

        const subscription = runtime.supabase.auth.onAuthStateChange((_event, session) => {
          if (isMounted) {
            void updateAuthenticatedState(session?.user ?? null);
          }
        });

        unsubscribe = () => {
          subscription.data.subscription.unsubscribe();
        };
      }

      if (isMounted) {
        setReady(true);
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  async function completeOnboarding() {
    const AsyncStorage = await getAsyncStorage();
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    setOnboardingComplete(true);

    const runtime = await getSupabaseRuntime();
    const session = await runtime.supabase?.auth.getSession().catch(() => null);
    const nextUser = session?.data.session?.user ?? null;

    setUser(nextUser);
    setProfileComplete(await hasCompletedProfileConsent(runtime, nextUser));
  }

  if (growPreviewEnabled) {
    return children;
  }

  if (!ready) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <BlessiLogo imageStyle={styles.loadingLogo} />
        <ActivityIndicator color="#FF6628" />
      </SafeAreaView>
    );
  }

  if (!onboardingComplete || !isSignedInUser(user) || !profileComplete) {
    return <FirstRunFlow authOnly={onboardingComplete} onFirstRunComplete={completeOnboarding} />;
  }

  return children;
}

function FirstRunFlow({ authOnly, onFirstRunComplete }: { authOnly: boolean; onFirstRunComplete: () => Promise<void> }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [showAuth, setShowAuth] = useState(authOnly);

  const slide = tutorialSlides[slideIndex];
  const isLastSlide = slideIndex === tutorialSlides.length - 1;

  function nextSlide() {
    if (isLastSlide) {
      setShowAuth(true);
      void onFirstRunComplete();
      return;
    }

    setSlideIndex((current) => current + 1);
  }

  if (showAuth) {
    return <AuthLanding onAuthenticated={onFirstRunComplete} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.tutorialHeader}>
        <BlessiLogo imageStyle={styles.tutorialLogo} />
      </View>
      <View style={styles.tutorialVisualWrap}>
        <PhonePreview slide={slide} />
      </View>
      <View style={styles.tutorialCopy}>
        <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.tutorialTitle}>
          {slide.title}
        </Text>
        <Text style={styles.tutorialBody}>{slide.body}</Text>
      </View>
      <View style={styles.tutorialFooter}>
        <View style={styles.dots}>
          {tutorialSlides.map((item, index) => (
            <View key={item.key} style={[styles.dot, index === slideIndex ? styles.dotActive : styles.dotInactive]} />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isLastSlide ? "Continue to sign in" : "Next tutorial slide"}
          onPress={nextSlide}
          style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed]}
        >
          <Text style={styles.primaryCtaText}>{isLastSlide ? "Continue" : "Next"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function PhonePreview({ slide }: { slide: TutorialSlide }) {
  const { width } = useWindowDimensions();
  const imageWidth = Math.min(326, Math.max(270, width * 0.78));
  const imageHeight = imageWidth * 1.08;

  return (
    <View style={[styles.tutorialImageCard, { width: imageWidth, height: imageHeight }]}>
      <Image accessibilityIgnoresInvertColors resizeMode="contain" source={slide.image} style={styles.tutorialImage} />
    </View>
  );
}

function AuthLanding({ onAuthenticated }: { onAuthenticated: () => Promise<void> }) {
  const [authPage, setAuthPage] = useState<"providers" | "email">("providers");
  const [emailTab, setEmailTab] = useState<"signin" | "signup">("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState<AvailabilityStatus>("idle");
  const [emailStatus, setEmailStatus] = useState<AvailabilityStatus>("idle");
  const [codeSent, setCodeSent] = useState(false);
  const [verificationSecondsLeft, setVerificationSecondsLeft] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("idle");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [policyDetailsVisible, setPolicyDetailsVisible] = useState(false);
  const [notificationOptIn, setNotificationOptIn] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedNickname = nickname.trim();
  const normalizedFirstName = firstName.trim();
  const normalizedLastName = lastName.trim();
  const emailFormatValid = !normalizedEmail || EMAIL_PATTERN.test(normalizedEmail);
  const fullName = [normalizedFirstName, normalizedLastName].filter(Boolean).join(" ");
  const signinDisabled = working || !normalizedEmail || !password;
  const codeVerified = verificationStatus === "verified";
  const codeChecking = verificationStatus === "checking";
  const signupBaseInvalid =
    working ||
    codeChecking ||
    !normalizedFirstName ||
    !normalizedLastName ||
    !normalizedNickname ||
    !normalizedEmail ||
    !emailFormatValid ||
    password.length < 8 ||
    password !== confirmPassword ||
    !verificationCode.trim() ||
    !policyAccepted ||
    nicknameStatus !== "available" ||
    emailStatus !== "available" ||
    !codeVerified;
  const sendCodeDisabled =
    working ||
    codeChecking ||
    codeVerified ||
    verificationSecondsLeft > 0 ||
    !normalizedFirstName ||
    !normalizedLastName ||
    !normalizedNickname ||
    !normalizedEmail ||
    !emailFormatValid ||
    nicknameStatus !== "available" ||
    emailStatus !== "available";

  const helperText = useMemo(() => {
    if (message) {
      return message;
    }

    return "";
  }, [message]);

  useEffect(() => {
    if (emailTab !== "signup") {
      return undefined;
    }

    if (!normalizedNickname) {
      setNicknameStatus("idle");
      return undefined;
    }

    let cancelled = false;
    const requestedNickname = normalizedNickname;
    const timer = setTimeout(() => {
      setNicknameStatus("checking");

      void checkProfileAvailability({
        email: "",
        nickname: requestedNickname,
      })
        .then((availability) => {
          if (!cancelled) {
            setNicknameStatus(availability.nicknameAvailable ? "available" : "taken");
          }
        })
        .catch(() => {
          if (!cancelled) {
            setNicknameStatus("error");
          }
        });
    }, AVAILABILITY_CHECK_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [emailTab, normalizedNickname]);

  useEffect(() => {
    if (emailTab !== "signup") {
      return undefined;
    }

    if (!normalizedEmail) {
      setEmailStatus("idle");
      return undefined;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setEmailStatus("invalid");
      return undefined;
    }

    let cancelled = false;
    const requestedEmail = normalizedEmail;
    const timer = setTimeout(() => {
      setEmailStatus("checking");

      void checkProfileAvailability({
        email: requestedEmail,
        nickname: "",
      })
        .then((availability) => {
          if (!cancelled) {
            setEmailStatus(availability.emailAvailable ? "available" : "taken");
          }
        })
        .catch(() => {
          if (!cancelled) {
            setEmailStatus("error");
          }
        });
    }, AVAILABILITY_CHECK_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [emailTab, normalizedEmail]);

  useEffect(() => {
    if (codeVerified || verificationSecondsLeft <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setVerificationSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [codeVerified, verificationSecondsLeft]);

  const legacyVerificationActionLabel =
    verificationSecondsLeft > 0
      ? `Code sent · ${verificationSecondsLeft}s`
      : codeSent
        ? "Resend verification code"
        : "Send verification code";
  void legacyVerificationActionLabel;
  const verificationActionLabel = codeVerified
    ? "Email verified"
    : codeChecking
      ? "Checking code..."
      : verificationSecondsLeft > 0
        ? `Code sent - ${verificationSecondsLeft}s`
        : codeSent
          ? "Resend verification code"
          : "Send verification code";

  async function runAuth(action: () => Promise<void>, successMessage = "Signed in.") {
    setWorking(true);
    setMessage("");

    try {
      await action();
      setMessage(successMessage);
      await onAuthenticated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setWorking(false);
    }
  }

  function authenticateWithProvider(provider: Provider) {
    void runAuth(async () => {
      await signInWithOAuthProvider(provider);
      await completeCurrentUserProfileConsent({ notificationOptIn: false });
    }, `Signed in with ${provider}.`);
  }

  function authenticateWithEmail() {
    const credentials = { email, password };

    void runAuth(() => signInWithEmail(credentials), "Signed in.");
  }

  async function requestNotificationPermissionIfNeeded() {
    if (!notificationOptIn) {
      return;
    }

    try {
      await requestPrayerReminderNotificationPermission();
    } catch (error) {
      console.warn("Could not request notification permission during sign up.", error);
    }
  }

  async function sendSignupCode() {
    if (nicknameStatus !== "available" || emailStatus !== "available") {
      setMessage("Check your ID and email first.");
      return;
    }

    setWorking(true);
    setMessage("");
    setVerificationCode("");
    setVerificationStatus("idle");

    try {
      await sendEmailVerificationCode(normalizedEmail);
      setCodeSent(true);
      setVerificationSecondsLeft(VERIFICATION_CODE_TTL_SECONDS);
      setMessage("Verification code sent. Check your email.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send verification code.");
    } finally {
      setWorking(false);
    }
  }

  async function verifySignupCode(nextCode = verificationCode) {
    const trimmedCode = nextCode.trim();

    if (!codeSent || trimmedCode.length !== 6 || codeChecking) {
      return;
    }

    if (verificationSecondsLeft <= 0) {
      setVerificationStatus("error");
      setMessage("This verification code expired. Send a new code.");
      return;
    }

    setVerificationStatus("checking");
    setMessage("");

    try {
      await verifyEmailVerificationCode({
        email: normalizedEmail,
        token: trimmedCode,
      });
      setVerificationStatus("verified");
      setVerificationSecondsLeft(0);
      setMessage("Email verified.");
    } catch (error) {
      setVerificationStatus("error");
      setMessage(error instanceof Error ? error.message : "Verification code is invalid or expired.");
    }
  }

  async function createEmailAccount() {
    if (signupBaseInvalid) {
      setMessage("Complete all required fields before creating your account.");
      return;
    }

    setWorking(true);
    setMessage("");

    try {
      await signUpWithEmail({
        email: normalizedEmail,
        fullName,
        nickname: normalizedNickname,
        notificationOptIn,
        password,
        token: verificationCode,
      });
      await requestNotificationPermissionIfNeeded();
      await onAuthenticated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create account.");
    } finally {
      setWorking(false);
    }
  }

  if (authPage === "email") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", default: undefined })} style={styles.authKeyboard}>
          <ScrollView contentContainerStyle={styles.emailAuthContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.emailAuthHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to sign in options"
                onPress={() => {
                  setMessage("");
                  setAuthPage("providers");
                }}
                style={styles.emailBackButton}
              >
                <UtilityIcon type="back" size={20} color="#2a1c13" />
              </Pressable>
              <BlessiLogo imageStyle={styles.emailAuthLogo} />
              <View style={styles.emailHeaderSpacer} />
            </View>

            <View style={styles.emailAuthIntro}>
              <Text style={styles.emailAuthTitle}>
                {emailTab === "signup" ? "Create your account" : "Log in or create account"}
              </Text>
              <Text style={styles.emailAuthBody}>
                {emailTab === "signup"
                  ? "Set up your profile once. Your prayers, groups, and growth stay connected."
                  : "Use your email to keep your prayer groups, growth, and profile connected."}
              </Text>
            </View>

            <View style={styles.emailTabBar}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMessage("");
                  setEmailTab("signin");
                }}
                style={[styles.emailTabButton, emailTab === "signin" && styles.emailTabButtonActive]}
              >
                <Text style={[styles.emailTabText, emailTab === "signin" && styles.emailTabTextActive]}>Sign in</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMessage("");
                  setEmailTab("signup");
                }}
                style={[styles.emailTabButton, emailTab === "signup" && styles.emailTabButtonActive]}
              >
                <Text style={[styles.emailTabText, emailTab === "signup" && styles.emailTabTextActive]}>Create account</Text>
              </Pressable>
            </View>

            <View style={styles.emailPanel}>
              {emailTab === "signin" ? (
                <>
                  <TextInput
                    accessibilityLabel="Email address"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="Email"
                    placeholderTextColor="#9C918A"
                    style={styles.emailInput}
                    value={email}
                  />
                  <TextInput
                    accessibilityLabel="Password"
                    autoCapitalize="none"
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor="#9C918A"
                    secureTextEntry
                    style={styles.emailInput}
                    value={password}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={signinDisabled}
                    onPress={authenticateWithEmail}
                    style={({ pressed }) => [styles.emailAction, pressed && styles.pressed, signinDisabled && styles.disabledButton]}
                  >
                    <Text style={styles.emailActionText}>Sign in</Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.signupStack}>
                  <View style={styles.formSection}>
                    <FormSectionHeader meta="Required" title="Profile" />
                    <View style={styles.nameFieldRow}>
                      <TextInput
                        accessibilityLabel="First name"
                        autoCapitalize="words"
                        autoComplete="given-name"
                        onChangeText={setFirstName}
                        placeholder="First name"
                        placeholderTextColor="#9C918A"
                        style={[styles.emailInput, styles.nameFieldInput]}
                        value={firstName}
                      />
                      <TextInput
                        accessibilityLabel="Last name"
                        autoCapitalize="words"
                        autoComplete="family-name"
                        onChangeText={setLastName}
                        placeholder="Last name"
                        placeholderTextColor="#9C918A"
                        style={[styles.emailInput, styles.nameFieldInput]}
                        value={lastName}
                      />
                    </View>
                  </View>

                  <View style={styles.formSection}>
                    <FormSectionHeader meta="Unique" title="Account ID" />
                    <View style={styles.availabilityField}>
                      <View style={styles.emailInputRow}>
                        <TextInput
                          accessibilityLabel="Account ID"
                          autoCapitalize="none"
                          autoComplete="username"
                          onChangeText={(value) => {
                            setNickname(value);
                            setNicknameStatus("idle");
                            setCodeSent(false);
                            setVerificationCode("");
                            setVerificationSecondsLeft(0);
                            setVerificationStatus("idle");
                          }}
                          placeholder="Choose an ID"
                          placeholderTextColor="#9C918A"
                          style={styles.emailInputInline}
                          value={nickname}
                        />
                        <AvailabilityStatusBadge status={nicknameStatus} />
                      </View>
                      <AvailabilityHint kind="ID" status={nicknameStatus} />
                    </View>
                  </View>

                  <View style={styles.formSection}>
                    <FormSectionHeader meta="Required" title="Email" />
                    <View style={styles.availabilityField}>
                      <View style={styles.emailInputRow}>
                        <TextInput
                          accessibilityLabel="Email address"
                          autoCapitalize="none"
                          autoComplete="email"
                          keyboardType="email-address"
                          onChangeText={(value) => {
                            setEmail(value);
                            setEmailStatus("idle");
                            setCodeSent(false);
                            setVerificationCode("");
                            setVerificationSecondsLeft(0);
                            setVerificationStatus("idle");
                          }}
                          placeholder="Email address"
                          placeholderTextColor="#9C918A"
                          style={styles.emailInputInline}
                          value={email}
                        />
                        <AvailabilityStatusBadge status={emailStatus} />
                      </View>
                      <AvailabilityHint kind="Email" status={emailStatus} />
                    </View>
                  </View>

                  <View style={styles.formSection}>
                    <FormSectionHeader meta="Minimum 8 characters" title="Password" />
                    <View style={styles.passwordFieldStack}>
                      <TextInput
                        accessibilityLabel="Password"
                        autoCapitalize="none"
                        autoComplete="new-password"
                        onChangeText={setPassword}
                        placeholder="Password"
                        placeholderTextColor="#9C918A"
                        secureTextEntry
                        style={styles.emailInput}
                        value={password}
                      />
                      <TextInput
                        accessibilityLabel="Confirm password"
                        autoCapitalize="none"
                        autoComplete="new-password"
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm password"
                        placeholderTextColor="#9C918A"
                        secureTextEntry
                        style={styles.emailInput}
                        value={confirmPassword}
                      />
                      <PasswordHint confirmPassword={confirmPassword} password={password} />
                    </View>
                  </View>

                  <View style={styles.formSection}>
                    <FormSectionHeader meta="60 seconds" title="Email verification" />
                    <Pressable
                      accessibilityRole="button"
                      disabled={sendCodeDisabled}
                      onPress={sendSignupCode}
                      style={({ pressed }) => [
                        styles.verificationAction,
                        codeSent && styles.verificationActionSent,
                        codeVerified && styles.verificationActionVerified,
                        pressed && styles.pressed,
                        sendCodeDisabled && !codeVerified && styles.disabledButton,
                      ]}
                    >
                      <Text style={[styles.verificationActionText, codeSent && styles.verificationActionTextSent, codeVerified && styles.verificationActionTextVerified]}>
                        {verificationActionLabel}
                      </Text>
                    </Pressable>
                    <TextInput
                      accessibilityLabel="Email verification code"
                      autoCapitalize="none"
                      autoComplete="one-time-code"
                      keyboardType="number-pad"
                      onChangeText={(value) => {
                        const nextCode = value.replace(/\D/g, "").slice(0, 6);
                        setVerificationCode(nextCode);

                        if (verificationStatus !== "idle") {
                          setVerificationStatus("idle");
                        }

                        if (nextCode.length === 6) {
                          void verifySignupCode(nextCode);
                        }
                      }}
                      placeholder="6-digit verification code"
                      placeholderTextColor="#9C918A"
                      style={styles.emailInput}
                      value={verificationCode}
                    />
                    {verificationStatus !== "idle" ? (
                      <Text
                        style={[
                          styles.verificationStatusText,
                          verificationStatus === "verified" && styles.verificationStatusSuccess,
                          verificationStatus === "error" && styles.verificationStatusError,
                        ]}
                      >
                        {verificationStatus === "verified"
                          ? "Verified."
                          : verificationStatus === "checking"
                            ? "Checking this code..."
                            : "This code is invalid or expired."}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.formSection}>
                    <FormSectionHeader meta="Consent" title="Preferences" />
                    <View style={styles.checkboxPanel}>
                      <CheckboxRow
                        checked={policyAccepted}
                        detailLabel="View details"
                        label="I agree to the Privacy and Safety Policy."
                        onDetailPress={() => setPolicyDetailsVisible(true)}
                        onPress={() => setPolicyAccepted((current) => !current)}
                      />
                      <CheckboxRow
                        checked={notificationOptIn}
                        label="Allow prayer reminder notifications."
                        onPress={() => setNotificationOptIn((current) => !current)}
                      />
                    </View>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    disabled={signupBaseInvalid}
                    onPress={createEmailAccount}
                    style={({ pressed }) => [styles.emailAction, styles.createAccountAction, pressed && styles.pressed, signupBaseInvalid && styles.disabledButton]}
                  >
                    <Text style={styles.emailActionText}>Create account</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.emailFeedbackArea}>
              {helperText ? <Text style={styles.authHelperText}>{helperText}</Text> : null}
              {working ? <ActivityIndicator color="#FF6628" /> : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <PolicyDetailsModal onClose={() => setPolicyDetailsVisible(false)} visible={policyDetailsVisible} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", default: undefined })} style={styles.authKeyboard}>
        <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.authTopRow}>
            <Pressable accessibilityRole="link" accessibilityLabel="Contact Blessie" onPress={() => setContactVisible(true)} style={styles.contactButton}>
              <Text style={styles.contactText}>Contact</Text>
            </Pressable>
          </View>
          <View style={styles.authBrandBlock}>
            <Text style={styles.authEyebrow}>Pray together with </Text>
            <BlessiLogo imageStyle={styles.authLogo} />
          </View>

          <View style={styles.authButtonStack}>
            <AuthProviderButton
              backgroundColor="#FFFFFF"
              borderColor="#DADCE0"
              disabled={working}
              icon={<GoogleMark />}
              label="Sign in with Google"
              onPress={() => authenticateWithProvider("google")}
              textColor="#1f1f1f"
              textStyle={styles.googleButtonText}
            />
            <AuthProviderButton
              backgroundColor="#000000"
              disabled={working}
              icon={<AppleMark />}
              label="Sign in with Apple"
              onPress={() => authenticateWithProvider("apple")}
              textColor="#FFFFFF"
              textStyle={styles.appleButtonText}
            />
            <AuthProviderButton
              backgroundColor="#FF6628"
              disabled={working}
              icon={<UtilityIcon type="message" size={20} color="#2a1c13" />}
              label="Continue with Email"
              onPress={() => {
                setMessage("");
                setAuthPage("email");
              }}
              textColor="#2a1c13"
              textStyle={styles.emailProviderButtonText}
            />
          </View>

          {helperText ? <Text style={styles.authHelperText}>{helperText}</Text> : null}
          {working ? <ActivityIndicator color="#FF6628" /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <ContactInfoModal onClose={() => setContactVisible(false)} visible={contactVisible} />
      <PolicyDetailsModal onClose={() => setPolicyDetailsVisible(false)} visible={policyDetailsVisible} />
    </SafeAreaView>
  );
}

async function hasCompletedProfileConsent(
  runtime: Awaited<ReturnType<typeof getSupabaseRuntime>>,
  user: User | null,
) {
  if (!isSignedInUser(user) || !runtime.supabase) {
    return false;
  }

  try {
    const { data, error } = await runtime.supabase
      .from("profiles")
      .select("policy_accepted_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return Boolean((data as { policy_accepted_at?: string | null } | null)?.policy_accepted_at);
  } catch (error) {
    console.warn("Could not check profile completion.", error);
    return false;
  }
}

function AppleMark() {
  return (
    <Svg width={18} height={21} viewBox="0 0 36 42">
      <Path d="M24.7 4.1 C26.5 1.9 29.1 0.5 31.4 0.3 C31.7 3.1 30.6 5.8 28.9 7.8 C27.1 9.9 24.3 11.6 21.8 11.3 C21.5 8.6 22.9 6 24.7 4.1 Z" fill="#FFFFFF" />
      <Path
        d="M30.9 21.8 C30.8 16.6 35.1 14 35.3 13.9 C32.9 10.4 29.1 9.9 27.8 9.8 C24.7 9.5 21.7 11.6 20.1 11.6 C18.5 11.6 16 9.8 13.5 9.9 C10.1 9.9 7 11.9 5.3 15 C1.7 21.2 4.4 30.4 7.8 35.4 C9.5 37.8 11.5 40.5 14.1 40.4 C16.6 40.3 17.6 38.8 20.7 38.8 C23.7 38.8 24.7 40.4 27.4 40.3 C30.2 40.3 31.9 37.9 33.5 35.5 C35.4 32.8 36.2 30.1 36.2 30 C36.1 30 31 28.1 30.9 21.8 Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

function GoogleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <Path fill="none" d="M0 0h48v48H0z" />
    </Svg>
  );
}

function AvailabilityStatusBadge({ status }: { status: AvailabilityStatus }) {
  const isError = status === "taken" || status === "invalid" || status === "error";

  return (
    <View
      accessibilityLabel="Availability status"
      style={[
        styles.availabilityCheckButton,
        status === "available" && styles.availabilityCheckButtonAvailable,
        isError && styles.availabilityCheckButtonError,
        status === "checking" && styles.availabilityCheckButtonChecking,
      ]}
    >
      {status === "checking" ? (
        <ActivityIndicator color="#69543a" size="small" />
      ) : (
        <UtilityIcon type="check" size={16} color={status === "available" ? "#FFFFFF" : isError ? "#B14524" : "#2a1c13"} />
      )}
    </View>
  );
}

function FormSectionHeader({ meta, title }: { meta: string; title: string }) {
  return (
    <View style={styles.formSectionHeader}>
      <Text style={styles.formSectionTitle}>{title}</Text>
      <Text style={styles.formSectionMeta}>{meta}</Text>
    </View>
  );
}

function AvailabilityHint({ kind, status }: { kind: "ID" | "Email"; status: AvailabilityStatus }) {
  if (status === "idle") {
    return <Text style={styles.availabilityHintMuted}>Type and pause to check this {kind.toLowerCase()} automatically.</Text>;
  }

  if (status === "checking") {
    return <Text style={styles.availabilityHintMuted}>Checking {kind.toLowerCase()} availability...</Text>;
  }

  if (status === "invalid") {
    return <Text style={styles.availabilityHintError}>Enter an email like name@example.com.</Text>;
  }

  if (status === "available") {
    return <Text style={styles.availabilityHintSuccess}>This {kind.toLowerCase()} is available.</Text>;
  }

  if (status === "taken") {
    return <Text style={styles.availabilityHintError}>This {kind.toLowerCase()} is already in use.</Text>;
  }

  return <Text style={styles.availabilityHintError}>Could not check this {kind.toLowerCase()}. Try again.</Text>;
}

function PasswordHint({
  confirmPassword,
  password,
}: {
  confirmPassword: string;
  password: string;
}) {
  if (!password && !confirmPassword) {
    return <Text style={styles.availabilityHintMuted}>Use at least 8 characters.</Text>;
  }

  if (password.length < 8) {
    return <Text style={styles.availabilityHintError}>Password must be at least 8 characters.</Text>;
  }

  if (confirmPassword && password !== confirmPassword) {
    return <Text style={styles.availabilityHintError}>Passwords do not match.</Text>;
  }

  if (confirmPassword && password === confirmPassword) {
    return <Text style={styles.availabilityHintSuccess}>Password is ready.</Text>;
  }

  return <Text style={styles.availabilityHintSuccess}>Password length is good.</Text>;
}

function CheckboxRow({
  checked,
  detailLabel,
  label,
  onDetailPress,
  onPress,
}: {
  checked: boolean;
  detailLabel?: string;
  label: string;
  onDetailPress?: () => void;
  onPress: () => void;
}) {
  return (
    <View style={styles.checkboxWrap}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={styles.checkboxRow}>
        <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
          {checked ? <UtilityIcon type="check" size={14} color="#FFFFFF" /> : null}
        </View>
        <Text style={styles.checkboxLabel}>{label}</Text>
      </Pressable>
      {detailLabel && onDetailPress ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onDetailPress} style={styles.checkboxDetailButton}>
          <Text style={styles.checkboxDetailText}>{detailLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PolicyDetailsModal({ onClose, visible }: { onClose: () => void; visible: boolean }) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <View style={styles.infoModalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Privacy and Safety Policy</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.modalIconButton}>
              <UtilityIcon type="close" size={18} color="#2a1c13" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
            <PolicySection
              body="We store your account profile, prayer requests, group memberships, reactions, prayer growth, report history, block choices, and reminder preferences so Blessie can keep your prayers connected to you."
              title="What Blessie Stores"
            />
            <PolicySection
              body="Public prayer requests can be shown to people inside your selected distance. Blessie uses your location permission to match nearby prayers, but your exact address is not shown on a post."
              title="Location and Public Prayers"
            />
            <PolicySection
              body="Private group prayers are visible only to members of that group. Invite codes should be shared only with people you want in the group."
              title="Private Groups"
            />
            <PolicySection
              body="You can report a prayer, hide it from yourself, and block its author. Harmful or profane words may be masked before they are shown."
              title="Safety Tools"
            />
            <PolicySection
              body="You can sign out anytime. Account deletion can be requested from settings, with a 24-hour cancellation window before data removal begins."
              title="Account Control"
            />
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.modalPrimaryButton}>
            <Text style={styles.modalPrimaryButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ContactInfoModal({ onClose, visible }: { onClose: () => void; visible: boolean }) {
  const supportEmail = "support@blessie.ca";

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <View style={styles.infoModalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Contact</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.modalIconButton}>
              <UtilityIcon type="close" size={18} color="#2a1c13" />
            </Pressable>
          </View>
          <Text style={styles.modalBodyText}>For questions, account help, or safety reports, contact Blessie by email.</Text>
          <Text selectable style={styles.contactEmailText}>
            {supportEmail}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void NativeLinking.openURL(`mailto:${supportEmail}`);
            }}
            style={styles.modalPrimaryButton}
          >
            <Text style={styles.modalPrimaryButtonText}>Email support</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PolicySection({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.policySection}>
      <Text style={styles.policySectionTitle}>{title}</Text>
      <Text style={styles.policySectionBody}>{body}</Text>
    </View>
  );
}

function AuthProviderButton({
  backgroundColor,
  borderColor,
  disabled,
  icon,
  label,
  onPress,
  textColor,
  textStyle,
}: {
  backgroundColor: string;
  borderColor?: string;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  textColor: string;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.providerButton,
        {
          backgroundColor,
          borderColor: borderColor ?? "transparent",
        },
        pressed && styles.pressed,
        disabled && styles.disabledButton,
      ]}
    >
      <View style={styles.providerContent}>
        <View style={styles.providerIcon}>{icon}</View>
        <Text style={[styles.providerText, { color: textColor }, textStyle]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const softShadow = Platform.select({
  web: { boxShadow: "0 20px 44px rgba(42, 28, 19, 0.12)" },
  default: {
    shadowColor: "#2a1c13",
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 16 },
    elevation: 5,
  },
});

const ctaShadow = Platform.select({
  web: { boxShadow: "0 14px 24px rgba(255, 102, 40, 0.2)" },
  default: {
    shadowColor: "#FF6628",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
});

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    backgroundColor: "#F7F7F2",
  },
  loadingLogo: {
    width: 138,
    height: 42,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  tutorialHeader: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  tutorialLogo: {
    width: 98,
    height: 30,
  },
  tutorialVisualWrap: {
    flex: 1,
    minHeight: 320,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
  },
  tutorialImageCard: {
    alignItems: "center",
    justifyContent: "center",
  },
  tutorialImage: {
    width: "100%",
    height: "100%",
  },
  tutorialCopy: {
    width: "100%",
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 10,
  },
  tutorialTitle: {
    color: "#2a1c13",
    fontFamily: Fonts.sans,
    width: "100%",
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
    textAlign: "center",
  },
  tutorialBody: {
    color: "#69543a",
    fontFamily: Fonts.sans,
    maxWidth: 330,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  tutorialFooter: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 22,
    gap: 18,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    height: 9,
    borderRadius: 5,
  },
  dotActive: {
    width: 24,
    backgroundColor: "#FF6628",
  },
  dotInactive: {
    width: 9,
    backgroundColor: "#D8D9D2",
  },
  primaryCta: {
    minHeight: 62,
    borderRadius: 20,
    backgroundColor: "#FF6628",
    alignItems: "center",
    justifyContent: "center",
    ...ctaShadow,
  },
  primaryCtaText: {
    color: "#2a1c13",
    fontFamily: Fonts.sans,
    fontSize: 19,
    fontWeight: "900",
  },
  authKeyboard: {
    flex: 1,
  },
  authContent: {
    flexGrow: 1,
    paddingHorizontal: 8,
    paddingBottom: 28,
  },
  authTopRow: {
    minHeight: 70,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    paddingBottom: 10,
  },
  contactButton: {
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  contactText: {
    color: "#69543a",
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: "700",
  },
  authBrandBlock: {
    minHeight: 300,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 0,
    paddingBottom: 36,
  },
  authLogo: {
    marginTop: -4,
    width: 320,
    height: 106,
  },
  authEyebrow: {
    color: "#513c25",
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "700",
    textAlign: "center",
  },
  authButtonStack: {
    gap: 10,
    marginTop: 0,
  },
  providerButton: {
    height: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  providerContent: {
    width: 208,
    flexDirection: "row",
    alignItems: "center",
  },
  providerIcon: {
    width: 24,
    height: 24,
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  providerText: {
    fontFamily: Platform.select({
      web: "Roboto, Arial, sans-serif",
      android: "Roboto",
      default: Fonts.sans,
    }),
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "left",
    flexShrink: 1,
  },
  googleButtonText: {
    fontFamily: Platform.select({
      web: "Roboto, Arial, sans-serif",
      android: "Roboto",
      default: Fonts.sans,
    }),
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: 0,
  },
  appleButtonText: {
    fontFamily: Platform.select({
      web: "Roboto, Arial, sans-serif",
      android: "Roboto",
      default: Fonts.sans,
    }),
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
  },
  emailProviderButtonText: {
    fontFamily: Platform.select({
      web: "Roboto, Arial, sans-serif",
      android: "Roboto",
      default: Fonts.sans,
    }),
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  emailAuthContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 34,
  },
  emailAuthHeader: {
    width: "100%",
    maxWidth: 390,
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emailBackButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emailAuthLogo: {
    width: 122,
    height: 38,
  },
  emailHeaderSpacer: {
    width: 44,
    height: 44,
  },
  emailAuthIntro: {
    width: "100%",
    maxWidth: 390,
    paddingTop: 38,
    paddingBottom: 20,
    alignItems: "center",
  },
  emailAuthTitle: {
    color: "#2a1c13",
    fontFamily: Fonts.sans,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    textAlign: "center",
  },
  emailAuthBody: {
    marginTop: 10,
    maxWidth: 300,
    color: "#69543a",
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    textAlign: "center",
  },
  emailPanel: {
    width: "100%",
    maxWidth: 390,
    marginTop: 12,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
    ...softShadow,
  },
  emailInput: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#F7F7F2",
    paddingHorizontal: 14,
    color: "#2a1c13",
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: "800",
  },
  emailInputRow: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#F7F7F2",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 6,
  },
  signupStack: {
    gap: 16,
  },
  formSection: {
    gap: 8,
  },
  formSectionHeader: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 2,
  },
  formSectionTitle: {
    color: "#2a1c13",
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  formSectionMeta: {
    color: "#8C7B65",
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
  },
  nameFieldRow: {
    gap: 8,
  },
  nameFieldInput: {
    width: "100%",
  },
  availabilityField: {
    gap: 5,
  },
  availabilityCheckButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCEADE",
  },
  availabilityCheckButtonAvailable: {
    backgroundColor: "#5BAA57",
  },
  availabilityCheckButtonError: {
    backgroundColor: "#FFE0D4",
  },
  availabilityCheckButtonChecking: {
    backgroundColor: "#FFF7EE",
  },
  availabilityHintMuted: {
    marginLeft: 6,
    color: "#8C7B65",
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  availabilityHintSuccess: {
    marginLeft: 6,
    color: "#3F8B3E",
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
  },
  availabilityHintError: {
    marginLeft: 6,
    color: "#B14524",
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
  },
  emailInputInline: {
    flex: 1,
    color: "#2a1c13",
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: "800",
    paddingVertical: 0,
  },
  verificationAction: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCEADE",
    borderWidth: 1,
    borderColor: "#FFD1BD",
  },
  verificationActionSent: {
    backgroundColor: "#FFF7EE",
    borderColor: "#FF6628",
  },
  verificationActionVerified: {
    backgroundColor: "#F1FAEE",
    borderColor: "#4F9A45",
  },
  verificationActionText: {
    color: "#FF6628",
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: "900",
  },
  verificationActionTextSent: {
    color: "#2a1c13",
  },
  verificationActionTextVerified: {
    color: "#3F8B3E",
  },
  verificationStatusText: {
    marginLeft: 6,
    marginTop: -2,
    color: "#69543a",
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
  },
  verificationStatusSuccess: {
    color: "#3F8B3E",
  },
  verificationStatusError: {
    color: "#B14524",
  },
  passwordFieldStack: {
    gap: 8,
  },
  emailTabBar: {
    width: "100%",
    maxWidth: 390,
    flexDirection: "row",
    gap: 8,
  },
  emailTabButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECECE4",
  },
  emailTabButtonActive: {
    backgroundColor: "#FF6628",
    borderColor: "#FF6628",
  },
  emailTabText: {
    color: "#69543a",
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: "900",
  },
  emailTabTextActive: {
    color: "#2a1c13",
  },
  checkboxRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
  },
  checkboxWrap: {
    paddingVertical: 2,
  },
  checkboxPanel: {
    borderRadius: 16,
    backgroundColor: "#FFF7EE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#D5CEC3",
    backgroundColor: "#FFFFFF",
  },
  checkboxBoxChecked: {
    borderColor: "#FF6628",
    backgroundColor: "#FF6628",
  },
  checkboxLabel: {
    flex: 1,
    color: "#513c25",
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  checkboxDetailButton: {
    alignSelf: "flex-start",
    marginLeft: 36,
    marginTop: -4,
    minHeight: 26,
    justifyContent: "center",
  },
  checkboxDetailText: {
    color: "rgba(105, 84, 58, 0.64)",
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  emailAction: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6628",
  },
  createAccountAction: {
    minHeight: 54,
    borderRadius: 18,
    ...ctaShadow,
  },
  emailActionText: {
    color: "#2a1c13",
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: "900",
  },
  authHelperText: {
    minHeight: 40,
    color: "#69543a",
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    textAlign: "center",
  },
  emailFeedbackArea: {
    width: "100%",
    maxWidth: 390,
    minHeight: 60,
    marginTop: 14,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  pressed: {
    opacity: 0.76,
  },
  disabledButton: {
    opacity: 0.45,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    backgroundColor: "rgba(42, 28, 19, 0.32)",
  },
  infoModalCard: {
    width: "100%",
    maxWidth: 390,
    maxHeight: "82%",
    borderRadius: 24,
    backgroundColor: "#FFFDF8",
    padding: 18,
    ...softShadow,
  },
  modalHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    color: "#2a1c13",
    fontFamily: Fonts.sans,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
  },
  modalIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F1EA",
  },
  modalScroll: {
    marginTop: 6,
    marginBottom: 12,
  },
  modalBodyText: {
    marginTop: 10,
    color: "#513c25",
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
  },
  contactEmailText: {
    marginTop: 16,
    marginBottom: 18,
    color: "#2a1c13",
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
  },
  modalPrimaryButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6628",
  },
  modalPrimaryButtonText: {
    color: "#2a1c13",
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: "900",
  },
  policySection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EFE7DD",
  },
  policySectionTitle: {
    color: "#2a1c13",
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
  },
  policySectionBody: {
    marginTop: 5,
    color: "#69543a",
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
});
