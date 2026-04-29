import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { auth } from "../config/firebase";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  updateProfile,
} from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { postListWithType } from "../api/ListAPI";
import {
  createBackendUserProfile,
  getSignupAvailability,
} from "../api/UserAPI";
import LegalAccessLink from "../components/LegalAccessLink";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_REGEX = /^[A-Za-z0-9._]+$/;

const getPasswordRules = (password) => [
  {
    key: "length",
    label: "At least 8 characters",
    met: password.length >= 8,
  },
  {
    key: "uppercase",
    label: "1 uppercase letter",
    met: /[A-Z]/.test(password),
  },
  {
    key: "lowercase",
    label: "1 lowercase letter",
    met: /[a-z]/.test(password),
  },
  {
    key: "number",
    label: "1 number",
    met: /\d/.test(password),
  },
];

const validateEmail = (email) => {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    return "Email is required.";
  }
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return "Enter a valid email address.";
  }

  return "";
};

const validateUsername = (username) => {
  const normalizedUsername = username.trim();

  if (!normalizedUsername) {
    return "Username is required.";
  }
  if (normalizedUsername.length < 3) {
    return "Username must be at least 3 characters.";
  }
  if (normalizedUsername.length > 24) {
    return "Username must be 24 characters or fewer.";
  }
  if (!USERNAME_REGEX.test(normalizedUsername)) {
    return "Use letters, numbers, periods, or underscores only.";
  }

  return "";
};

