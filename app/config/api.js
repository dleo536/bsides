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
 * - Missing env now defaults to the production API instead of localhost.
 * - Local mode is explicit and requires REACT_NATIVE_LOCAL_API_URL or REACT_NATIVE_API_URL.
 * - Release builds fail fast if they resolve to a local/private API host.
 * - For iOS Simulator/Android Emulator, localhost can point to your machine.
 * - For a physical device, use your machine's LAN IP instead of localhost.
 * - Restart Expo after changing env vars.
 */

const DEFAULT_API_TARGET = 'production';
const DEFAULT_API_URLS = {
  staging: 'https://b-backend-50184648070.us-central1.run.app',
  production: 'https://b-backend-50184648070.us-central1.run.app',
};

const normalizeApiTarget = (value) => {
  const normalizedValue =
    typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (normalizedValue === 'local' || normalizedValue === 'staging' || normalizedValue === 'production') {
    return normalizedValue;
  }

  return DEFAULT_API_TARGET;
};

const normalizeApiUrl = (value) =>
  typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';

const parseApiUrl = (value) => {
  try {
    return new URL(value);
  } catch (error) {
    throw new Error(
      `Invalid API URL "${value}". Check REACT_NATIVE_API_URL or the target-specific API env vars.`
    );
  }
};

const isLocalOnlyHostname = (hostname) => {
  const normalizedHostname =
    typeof hostname === 'string' ? hostname.trim().toLowerCase() : '';

  if (!normalizedHostname) {
    return false;
  }

  if (
    normalizedHostname === 'localhost' ||
    normalizedHostname === '0.0.0.0' ||
    normalizedHostname === '127.0.0.1' ||
    normalizedHostname === '::1' ||
    normalizedHostname === '10.0.2.2' ||
    normalizedHostname === '10.0.3.2' ||
    normalizedHostname.endsWith('.local')
  ) {
    return true;
  }

  const ipv4Match = normalizedHostname.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  );

  if (!ipv4Match) {
    return false;
  }

  const octets = ipv4Match.slice(1).map((part) => Number.parseInt(part, 10));

  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  if (octets[0] === 10 || octets[0] === 127) {
    return true;
  }

  if (octets[0] === 192 && octets[1] === 168) {
    return true;
  }

  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
    return true;
  }

  return false;
};

const API_TARGET = normalizeApiTarget(REACT_NATIVE_API_TARGET);
const overrideApiUrl = normalizeApiUrl(REACT_NATIVE_API_URL);
const targetApiUrl = normalizeApiUrl(
  API_TARGET === 'local'
    ? REACT_NATIVE_LOCAL_API_URL
    : API_TARGET === 'staging'
      ? REACT_NATIVE_STAGING_API_URL
      : REACT_NATIVE_PRODUCTION_API_URL,
);

const resolveApiBaseUrl = () => {
  if (overrideApiUrl) {
    return overrideApiUrl;
  }

  if (targetApiUrl) {
    return targetApiUrl;
  }

  if (API_TARGET === 'local') {
    throw new Error(
      'Local API mode requires REACT_NATIVE_LOCAL_API_URL or REACT_NATIVE_API_URL. Example: http://localhost:3000'
    );
  }

  return DEFAULT_API_URLS[API_TARGET];
};

const API_BASE_URL = resolveApiBaseUrl();
const parsedApiUrl = parseApiUrl(API_BASE_URL);

if (
  typeof __DEV__ === 'boolean' &&
  !__DEV__ &&
  (API_TARGET === 'local' || isLocalOnlyHostname(parsedApiUrl.hostname))
) {
  throw new Error(
    `Release builds cannot use local or private API URLs. Resolved API_BASE_URL: ${API_BASE_URL}`
  );
}

console.log("[API Config]", {
  target: API_TARGET,
  baseUrl: API_BASE_URL,
});

export { API_TARGET };
export default API_BASE_URL;
