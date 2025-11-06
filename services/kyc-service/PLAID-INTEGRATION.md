# 🎯 Plaid Integration Explained

## What We're Using: **Plaid Link (Hosted UI)**

✅ **YES - We're using Plaid's hosted platform!**

You do **NOT** need to build custom verification UI. Plaid provides everything.

---

## How It Works

### **Plaid Link = Pre-built Hosted UI**

Plaid Link is a **pre-built, hosted interface** provided by Plaid that handles the entire identity verification workflow.

**What this means:**
- ✅ Plaid hosts all the UI components
- ✅ Plaid handles document capture, selfie, verification
- ✅ You just embed their component (like embedding a YouTube video)
- ✅ NO custom UI development needed

---

## Our Implementation Flow

### **1. Backend (KYC Microservice)**

```
User clicks "Verify Identity" in Dashboard
    ↓
Main App → KYC Service: POST /kyc/create-link-token
    ↓
KYC Service → Plaid API: Create Link Token
    ↓
Plaid returns: link_token (expires in 4 hours)
    ↓
Return link_token to Frontend
```

### **2. Frontend (Dashboard)**

```javascript
// In your React component (Dashboard)
import { usePlaidLink } from 'react-plaid-link';

const { open, ready } = usePlaidLink({
  token: linkToken,  // From step 1
  onSuccess: (sessionId) => {
    // User completed verification!
    // Call: POST /kyc/verify with sessionId
  }
});

// When user clicks "Verify Now"
<button onClick={() => open()}>
  Verify Identity
</button>
```

**What happens when `open()` is called:**
- 🎬 Plaid's hosted modal/window opens
- 📸 User takes photo of ID (Plaid's UI)
- 🤳 User takes selfie (Plaid's UI)
- ✅ Plaid verifies everything
- 🎉 onSuccess callback fires with session ID

### **3. Backend Again**

```
Frontend gets sessionId from onSuccess callback
    ↓
Call: POST /kyc/verify { sessionId }
    ↓
KYC Service → Plaid: GET /identity_verification/get
    ↓
Plaid returns: verification results (verified/failed)
    ↓
Store in database: kyc_verification table
    ↓
Return success to Frontend
```

---

## What Plaid Provides (You Don't Build)

### **Plaid Link UI includes:**

✅ **Document Upload**
- Camera interface for ID capture
- Support for 16,000+ document types worldwide
- Auto-cropping and quality checks
- Front/back capture for IDs

✅ **Selfie Capture**
- Live video selfie
- Liveness detection (prevents photos of photos)
- Face matching with document photo

✅ **Data Verification**
- Name, address, DOB validation
- Phone number verification (SMS)
- Check against trusted databases

✅ **User Experience**
- Multi-language support
- Mobile-optimized
- QR code handoff (desktop → mobile camera)
- Error handling & retries
- Progress indicators

---

## Integration Types

### **Option 1: Embedded (What We're Using)**

Plaid Link is embedded directly in your app:
- Opens as a modal/overlay
- Feels like part of your app
- User never leaves your site

**React Example:**
```jsx
import { usePlaidLink } from 'react-plaid-link';

function KYCVerification() {
  const { open } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess
  });

  return <button onClick={open}>Verify Now</button>;
}
```

### **Option 2: Hosted Link (Alternative)**

Plaid-hosted URL that user visits:
- Good for email/SMS verification links
- User goes to Plaid's website directly
- Example: `https://cdn.plaid.com/link/v2/...`

**We're NOT using this** - we're using embedded Link.

---

## Does This Match Plaid's Documentation?

### ✅ **YES - 100% Matches!**

**From Plaid Docs:**
> "Plaid Link is a client-side component that your users will interact with in order to link their accounts to Plaid..."

> "Create an instance of Link using the link_token returned from the API call."

> "Link is available as native SDKs for web browsers, iOS, Android, and React Native."

**Our Implementation:**
1. ✅ Create link token via `/link/token/create`
2. ✅ Initialize Plaid Link client-side
3. ✅ User completes flow in Plaid's hosted UI
4. ✅ Receive session ID in `onSuccess` callback
5. ✅ Fetch results via `/identity_verification/get`

**Exactly as documented!**

---

## What You Need to Do (Frontend)

### **Install Plaid SDK**

```bash
npm install react-plaid-link
```

### **Create KYC Modal Component**

```tsx
// src/components/KYCVerificationModal.tsx
import { usePlaidLink } from 'react-plaid-link';

export function KYCVerificationModal({ isOpen, onClose }) {
  const [linkToken, setLinkToken] = useState(null);

  // Get link token from our KYC service
  useEffect(() => {
    if (isOpen) {
      fetch('/api/kyc/create-link-token', {
        method: 'POST',
        credentials: 'include'
      })
      .then(r => r.json())
      .then(data => setLinkToken(data.linkToken));
    }
  }, [isOpen]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (sessionId) => {
      // Verify with our KYC service
      await fetch('/api/kyc/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId })
      });
      onClose();
      // Show success message
    }
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Identity Verification</h2>
      <p>Verify your identity to access all features</p>
      <button
        onClick={open}
        disabled={!ready}
      >
        Start Verification
      </button>
    </Modal>
  );
}
```

---

## Summary

### **What Plaid Provides:**
- ✅ Complete hosted UI for verification
- ✅ Document capture interface
- ✅ Selfie capture with liveness detection
- ✅ All verification logic
- ✅ Multi-language, mobile-optimized
- ✅ 16,000+ document types supported

### **What You Build:**
- ✅ Button to trigger verification
- ✅ API calls to KYC microservice
- ✅ Database storage of results
- ✅ Banner to show verification status

### **What You DON'T Build:**
- ❌ Camera interface
- ❌ Document scanning
- ❌ Selfie capture
- ❌ Verification algorithms
- ❌ Fraud detection

---

## Cost Reminder

Plaid charges per verification:
- ~$0.55 - Anti-Fraud Engine (SMS check)
- ~$0.50 - Data Source Verification
- ~$0.85 - Document Verification

**First 200 verifications are FREE!**

---

## Next Steps

1. ✅ KYC microservice is built (done!)
2. ⏳ Add Plaid credentials to `.env`
3. ⏳ Install `react-plaid-link` in main app
4. ⏳ Create KYC modal component
5. ⏳ Add "Verify Now" button to Dashboard banner
6. ⏳ Create proxy API endpoints in main app

**You're using Plaid's hosted platform exactly as documented!** 🎉
