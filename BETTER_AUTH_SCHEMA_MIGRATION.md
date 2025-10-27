# Better Auth Schema Migration Guide

## 🎯 Overview

This guide will help you safely add Better Auth tables to your existing database without losing any data.

## ✅ What This Migration Does

### **Safe Operations (No Data Loss)**
- ✅ **Adds NEW tables only** - No existing tables are modified
- ✅ **Uses IF NOT EXISTS** - Won't overwrite existing tables
- ✅ **Preserves all your data** - All existing tables remain untouched
- ✅ **Adds foreign key constraints safely** - Uses error handling for existing constraints

### **Tables to be Added**
1. `user` - Better Auth main user identity table
2. `session` - Better Auth session management
3. `account` - OAuth provider accounts (Google, etc.)
4. `verification` - Email/phone verification codes
5. `passkey` - WebAuthn passkey credentials
6. `two_factor` - Two-factor authentication settings
7. `organization` - Organization/team management
8. `organization_member` - Organization membership
9. `organization_invitation` - Organization invitations

## 🚀 Migration Steps

### Step 1: Backup Your Database (Recommended)
```bash
# Create a backup before migration (optional but recommended)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run the Migration
```bash
# Add Better Auth schemas to your database
npm run db:add-better-auth
```

### Step 3: Verify the Migration
The script will automatically:
- Check which tables already exist
- Create only missing tables
- Add foreign key constraints
- Verify all tables were created
- Show a summary of total tables

## 📋 Expected Output

```
🔄 Adding Better Auth schemas to database...

Existing Better Auth tables: none

Tables to create: user, session, account, verification, passkey, two_factor, organization, organization_member, organization_invitation

✅ Better Auth tables created successfully!

🔄 Adding foreign key constraints...
  ✅ Added constraint: session_userId_user_id_fk
  ✅ Added constraint: account_userId_user_id_fk
  ✅ Added constraint: passkey_userId_user_id_fk
  ✅ Added constraint: two_factor_userId_user_id_fk
  ✅ Added constraint: organization_member_organizationId_organization_id_fk
  ✅ Added constraint: organization_member_userId_user_id_fk
  ✅ Added constraint: organization_invitation_organizationId_organization_id_fk
  ✅ Added constraint: organization_invitation_inviterId_user_id_fk

✅ Verified Better Auth tables in database:
  - account
  - organization
  - organization_invitation
  - organization_member
  - passkey
  - session
  - two_factor
  - user
  - verification

📊 Total tables in database: 45

🎉 Better Auth schemas added successfully!
```

## 🔧 Alternative Methods

### Method 1: Using Drizzle Kit (Recommended)
```bash
# Generate migration files
npm run db:generate

# Review the generated migration files in drizzle/migrations/
# Then apply them
npm run db:push
```

### Method 2: Manual SQL Execution
If you prefer to run SQL manually, you can use the SQL from `scripts/apply-better-auth-tables.ts`.

## 🛡️ Safety Features

### **Data Protection**
- All SQL uses `CREATE TABLE IF NOT EXISTS`
- Foreign key constraints use error handling
- No `DROP` or `ALTER` statements on existing tables
- No data modification queries

### **Rollback Plan**
If you need to remove Better Auth tables (not recommended):
```sql
-- Only run this if you need to completely remove Better Auth tables
DROP TABLE IF EXISTS organization_invitation CASCADE;
DROP TABLE IF EXISTS organization_member CASCADE;
DROP TABLE IF EXISTS organization CASCADE;
DROP TABLE IF EXISTS two_factor CASCADE;
DROP TABLE IF EXISTS passkey CASCADE;
DROP TABLE IF EXISTS verification CASCADE;
DROP TABLE IF EXISTS account CASCADE;
DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS user CASCADE;
```

## 🔍 Troubleshooting

### **Issue: "Table already exists" errors**
This is normal and expected. The script uses `IF NOT EXISTS` so existing tables are safely skipped.

### **Issue: Foreign key constraint errors**
The script handles this automatically with error catching. Existing constraints are skipped.

### **Issue: Connection errors**
Make sure your `DATABASE_URL` in `.env.local` is correct and the database is accessible.

### **Issue: Permission errors**
Ensure your database user has CREATE TABLE permissions.

## 📊 Schema Overview

### **Better Auth Core Tables**
```
user (id, name, email, emailVerified, password, image, createdAt, updatedAt)
├── session (id, userId, expiresAt, ipAddress, userAgent, createdAt)
├── account (id, userId, accountId, providerId, accessToken, refreshToken, ...)
├── passkey (id, userId, name, credentialId, publicKey, counter, ...)
└── two_factor (id, userId, secret, backupCodes, verified, ...)
```

### **Organization Management Tables**
```
organization (id, name, slug, logo, metadata, createdAt, updatedAt)
├── organization_member (id, organizationId, userId, role, createdAt)
└── organization_invitation (id, organizationId, email, role, inviterId, status, token, ...)
```

### **Verification Table**
```
verification (id, identifier, value, expiresAt, createdAt)
```

## ✅ Post-Migration Checklist

- [ ] All Better Auth tables created successfully
- [ ] Foreign key constraints added
- [ ] No errors in migration output
- [ ] Existing data is intact
- [ ] Better Auth authentication works
- [ ] Passkey registration works
- [ ] 2FA setup works
- [ ] Organization features work

## 🎉 Next Steps

After successful migration:

1. **Test Better Auth Features**
   - Try the new signup flow
   - Test login with email/password
   - Test Google OAuth
   - Test passkey registration
   - Test 2FA setup

2. **Update Your Application**
   - Use the new Better Auth components
   - Update authentication flows
   - Test all security features

3. **Monitor and Optimize**
   - Check database performance
   - Monitor authentication metrics
   - Optimize queries if needed

The migration is designed to be safe and reversible. Your existing data and functionality will remain completely intact!