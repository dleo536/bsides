import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../config/firebase";
import { updateCurrentUserOnboardingDetails } from "../api/UserAPI";
import { setSignupOnboardingState } from "../logic/onboardingFlow";

const BIO_MAX_LENGTH = 160;
const MINIMUM_AGE = 13;
const LOCATION_SOURCE_MANUAL = "manual";
const DATE_OF_BIRTH_INPUT_ACCESSORY_ID = "date-of-birth-input-accessory";

const formatDateInput = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const toIsoDate = (formattedValue) => {
  const digits = formattedValue.replace(/\D/g, "");
  if (digits.length !== 8) {
    return null;
  }

  const month = Number.parseInt(digits.slice(0, 2), 10);
  const day = Number.parseInt(digits.slice(2, 4), 10);
  const year = Number.parseInt(digits.slice(4, 8), 10);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
};

const isOldEnough = (isoDate) => {
  if (!isoDate) {
    return false;
  }

  const [year, month, day] = isoDate
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  const today = new Date();
  let age = today.getFullYear() - year;
  const birthdayHasPassed =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);

  if (!birthdayHasPassed) {
    age -= 1;
  }

  return age >= MINIMUM_AGE;
};

const validateDateOfBirth = (value) => {
  if (!value.trim()) {
    return "Date of birth is required.";
  }

  const isoDate = toIsoDate(value);
  if (!isoDate) {
    return "Enter a valid date of birth in MM/DD/YYYY format.";
  }

  if (!isOldEnough(isoDate)) {
    return "b.sides is only available to users age 13 and older.";
  }

  return "";
};

