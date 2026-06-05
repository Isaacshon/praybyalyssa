# Android Developers Menu Audit for Blessie

Date: 2026-05-28

This audit maps the Android Developers top navigation and the relevant sidebar
menus to the current Blessie Expo SDK 55 app. Status values:

- `Apply`: Should become implementation work.
- `Partial`: Already partly covered, but needs targeted verification or cleanup.
- `Defer`: Useful later, not release-critical.
- `N/A`: Not relevant to Blessie's current mobile app surface.

## Sources Reviewed

- Android Developers root navigation: <https://developer.android.com/?hl=ko>
- Mobile UI system bars: <https://developer.android.com/design/ui/mobile/guides/foundations/system-bars?hl=ko>
- Mobile UI guide sidebar: <https://developer.android.com/design/ui/mobile?hl=ko>
- App architecture: <https://developer.android.com/topic/architecture?hl=ko>
- Quality guidelines: <https://developer.android.com/docs/quality-guidelines?hl=ko>
- Privacy/security and permissions: <https://developer.android.com/privacy-and-security/about?hl=ko>, <https://developer.android.com/guide/topics/permissions/overview?hl=ko>
- Edge-to-edge: <https://developer.android.com/develop/ui/views/layout/edge-to-edge?hl=ko>
- Google Play distribution: <https://developer.android.com/distribute?hl=ko>
- Android App Bundle: <https://developer.android.com/guide/app-bundle?hl=ko>
- Expo SDK 55 docs: <https://docs.expo.dev/versions/v55.0.0/>

## Current Blessie Snapshot

- Stack: Expo SDK 55, React Native 0.83, Expo Router, native tabs, Supabase.
- Android package: `com.blessie.myapp`.
- Android build config: `app.json` uses portrait orientation, adaptive icon assets,
  app links for `https://blessie.ca/invite`, and permissions for coarse/fine
  location, camera, and notifications.
- System UI: root status/root-background handling lives in
  `src/components/app-system-bars.tsx` and is mounted from `src/app/_layout.tsx`.
  Screens still need Android 15/16 gesture and 3-button navigation QA because
  `GrowScreen` uses edge-to-edge style with `SafeAreaView edges={[]}` while modal
  overlays use top/bottom safe areas.
- Back behavior: `android.predictiveBackGestureEnabled` is enabled. Modal, sheet,
  auth, compose, invite, and root-tab back behavior still need manual Android QA.
- Auth/storage: Supabase sessions are persisted in SecureStore on native and
  AsyncStorage on web. Account deletion and in-app policy text exist.
- Known Play-facing concerns from recent work: Data Safety, privacy policy URL,
  account deletion URL, Android App Bundle signing/package name, app size, and
  launch crash verification.
- Release checklist: `docs/android-release-readiness-checklist.md` tracks the
  Play Console gates, Data Safety mapping, predictive back QA, and system-bar QA.

## Top Navigation Inventory

