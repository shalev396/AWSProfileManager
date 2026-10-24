# macOS signing & notarization

All macOS signing and notarization runs in GitHub Actions (`.github/workflows/build-electron.yml`, macOS job). No local Mac is required to renew credentials or ship a release.

## What expires

| Item | Lifetime | Where to renew |
|---|---|---|
| Apple Developer Program membership | Yearly | developer.apple.com/account → Membership details |
| Apple Developer Program License Agreement | Re-accept whenever Apple publishes a new version | developer.apple.com/account (banner at top) |
| Developer ID Application certificate | Check `notAfter` (see below) | developer.apple.com → Certificates |
| App-specific password | Never expires; revoked when the Apple ID password changes | appleid.apple.com → Sign-In and Security |
| Team ID | Permanent | — |

Symptoms when something lapses:

- Agreement or membership: notarization fails with `HTTP status code: 403. A required agreement is missing or has expired.`
- App-specific password revoked: notarization fails with an authentication error.
- Certificate expired: signing fails, or no valid identity is found.

Apps that were already signed, notarized and stapled keep working after the certificate expires.

## GitHub secrets

| Secret | Value |
|---|---|
| `APPLE_CERTIFICATE` | base64 of the Developer ID Application `.p12` (cert + private key + G2 intermediate) |
| `APPLE_CERTIFICATE_PASSWORD` | password of that `.p12` |
| `APPLE_ID` | Apple ID email of the developer account |
| `APPLE_APP_SPECIFIC_PASSWORD` | app-specific password for notarization |
| `APPLE_TEAM_ID` | your 10-character Team ID |

GitHub secrets can't be read back. Keep the `.p12` and both passwords in a password manager.

## Renewing the certificate (any OS with openssl)

```bash
openssl genrsa -out devid.key 2048
openssl req -new -key devid.key -out devid.csr \
  -subj "/emailAddress=<apple id email>/CN=<your name>/C=<country>"
```

1. developer.apple.com → Certificates → **+** → **Developer ID Application** → **G2 Sub-CA**, upload `devid.csr`, download `developerID_application.cer`. The portal pre-selects "Previous Sub-CA"; every cert issued under it expires 2027-02-01, so pick G2.
2. Build the `.p12`. `-legacy` keeps it importable by macOS `security import`:

   ```bash
   curl -sO https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer
   openssl x509 -inform DER -in developerID_application.cer -out devid.pem
   openssl x509 -inform DER -in DeveloperIDG2CA.cer -out g2ca.pem
   openssl pkcs12 -export -legacy -inkey devid.key -in devid.pem -certfile g2ca.pem \
     -name "Developer ID Application: <your name> (<TEAM_ID>)" -out devid.p12
   openssl x509 -in devid.pem -noout -subject -enddate
   ```

3. Update the secrets:

   ```bash
   base64 < devid.p12 | tr -d '\n' | gh secret set APPLE_CERTIFICATE
   gh secret set APPLE_CERTIFICATE_PASSWORD
   ```

4. Store `devid.p12` and its password in the password manager, then delete `devid.key`, `devid.csr`, `*.pem` and `*.cer`.
5. Don't revoke the old certificate. Revoking a Developer ID certificate can stop already-shipped builds from launching. Let it expire.

## Rotating the app-specific password

appleid.apple.com → Sign-In and Security → App-Specific Passwords → generate a new one → `gh secret set APPLE_APP_SPECIFIC_PASSWORD`. Then revoke the old one.

## Checking credentials (needs Xcode command line tools)

```bash
xcrun notarytool history --apple-id <apple id> --password <app-specific password> --team-id <TEAM_ID>
```

## How CI signs

1. **Import Apple signing certificate** decodes `APPLE_CERTIFICATE` into its own keychain and sets the key partition list. It doesn't hand the cert to electron-builder via `CSC_LINK`, because electron-builder's temporary keychain calls `set-key-partition-list` with the `.p12` password instead of the keychain password, and macOS 26+ rejects that.
2. **Package & publish** signs with the keychain identity (`CSC_NAME`) and notarizes using `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID`. See `macNotarizeEnabled()` in `electron/electron-builder.cjs`.
3. **Verify macOS signature & notarization** runs `codesign`, `spctl` and `stapler validate` on the built app.

## Local signed builds (optional, Mac only)

Create `electron/.env` (gitignored) with `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID`. Then run `npm run package:mac`. Alternatively, install the `.p12` into the login keychain and leave the two certificate variables out of `.env`. electron-builder then finds the identity on its own and skips the temporary-keychain step that macOS 26+ rejects.

## Reminders

- One month before the membership expires.
- One month before the certificate's `notAfter` date.
- Look at the developer.apple.com banner after each WWDC (June), when Apple usually updates the agreement.
