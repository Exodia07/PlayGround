# PlayGround

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/Exodia07/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/Exodia07/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/Exodia07/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/Exodia07/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/Exodia07/PlayGround).
- 🛠️ [Check build runs](https://github.com/Exodia07/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/Exodia07/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/Exodia07).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
<!-- omgithub:readme:end -->

## Darkest Fear — The Trilogy

A mobile-friendly 3D survival-puzzle game with three chapters and twelve missions. It runs in modern desktop and mobile browsers and can be installed as a home-screen web app. Progress is saved in the browser on the current device.

### Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). To build and serve the production version:

```sh
npm run build
npm run preview
```

The app shell and visited game resources are cached by a service worker for subsequent offline play. The first visit requires a network connection. Install it from the browser's **Add to Home Screen** / **Install app** menu while served over HTTPS (or localhost).

### Controls

- **Desktop:** WASD or arrow keys to move; **F** or **Space** toggles the torch; **P** or **Esc** pauses. Click a nearby floor tile to move there.
- **Touch:** use the on-screen directional pad and Light button, or swipe/tap the play area. Controls avoid browser swipe gestures during play.
- Gather all three seals in each mission, keep the torch charged, and reach the exit. The monster is repelled while illuminated.

Three.js renders the game locally. Google Fonts are optional; if unavailable, the interface uses system sans-serif fallbacks.

### Android app

The Android project wraps the same offline-capable game in a native Android WebView using Capacitor. Install Android Studio (including the Android SDK and platform tools), Java 21+, then run:

```sh
npm install
npm run android:debug
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. Install it on a connected device with `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`, or open the project in Android Studio with `npm run android:open` and run it on a device/emulator. To create a release APK, configure your signing credentials in Android Studio and use `npm run android:release`; the unsigned output is under `android/app/build/outputs/apk/release/`. The project requires the Android SDK platform/build tools specified in `android/variables.gradle`.

The wrapper requires Java 17 and uses its checked-in Gradle 8.14.3 wrapper. Device installation needs USB debugging enabled (or install the APK manually).