| Menu | Detailed official menu items | Blessie status |
| --- | --- | --- |
| Essentials | AI environment build, Get started, Hello World, Courses, Tutorials, Compose for teams, Kotlin for Android, Play monetization, Android developer verification | Partial. Use only release/account verification and official update checks; native Kotlin/Compose learning paths are not implementation targets for this Expo app. |
| Essentials: Expand by device | Adaptive apps, Android XR, Wear OS, Android for Cars, Android TV, ChromeOS | Partial. Adaptive phones/tablets/foldables applies. XR, Wear, Cars, TV, ChromeOS are N/A unless Blessie adds those surfaces. |
| Essentials: Build by category | Games, Camera and media, Social and messaging, Health and fitness, Productivity, Enterprise apps | Partial. Social/messaging and productivity patterns apply to prayer boards/groups/reminders. Camera/media applies only to profile photo picking. Games/Health/Enterprise are N/A. |
| Essentials: Latest news | Latest updates, preview updates, Android Studio preview, Jetpack/Compose releases, Wear OS releases, Privacy Sandbox | Partial. Track Android/Play/Expo compatibility updates before release. Wear OS is N/A. Privacy Sandbox is Defer unless ads/measurement are added. |
| Design & Plan: Best experiences | Excellent experiences, quality overview | Apply. Use this as the quality bar for launch readiness, especially accessibility, technical quality, and privacy/security. |
| Design & Plan: UI design | Android design, mobile, adaptive UI, desktop, XR, AI glasses, widgets, Wear, TV, Cars | Apply mobile/adaptive. Defer widgets. Desktop/XR/AI glasses/Wear/TV/Cars are N/A for current release. |
| Design & Plan: Architecture | Intro, libraries, navigation, modularization, testing, Kotlin Multiplatform | Apply architecture, navigation, and testing concepts. View/Kotlin-specific APIs are N/A, but layering principles map to React Native. |
| Design & Plan: Quality | Overview, core value, user experience, accessibility, technical quality | Apply. Convert into release checklist for all primary screens. |
| Design & Plan: Security | Privacy, permissions, identity, fraud prevention | Apply privacy, permissions, identity/account flows. Fraud prevention is Defer unless abuse/spam hardening is prioritized. |
| Develop | Gemini, Android Studio download, samples, UI, background work, data/files, connectivity, build/debug/test/performance/tools, device technologies, platform/Jetpack/Compose libraries | Partial. Use testing/performance/connectivity/background guidance conceptually; no native rewrite. |
| Google Play | Play Console, monetization, Play Integrity, Play policies, Play programs, game center, Play Asset Delivery, Play Games, Play Feature Delivery, in-app updates/reviews, install referrer, Android App Bundle, brand/marketing, Console API | Apply Play policies, AAB, brand assets, pre-launch reports. Defer Play Integrity, in-app updates/reviews, feature delivery until after initial release. Billing/games/install referrer are N/A. |
| Community / Blog | Latest posts, authors, case studies, events/programs | Defer. Use only for current release announcements or breaking platform changes. |
| Android Studio | Download, IDE guide, Gemini, agents tools/resources, previews, Gradle build guide, SDK tools | Partial. Use for Android emulator/pre-launch diagnostics and Gradle/AAB troubleshooting. Expo/EAS remains the primary build path. |

## Mobile UI Sidebar Inventory

| Section | Detailed official menu items | Blessie status |
| --- | --- | --- |
| Foundations | Accessibility, system bars, glossary, platform translation | Apply. Accessibility and system bars are P1. Platform translation is Partial because Blessie has Korean/English mixed content and should avoid unlocalized Play copy. |
| Style | Color, themes | Partial. App has a strong visual identity; verify dark/light system compatibility and contrast rather than redesigning the palette. |
| Layout and content | Layout basics, app anatomy, grids and units, content structure, layout and navigation patterns, canonical layouts, custom layouts, adapt layout, immersive content, wider screen/edge-to-edge, images and graphics | Apply to Board, Groups, Grow, Me, onboarding, modals, and tablet screenshots. Main risks are bottom tab/inset overlap, large font overflow, and 10-inch tablet density. |
| Components | Material components | Partial. Native Material components are not directly used, but touch targets, progress, dialogs, sheets, and buttons should follow Android expectations. |
| Patterns | Predictive back, settings, help content, passkeys, onboarding | Apply predictive back, settings, onboarding. Help content is Defer. Passkeys are Defer because Supabase OAuth/email is current auth. |
| Home screen | Notifications, live updates, widgets, picture-in-picture | Apply notifications only. Widgets/live updates/PIP are N/A for current Blessie release. |
| Widgets | Getting started, layouts, sizing, configuration, discovery/promotion | Defer. No Blessie widget is planned for initial release. |

## Architecture Sidebar Inventory

| Section | Detailed official menu items | Blessie status |
| --- | --- | --- |
| Guide to app architecture | About app architecture, architecture recommendations, learning pathway, app fundamentals | Apply. Use UI/data separation and single source of truth as the audit baseline. |
| UI layer libraries | About UI layer, UI events, state holders/UI state, state production | Apply conceptually. Existing large screen components mix UI and side effects; prioritize new/changed features and high-risk flows. |
| Lifecycle-aware components | Lifecycles, ViewModel, ViewModel dependencies, ViewModel scoping, saved state, coroutines | Partial. Native ViewModel/coroutines are N/A, but the lifecycle idea maps to React hooks cleanup, app state, and persisted screen state. |
| Paging Library | Overview, network/database paging, transforms, loading states, tests, migration | Defer. Prayer board/group feeds are not using paged local DB yet; revisit if post volume grows. |
| Domain layer | Domain layer | Partial. Some helpers exist in `src/lib/praybor`; continue extracting business rules from large screens. |
| Data layer libraries | Data layer, offline first, DataStore, WorkManager, App Startup | Apply data-layer separation. Offline-first and WorkManager are Defer unless background sync/reminders expand. |
| Modularization | About modularization, common patterns | Defer/P2. Useful if Grow/Board/Groups continue growing, but not launch blocking. |
| App resources | Resources, configuration changes, localization, pseudolocales, internationalization, per-app language preferences, strings, fonts, resource types | Apply localization/configuration checks. Blessie is portrait-only but still must handle font scale, locale, and resource loading. |
| Manifest file | manifest, application, activity, intent-filter, data, category, uses-permission, uses-sdk, supports-screens, queries, service, receiver, provider, meta-data, and related elements | Partial. Expo owns most manifest generation; audit `app.json` for package, permissions, app links, predictive back, and blocked permissions. |
| App entry points and navigation | Activities, lifecycle, tasks/back stack, process lifecycle, shortcuts, navigation principles, navigation controller, graph/deep links/dialog destinations/type safety | Apply navigation principles, deep links, and back behavior. Native activity graph details are N/A under Expo Router. |

