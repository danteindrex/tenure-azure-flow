# Passkey Autofill Implementation Guide

## Overview

Your Tenure application now supports **automatic passkey authentication with conditional UI**. This means users with registered passkeys can log in with just Face ID, Touch ID, or Windows Hello - without even entering their email or password!

---

## What Was Implemented

### 1. ✅ Automatic Passkey Autofill (Conditional UI)

When users visit the login page:
- The browser automatically starts a **silent WebAuthn request** in the background
- When users click/focus on the email field, the browser shows an **autofill dropdown**
- The dropdown includes both **saved passwords** AND **registered passkeys**
- Selecting a passkey triggers biometric authentication → instant login!

**Location:** `pages/login-new.tsx:42-98`

### 2. ✅ HTML Autocomplete Attribute

The email input now has the correct autocomplete attribute for WebAuthn:

```tsx
<Input
  autoComplete="username webauthn"
  // ... other props
/>
```

**Location:** `pages/login-new.tsx:369`

### 3. ✅ Production-Ready rpID Configuration

The passkey plugin now automatically extracts the domain from your `BETTER_AUTH_URL`:

```typescript
passkey({
  rpName: 'Tenure',
  rpID: process.env.NODE_ENV === 'production'
    ? process.env.PASSKEY_RP_ID || new URL(process.env.BETTER_AUTH_URL || 'http://localhost:3000').hostname
    : 'localhost',
  origin: process.env.BETTER_AUTH_URL || 'http://localhost:3000'
})
```

**Location:** `lib/auth.ts:135-144`

---

## How It Works (User Flow)

### First Time Setup
1. User creates an account with email/password
2. User goes to Security Settings (or receives a prompt)
3. User clicks "Add Passkey" → registers with biometric
4. Passkey is saved to their device (private key stays on device)

### Subsequent Logins (The Magic!)
1. User visits login page
2. User clicks on email field
3. Browser shows autofill dropdown with passkeys
4. User selects their passkey
5. Browser prompts for Face ID / Touch ID / Windows Hello
6. **Instant login - no password needed!**

---

## Technical Implementation Details

### Feature Detection

The implementation checks for conditional UI support:

```typescript
if (PublicKeyCredential.isConditionalMediationAvailable) {
  const isConditionalUIAvailable = await PublicKeyCredential.isConditionalMediationAvailable();

  if (isConditionalUIAvailable) {
    // Start autofill flow
    const result = await authClient.signIn.passkey({ autoFill: true });
  }
}
```

### AbortController for Cleanup

Uses an AbortController to cancel pending autofill requests when:
- Component unmounts
- User navigates away
- User explicitly chooses password login

### Silent Error Handling

Autofill failures are logged but don't show error messages to users:
- User cancelled passkey selection → silent fail
- No passkeys registered → silent fail (shows password form)
- WebAuthn not supported → falls back to password

---

## Browser Support (2025)

| Browser | Conditional UI Support |
|---------|----------------------|
| Chrome 108+ | ✅ Full Support |
| Edge 108+ | ✅ Full Support |
| Safari 16+ | ✅ Full Support |
| Firefox 119+ | ✅ Full Support |

---

## Environment Variables

### Required
- `BETTER_AUTH_URL` - Your app URL (e.g., `https://app.tenure.com`)
- `BETTER_AUTH_SECRET` - Secret key for JWT signing

### Optional
- `PASSKEY_RP_ID` - Override the relying party ID (defaults to hostname from BETTER_AUTH_URL)

**Example Production .env:**
```bash
BETTER_AUTH_URL=https://app.tenure.com
PASSKEY_RP_ID=app.tenure.com  # Optional - auto-detected if not set
```

**Example Development .env:**
```bash
BETTER_AUTH_URL=http://localhost:3000
# rpID automatically uses 'localhost' in development
```

---

## Security Features

### ✅ Implemented
- **Counter-based clone detection** - Detects if authenticator is cloned
- **Origin validation** - Prevents phishing attacks
- **User verification required** - Biometric/PIN required for sensitive operations
- **Credential ID tracking** - Each passkey has unique identifier
- **Transport information** - Tracks how passkey was created (USB, NFC, internal)

### 🔒 Database Schema
```typescript
passkey {
  id: string (primary key)
  name: string (user-friendly label)
  publicKey: string (public key only - private key stays on device)
  userId: uuid (foreign key to users table)
  webauthnUserId: string
  counter: integer (increments with each use - detects clones)
  deviceType: string
  backedUp: boolean
  transports: string
  createdAt: timestamp
  credentialID: string
}
```

---

