# Apple renewals: step-by-step checklist

Short version. Full details: [macos-signing-and-notarization.md](macos-signing-and-notarization.md).

## 1. Apple Developer account
- Sign in at https://developer.apple.com/account
- Accept any pending agreement banner
- Accept any pending agreements in App Store Connect → Business (Agreements, Tax, and Banking)
- Membership details → check the expiry date → renew, or turn on auto-renew

## 2. App-specific password (only if revoked, leaked, or the Apple ID password changed)
- https://appleid.apple.com → Sign-In and Security → App-Specific Passwords
- Generate a new one → save it in the password manager
- Revoke the old one once CI is green with the new one

## 3. Developer ID Application certificate (before it expires)
- `openssl genrsa -out devid.key 2048`
- `openssl req -new -key devid.key -out devid.csr -subj "/emailAddress=<APPLE_ID_EMAIL>/CN=<YOUR_NAME>/C=<COUNTRY>"`
- developer.apple.com → Certificates → **+** → Developer ID Application → **G2 Sub-CA** (not the pre-selected "Previous Sub-CA"; those certs all expire 2027-02-01) → upload `devid.csr` → download the `.cer`
- `curl -sO https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer`
- `openssl x509 -inform DER -in developerID_application.cer -out devid.pem`
- `openssl x509 -inform DER -in DeveloperIDG2CA.cer -out g2ca.pem`
- `openssl pkcs12 -export -legacy -inkey devid.key -in devid.pem -certfile g2ca.pem -out devid.p12` (reuse the current `APPLE_CERTIFICATE_PASSWORD` so only `APPLE_CERTIFICATE` changes, or choose a new one)
- `openssl x509 -in devid.pem -noout -enddate` → write down the new expiry date
- Save `devid.p12` and its password in the password manager
- Delete `devid.key`, `devid.csr`, `*.pem`, `*.cer`
- Don't revoke the old certificate; let it expire

## 4. GitHub secrets
- `base64 < devid.p12 | tr -d '\n' | gh secret set APPLE_CERTIFICATE`
- `gh secret set APPLE_CERTIFICATE_PASSWORD` (only if the password changed)
- Update `APPLE_CERTIFICATE` (and password if changed) in `electron/.env` if you keep one
- `gh secret set APPLE_APP_SPECIFIC_PASSWORD` (only if step 2 was done)
- `APPLE_ID` and `APPLE_TEAM_ID` normally stay the same

## 5. Release and verify
- Push to `main` (or re-run "Build and Release Electron App")
- `gh run watch`
- macOS job: "Import Apple signing certificate" shows `1 valid identities found`
- Packaging log shows `notarization successful`
- "Verify macOS signature & notarization" passes
- The new release is published with the DMG, ZIP, EXE and AppImage

## 6. Cleanup and reminders
- Delete leftover local secrets (`electron/.env`, old keychain identity) from any machine you're giving up
- Calendar reminder: 1 month before membership expiry
- Calendar reminder: 1 month before certificate expiry
- After each WWDC (June): check developer.apple.com for new agreements