## Develop Menu Inventory

| Section | Detailed official menu items | Blessie status |
| --- | --- | --- |
| Core areas | Samples, multi-device, UI, background work, data/files, connectivity | Apply UI/connectivity/data. Background work applies to notifications/reminders only. |
| Tools and workflow | Write/debug code, build project, test app, performance, command-line tools, Gradle plugin API, Android Bench | Apply test/performance/build diagnostics. Gradle plugin API and Android Bench are Defer unless native build issues recur. |
| Device technologies | Adaptive UI, Wear OS, Android XR, Android Health, Cars, TV, Better Together | Apply adaptive UI. Others N/A for current release. |
| Libraries | Android platform, Jetpack, Compose, Google Play services, Play SDK Index | Partial. Use Play SDK Index conceptually to watch third-party SDK risk; native APIs are mostly mediated by Expo. |

## Google Play Inventory

| Section | Detailed official menu items | Blessie status |
| --- | --- | --- |
| Play Console | Console, Console docs | Apply. Use for pre-launch report, policy warnings, app signing, release tracks, store listing. |
| Basics | Play Billing, Play Integrity, Play policies, Play programs | Apply policies. Billing is N/A. Play Integrity is Defer unless abuse or API attestation becomes necessary. |
| Game developer center | Play Asset Delivery, Play Games services, Play Games on PC | N/A. Blessie is not a game. |
| Libraries | Play Feature Delivery, in-app updates, in-app reviews, install referrer, Google Play services, SDK Index | Defer except SDK Index. In-app updates/reviews are post-launch enhancements. |
| Tools and resources | Android App Bundle, brand and marketing, Play Console API, Play Points | Apply App Bundle and brand/marketing. Console API and Play Points are N/A. |

## Blessie Findings

| Finding | Status | Priority | Evidence |
| --- | --- | --- | --- |
| Android system bars have an app-wide policy, but still need device QA | Partial | P1 | `src/components/app-system-bars.tsx` sets root `StatusBar`/SystemUI behavior; Android 15/16 gesture and 3-button navigation must still be checked for clipped controls. |
| Predictive back is enabled and needs flow QA | Partial | P1 | `app.json` has `predictiveBackGestureEnabled: true`; modal/sheet/auth/compose/group-invite/root-tab back behavior must be verified before release. |
| Location permission should be minimized and clearly optional where possible | Partial | P1 | App declares coarse and fine location and requests foreground location for public nearby prayers. |
| Data Safety and privacy disclosures must match actual storage | Apply | P0 | App stores account/profile/prayers/groups/reactions/reports/growth/reminders and uses location/camera/notifications. |
| Account deletion URL and in-app deletion behavior exist but need Play URL verification | Apply | P0 | Settings has account deletion flow and `public/delete-account/index.html` exists; Play requires the production URL to be reachable. |
| Android App Bundle/package/signing remains release-critical | Apply | P0 | `app.json` package is `com.blessie.myapp`; Play upload previously rejected wrong key/package/signing. |
| Large screens/tablets need visual QA | Apply | P1 | App is portrait-focused, has custom tab bar and many fixed-size illustrated surfaces. |
| Large screen/foldable landscape support is not current scope | Defer | P3 | `orientation` is portrait; current release assets/screenshots target phone/tablet portrait. |
| Architecture is workable but large screens own too much orchestration | Partial | P2 | `GrowScreen`, `ForestScreen`, and `PrayerBoardScreen` contain UI plus data/state side effects. |
| Native Android-only APIs should stay behind Expo abstractions | Apply | P2 | Project uses Expo config plugins and managed libraries; avoid Kotlin/manifest edits unless generated config cannot satisfy a requirement. |
