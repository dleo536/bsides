import AsyncStorage from "@react-native-async-storage/async-storage";

const SIGNUP_ONBOARDING_STATE_KEY = "signup_onboarding_state";

const normalizeStep = (step) => {
  if (step === "user-details" || step === "profile-picture") {
    return step;
  }

  return null;
};

export const getSignupOnboardingState = async () => {
  try {
    const rawValue = await AsyncStorage.getItem(SIGNUP_ONBOARDING_STATE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);
    const uid =
      typeof parsedValue?.uid === "string" && parsedValue.uid.trim()
        ? parsedValue.uid.trim()
        : null;
    const step = normalizeStep(parsedValue?.step);

    if (!uid || !step) {
      await AsyncStorage.removeItem(SIGNUP_ONBOARDING_STATE_KEY);
      return null;
    }

    return { uid, step };
  } catch (error) {
    return null;
  }
};

export const setSignupOnboardingState = async (uid, step) => {
  const normalizedUid = typeof uid === "string" ? uid.trim() : "";
  const normalizedStep = normalizeStep(step);

  if (!normalizedUid || !normalizedStep) {
    return;
  }

  await AsyncStorage.setItem(
    SIGNUP_ONBOARDING_STATE_KEY,
    JSON.stringify({
      uid: normalizedUid,
      step: normalizedStep,
    })
  );
};

export const clearSignupOnboardingState = async () => {
  await AsyncStorage.removeItem(SIGNUP_ONBOARDING_STATE_KEY);
};

export const getPostAuthRouteForUser = async (user) => {
  const uid = typeof user?.uid === "string" ? user.uid.trim() : "";
  if (!uid) {
    return "Landing";
  }

  const onboardingState = await getSignupOnboardingState();
  if (!onboardingState || onboardingState.uid !== uid) {
    return "Welcome";
  }

  if (onboardingState.step === "user-details") {
    return "User Details";
  }

  if (onboardingState.step === "profile-picture") {
    return "Profile Picture";
  }

  return "Welcome";
};
