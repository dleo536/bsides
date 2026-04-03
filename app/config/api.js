import {
  REACT_NATIVE_API_TARGET,
  REACT_NATIVE_API_URL,
  REACT_NATIVE_LOCAL_API_URL,
  REACT_NATIVE_STAGING_API_URL,
  REACT_NATIVE_PRODUCTION_API_URL,
} from "@env";

/**
 * API Configuration
 *
 * Supported modes:
 * - REACT_NATIVE_API_TARGET=local
 * - REACT_NATIVE_API_TARGET=staging
 * - REACT_NATIVE_API_TARGET=production
 *
 * Optional direct override:
 * - REACT_NATIVE_API_URL=https://example.com
 *
 * Notes:
 * - For iOS Simulator/Android Emulator, localhost can point to your machine.
 * - For a physical device, use your machine's LAN IP instead of localhost.
 * - Restart Expo after changing env vars.
 */

const DEFAULT_API_TARGET = 'local';
const DEFAULT_API_URLS = {
  local: 'http://localhost:3000',
  staging: 'https://b-backend-50184648070.us-central1.run.app',
  production: 'https://b-backend-50184648070.us-central1.run.app',
};

const normalizeApiTarget = (value) => {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === 'local' || normalizedValue === 'staging' || normalizedValue === 'production') {
    return normalizedValue;
  }

  return DEFAULT_API_TARGET;
};

const normalizeApiUrl = (value) => value?.trim().replace(/\/+$/, '');
const API_TARGET = normalizeApiTarget(REACT_NATIVE_API_TARGET);
const overrideApiUrl = normalizeApiUrl(REACT_NATIVE_API_URL);
const targetApiUrl = normalizeApiUrl(
  API_TARGET === 'local'
    ? REACT_NATIVE_LOCAL_API_URL
    : API_TARGET === 'staging'
      ? REACT_NATIVE_STAGING_API_URL
      : REACT_NATIVE_PRODUCTION_API_URL,
);

const API_BASE_URL = overrideApiUrl || targetApiUrl || DEFAULT_API_URLS[API_TARGET];

console.log("[API Config]", {
  target: API_TARGET,
  baseUrl: API_BASE_URL,
});

export { API_TARGET };
export default API_BASE_URL;
