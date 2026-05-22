import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const readFile = (...segments) =>
  fs.readFileSync(path.join(repoRoot, ...segments), "utf8");

const appConfig = JSON.parse(readFile("app.json"));
const packageJson = JSON.parse(readFile("package.json"));
const iosInfoPlist = readFile("ios", "bsides", "Info.plist");
const iosProject = readFile("ios", "bsides.xcodeproj", "project.pbxproj");
const androidManifest = readFile(
  "android",
  "app",
  "src",
  "main",
  "AndroidManifest.xml"
);
const androidGradle = readFile("android", "app", "build.gradle");
const legalConfig = readFile("app", "config", "legal.js");
const apiConfig = readFile("app", "config", "api.js");

const expectedScheme = "bsidespro";
const expectedBundleId = "pro.bsides.app";
const expectedSupportUrl = "https://bsides.pro/";
const expectedPrivacyPolicyUrl = "https://bsides.pro/privacy/";
const expectedSupportEmail = "support@bsides.pro";

const capture = (pattern, source, label) => {
  const match = source.match(pattern);
  assert.ok(match, `Expected to find ${label}`);
  return match[1];
};

test("app.json uses the expected production identity", () => {
  assert.equal(appConfig.expo.name, "b.sides");
  assert.equal(appConfig.expo.slug, "b-sides");
  assert.equal(appConfig.expo.scheme, expectedScheme);
  assert.equal(appConfig.expo.ios.bundleIdentifier, expectedBundleId);
  assert.equal(appConfig.expo.android.package, expectedBundleId);
  assert.equal(appConfig.expo.ios.supportsTablet, false);
});

test("package version stays aligned with Expo version", () => {
  assert.equal(packageJson.version, appConfig.expo.version);
});

test("iOS native config stays aligned with Expo identity and version", () => {
  assert.match(iosInfoPlist, new RegExp(`<string>${expectedScheme}</string>`));
  assert.match(
    iosProject,
    new RegExp(`PRODUCT_BUNDLE_IDENTIFIER = "?${expectedBundleId}"?`, "g")
  );

  const iosShortVersion = capture(
    /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/,
    iosInfoPlist,
    "iOS marketing version"
  );
  const iosBuildNumber = capture(
    /<key>CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/,
    iosInfoPlist,
    "iOS build number"
  );

  assert.equal(iosShortVersion, appConfig.expo.version);
  assert.match(iosBuildNumber, /^\d+$/);
});

test("Android native config stays aligned with Expo identity and version", () => {
  assert.match(androidManifest, new RegExp(`android:scheme="${expectedScheme}"`));

  const namespace = capture(
    /namespace '([^']+)'/,
    androidGradle,
    "Android namespace"
  );
  const applicationId = capture(
    /applicationId '([^']+)'/,
    androidGradle,
    "Android applicationId"
  );
  const versionName = capture(
    /versionName "([^"]+)"/,
    androidGradle,
    "Android versionName"
  );
  const versionCode = capture(
    /versionCode (\d+)/,
    androidGradle,
    "Android versionCode"
  );

  assert.equal(namespace, expectedBundleId);
  assert.equal(applicationId, expectedBundleId);
  assert.equal(versionName, appConfig.expo.version);
  assert.match(versionCode, /^\d+$/);
});

test("legal defaults point at the hosted support and privacy pages", () => {
  assert.match(legalConfig, new RegExp(`"${expectedSupportUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(
    legalConfig,
    new RegExp(`"${expectedPrivacyPolicyUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`)
  );
  assert.match(legalConfig, new RegExp(`"${expectedSupportEmail}"`));
});

test("API config defaults to production and protects release builds from local endpoints", () => {
  assert.match(apiConfig, /const DEFAULT_API_TARGET = 'production';/);
  assert.doesNotMatch(apiConfig, /const DEFAULT_API_TARGET = 'local';/);
  assert.match(
    apiConfig,
    /Local API mode requires REACT_NATIVE_LOCAL_API_URL or REACT_NATIVE_API_URL/
  );
  assert.match(
    apiConfig,
    /Release builds cannot use local or private API URLs/
  );
});
