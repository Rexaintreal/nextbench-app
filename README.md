# NextBench iOS

Native iOS app for **NextBench** — the campus marketplace and social platform for college students.

Buy, sell, post, and chat — all scoped to your campus.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) SDK 52 (prebuild) |
| Navigation | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based) |
| Styling | [NativeWind](https://www.nativewind.dev/) v4 (Tailwind CSS for React Native) |
| Backend | [Firebase](https://firebase.google.com/) (Auth, Firestore, Storage) |
| Firebase SDK | `@react-native-firebase/*` (native modules, not JS SDK) |
| Auth | Google Sign-In via `@react-native-google-signin/google-signin` |

## Features

- **Feed** — Mixed feed of marketplace products and social posts with a scoring algorithm (hype, recency, campus proximity)
-  **Search** — Find products, posts, and users
-  **Create Listing** — Multi-image upload with camera/gallery picker
-  **Messaging** — Real-time 1:1 chat with image support
-  **Profile** — View your listings and posts

## Prerequisites

- **Node.js** ≥ 18
- **Xcode** ≥ 15 (with iOS Simulator)
- **CocoaPods** (`sudo gem install cocoapods`)
- A Firebase project with `GoogleService-Info.plist` (see [Setup](#setup))

## Setup

### 1. Clone & install

```bash
git clone <your-repo-url>
cd nextbench_ios
npm install
```

### 2. Environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Where to find it |
|---|---|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Firebase Console → Auth → Google provider → Web SDK config → Web client ID |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Run `eas init` or find on [expo.dev](https://expo.dev) |

### 3. Firebase config

Download `GoogleService-Info.plist` from [Firebase Console](https://console.firebase.google.com) → Project Settings → Your iOS App, and place it in the project root:

```
nextbench_ios/
├── GoogleService-Info.plist   ← place here
├── package.json
└── ...
```

> This file is git-ignored. Every developer must download their own copy.

### 4. Build & run

```bash
# Generate the native iOS project
npx expo prebuild --clean

# Run on iOS Simulator
npx expo run:ios
```

> **Note:** This project uses native Firebase modules, so Expo Go will **not** work. You must use `npx expo run:ios` or an EAS development build.

## Project Structure

```
src/
├── app/                        # Expo Router — file-based routes
│   ├── _layout.tsx             #   Root layout (providers, auth gate)
│   ├── (auth)/                 #   Login & signup screens
│   ├── (tabs)/                 #   Bottom tab navigator
│   │   ├── index.tsx           #     Home / Feed
│   │   ├── search.tsx          #     Search
│   │   ├── create.tsx          #     Create listing
│   │   ├── messages.tsx        #     Chat list
│   │   └── profile.tsx         #     User profile
│   ├── product/[id].tsx        #   Product detail (stack push)
│   └── chat/[id].tsx           #   Chat room (stack push)
├── components/ui/              # Reusable UI components
│   ├── Text.tsx                #   Typography with variant system
│   ├── Button.tsx              #   Styled button
│   ├── Input.tsx               #   Form input
│   ├── ProductCard.tsx         #   Marketplace item card
│   └── PostCard.tsx            #   Social post card
├── providers/
│   └── AuthProvider.tsx        # Auth context (Firebase Auth + Firestore user doc)
├── services/firebase/          # Native Firebase SDK wrappers
│   ├── auth.ts                 #   Google Sign-In, sign out
│   ├── firestore.ts            #   CRUD helpers
│   └── storage.ts              #   Image upload
├── constants/                  # Design tokens (colors, config)
└── global.css                  # NativeWind base styles
```

## Firebase Collections

| Collection | Purpose |
|---|---|
| `users` | User profiles (name, school, verification status) |
| `products` | Marketplace listings |
| `posts` | Social feed posts |
| `chatRooms` | DM rooms (with `messages` sub-collection) |
| `clubs` | Group chat clubs |
| `notifications` | User notifications |
| `upvotes` | Post upvote records |
| `wishlists` | Product wishlist records |
| `follows` | Follow relationships |
| `blocks` | Block relationships |

## Scripts

```bash
npm install              # Install dependencies
npx expo prebuild        # Generate native projects
npx expo run:ios         # Build & run on iOS Simulator
npx expo run:ios -d      # Build & run on physical device
npx expo start           # Start Metro bundler (for dev builds only)
```

## License

See [LICENSE](./LICENSE).
