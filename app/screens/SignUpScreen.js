import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
  patchUser,
} from "../api/UserAPI";

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
  const emailRequestRef = useRef(0);

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

    if (validateEmail(normalizedEmail)) {
      setEmailAvailability({ status: "idle", message: "" });
      return;
    }

    const requestId = emailRequestRef.current + 1;
    emailRequestRef.current = requestId;
    setEmailAvailability({
      status: "checking",
      message: "Checking email...",
    });

    const timeoutId = setTimeout(async () => {
      try {
        const availability = await getSignupAvailability({
          email: normalizedEmail,
        });

        if (emailRequestRef.current !== requestId) {
          return;
        }

        if (availability?.emailAvailable) {
          setEmailAvailability({
            status: "available",
            message: "Email is available.",
          });
        } else {
          setEmailAvailability({
            status: "taken",
            message: "That email is already in use.",
          });
        }
      } catch (error) {
        if (emailRequestRef.current !== requestId) {
          return;
        }

        setEmailAvailability({
          status: "error",
          message: "Could not verify email right now.",
        });
      }
    }, 350);

    return () => clearTimeout(timeoutId);
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
        email: normalizedEmail,
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

      if (!availability?.emailAvailable) {
        setEmailError("That email is already in use.");
        setEmailAvailability({
          status: "taken",
          message: "That email is already in use.",
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
          oauthId: localUser.uid,
          email: normalizedEmail,
          username: normalizedUsername,
          firstName: normalizedUsername,
          lastName: "user",
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

      let backlogListId = null;
      let favoriteListId = null;

      try {
        backlogListId = await postListWithType(localUser.uid, "backlog");
      } catch (error) {
        console.error("Failed to create backlog list:", error);
      }

      try {
        favoriteListId = await postListWithType(localUser.uid, "favorite");
      } catch (error) {
        console.error("Failed to create favorites list:", error);
      }

      try {
        if (backlogListId || favoriteListId) {
          await patchUser(localUser.uid, backlogListId, favoriteListId);
        }
      } catch (error) {
        console.error("Failed to patch default lists onto user:", error);
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Text style={styles.brand}>b.sides</Text>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Claim your username and start building your taste.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
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
                <Text style={styles.helperText}>{emailAvailability.message}</Text>
              ) : emailAvailability.message ? (
                <Text
                  style={
                    emailAvailability.status === "available"
                      ? styles.successText
                      : styles.helperText
                  }
                >
                  {emailAvailability.message}
                </Text>
              ) : (
                <Text style={styles.helperText}>
                  Use a real email address you can access.
                </Text>
              )}
            </View>

            <View style={styles.fieldGroup}>
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
              <View style={styles.rulesCard}>
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
                <Text style={styles.helperText}>
                  Use a password you have not used elsewhere.
                </Text>
              )}
            </View>

            <View style={styles.fieldGroup}>
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
                <Text style={styles.helperText}>{usernameAvailability.message}</Text>
              ) : usernameAvailability.message ? (
                <Text
                  style={
                    usernameAvailability.status === "available"
                      ? styles.successText
                      : styles.helperText
                  }
                >
                  {usernameAvailability.message}
                </Text>
              ) : (
                <Text style={styles.helperText}>
                  3-24 characters. Letters, numbers, periods, and underscores.
                </Text>
              )}
            </View>

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <TouchableOpacity
              onPress={handleSignUp}
              style={[
                styles.primaryButton,
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
              style={styles.secondaryAction}
              disabled={isSubmitting}
            >
              <Text style={styles.secondaryActionText}>
                Already have an account? Sign in
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  hero: {
    marginBottom: 22,
    alignItems: "center",
  },
  brand: {
    fontSize: 42,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -1.2,
  },
  title: {
    marginTop: 12,
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#6b7280",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: "#ece8dc",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  fieldGroup: {
    marginBottom: 18,
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
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 8,
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
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 19,
    color: "#b91c1c",
    fontWeight: "600",
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
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
  },
});
