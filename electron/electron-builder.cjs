"use strict";

const path = require("path");

// Load `electron/.env` for local `npm run package:mac` (CI injects env vars; dotenv is a no-op if file missing).
try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch {
  // dotenv not installed in some edge layouts; CI does not need it
}

// Use GitHub secret names locally and in CI: APPLE_CERTIFICATE, APPLE_CERTIFICATE_PASSWORD.
// electron-builder only reads CSC_LINK / CSC_KEY_PASSWORD for the .p12; copy over if not set explicitly.
if (!process.env.CSC_LINK && process.env.APPLE_CERTIFICATE) {
  process.env.CSC_LINK = process.env.APPLE_CERTIFICATE;
}
if (!process.env.CSC_KEY_PASSWORD && process.env.APPLE_CERTIFICATE_PASSWORD) {
  process.env.CSC_KEY_PASSWORD = process.env.APPLE_CERTIFICATE_PASSWORD;
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
    signtoolOptions: {
      publisherName: "Shalev Ben Moshe",
    },
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
