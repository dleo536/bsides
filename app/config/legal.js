import {
  REACT_NATIVE_PRIVACY_POLICY_URL,
  REACT_NATIVE_SUPPORT_EMAIL,
  REACT_NATIVE_SUPPORT_URL,
} from "@env";

const DEFAULT_SUPPORT_EMAIL = "support@bsides.pro";
const DEFAULT_SUPPORT_URL = "https://bsides.pro/";
const DEFAULT_PRIVACY_POLICY_URL = "https://bsides.pro/privacy/";

const normalizeValue = (value) =>
  typeof value === "string" ? value.trim() : "";

export const SUPPORT_URL =
  normalizeValue(REACT_NATIVE_SUPPORT_URL) || DEFAULT_SUPPORT_URL;

export const PRIVACY_POLICY_URL =
  normalizeValue(REACT_NATIVE_PRIVACY_POLICY_URL) ||
  DEFAULT_PRIVACY_POLICY_URL;

export const SUPPORT_EMAIL =
  normalizeValue(REACT_NATIVE_SUPPORT_EMAIL) || DEFAULT_SUPPORT_EMAIL;

export const SUPPORT_EMAIL_URL = SUPPORT_EMAIL
  ? `mailto:${SUPPORT_EMAIL}`
  : null;

export const LEGAL_LAST_UPDATED = "April 7, 2026";
