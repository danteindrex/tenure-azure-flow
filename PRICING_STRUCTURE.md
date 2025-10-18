# Tenure Pricing Structure

## 💰 Payment Model

### Initial Payment: $300
- **Setup Fee**: $275
- **First Month**: $25
- **Total Initial**: $300 (paid once at signup)

### Recurring Payment: $25/month
- **Starts**: Month 2 (30 days after initial payment)
- **Amount**: $25 per month
- **Billing**: Automatic via Stripe subscription

## 🔄 Payment Timeline

```
Month 1: $300 (Setup $275 + First Month $25)
Month 2: $25
Month 3: $25
Month 4: $25
... and so on
```

## 🛠 Technical Implementation

### Stripe Configuration:
- **Mode**: `subscription` (with setup fee)
- **Initial Invoice**: $300 total
  - $275 setup fee (one-time)
  - $25 first month (subscription)
- **Recurring**: $25/month starting month 2

### Database Records:
- **Member Status**: Changes to 'Active' after initial payment
- **Financial Schedule**: Records $25 monthly billing
- **Payment Methods**: Stores subscription details
- **Queue Entry**: Added after successful payment

### User Experience:
1. **Signup**: User sees "$300 initial (includes first month) + $25/month"
2. **Checkout**: Stripe shows total $300 for first payment
3. **Confirmation**: User understands recurring $25/month starts next month
4. **Billing**: Automatic $25 charges every 30 days

## ✅ What User Gets for $300:
- ✅ Membership activation
- ✅ Queue position assignment
- ✅ First month of service included
- ✅ Access to member dashboard
- ✅ Automatic recurring billing setup

## 📋 Legal Agreements:
User must agree to:
- Terms & Conditions
- Payment Authorization for $300 initial + $25/month recurring
- Understanding that membership activates immediately
- Recurring billing starts month 2

This structure ensures clear pricing communication while properly handling both the setup fee and ongoing subscription in Stripe.