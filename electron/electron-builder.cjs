"use strict";

const path = require("path");

// Load `electron/.env` for local `npm run package:mac` (CI injects env vars; dotenv is a no-op if file missing).
try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch {
  // dotenv not installed in some edge layouts; CI does not need it
}

// CSC_LINK / CSC_KEY_PASSWORD are what electron-builder reads for code-signing.
// We map APPLE_CERTIFICATE → CSC_LINK, but ONLY on macOS. On Windows the Apple
// Developer ID cert is not trusted by the OS certificate store, which causes
// electron-updater's Authenticode verification to reject the downloaded update.
//
// If you purchase a Windows (Authenticode) code-signing certificate:
//   1. Add WIN_CSC_LINK and WIN_CSC_KEY_PASSWORD secrets to the repo.
//   2. Add a `process.platform === "win32"` block here that maps them to
//      CSC_LINK / CSC_KEY_PASSWORD (same pattern as the macOS block below).
//   3. Remove the `verifyUpdateCodeSignature = false` line in src/main/index.ts
//      so electron-updater validates the trusted Windows signature.
if (process.platform === "darwin") {
  if (!process.env.CSC_LINK && process.env.APPLE_CERTIFICATE) {
    process.env.CSC_LINK = process.env.APPLE_CERTIFICATE;
  }
  if (!process.env.CSC_KEY_PASSWORD && process.env.APPLE_CERTIFICATE_PASSWORD) {
    process.env.CSC_KEY_PASSWORD = process.env.APPLE_CERTIFICATE_PASSWORD;
  }
}

/**
 * Loads `electron/.env` above so local builds match CI. Notarization credentials are read from env by
 * electron-builder 26+ (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, or API key vars).
 * See docs/macos-signing-and-notarization.md.
 * @type {import('electron-builder').Configuration}
 */
function macNotarizeEnabled() {
  const appleIdFlow =
    process.env.APPLE_ID &&
    process.env.APPLE_APP_SPECIFIC_PASSWORD &&
    process.env.APPLE_TEAM_ID;
  const apiKeyFlow =
    process.env.APPLE_API_KEY &&
    process.env.APPLE_API_KEY_ID &&
    process.env.APPLE_API_ISSUER;
  const keychainFlow = process.env.APPLE_KEYCHAIN_PROFILE;
  return !!(appleIdFlow || apiKeyFlow || keychainFlow);
}

module.exports = {
  appId: "com.shalev396.aws-profile-manager",
  productName: "AWS Profile Manager",
  directories: {
    output: "dist",
  },
  publish: {
    provider: "github",
    owner: "shalev396",
    repo: "AWSProfileManager",
  },
  asarUnpack: ["**/node_modules/better-sqlite3/**"],
  files: ["out", "assets/**"],
  mac: {
    icon: "assets/icon.png",
    category: "public.app-category.developer-tools",
    target: ["dmg", "zip"],
    artifactName: "AWS-Profile-Manager.${ext}",
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist",
    notarize: macNotarizeEnabled(),
    extendInfo: {
      CFBundleName: "AWS Profile Manager",
      CFBundleDisplayName: "AWS Profile Manager",
      LSMultipleInstancesProhibit: true,
    },
  },
  win: {
    icon: "assets/icon.png",
    target: ["nsis"],
    artifactName: "AWS-Profile-Manager-Setup.${ext}",
    // No Authenticode certificate yet — omitting signtoolOptions so
    // publisherName doesn't end up in app-update.yml (which would
    // make electron-updater attempt signature verification against
    // an unsigned exe). If you add a Windows code-signing cert later,
    // restore: signtoolOptions: { publisherName: "Shalev Ben Moshe" }
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    shortcutName: "AWS Profile Manager",
  },
  linux: {
    icon: "assets/icon.png",
    target: ["AppImage"],
    artifactName: "AWS-Profile-Manager.${ext}",
    category: "Development",
    maintainer: "Shalev Ben Moshe",
    synopsis: "Manage and switch AWS CLI profiles",
  },
};