export default function SignUpScreen() {
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  const compactLayout = height <= 820;
  const ultraCompactLayout = height <= 740;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    username: false,
  });
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState({
    status: "idle",
    message: "",
  });
  const [emailAvailability, setEmailAvailability] = useState({
    status: "idle",
    message: "",
  });

  const usernameRequestRef = useRef(0);

  const passwordRules = getPasswordRules(password);
  const isPasswordValid = passwordRules.every((rule) => rule.met);
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && !isSubmitting) {
        navigation.replace("Profile Picture");
      }
    });

    return unsubscribe;
  }, [isSubmitting, navigation]);

  useEffect(() => {
    if (!normalizedUsername) {
      setUsernameAvailability({ status: "idle", message: "" });
      return;
    }

    if (validateUsername(normalizedUsername)) {
      setUsernameAvailability({ status: "idle", message: "" });
      return;
    }

    const requestId = usernameRequestRef.current + 1;
    usernameRequestRef.current = requestId;
    setUsernameAvailability({
      status: "checking",
      message: "Checking username...",
    });

    const timeoutId = setTimeout(async () => {
      try {
        const availability = await getSignupAvailability({
          username: normalizedUsername,
        });

        if (usernameRequestRef.current !== requestId) {
          return;
        }

        if (availability?.usernameAvailable) {
          setUsernameAvailability({
            status: "available",
            message: "Username is available.",
          });
        } else {
          setUsernameAvailability({
            status: "taken",
            message: "That username is already taken.",
          });
        }
      } catch (error) {
        if (usernameRequestRef.current !== requestId) {
          return;
        }

        setUsernameAvailability({
          status: "error",
          message: "Could not verify username right now.",
        });
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [normalizedUsername]);

  useEffect(() => {
    if (!normalizedEmail) {
      setEmailAvailability({ status: "idle", message: "" });
      return;
    }

    const nextEmailError = validateEmail(normalizedEmail);
    if (nextEmailError) {
      setEmailAvailability({ status: "idle", message: "" });
      return;
    }

    setEmailAvailability({
      status: "available",
      message: "We'll verify this email during account creation.",
    });
  }, [normalizedEmail]);

  const setFieldTouched = (field) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const getInputStateStyle = ({ hasError, isValid }) => {
    if (hasError) {
      return styles.inputError;
    }
    if (isValid) {
      return styles.inputSuccess;
    }
    return null;
  };

  const handleEmailChange = (nextEmail) => {
    setEmail(nextEmail);
    setFormError("");
    if (emailError) {
      setEmailError("");
    }
  };

  const handlePasswordChange = (nextPassword) => {
    setPassword(nextPassword);
    setFormError("");
    if (passwordError) {
      setPasswordError("");
    }
  };

  const handleUsernameChange = (nextUsername) => {
    setUsername(nextUsername);
    setFormError("");
    if (usernameError) {
      setUsernameError("");
    }
  };

  const handleFirebaseError = (error) => {
    const errorCode = error?.code || "";
    const errorMessage = error?.message || "Could not create your account.";

    if (errorCode === "auth/email-already-in-use") {
      setEmailError("That email is already in use.");
      setEmailAvailability({
        status: "taken",
        message: "That email is already in use.",
      });
      return;
    }

    if (errorCode === "auth/invalid-email") {
      setEmailError("Enter a valid email address.");
      return;
    }

    if (errorCode === "auth/weak-password") {
      setPasswordError("Password does not meet the required rules.");
      return;
    }

    setFormError(errorMessage);
  };

  const handleBackendError = (error) => {
    const message = error?.payload?.message || error?.message || "Could not create your profile.";
    const normalizedMessage = String(message).toLowerCase();

    if (normalizedMessage.includes("username")) {
      setUsernameError("That username is already taken.");
      setUsernameAvailability({
        status: "taken",
        message: "That username is already taken.",
      });
      return;
    }

    if (normalizedMessage.includes("email")) {
      setEmailError("That email is already in use.");
      setEmailAvailability({
        status: "taken",
        message: "That email is already in use.",
      });
      return;
    }

    setFormError(message);
  };

  const handleSignUp = async () => {
    setTouched({
      email: true,
      password: true,
      username: true,
    });
    setFormError("");

    const nextEmailError = validateEmail(normalizedEmail);
    const nextUsernameError = validateUsername(normalizedUsername);
    const nextPasswordError = isPasswordValid
      ? ""
      : "Password does not meet the required rules.";

    setEmailError(nextEmailError);
    setUsernameError(nextUsernameError);
    setPasswordError(nextPasswordError);

    if (nextEmailError || nextUsernameError || nextPasswordError) {
      return;
    }

    setIsSubmitting(true);

    try {
      const availability = await getSignupAvailability({
        username: normalizedUsername,
      });

      if (!availability?.usernameAvailable) {
        setUsernameError("That username is already taken.");
        setUsernameAvailability({
          status: "taken",
          message: "That username is already taken.",
        });
        setIsSubmitting(false);
        return;
      }

      const credential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );
      const localUser = credential.user;

      await updateProfile(localUser, {
        displayName: normalizedUsername,
      });

      try {
        await createBackendUserProfile({
          email: normalizedEmail,
          username: normalizedUsername,
        });
      } catch (backendError) {
        try {
          await deleteUser(localUser);
        } catch (cleanupError) {
          console.error("Failed to delete Firebase user after signup error:", cleanupError);
        }

        handleBackendError(backendError);
        setIsSubmitting(false);
        return;
      }

      try {
        await postListWithType(localUser.uid, "backlog");
      } catch (error) {
        console.error("Failed to create backlog list:", error);
      }

      try {
        await postListWithType(localUser.uid, "favorite");
      } catch (error) {
        console.error("Failed to create favorites list:", error);
      }

      navigation.replace("Profile Picture");
    } catch (error) {
      handleFirebaseError(error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const showEmailError = touched.email && Boolean(emailError);
  const showUsernameError = touched.username && Boolean(usernameError);
  const showPasswordError = touched.password && Boolean(passwordError);

  const emailIsValid =
    normalizedEmail &&
    !emailError &&
    emailAvailability.status === "available";
  const usernameIsValid =
    normalizedUsername &&
    !usernameError &&
    usernameAvailability.status === "available";

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.content,
            compactLayout && styles.contentCompact,
            ultraCompactLayout && styles.contentUltraCompact,
          ]}
        >
          <View
            style={[
              styles.hero,
              compactLayout && styles.heroCompact,
              ultraCompactLayout && styles.heroUltraCompact,
            ]}
          >
            <Text
              style={[
                styles.brand,
                compactLayout && styles.brandCompact,
                ultraCompactLayout && styles.brandUltraCompact,
              ]}
            >
              b.sides
            </Text>
            <Text style={[styles.title, compactLayout && styles.titleCompact]}>
              Create your account
            </Text>
          </View>

          <View
            style={[
              styles.card,
              compactLayout && styles.cardCompact,
              ultraCompactLayout && styles.cardUltraCompact,
            ]}
          >
            <View style={[styles.fieldGroup, compactLayout && styles.fieldGroupCompact]}>
              <View style={styles.fieldHeader}>
                <Text style={styles.label}>Email</Text>
                {emailIsValid ? (
                  <View style={styles.successBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#15803d" />
                    <Text style={styles.successBadgeText}>Looks good</Text>
                  </View>
                ) : null}
              </View>
              <TextInput
                placeholder="you@example.com"
                value={email}
                onChangeText={handleEmailChange}
                onBlur={() => {
                  setFieldTouched("email");
                  setEmailError(validateEmail(normalizedEmail));
                }}
                style={[
                  styles.input,
                  compactLayout && styles.inputCompact,
                  getInputStateStyle({
                    hasError: showEmailError,
                    isValid: emailIsValid,
                  }),
                ]}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholderTextColor="#9ca3af"
              />
              {showEmailError ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : emailAvailability.status === "checking" ? (
                <Text style={[styles.helperText, compactLayout && styles.helperTextCompact]}>
                  {emailAvailability.message}
                </Text>
              ) : emailAvailability.message ? (
                <Text
                  style={
                    emailAvailability.status === "available"
                      ? [styles.successText, compactLayout && styles.helperTextCompact]
                      : [styles.helperText, compactLayout && styles.helperTextCompact]
                  }
                >
                  {emailAvailability.message}
                </Text>
              ) : (
                <Text style={[styles.helperText, compactLayout && styles.helperTextCompact]}>
                  Use a real email address you can access.
                </Text>
              )}
            </View>

            <View style={[styles.fieldGroup, compactLayout && styles.fieldGroupCompact]}>
              <View style={styles.fieldHeader}>
                <Text style={styles.label}>Password</Text>
                {isPasswordValid ? (
                  <View style={styles.successBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#15803d" />
                    <Text style={styles.successBadgeText}>Strong</Text>
                  </View>
                ) : null}
              </View>
              <TextInput
                placeholder="Create a password"
                value={password}
                onChangeText={handlePasswordChange}
                onBlur={() => {
                  setFieldTouched("password");
                  setPasswordError(
                    passwordRules.every((rule) => rule.met)
                      ? ""
                      : "Password does not meet the required rules."
                  );
                }}
                style={[
                  styles.input,
                  compactLayout && styles.inputCompact,
                  getInputStateStyle({
                    hasError: showPasswordError,
                    isValid: touched.password && isPasswordValid,
                  }),
                ]}
                secureTextEntry
                textContentType="newPassword"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#9ca3af"
              />
              <View style={[styles.rulesCard, compactLayout && styles.rulesCardCompact]}>
                {passwordRules.map((rule) => (
                  <View key={rule.key} style={styles.ruleRow}>
                    <Ionicons
                      name={rule.met ? "checkmark-circle" : "ellipse-outline"}
                      size={18}
                      color={rule.met ? "#15803d" : "#94a3b8"}
                    />
                    <Text
                      style={[
                        styles.ruleText,
                        compactLayout && styles.ruleTextCompact,
                        rule.met ? styles.ruleTextMet : null,
                      ]}
                    >
                      {rule.label}
                    </Text>
                  </View>
                ))}
              </View>
              {showPasswordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : (
                <Text style={[styles.helperText, compactLayout && styles.helperTextCompact]}>
                  Use a password you have not used elsewhere.
                </Text>
              )}
            </View>

            <View style={[styles.fieldGroup, compactLayout && styles.fieldGroupCompact]}>
              <View style={styles.fieldHeader}>
                <Text style={styles.label}>Username</Text>
                {usernameIsValid ? (
                  <View style={styles.successBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#15803d" />
                    <Text style={styles.successBadgeText}>Available</Text>
                  </View>
                ) : null}
              </View>
              <TextInput
                placeholder="your.name"
                value={username}
                onChangeText={handleUsernameChange}
                onBlur={() => {
                  setFieldTouched("username");
                  setUsernameError(validateUsername(normalizedUsername));
                }}
                style={[
                  styles.input,
                  compactLayout && styles.inputCompact,
                  getInputStateStyle({
                    hasError: showUsernameError,
                    isValid: usernameIsValid,
                  }),
                ]}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#9ca3af"
              />
              {showUsernameError ? (
                <Text style={styles.errorText}>{usernameError}</Text>
              ) : usernameAvailability.status === "checking" ? (
                <Text style={[styles.helperText, compactLayout && styles.helperTextCompact]}>
                  {usernameAvailability.message}
                </Text>
              ) : usernameAvailability.message ? (
                <Text
                  style={
                    usernameAvailability.status === "available"
                      ? [styles.successText, compactLayout && styles.helperTextCompact]
                      : [styles.helperText, compactLayout && styles.helperTextCompact]
                  }
                >
                  {usernameAvailability.message}
                </Text>
              ) : (
                <Text style={[styles.helperText, compactLayout && styles.helperTextCompact]}>
                  3-24 characters. Letters, numbers, periods, and underscores.
                </Text>
              )}
            </View>

            {formError ? (
              <Text style={[styles.formError, compactLayout && styles.formErrorCompact]}>
                {formError}
              </Text>
            ) : null}

            <TouchableOpacity
              onPress={handleSignUp}
              style={[
                styles.primaryButton,
                compactLayout && styles.primaryButtonCompact,
                isSubmitting ? styles.primaryButtonDisabled : null,
              ]}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <View style={styles.buttonLoadingRow}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.primaryButtonText}>Creating account...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Create account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate("Sign In")}
              style={[
                styles.secondaryAction,
                compactLayout && styles.secondaryActionCompact,
              ]}
              disabled={isSubmitting}
            >
              <Text style={styles.secondaryActionText}>
                Already have an account? Sign in
              </Text>
            </TouchableOpacity>

            <LegalAccessLink
              onPress={() => navigation.navigate("LegalSupport")}
              style={[styles.legalLink, compactLayout && styles.legalLinkCompact]}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: "#f4f4ef",
  },
  content: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  contentCompact: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  contentUltraCompact: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  hero: {
    marginBottom: 14,
    alignItems: "center",
  },
  heroCompact: {
    marginBottom: 10,
  },
  heroUltraCompact: {
    marginBottom: 8,
  },
  brand: {
    fontSize: 38,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -1.2,
  },
  brandCompact: {
    fontSize: 34,
  },
  brandUltraCompact: {
    fontSize: 30,
  },
  title: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  titleCompact: {
    marginTop: 6,
    fontSize: 22,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#6b7280",
    textAlign: "center",
  },
  subtitleCompact: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 19,
  },
  subtitleUltraCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#ece8dc",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardCompact: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardUltraCompact: {
    paddingVertical: 12,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldGroupCompact: {
    marginBottom: 10,
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  inputCompact: {
    paddingVertical: 10,
    fontSize: 14,
  },
  inputError: {
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
  },
  inputSuccess: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  rulesCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 6,
  },
  rulesCardCompact: {
    marginTop: 6,
    padding: 8,
    gap: 6,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ruleText: {
    fontSize: 13,
    color: "#64748b",
  },
  ruleTextCompact: {
    fontSize: 12,
  },
  ruleTextMet: {
    color: "#166534",
    fontWeight: "600",
  },
  helperText: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    color: "#6b7280",
  },
  helperTextCompact: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 16,
  },
  successText: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    color: "#15803d",
    fontWeight: "600",
  },
  errorText: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    color: "#dc2626",
    fontWeight: "600",
  },
  formError: {
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 19,
    color: "#b91c1c",
    fontWeight: "600",
  },
  formErrorCompact: {
    marginBottom: 10,
    fontSize: 12,
    lineHeight: 17,
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  successBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803d",
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 4,
  },
  primaryButtonCompact: {
    paddingVertical: 13,
    marginTop: 2,
  },
  primaryButtonDisabled: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  secondaryAction: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 6,
  },
  secondaryActionCompact: {
    paddingVertical: 10,
    marginTop: 4,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
  },
  legalLink: {
    marginTop: 14,
  },
  legalLinkCompact: {
    marginTop: 10,
  },
});
