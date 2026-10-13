# Cookbook

A mobile meal-planning app built around all 271 recipes from *The Meal Prep Cookbook* and *Jalal's Cookbook* (Jalal Sameja), for personal use.

- **Plan the week** — Monday to Sunday, a slot per meal (breakfast / lunch / dinner / snack). Repeat one recipe across several days, meal-prep style.
- **Smart picker** — when you add a recipe, the list is sorted by how many ingredients it shares with what you have already planned (and what's in your pantry). Each row says *"3 new items to buy · reuses 9 of 12"*, so one shop covers the whole week instead of buying a new set of things for every recipe.
- **Grocery list** — every ingredient from the week's meals merged into one list, quantities summed and scaled to the servings you planned, grouped by aisle. Items already in your pantry are skipped.
- **Pantry** — spices, sauces and other staples you tick off while shopping are remembered, so next week's list doesn't ask you to buy paprika again. Perishables (meat, produce, dairy) are never carried over.
- **Recipe guide** — scalable ingredients with tick boxes, numbered method, tap any "8 minutes" in a step to start a kitchen timer. **Cook mode** shows one step at a time with big type and keeps the screen awake; progress is saved so you can leave and **resume** later, or **clear** it.
- **Cloud backup (Firebase) + Google sign-in** — past weeks, pantry, favourites and cooking progress are stored in Firestore. You start on an anonymous device account; *Continue with Google* upgrades it so the same data follows you to any phone. Works offline; without a Firebase config everything is still saved on the phone.

Built with **TypeScript + React Native (Expo SDK 57)**, Expo Router, Zustand, Firebase JS SDK (Auth + Firestore), @react-native-google-signin, Reanimated, expo-haptics, expo-keep-awake.

---

## 1. Run it on your phone (5 minutes)

You need **Node.js 20 or newer** on your computer (https://nodejs.org) and the free **Expo Go** app on your phone (Play Store / App Store).

```bash
cd cookbook-app
npm install
npx expo start
```

A QR code appears in the terminal. Open Expo Go on your phone and scan it (Android: "Scan QR code" in Expo Go; iPhone: use the Camera app). Phone and computer must be on the same Wi-Fi. If they are not, run `npx expo start --tunnel` instead.

Edits you make to the code reload on the phone instantly.

To try it in a browser instead: `npx expo start --web`.

## 2. Turn on cloud backup (Firebase) + Google sign-in

The app runs in local-only mode until you add a Firebase project. It's free (Spark plan).

### 2a. Firebase project and database

1. Go to https://console.firebase.google.com → **Add project** (any name, Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method** → enable **Anonymous** *and* **Google** (for Google, pick a support email and save).
3. **Build → Firestore Database → Create database → Production mode** → pick the region closest to you (e.g. `northamerica-northeast1` Montréal).
4. In Firestore open the **Rules** tab, replace the contents with the file `firestore.rules` from this project and **Publish**. That rule lets each user read/write only their own `users/{uid}/…` documents.
5. **Project settings (gear) → Your apps → Web app (`</>`) → Register** → copy the `firebaseConfig` object.
6. Paste it into **`src/firebaseConfig.ts`**. From now on everything syncs under an anonymous per-device account, and the *Pantry & more* tab shows "Device account · Synced".

### 2b. Google sign-in (keeps your data when you change phones)

Google's native sign-in can't run inside Expo Go, so this part works in the **installed app** (step 3) and on the web (`npx expo start --web`).

1. **Authentication → Sign-in method → Google → Web SDK configuration** → copy the **Web client ID** into `googleWebClientId` in `src/firebaseConfig.ts`.
2. Register the Android app: **Project settings → Your apps → Add app → Android**, package name **`com.thamizh.cookbook`**.
   - It asks for a **SHA-1**. Get it from EAS: `eas credentials -p android` → choose *production* (or *preview*) → "Keystore: Set up / View" → copy the SHA-1 fingerprint. (If you haven't built yet, run `eas build -p android --profile preview` once first — EAS creates the keystore.)
   - Download **`google-services.json`** and put it in the project root (next to `package.json`). It's git-ignored; `app.config.js` picks it up automatically and enables the native Google Sign-In plugin.
3. Rebuild: `eas build -p android --profile preview`, install the APK, open **Pantry & more → Continue with Google**.

What happens on sign-in:
- First time: your anonymous device account is **upgraded in place** — same ID, nothing moves.
- On a second phone where the Google account already has data: the phone's local plan, pantry and favourites are **merged** into the account (newer week wins per week; pantry, favourites and cook log are unioned) and everything syncs from then on.
- **Sign out** keeps your data in the cloud and starts the phone fresh.

(iOS: also add an iOS app in Firebase, download `GoogleService-Info.plist` into the project root, then `eas build -p ios`.)

Data layout in Firestore:

```
users/{uid}/state/profile        favourites, pantry, cooking progress, cook log, settings
users/{uid}/weeks/{YYYY-MM-DD}   one document per planned week (Monday date), incl. grocery ticks
```

Sync is last-write-wins by `updatedAt`, pushed a moment after each change and pulled live from the server.

## 3. Install it as a real app (APK)

Expo's build service compiles the app in the cloud, no Android Studio needed:

```bash
npm install -g eas-cli
eas login              # free Expo account
eas build -p android --profile preview
```

When it finishes you get a link to an `.apk` — open it on your phone to install. (`--profile production` makes a Play-Store-ready `.aab`.) iOS builds need an Apple developer account.

## 4. Checks

```bash
npm test             # unit tests for the grocery engine, scaling, suggestions, week logic
npm run typecheck    # tsc
npm run lint         # eslint
```

## 5. Project layout

```
src/app/                 screens (Expo Router — file = route)
  (tabs)/index.tsx       Plan — the week
  (tabs)/recipes.tsx     recipe browser
  (tabs)/groceries.tsx   grocery list + pantry awareness
  (tabs)/more.tsx        pantry, history, favourites, sync status
  pick.tsx               smart recipe picker (modal)
  recipe/[id].tsx        recipe guide (resume / clear / timers / add to plan)
  cook/[id].tsx          cook mode (full screen, keeps screen on)
  pantry.tsx, history.tsx
src/lib/                 pure logic, unit-tested
  grocery.ts             merge + scale ingredients, aisles, pantry carry-over
  suggest.ts             overlap scoring for the smart picker
  quantities.ts          fraction formatting, scaling, unit sums
  week.ts, timers.ts, recipes.ts, types.ts
  firebase.ts, sync.ts   cloud backup (follows the signed-in account)
  auth.ts, merge.ts      Google sign-in (link or switch + merge)
src/store/useStore.ts    app state (Zustand), persisted with AsyncStorage
src/components/          UI building blocks (ui.tsx, RecipeCard, Sheet, TimerDock, Toast, TimerChips, AccountCard)
src/data/                recipes.json (parsed from the two PDFs), staples.json, photos.ts
assets/photos/           one photo per recipe
src/firebaseConfig.ts    ← paste your Firebase config + Google Web client ID here
app.config.js            enables the Google Sign-In plugin when google-services.json is present
firestore.rules          ← paste into Firestore → Rules
```

## How the smart picker scores recipes

Every ingredient line in the books was parsed into a normalised key (`chicken breast`, `smoked paprika`, …) and an aisle. For a candidate recipe, the ingredients not covered by the week's plan or the pantry are the "new" ones. Each new item is weighted by how much effort it is to buy — meat and seafood 3, produce/dairy/bakery 2, pantry staples 0.5 — and recipes are ranked by the share of their shopping that is already covered. The row text shows the count of new items and names the big ones first.

Cooking times are estimated from the minutes mentioned in each recipe's steps (the books don't state times); marinating and resting time is shown separately.
