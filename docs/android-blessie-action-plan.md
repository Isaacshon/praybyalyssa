# Blessie Android Action Plan

Date: 2026-05-28

This action plan turns the Android Developers menu audit into implementation
work for the current Expo SDK 55 Blessie app.

## P0 - Release Blockers

| Work | Expected change | Verification |
| --- | --- | --- |
| Play package/signing | Confirm production AAB uses `com.blessie.myapp` and the Play app signing/upload key expected by Play Console. Do not rename files; package identity comes from `app.json`. | Upload a fresh AAB to the correct Play release track; no package/signing rejection. |
| Public policy URLs | Ensure `https://blessie.ca/privacy` and `https://blessie.ca/delete-account` are live, crawlable, HTTPS-valid, and match in-app policy/deletion text. | Open both URLs in a fresh browser and re-run Play Console policy checks. |
| Data Safety truth table | Reconcile Play Data Safety answers with actual app behavior: account data, prayer content, location, profile photos, reports/blocks, reminders, Supabase storage, and deletion. | Play Console Data Safety has no blocking mismatch; document final answers. |
| Launch crash triage | Capture Android crash logs for installed production build if Expo splash appears then exits. | `adb logcat` shows no startup crash after installing the signed release candidate. |
| AAB size | Keep optimized image/GIF assets and verify bundle size after release build. | EAS/Gradle artifact size and Play Console size report are acceptable. |

## P1 - Android UX and Policy Quality

| Work | Expected change | Verification |
| --- | --- | --- |
| System bars and edge-to-edge | Root-level status/root-background handling is in place. Audit all screens for gesture navigation and 3-button navigation overlap before release. | Android 15/16 phone: Board, Groups, Grow, Me, onboarding, modals, sheets, keyboard states have no clipped controls/text. |
| Predictive back | `predictiveBackGestureEnabled` is enabled. Verify modal/sheet/back behavior and fix any regressions before shipping the AAB. | Back gesture closes sheets/modals first, returns from nested flows, and never loses unsaved compose/auth input unexpectedly. |
| Permission timing and copy | Confirm location, camera, photo, and notification prompts are triggered only from user-initiated feature flows and have matching explanations. | Deny/grant/retry flows work for public prayer location, profile photo, and reminders. |
| Accessibility | Run high font scale and screen reader pass on primary flows. Fix text overflow, missing labels, disabled states, and small touch targets. | Large text does not overlap; interactive controls expose labels/states. |
| Tablet portrait | Validate 10-inch portrait screenshots and runtime layout. Adjust fixed-size boards, maps, tabs, and modals only where clipping/overlap appears. | At least two 10-inch screenshots meet Play size/aspect requirements and show real app UI. |
| Dark/light theme | Verify `userInterfaceStyle: automatic` with current colors, status bar contrast, forms, modals, and policy screens. | Android emulator light/dark modes show readable text and visible controls. |

## P2 - Architecture and Maintainability

| Work | Expected change | Verification |
| --- | --- | --- |
| Screen state boundaries | When touching large screens, move reusable business rules and persistence helpers into `src/lib/praybor` and keep UI components focused on rendering/events. | New behavior has unit tests in `src/lib/praybor`; screen code avoids duplicated data mapping. |
| Data-layer consistency | Keep Supabase reads/writes in repository/helper modules, preserve SecureStore session persistence on native, and avoid new direct DB calls in UI components. | Existing persistence tests pass; new RPC/storage behavior has targeted tests. |
| Offline and fallback behavior | Preserve local preview/cache fallbacks for public posts, growth state, and grow preferences; document any server-only feature clearly. | Offline/failed Supabase smoke test still renders last available or sample state without crashing. |
| Localization readiness | Avoid adding new hard-coded Play-facing or policy text without a localization note. Keep Korean/English store assets consistent. | Manual copy review; no critical Play copy contradicts in-app policy. |
| Performance | Profile startup and image-heavy Grow screen after asset changes; avoid adding unbounded prefetch or animation loops. | Release build startup and Grow route open without obvious jank/crash on Android device. |

## P3 - Deferred / Not Current Release

| Area | Decision |
| --- | --- |
| Wear OS, Cars, TV, XR, ChromeOS | Not applicable to current Blessie mobile release. Revisit only if product scope expands. |
| Widgets, live updates, PIP | Defer. Prayer reminders already cover the current home-screen need. |
| Passkeys | Defer. Current auth uses Supabase email/OAuth. |
| Play Integrity | Defer unless abuse, fraud, or protected server actions require device/app attestation. |
| Play Feature Delivery, in-app updates, in-app reviews | Defer until after first stable Play release. |
| Billing, Play Points, install referrer | Not applicable unless monetization/attribution is added. |
| Kotlin Multiplatform, native Compose rewrite | Not applicable; keep Expo/React Native architecture. |

## Suggested Implementation Order

1. Resolve P0 Play release blockers: policy URLs, Data Safety, package/signing, startup crash, AAB size.
2. Verify the Android system bar policy and edge-to-edge behavior on Android 15/16.
3. Run permission/accessibility/tablet QA and patch only observed issues.
4. Run predictive back manual QA and patch any modal/sheet/back-stack regressions.
5. Convert recurring screen-level side effects into `src/lib/praybor` helpers as P2 maintenance while touching those areas.

## Applied Repo Changes

- Root Android system UI policy lives in `src/components/app-system-bars.tsx` and is mounted from `src/app/_layout.tsx`.
- Android predictive back is enabled in `app.json`; release still requires the manual back-flow checks in `docs/android-release-readiness-checklist.md`.
- Play/Data Safety and Android manual QA gates are tracked in `docs/android-release-readiness-checklist.md`.
- Public web policy page files exist at `public/privacy/index.html` and `public/delete-account/index.html`; production DNS/HTTPS still must be verified through Play Console.

## Validation Commands

Run these after any code/config changes:

```powershell
npm.cmd run check:android-release
npm.cmd test
npm.cmd run lint
npx.cmd tsc --noEmit
```

Run these for Android release verification:

```powershell
eas build --platform android --profile production
adb install path\to\release.apk
adb logcat
```

For local web smoke checks:

```powershell
npm.cmd start -- --port 8086
```

Then inspect `http://localhost:8086`, `/groups`, `/grow`, and `/me` for runtime console errors.

## Acceptance Criteria

- Both audit docs exist and reflect Android Developers top menus plus mobile/architecture sidebars.
- P0 tasks have a clear owner path and verification path before Play review.
- P1 Android UX tasks are scoped to concrete Blessie screens and Android behaviors.
- P2/P3 items are separated so non-release work does not block app submission.
- No public API or Supabase schema change is required by this audit itself.
