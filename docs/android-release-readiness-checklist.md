# Blessie Android Release Readiness Checklist

Date: 2026-05-28

Use this checklist before each Play Console upload. It applies the Android
Developers audit to the current Expo SDK 55 Android release.

## P0 Play Console Gates

- [x] Local config package name is `com.blessie.myapp`.
- [x] EAS production Android keystore SHA1 matches the Play Console expected fingerprint `33:D2:52:91:5B:AB:15:12:D5:82:A8:9A:DD:EC:B3:BA:E3:47:4B:6A`.
- [ ] Release AAB uploads successfully to Play Console.
- [x] Local privacy page file exists at `public/privacy/index.html`.
- [x] Local account deletion page file exists at `public/delete-account/index.html`.
- [x] `https://blessie.ca/privacy/` loads over HTTPS without DNS, certificate, or 404 errors.
- [x] `https://blessie.ca/delete-account/` loads over HTTPS without DNS, certificate, or 404 errors.
- [ ] `https://www.blessie.ca/` HTTPS certificate issue is resolved, or Play Console uses only the working apex `https://blessie.ca/...` URLs.
- [ ] Play Console privacy policy URL uses the live privacy page.
- [ ] Play Console account deletion URL uses the live account deletion page.
- [ ] Data Safety answers match the table below.
- [ ] Pre-launch report has no launch crash.
- [ ] Android Vitals/pre-launch report has no privacy, permission, or startup blocker.

## Data Safety Mapping

| Data type | Blessie behavior | Play answer guidance |
| --- | --- | --- |
| Account info | Email, username/account ID, display name, auth provider, profile metadata are stored for accounts. | Collected. Used for app functionality, account management, security/compliance. Encrypted in transit. |
| User content | Prayer requests, group posts, reactions, reports, block choices, group membership, prayer growth are stored in Supabase. | Collected. Used for app functionality, account management, moderation/security. Encrypted in transit. |
| Precise location | Foreground location is requested for nearby public prayers and public posting. | Collected if transmitted to Supabase/RPC for nearby prayers or public post location. Not shared for advertising. Mark optional if users can avoid public nearby features. |
| Approximate location | Same feature area as precise location; Android may provide approximate permission. | Collected if transmitted for nearby prayers. App functionality. Optional when public nearby features are optional. |
| Photos | Profile photo can be selected/captured and uploaded when user chooses. | Collected only for profile feature. App functionality/account management. |
| Device or other IDs | Supabase/auth/app store services may process technical identifiers; Blessie code does not create an ad ID flow. | Do not declare advertising ID unless an SDK actually collects it. Check Play SDK Index and final dependency report. |
| App activity | Posts, reactions, group participation, reports, growth actions are account activity. | Collected. App functionality, account management, security/compliance. |
| Crash/diagnostics | No explicit crash analytics SDK is present in repo. Platform/Play pre-launch may process diagnostics outside app code. | Only declare app-collected diagnostics if a dependency or service collects/transmits it from the app. |

## Restricted Access Review Instructions

If Play Console asks for reviewer access:

- Public board can be viewed after onboarding/sign-in flow.
- Account creation supports email and OAuth providers from the app.
- Private group functionality requires a test account and an invite code or group created in-app.
- Provide a reviewer test account only if production review cannot create accounts. Do not rely on reviewers contacting support.

## Android Manual QA Matrix

Run on at least one Android 15 or 16 device/emulator:

| Flow | Gesture navigation | 3-button navigation | Large text | Dark mode |
| --- | --- | --- | --- | --- |
| Onboarding and sign-in | [ ] | [ ] | [ ] | [ ] |
| Public Board and compose sheet | [ ] | [ ] | [ ] | [ ] |
| Groups list, join, create group | [ ] | [ ] | [ ] | [ ] |
| Grow map and collection modals | [ ] | [ ] | [ ] | [ ] |
| Me/settings/account deletion | [ ] | [ ] | [ ] | [ ] |
| Profile photo camera/library | [ ] | [ ] | [ ] | [ ] |
| Reminder permission and scheduling | [ ] | [ ] | [ ] | [ ] |

## Predictive Back QA

`android.predictiveBackGestureEnabled` is enabled. Before release, verify:

- [ ] Back from a modal closes only that modal.
- [ ] Back from a bottom sheet closes the sheet before leaving the tab.
- [ ] Back from onboarding/auth does not skip required policy consent.
- [ ] Back from group invite route lands on the Groups tab.
- [ ] Back while composing a prayer does not silently lose typed text.
- [ ] Android system back from root tab exits or backgrounds the app normally.

## Edge-to-Edge / System Bar QA

The app now sets a root StatusBar/SystemUI policy. Before release, verify:

- [ ] Status bar icons remain readable on all primary screens.
- [ ] Content does not hide behind the status bar on onboarding/auth.
- [ ] Bottom tab controls do not collide with Android navigation buttons.
- [ ] Grow map animals/tree controls are not clipped near the bottom edge.
- [ ] Modal close/back buttons are reachable below cutouts/status bars.
- [ ] Keyboard open states do not hide submit buttons in auth, groups, and compose.

## Verification Commands

```powershell
npm.cmd run check:android-release
npm.cmd test
npm.cmd run lint
npx.cmd tsc --noEmit
```

For a release candidate:

```powershell
eas build --platform android --profile production
adb install path\to\release.apk
adb logcat
```

## 2026-05-31 Release Run Notes

- Use the apex URLs in Play Console: `https://blessie.ca/privacy/` and `https://blessie.ca/delete-account/`.
- Do not use `www.blessie.ca` in Play Console until its HTTPS certificate is fixed.
- EAS Android production build started for versionCode 9:
  <https://expo.dev/accounts/thswndrnr/projects/praybor/builds/8e0b1f28-27ec-4058-b857-365d8227a4ca>
