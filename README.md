# PrayBor

PrayBor is an Expo React Native prototype for sharing prayers with nearby neighbors and private groups. The current implementation focuses on the design system, mobile-first flows, prayer board, group board, growth loop, My Forest view, and the Supabase data interface.

## Run

```bash
npm install
npx expo start --web --port 8081
```

The app is currently verified on the mobile web viewport at `http://localhost:8081`.

## Supabase

Set these Expo public environment variables before enabling live auth or data calls:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

The initial schema draft is in `supabase/migrations/20260519000000_praybor_design_interface.sql`.

### Resend Email Verification

Email account creation uses Supabase Edge Functions with Resend. Do not put the Resend API key in the Expo app. Apply the migrations, then deploy the two functions and set their secrets:

```bash
supabase functions deploy send-email-verification --project-ref wwrhlvgipgjvxklojqaj
supabase functions deploy verify-email-signup --project-ref wwrhlvgipgjvxklojqaj

supabase secrets set \
  RESEND_API_KEY=your-resend-api-key \
  RESEND_FROM_EMAIL="Blessie <verify@your-domain.com>" \
  EMAIL_OTP_SECRET=replace-with-a-long-random-secret \
  --project-ref wwrhlvgipgjvxklojqaj
```

The sender domain must be verified in Resend before production use.
The signup functions are configured as public functions in `supabase/config.toml` because users call them before they are signed in.

## Lottie Assets

The app is wired for `@lottiefiles/dotlottie-react-native` and local `.lottie` assets. Placeholder files live in `assets/lottie`; replace them with exported production `.lottie` files for onboarding, reactions, moods, tree growth, fruit-to-seed, and forest highlight animations.

When Lottie is unavailable, Reduce Motion is enabled, or an asset fails to load, the app falls back to static native visuals.

## Checks

```bash
npm test
npm run lint
npx tsc --noEmit
```