## Testing

### Manual Testing Steps

1. **Test Autofill Detection:**
   ```bash
   npm run dev
   # Navigate to http://localhost:3000/login
   # Open browser console
   # Look for: "Conditional UI supported: true"
   ```

2. **Test Passkey Registration:**
   - Login with email/password
   - Navigate to Security Settings
   - Click "Add Passkey"
   - Use device biometric (or virtual authenticator in DevTools)
   - Verify passkey appears in list

3. **Test Autofill Login:**
   - Logout
   - Return to login page
   - Click on email field
   - Verify passkey appears in autofill dropdown
   - Select passkey → should auto-login

### E2E Testing

The project includes comprehensive E2E tests for passkeys:

**Location:** `tests/e2e/04-passkey-webauthn.spec.ts`

Run tests:
```bash
npm run test:e2e
```

**Note:** Most tests are currently `.skip()` because they require virtual authenticators. To enable:
1. Remove `.skip()` from test
2. Tests use Chrome DevTools Protocol to create virtual authenticators

---

## Debugging

### Chrome DevTools

1. Open DevTools → Application → WebAuthn
2. Enable "Enable virtual authenticator environment"
3. Add Virtual Authenticator:
   - Protocol: `ctap2`
   - Transport: `internal` (for platform authenticators like Touch ID)
   - Supports: `resident keys` + `user verification`

### Common Issues

**Issue:** Autofill not showing
- **Check:** Browser supports conditional UI (Chrome 108+, Safari 16+)
- **Check:** Input has `autocomplete="username webauthn"`
- **Check:** User has registered passkeys in database

**Issue:** "User verification failed"
- **Cause:** Device doesn't have biometric/PIN set up
- **Solution:** User needs to enable device security

**Issue:** "Invalid origin"
- **Cause:** rpID doesn't match domain
- **Solution:** Check `BETTER_AUTH_URL` and `PASSKEY_RP_ID` match production domain

---

## User Experience Best Practices

### ✅ Implemented
1. Feature detection before showing passkey options
2. Graceful fallback to password if passkey fails
3. User-friendly error messages
4. Loading states during authentication

### 🎯 Recommended Enhancements
1. Show hint text: "Sign in faster with Face ID or Touch ID"
2. Passkey onboarding flow after first login
3. Prompt users to add passkey after password login
4. Multi-device passkey sync messaging

---

## API Reference

### Client Methods

```typescript
// Sign in with passkey (autofill)
await authClient.signIn.passkey({ autoFill: true });

// Sign in with passkey (explicit button click)
await authClient.signIn.passkey();

// Register new passkey
await authClient.passkey.addPasskey({
  name: "My iPhone",
  authenticatorAttachment: "platform" // or "cross-platform"
});

// List user's passkeys
const { data: passkeys } = await authClient.passkey.listUserPasskeys();

// Update passkey name
await authClient.passkey.updatePasskey({
  id: "passkey-id",
  name: "New Name"
});

// Delete passkey
await authClient.passkey.deletePasskey({ id: "passkey-id" });
```

---

## Next Steps

### High Priority
- ✅ ~~Add autoComplete="username webauthn" to email input~~
- ✅ ~~Enable autoFill: true for passkey sign-in~~
- ✅ ~~Update production rpID configuration~~
- ⏳ Test passkey autofill in production environment

### Medium Priority
- Add passkey rename functionality to UI
- Prevent users from deleting last authentication method
- Add "Add Passkey" prompt after successful password login
- Create passkey onboarding flow for new users

### Low Priority
- Reorder login buttons to prioritize passkeys
- Add device name suggestions based on AAGUID
- Implement passkey usage analytics
- Add "sign in from another device" QR code flow

---

## Support & Documentation

### Better Auth Passkey Docs
https://www.better-auth.com/docs/plugins/passkey

### WebAuthn Specs
https://www.w3.org/TR/webauthn-3/

### Conditional UI Explainer
https://github.com/w3c/webauthn/wiki/Explainer:-WebAuthn-Conditional-UI

### Passkeys.dev Resources
https://passkeys.dev/

---

## File Locations

| Component | File Path |
|-----------|-----------|
| Login page | `pages/login-new.tsx` |
| Auth config | `lib/auth.ts` |
| Auth client | `lib/auth-client.ts` |
| Passkey manager UI | `src/components/security/PasskeyManager.tsx` |
| Database schema | `drizzle/schema/auth.ts` |
| E2E tests | `tests/e2e/04-passkey-webauthn.spec.ts` |

---

*Last updated: 2025-11-14*
*Implementation by: Claude Code*
