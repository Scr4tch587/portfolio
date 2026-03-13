# Admin Auth Hardening Setup

This project now uses server-side passphrase verification with Firebase custom tokens.

## Security model

- `/dev` accepts a passphrase.
- Browser sends passphrase only to `adminIssueToken` Cloud Function.
- Function verifies passphrase using `scrypt` hash + salt (stored as Firebase Secrets).
- On success, function issues a Firebase custom token with `admin: true` claim.
- Firestore/Storage write rules require `request.auth.token.admin == true`.

Result: client code cannot self-verify or bypass write protections.

## 1. Generate secrets from your passphrase

Use your UUID (or any long random passphrase):

```bash
cd /Users/scr4tch/Documents/Coding/Projects/Portfolio/portfolio
node scripts/gen-admin-secret.mjs "YOUR_UUID_PASSPHRASE"
```

This prints three values:
- `ADMIN_PASS_SALT_HEX`
- `ADMIN_PASS_HASH_HEX`
- `RATE_LIMIT_PEPPER`

Do not commit these values.

## 2. Install and deploy Cloud Function

```bash
cd /Users/scr4tch/Documents/Coding/Projects/Portfolio/portfolio/functions
npm install
```

Set function secrets:

```bash
firebase functions:secrets:set ADMIN_PASS_SALT_HEX
firebase functions:secrets:set ADMIN_PASS_HASH_HEX
firebase functions:secrets:set RATE_LIMIT_PEPPER
```

Deploy function:

```bash
cd /Users/scr4tch/Documents/Coding/Projects/Portfolio/portfolio
firebase deploy --only functions
```

## 3. Deploy security rules

```bash
cd /Users/scr4tch/Documents/Coding/Projects/Portfolio/portfolio
firebase deploy --only firestore:rules,storage
```

## 4. Frontend env

Ensure `VITE_FIREBASE_FUNCTIONS_REGION` matches function region (`us-central1` by default).

Example in `.env.local`:

```bash
VITE_FIREBASE_FUNCTIONS_REGION=us-central1
```

## 5. Validate

1. Open `/dev`, enter wrong passphrase several times, confirm lockout message appears.
2. Enter correct passphrase, confirm `/dev/admin` loads.
3. Edit/create projects successfully when authenticated.
4. Sign out from admin panel; write actions should fail if forced manually.

## Hygiene checklist

- Keep passphrase out of source control, screenshots, and chat logs.
- Rotate all three secrets if passphrase may have leaked.
- Keep Cloud Function, Firebase Admin SDK, and Firebase rules reviewed periodically.
- Consider enabling Firebase App Check for additional abuse resistance.

## Check deployed rules (source of truth)

Use the Firebase Console to verify currently active rules:

1. Firestore: `Build -> Firestore Database -> Rules`
2. Storage: `Build -> Storage -> Rules`

These tabs show the exact deployed rules currently enforcing access in production.

## CMS readiness checks

Before fully switching to CMS-managed projects:

1. Logged out:
   - project create/edit must fail
2. Logged in via `/dev`:
   - project create/edit must succeed
3. Public site:
   - project reads still load
