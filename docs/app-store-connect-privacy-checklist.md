# App Store Privacy Checklist

Last updated: April 7, 2026

This file is the repo-side checklist for the Apple audit item covering privacy policy metadata, App Privacy disclosures, and the in-app support/contact surface.

## Public URLs to publish in App Store Connect

- Privacy Policy URL: `https://bsides.pro/privacy/`
- Support URL: `https://bsides.pro/`
- Published support email: `support@bsides.pro`

If you move these to a custom domain later, update both App Store Connect and `app/config/legal.js`.

## In-app access points added by this change

- Logged out: Landing page
- Logged out: Sign in screen
- Logged out: Sign up screen
- Logged in: Profile screen
- Logged in: Profile overflow menu

## App Privacy starting point

Based on the current codebase, the minimum App Privacy entries to verify in App Store Connect are:

- Contact Info: Email Address
- Identifiers: User ID
- User Content: Photos or Videos
- User Content: Other User Content

Why:

- Email is collected during sign-up and returned on the signed-in profile response.
- Firebase UID and backend user IDs are used to operate the account.
- Profile photos are uploaded and stored.
- Reviews, ratings, list descriptions, bios, and report details are user-generated content stored by the service.

## Manual verification before submission

- Confirm whether production Firebase, Google Cloud, or reverse-proxy logging adds any additional App Privacy disclosures.
- Confirm the in-app and published support email remains `support@bsides.pro` unless you intentionally change it.
- Confirm the public privacy-policy URL is reachable without authentication.
- Confirm your moderation operations can satisfy Apple’s UGC expectation for timely review of objectionable-content reports. That is an operational requirement, not something the app binary can enforce by itself.