export default function SignUpDetailsScreen() {
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  const compactLayout = height <= 820;
  const ultraCompactLayout = height <= 740;

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [cityName, setCityName] = useState("");
  const [bio, setBio] = useState("");
  const [touched, setTouched] = useState({
    dateOfBirth: false,
    city: false,
    bio: false,
  });
  const [focusedField, setFocusedField] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bioCount = bio.length;
  const normalizedDateOfBirth = toIsoDate(dateOfBirth);
  const normalizedCityName = cityName.trim();
  const cityError = touched.city && !normalizedCityName ? "City is required." : "";
  const dateOfBirthError = touched.dateOfBirth
    ? validateDateOfBirth(dateOfBirth)
    : "";
  const bioError =
    touched.bio && bioCount > BIO_MAX_LENGTH
      ? `Bio must be ${BIO_MAX_LENGTH} characters or fewer.`
      : "";
  const canContinue =
    Boolean(normalizedDateOfBirth) &&
    isOldEnough(normalizedDateOfBirth) &&
    Boolean(normalizedCityName) &&
    bioCount <= BIO_MAX_LENGTH &&
    !isSubmitting;

  const ageStatusLabel = useMemo(() => {
    if (!dateOfBirth.trim()) {
      return "13+ only";
    }
    if (!normalizedDateOfBirth) {
      return "Enter a valid date";
    }
    if (!isOldEnough(normalizedDateOfBirth)) {
      return "Not eligible";
    }

    return "Eligible";
  }, [dateOfBirth, normalizedDateOfBirth]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setFocusedField(null);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const isBioFocused = focusedField === "bio";
  const shouldCompressForKeyboard = keyboardVisible && isBioFocused;

  const getInputStateStyle = ({ hasError, isValid }) => {
    if (hasError) {
      return styles.inputError;
    }
    if (isValid) {
      return styles.inputSuccess;
    }
    return null;
  };

  const setFieldTouched = (field) => {
    setTouched((current) => ({
      ...current,
      [field]: true,
    }));
  };

  const handleContinue = async () => {
    setTouched({
      dateOfBirth: true,
      city: true,
      bio: true,
    });
    setFormError("");

    const nextDateOfBirthError = validateDateOfBirth(dateOfBirth);
    const nextCityError = normalizedCityName ? "" : "City is required.";
    const nextBioError =
      bioCount > BIO_MAX_LENGTH
        ? `Bio must be ${BIO_MAX_LENGTH} characters or fewer.`
        : "";

    if (
      nextDateOfBirthError ||
      nextCityError ||
      nextBioError ||
      !normalizedDateOfBirth
    ) {
      return;
    }

    if (!auth.currentUser?.uid) {
      setFormError("Your session expired. Please sign in and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateCurrentUserOnboardingDetails({
        dateOfBirth: normalizedDateOfBirth,
        cityName: normalizedCityName,
        locationSource: LOCATION_SOURCE_MANUAL,
        bio: bio.trim(),
      });
      await setSignupOnboardingState(auth.currentUser.uid, "profile-picture");
      navigation.replace("Profile Picture");
    } catch (error) {
      const message =
        error?.payload?.message || error?.message || "Could not save your details.";
      setFormError(String(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View
            style={[
              styles.content,
              compactLayout && styles.contentCompact,
              ultraCompactLayout && styles.contentUltraCompact,
              shouldCompressForKeyboard && styles.contentKeyboardOpen,
            ]}
          >
            <View
              style={[
                styles.hero,
                compactLayout && styles.heroCompact,
                ultraCompactLayout && styles.heroUltraCompact,
                shouldCompressForKeyboard && styles.heroKeyboardOpen,
              ]}
            >
              <Text
                style={[
                  styles.brand,
                  compactLayout && styles.brandCompact,
                  ultraCompactLayout && styles.brandUltraCompact,
                  shouldCompressForKeyboard && styles.brandKeyboardOpen,
                ]}
              >
                b.sides
              </Text>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>Step 2 of 3</Text>
              </View>
              <Text style={[styles.title, compactLayout && styles.titleCompact]}>
                Tell us a little about you
              </Text>
            </View>

            <View
              style={[
                styles.card,
                compactLayout && styles.cardCompact,
                ultraCompactLayout && styles.cardUltraCompact,
                shouldCompressForKeyboard && styles.cardKeyboardOpen,
              ]}
            >
              <View style={styles.formBody}>
                <View style={[styles.fieldGroup, compactLayout && styles.fieldGroupCompact]}>
                  <View style={styles.fieldHeader}>
                    <Text style={styles.label}>Date of birth</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        normalizedDateOfBirth && isOldEnough(normalizedDateOfBirth)
                          ? styles.statusBadgeSuccess
                          : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          normalizedDateOfBirth && isOldEnough(normalizedDateOfBirth)
                            ? styles.statusBadgeTextSuccess
                            : null,
                        ]}
                      >
                        {ageStatusLabel}
                      </Text>
                    </View>
                  </View>
                  <TextInput
                    autoCorrect={false}
                    inputAccessoryViewID={
                      Platform.OS === "ios"
                        ? DATE_OF_BIRTH_INPUT_ACCESSORY_ID
                        : undefined
                    }
                    keyboardType="number-pad"
                    maxLength={10}
                    onBlur={() => setFieldTouched("dateOfBirth")}
                    onChangeText={(value) => {
                      setDateOfBirth(formatDateInput(value));
                      setFormError("");
                    }}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor="#9ca3af"
                    style={[
                      styles.input,
                      compactLayout && styles.inputCompact,
                      getInputStateStyle({
                        hasError: Boolean(dateOfBirthError),
                        isValid: Boolean(
                          normalizedDateOfBirth && isOldEnough(normalizedDateOfBirth)
                        ),
                      }),
                    ]}
                    value={dateOfBirth}
                  />
                  {dateOfBirthError ? (
                    <Text style={styles.errorText}>{dateOfBirthError}</Text>
                  ) : (
                    <Text style={[styles.helperText, compactLayout && styles.helperTextCompact]}>
                      You need to be at least 13 to use b.sides.
                    </Text>
                  )}
                </View>

                {!shouldCompressForKeyboard ? (
                  <View style={[styles.infoCard, compactLayout && styles.infoCardCompact]}>
                    <Ionicons name="location-outline" size={18} color="#7c5d00" />
                    <Text style={styles.infoCardText}>
                      Your location is only used to help show music local to you.
                    </Text>
                  </View>
                ) : null}

                <View style={[styles.fieldGroup, compactLayout && styles.fieldGroupCompact]}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    autoCapitalize="words"
                    autoCorrect={false}
                    onBlur={() => setFieldTouched("city")}
                    onChangeText={(value) => {
                      setCityName(value);
                      setFormError("");
                    }}
                    placeholder="Type your city"
                    placeholderTextColor="#9ca3af"
                    style={[
                      styles.input,
                      compactLayout && styles.inputCompact,
                      getInputStateStyle({
                        hasError: Boolean(cityError),
                        isValid: Boolean(normalizedCityName && touched.city),
                      }),
                    ]}
                    value={cityName}
                  />
                  {cityError ? (
                    <Text style={styles.errorText}>{cityError}</Text>
                  ) : (
                    <Text style={[styles.helperText, compactLayout && styles.helperTextCompact]}>
                      Enter the city you listen from most often.
                    </Text>
                  )}
                </View>

                <View style={[styles.fieldGroup, compactLayout && styles.fieldGroupCompact]}>
                  <View style={styles.fieldHeader}>
                    <Text style={styles.label}>Bio</Text>
                    <Text
                      style={[
                        styles.counterText,
                        bioCount > BIO_MAX_LENGTH ? styles.counterTextError : null,
                      ]}
                    >
                      {bioCount}/{BIO_MAX_LENGTH}
                    </Text>
                  </View>
                  <TextInput
                    autoCapitalize="sentences"
                    multiline
                    onFocus={() => setFocusedField("bio")}
                    onBlur={() => {
                      setFieldTouched("bio");
                      setFocusedField((currentField) =>
                        currentField === "bio" ? null : currentField
                      );
                    }}
                    onChangeText={(value) => {
                      setBio(value);
                      setFormError("");
                    }}
                    placeholder="What should people know about your taste?"
                    placeholderTextColor="#9ca3af"
                    style={[
                      styles.input,
                      styles.bioInput,
                      compactLayout && styles.inputCompact,
                      compactLayout && styles.bioInputCompact,
                      ultraCompactLayout && styles.bioInputUltraCompact,
                      shouldCompressForKeyboard && styles.bioInputKeyboardOpen,
                      getInputStateStyle({
                        hasError: Boolean(bioError),
                        isValid: Boolean(
                          touched.bio && bioCount > 0 && bioCount <= BIO_MAX_LENGTH
                        ),
                      }),
                    ]}
                    textAlignVertical="top"
                    value={bio}
                  />
                  {bioError ? (
                    <Text style={styles.errorText}>{bioError}</Text>
                  ) : (
                    <Text style={[styles.helperText, compactLayout && styles.helperTextCompact]}>
                      Optional. Your bio appears on your profile.
                    </Text>
                  )}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={!canContinue || isSubmitting}
                    onPress={() => {
                      Keyboard.dismiss();
                      handleContinue();
                    }}
                    style={[
                      styles.primaryButton,
                      compactLayout && styles.primaryButtonCompact,
                      !canContinue || isSubmitting ? styles.primaryButtonDisabled : null,
                    ]}
                  >
                    {isSubmitting ? (
                      <View style={styles.buttonLoadingRow}>
                        <ActivityIndicator size="small" color="#ffffff" />
                        <Text style={styles.primaryButtonText}>Saving details...</Text>
                      </View>
                    ) : (
                      <Text style={styles.primaryButtonText}>Continue</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.actionArea}>
                {formError ? (
                  <Text style={[styles.formError, compactLayout && styles.formErrorCompact]}>
                    {formError}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {Platform.OS === "ios" ? (
        <InputAccessoryView nativeID={DATE_OF_BIRTH_INPUT_ACCESSORY_ID}>
          <View style={styles.inputAccessory}>
            <TouchableOpacity activeOpacity={0.8} onPress={Keyboard.dismiss}>
              <Text style={styles.inputAccessoryButton}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      ) : null}
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
  },
  contentCompact: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  contentUltraCompact: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  contentKeyboardOpen: {
    paddingTop: 6,
    paddingBottom: 6,
  },
  hero: {
    marginBottom: 12,
    alignItems: "center",
  },
  heroCompact: {
    marginBottom: 10,
  },
  heroUltraCompact: {
    marginBottom: 8,
  },
  heroKeyboardOpen: {
    marginBottom: 6,
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
  brandKeyboardOpen: {
    fontSize: 30,
  },
  stepBadge: {
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: "#fff0b8",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stepBadgeText: {
    color: "#7c5d00",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  titleCompact: {
    marginTop: 6,
    fontSize: 22,
  },
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
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
    paddingTop: 14,
    paddingBottom: 14,
  },
  cardUltraCompact: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  cardKeyboardOpen: {
    paddingTop: 12,
    paddingBottom: 10,
  },
  formBody: {
    flexShrink: 1,
  },
  actionArea: {
    marginTop: 4,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldGroupCompact: {
    marginBottom: 9,
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
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  bioInput: {
    minHeight: 86,
    paddingTop: 12,
  },
  bioInputCompact: {
    minHeight: 74,
  },
  bioInputUltraCompact: {
    minHeight: 66,
  },
  bioInputKeyboardOpen: {
    minHeight: 54,
  },
  inputCompact: {
    minHeight: 44,
    paddingVertical: 9,
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
  helperText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: "#6b7280",
  },
  helperTextCompact: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: "#dc2626",
    fontWeight: "600",
  },
  formError: {
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 18,
    color: "#b91c1c",
    fontWeight: "600",
  },
  formErrorCompact: {
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 16,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: "#fff7d6",
    borderWidth: 1,
    borderColor: "#f2e3a2",
  },
  infoCardCompact: {
    marginBottom: 10,
    paddingVertical: 10,
  },
  infoCardText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#7c5d00",
    fontWeight: "600",
  },
  counterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
  },
  counterTextError: {
    color: "#dc2626",
  },
  statusBadge: {
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeSuccess: {
    backgroundColor: "#dcfce7",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6b7280",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  statusBadgeTextSuccess: {
    color: "#15803d",
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
    borderRadius: 14,
    minHeight: 50,
    paddingHorizontal: 18,
  },
  primaryButtonCompact: {
    minHeight: 46,
  },
  primaryButtonDisabled: {
    opacity: 0.72,
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
  inputAccessory: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f9fafb",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#d1d5db",
  },
  inputAccessoryButton: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
});
