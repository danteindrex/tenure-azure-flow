# Quick Fix for "User already registered" Error

## 🎯 **Immediate Solution**

The error happens because you're testing with the same email multiple times. Here are the quick fixes:

### Option 1: Use Different Email (Fastest)
- Try with a new email: `test2@example.com`, `test3@example.com`, etc.
- Each test needs a unique email

### Option 2: Clear Existing User
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. **Authentication** → **Users**
3. Find and **delete** the test user
4. Try signup again with same email

### Option 3: Disable Email Confirmation (Recommended for Testing)
1. **Supabase Dashboard** → **Authentication** → **Settings**
2. Find **"Enable email confirmations"**
3. **Turn it OFF**
4. **Save changes**

This will:
- ✅ Skip email verification step
- ✅ Allow immediate payment flow
- ✅ Perfect for testing Stripe integration

## 🔧 **Better Error Handling**

The "User already registered" error should redirect users to login instead of showing an error. The current flow tries to create an account twice:

1. **Step 1**: Creates account ✅
2. **Step 3**: Tries to create account again ❌ (This causes the error)

## 💡 **Recommended Next Steps**

1. **For immediate testing**: Disable email confirmation in Supabase
2. **For production**: Keep email confirmation enabled and fix the duplicate signup logic

**Try Option 3 (disable email confirmation) to test the payment flow right now!**