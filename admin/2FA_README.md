# Two-Factor Authentication (2FA) System

Complete 2FA implementation for admin authentication with email verification.

## 🚀 Quick Start

1. **Configure SMTP** (2 minutes)
   ```env
   # Add to .env.local
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_app_password
   ```

2. **Setup Database** (1 minute)
   ```bash
   # Run in Supabase SQL Editor
   # Copy contents from scripts/setup-2fa-tables.sql
   ```

3. **Test It** (2 minutes)
   ```bash
   npm run dev
   # Visit http://localhost:3000/login
   ```

## 📚 Documentation

- **[Quick Start Guide](2FA_QUICK_START.md)** - Get started in 5 minutes
- **[Setup Guide](2FA_SETUP_GUIDE.md)** - Complete documentation
- **[Flow Diagram](2FA_FLOW_DIAGRAM.md)** - Visual flow charts
- **[Checklist](2FA_CHECKLIST.md)** - Step-by-step checklist
- **[Summary](2FA_IMPLEMENTATION_SUMMARY.md)** - Implementation overview

## 🔑 How It Works

### Login Flow
1. User enters email/password
2. 5-digit code sent to email
3. User verifies code
4. First time? → 2FA setup
5. Already setup? → Dashboard

### 2FA Setup (First Time Only)
1. Click "Send Verification Code"
2. 6-digit code sent to email
3. User verifies code
4. 10 backup codes generated
5. User downloads backup codes
6. Redirect to dashboard

## 📁 Files

### API Routes
- `app/api/auth/login/route.ts` - Login endpoint
- `app/api/auth/verify-login/route.ts` - Verify 5-digit code
- `app/api/auth/2fa-setup/send-code/route.ts` - Send setup code
- `app/api/auth/2fa-setup/verify/route.ts` - Complete setup

### UI Components
- `components/pages/Login.tsx` - Login page with verification
- `components/pages/TwoFactorSetup.tsx` - 2FA setup page
- `app/verify/page.tsx` - Setup route

### Utilities
- `lib/utils/2fa.ts` - Helper functions
- `lib/utils/send-email.ts` - Email sending

### Database
- `scripts/setup-2fa-tables.sql` - Database schema

### Testing
- `scripts/test-email.ts` - Test SMTP
- `scripts/check-2fa-status.ts` - Check admin status
- `scripts/reset-2fa.ts` - Reset for testing

## 🔧 Testing

```bash
# Test email configuration
npx ts-node scripts/test-email.ts

# Check 2FA status
npx ts-node scripts/check-2fa-status.ts

# Reset 2FA for testing
npx ts-node scripts/reset-2fa.ts admin@example.com
```

## 🔐 Security Features

- ✅ SHA-256 code hashing
- ✅ Bcrypt backup code hashing
- ✅ 10-minute code expiration
- ✅ 3 attempts rate limiting
- ✅ Session tracking
- ✅ Audit logging

## 🎯 Features

- ✅ 5-digit login verification
- ✅ 6-digit setup verification
- ✅ Email delivery via SMTP
- ✅ 10 backup codes
- ✅ Modern UI with Tailwind
- ✅ Toast notifications
- ✅ Error handling
- ✅ Rate limiting

## 📧 SMTP Providers

### Gmail (Easiest for Testing)
1. Enable 2-Step Verification
2. Get App Password: https://myaccount.google.com/apppasswords
3. Use in `.env.local`

### SendGrid (Recommended for Production)
1. Sign up at sendgrid.com
2. Create API key
3. Use as SMTP password

### AWS SES (If Using AWS)
1. Verify domain in SES
2. Get SMTP credentials
3. Configure in `.env.local`

## 🐛 Troubleshooting

### Email not sending?
```bash
npx ts-node scripts/test-email.ts
```

### Code not working?
- Check expiration (10 minutes)
- Check attempts (3 max)
- Request new code

### Database errors?
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'admin_2fa_codes';
```

## 📊 Database Schema

### admin table (new columns)
- `two_factor_enabled` - Boolean flag
- `two_factor_secret` - For TOTP (future)
- `backup_codes` - Array of hashed codes

### admin_2fa_codes table (new)
- `id` - UUID primary key
- `admin_id` - Foreign key to admin
- `code` - Hashed verification code
- `expires_at` - Expiration timestamp
- `used` - Usage flag
- `attempts` - Failed attempts counter
- `created_at` - Creation timestamp

## 🎉 Ready!

Your 2FA system is complete and ready to use. Follow the Quick Start guide to get started!

## 📞 Support

- Full docs: `2FA_SETUP_GUIDE.md`
- Quick start: `2FA_QUICK_START.md`
- Flow diagram: `2FA_FLOW_DIAGRAM.md`
- Checklist: `2FA_CHECKLIST.md`

---

**Implementation Date**: November 13, 2025  
**Status**: ✅ Complete  
**Version**: 1.0.0
