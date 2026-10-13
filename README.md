# Cookbook

A mobile meal-planning app built around all 271 recipes from *The Meal Prep Cookbook* and *Jalal's Cookbook* (Jalal Sameja), for personal use.

- **Plan the week** — Monday to Sunday, a slot per meal (breakfast / lunch / dinner / snack). Repeat one recipe across several days, meal-prep style.
- **Smart picker** — when you add a recipe, the list is sorted by how many ingredients it shares with what you have already planned (and what's in your pantry). Each row says *"3 new items to buy · reuses 9 of 12"*, so one shop covers the whole week instead of buying a new set of things for every recipe.
- **Grocery list** — every ingredient from the week's meals merged into one list, quantities summed and scaled to the servings you planned, grouped by aisle. Items already in your pantry are skipped.
- **Pantry** — spices, sauces and other staples you tick off while shopping are remembered, so next week's list doesn't ask you to buy paprika again. Perishables (meat, produce, dairy) are never carried over.
- **Recipe guide** — scalable ingredients with tick boxes, numbered method, tap any "8 minutes" in a step to start a kitchen timer. **Cook mode** shows one step at a time with big type and keeps the screen awake; progress is saved so you can leave and **resume** later, or **clear** it.
- **Cloud backup (Firebase)** — past weeks, pantry, favourites and cooking progress are stored in Firestore under your own anonymous account and sync between devices. Works offline; without a Firebase config everything is still saved on the phone.

Built with **TypeScript + React Native (Expo SDK 57)**, Expo Router, Zustand, Firebase JS SDK, Reanimated, expo-haptics, expo-keep-awake.

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

## 2. Turn on cloud backup (Firebase)

The app runs in local-only mode until you add a Firebase project. It's free (Spark plan).

1. Go to https://console.firebase.google.com → **Add project** (any name, Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.** (No accounts or passwords; each phone gets its own anonymous id, which is what the data is keyed by.)
3. **Build → Firestore Database → Create database → Production mode** → pick the region closest to you (e.g. `northamerica-northeast1` Montréal).
4. In Firestore, open the **Rules** tab, replace the contents with the file `firestore.rules` from this project and **Publish**. That rule lets each user read/write only their own `users/{uid}/…` documents.
5. **Project settings (gear icon) → Your apps → Web app (`</>`) → Register** → copy the `firebaseConfig` object.
6. Paste it into **`src/firebaseConfig.ts`**, replacing the placeholder values. Save, and the app reconnects — the *Pantry & more* tab shows "Cloud backup (Firebase) · Synced".

Data layout in Firestore:

```
users/{uid}/state/profile        favourites, pantry, cooking progress, cook log, settings
users/{uid}/weeks/{YYYY-MM-DD}   one document per planned week (Monday date), incl. grocery ticks
```

Sync is last-write-wins by `updatedAt`, pushed a moment after each change and pulled live from the server.

**Moving to a new phone:** anonymous accounts are per-install. If you want the same data on two phones, the simplest route is to add Google sign-in in Firebase and link the anonymous account — ask and I'll wire it up. (For one phone, the backup already protects you against reinstalling: the id is restored from Firebase's persisted session.)

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
  firebase.ts, sync.ts   cloud backup
src/store/useStore.ts    app state (Zustand), persisted with AsyncStorage
src/components/          UI building blocks (ui.tsx, RecipeCard, Sheet, TimerDock, Toast, TimerChips)
src/data/                recipes.json (parsed from the two PDFs), staples.json, photos.ts
assets/photos/           one photo per recipe
src/firebaseConfig.ts    ← paste your Firebase config here
firestore.rules          ← paste into Firestore → Rules
```

## How the smart picker scores recipes

Every ingredient line in the books was parsed into a normalised key (`chicken breast`, `smoked paprika`, …) and an aisle. For a candidate recipe, the ingredients not covered by the week's plan or the pantry are the "new" ones. Each new item is weighted by how much effort it is to buy — meat and seafood 3, produce/dairy/bakery 2, pantry staples 0.5 — and recipes are ranked by the share of their shopping that is already covered. The row text shows the count of new items and names the big ones first.

Cooking times are estimated from the minutes mentioned in each recipe's steps (the books don't state times); marinating and resting time is shown separately.
