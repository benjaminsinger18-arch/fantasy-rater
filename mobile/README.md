# FantasyRater Mobile

React Native app built with Expo Router.

## Setup

```bash
cd mobile
npm install
```

Copy `.env.local` and fill in your values:
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...  # same key as web app
EXPO_PUBLIC_API_URL=https://your-railway-url.railway.app/api
```

## Run

```bash
npx expo start        # opens Expo Go QR code
npx expo start --ios  # iOS simulator
```

## Push Notifications

Push notifications use Expo's push service. For them to work in a **production build** (not Expo Go):

1. Create an EAS project: `npx eas-cli@latest init`
2. Copy the projectId into `app.json → extra.eas.projectId`
3. Build with EAS: `npx eas build --platform ios`

In Expo Go, `getExpoPushTokenAsync` will fail silently (no projectId in dev). The rest of the app (auth, account, billing) works fine.

## Auth

Clerk handles auth. The same publishable key works for both web and mobile. Sessions are stored in SecureStore (encrypted keychain/keystore).

## Account Screen

- Shows current plan (free/pro) — fetched live from `/api/billing/status`
- Upgrade button opens Stripe checkout in the browser, returns to app after payment
- Manage subscription opens Stripe billing portal
- Push notifications toggle registers/unregisters the Expo push token with the backend
- Email alerts toggle updates preferences in the database
- Sign out clears the Clerk session from SecureStore and redirects to sign-in
