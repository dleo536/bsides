# Release Checklist

Use this before shipping a new iOS/TestFlight build.

## Versioning

1. Update `version` in `package.json` and `app.json`.
2. Update the iOS marketing/build versions in `ios/bsides/Info.plist` and the Android `versionName` / `versionCode` in `android/app/build.gradle`.
3. Keep the native identifiers stable:
   - iOS bundle ID: `pro.bsides.app`
   - Android package: `pro.bsides.app`
   - URL scheme: `bsidespro`

## Preflight

Run:

```bash
npm run release:check
```

That command runs:

- release-config smoke tests
- TypeScript no-emit check
- iOS Expo export verification

## Metadata

Before upload, confirm:

- Privacy policy URL points to `https://bsides.pro/privacy/`
- Support URL points to `https://bsides.pro/`
- Support email is `support@bsides.pro`
- App Store Connect version/build numbers match the native project

## Upload

After preflight passes, create the build you intend to ship and upload that exact artifact to TestFlight.
