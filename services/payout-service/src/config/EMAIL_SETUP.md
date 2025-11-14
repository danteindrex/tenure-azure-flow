# Email/SMTP Configuration Guide

## Overview

The Payout Service uses SMTP (Simple Mail Transfer Protocol) to send email notifications to members and administrators throughout the payout process. The service is configured to use Gmail SMTP by default, but can be configured to work with any SMTP provider.

## Configuration

### Environment Variables

The SMTP configuration is loaded from the root `.env` file. Add the following variables:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
SMTP_TLS=true
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Home Solutions
```

### Gmail Setup

If using Gmail, you'll need to:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to Google Account Settings → Security
   - Under "2-Step Verification", click on "App passwords"
   - Generate a new app password for "Mail"
   - Use this password as `SMTP_PASS`

### Other SMTP Providers

The service works with any SMTP provider. Common configurations:

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

#### AWS SES
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

## Testing the Configuration

Run the test email script to verify your SMTP configuration:

```bash
cd services/payout-service
npm run test:email
```

This will:
1. Verify the SMTP connection
2. Send a test email to the configured `SMTP_USER` address
3. Display success/error messages

## Email Templates

Email templates are located in `src/templates/`. The notification service uses these templates to send:

- **Approval Requests** - Sent to administrators when a payout needs approval
- **Payout Approved** - Sent to members when their payout is approved
- **Payout Rejected** - Sent to members if their payout is rejected
- **Payment Confirmation** - Sent when payment is sent/completed
- **Membership Removal** - Sent when membership is removed after 12 months

## Usage in Code

### Sending a Simple Email

```typescript
import { sendEmail } from '../config/email';

await sendEmail({
  to: 'user@example.com',
  subject: 'Test Email',
  html: '<h1>Hello!</h1><p>This is a test email.</p>',
  text: 'Hello! This is a test email.',
});
```

### Using the Notification Service

```typescript
import { notificationService } from '../services/notification.service';

// Send approval request
await notificationService.sendApprovalRequest(
  adminId,
  payoutId,
  {
    userId: 'user-123',
    amount: 100000,
    queuePosition: 1,
    adminEmail: 'admin@example.com'
  }
);

// Send payout approved notification
await notificationService.sendPayoutApproved(
  payoutId,
  userId,
  {
    amount: 100000,
    approvalCount: 2,
    finalApprover: 'admin-456',
    userEmail: 'user@example.com'
  }
);
```

## Troubleshooting

### Connection Refused

If you get "Connection refused" errors:
- Check that `SMTP_HOST` and `SMTP_PORT` are correct
- Verify firewall settings allow outbound connections on the SMTP port
- Try using port 465 with `SMTP_SECURE=true` instead of 587

### Authentication Failed

If authentication fails:
- Verify `SMTP_USER` and `SMTP_PASS` are correct
- For Gmail, ensure you're using an App Password, not your regular password
- Check that 2FA is enabled on your Google account

### TLS/SSL Errors

If you get TLS/SSL errors:
- Try setting `SMTP_TLS=false`
- Or set `SMTP_SECURE=true` and use port 465
- For development, the service has `rejectUnauthorized: false` to allow self-signed certificates

### Emails Not Arriving

If emails aren't arriving:
- Check spam/junk folders
- Verify the `EMAIL_FROM` address is valid
- Check SMTP provider logs for delivery issues
- Ensure your SMTP provider allows sending from the configured address

## Security Best Practices

1. **Never commit credentials** - Keep `.env` files out of version control
2. **Use App Passwords** - Don't use your main email password
3. **Rotate credentials** - Change SMTP passwords periodically
4. **Monitor usage** - Watch for unusual sending patterns
5. **Rate limiting** - The service has built-in rate limiting to prevent abuse

## Production Considerations

For production deployments:

1. **Use a dedicated email service** - Consider SendGrid, Mailgun, or AWS SES for better deliverability
2. **Set up SPF/DKIM/DMARC** - Configure email authentication records
3. **Monitor bounce rates** - Track email delivery success
4. **Implement retry logic** - The service already retries failed emails
5. **Use environment-specific configs** - Different SMTP settings for dev/staging/prod

## Related Files

- `src/config/email.ts` - Email configuration and transporter setup
- `src/services/notification.service.ts` - Notification service implementation
- `src/scripts/test-email.ts` - Email testing script
- `.env.example` - Example environment configuration
