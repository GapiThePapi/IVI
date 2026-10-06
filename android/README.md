# IVI for Android

The signed APK supports Android 8 and newer. Download the latest `IVI-Android-<version>.apk` and install it over the previous app. Android may ask you to allow installation from your browser or file manager.

## Play over the internet

Deploy the cloud service using the [hosting instructions](../README.md#play-over-the-internet-without-a-home-server). Open connection settings in the app and enter that service's HTTPS address. Everyone using that address can create and join tables from different networks; no home server is needed.

To make the public address the default in new installations, build with:

```powershell
$env:DEKI_SERVER_URL = 'https://YOUR-SERVICE.onrender.com'
pnpm android:build
```

Replace the placeholder with your actual deployed address. Only HTTPS origins without a path, query, credentials, or fragment are accepted for bundled defaults. Previously saved server choices remain in place after an update; switch those installations through connection settings. A build without `DEKI_SERVER_URL` defaults to `https://deki-ymh6.onrender.com`; an explicitly empty value requires setup. Solo bot workers are bundled in the app. If workers fail, Hard falls back to Medium decisions so the match can continue.

## Test on local Wi-Fi

1. On the computer, run `pnpm build` and `pnpm start` from the 41 folder.
2. Connect the phones to the same Wi-Fi as the computer.
3. Open IVI and use connection settings to enter `http://YOUR_COMPUTER_IP:3001`. Include `http://` for local testing; addresses without a scheme default to HTTPS.
4. Create a table and share its six-character code. Four to eight players must join and be ready to begin. Desktop players can use the same server address in a browser.

The APK bundles the interface, fonts, and artwork. Solo games with Easy, Medium, and Hard bots work offline. Online tables require the matching version-2 server. Choose Portrait or Landscape in Settings; rotating layouts preserves the current match. The Android app remembers your nickname, server address, and seat across app restarts. Server restarts clear all matches.

## Build and verify

Requires Node 24, pnpm 11, Android SDK platform 36/build-tools 36.0.0, and JDK 21. Set `ANDROID_HOME` and `DEKI_JAVA_HOME` when these are outside the locations detected by `build.mjs`. A portable JDK under `.tools/jdk-*` is also detected.

```sh
pnpm android:build
```

The script packages the production web build, compiles the native shell, aligns the APK, signs it, and verifies its signature. Outputs are written to `releases/` with a SHA-256 checksum. Preserve the ignored `android/.private/` signing files to sign future updates with the same identity. Never upload that directory.

With the production server running on port 3001, test the Android interface with:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
pnpm test:android-ui
```

These browser tests check narrow layouts, saved seats, and an eight-player match. They do not replace testing the native WebView, keyboard, system bars, or installation on a physical Android device.

New local builds use the name **IVI** and are saved as `IVI-Android-<version>.apk`. The Android package ID and signing key remain the same so updates preserve app data.
