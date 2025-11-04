# Terms & Conditions Implementation

## Overview
Comprehensive Terms & Conditions page has been created with two primary consent blocks covering financial commitments and termination policies.

## Files Created/Modified

### 1. New Terms & Conditions Page
**File**: [src/pages/TermsAndConditions.tsx](../src/pages/TermsAndConditions.tsx)

A comprehensive, professionally formatted page containing:

#### Section 1: Membership Fee Acknowledgment (Consent Block A)
- **Non-Refundable Signup Fee**: $300.00 USD one-time payment
  - Establishes tenure start timestamp
  - Not contingent on future service delivery
  - No refunds under any circumstances:
    - Voluntary cancellation
    - Suspension/termination
    - Failure to receive services
    - Change of mind

- **Monthly Membership Fee**: $25.00 USD recurring
  - Charged every 30 days
  - First month due immediately
  - Automatic billing on same day each month

- **Payment Authorization**: Explicit authorization to charge payment method

#### Section 2: Continuation and Termination Policy (Consent Block B)
- **Active Status Requirements**: Contingent on timely $25 monthly payment

- **Immediate Suspension (2.1)**:
  - Triggered by any payment failure
  - Queue entry loses active status
  - No services during suspension
  - Email notification sent

- **30-Day Termination Policy (2.2)**:
  - Permanent termination if payment not made within 30 days
  - Queue entries permanently marked inactive
  - **Queue position lost permanently**
  - No refunds issued

- **Re-entry After Termination (2.3)**:
  - Full new signup required
  - Must pay $300 signup fee again
  - New tenure timestamp assigned
  - Start at back of queue

- **Voluntary Cancellation (2.4)**:
  - Cancel at end of billing period
  - No refunds for past payments
  - Queue position permanently lost

#### Section 3: Membership Queue System
- Queue based on tenure start timestamp
- Active status required for queue eligibility
- Service delivery dependent on queue position
- No guarantees on delivery timelines

#### Section 4: Additional Terms
- Modification rights (30-day notice)
- Contact information requirements
- Data protection acknowledgment
- Governing law

#### Final Acknowledgment Section
Comprehensive checklist confirming user understanding of:
- ✓ All terms read and understood
- ✓ $300 non-refundable signup fee consent
- ✓ $25 recurring monthly fee consent
- ✓ Suspension and 30-day termination policy
- ✓ Permanent queue position loss
- ✓ Automatic recurring charges authorization

### 2. Updated SignUp Page Links
**File**: [src/pages/SignUp.tsx](../src/pages/SignUp.tsx)

#### Step 1 - Initial Terms Agreement (Line 1531-1537)
```tsx
<a
  href="/TermsAndConditions"
  target="_blank"
  rel="noopener noreferrer"
  className="text-accent hover:text-accent/80 hover:underline transition-colors"
>
  Terms & Conditions
</a>
```

#### Step 5 - Payment Consent (Lines 2082-2091)
```tsx
I explicitly consent to the payment of the
<strong>non-refundable $300 signup fee</strong> and the
<strong>recurring $25 monthly membership fee</strong> as outlined in the{" "}
<a
  href="/TermsAndConditions"
  target="_blank"
  rel="noopener noreferrer"
  className="text-accent hover:text-accent/80 hover:underline font-semibold"
  onClick={(e) => e.stopPropagation()}
>
  Terms & Conditions
</a>.
```

## User Experience Flow

### Step 1: Account Creation
1. User sees checkbox: "I agree to the Terms & Conditions and Privacy Policy"
2. "Terms & Conditions" is a clickable link
3. Opens in new tab to review full terms
4. User must check box to proceed

### Step 5: Payment Consent
1. User sees detailed fee breakdown:
   - **Non-refundable Signup Fee**: $300 (One-time)
   - **Recurring Monthly Membership Fee**: $25 (Starting month 2)
2. Payment consent checkbox includes link to full Terms
3. User must explicitly consent to proceed
4. Payment button disabled until consent given

## Key Features

### Visual Design
- ✅ Sticky header with back button
- ✅ Card-based layout with proper spacing
- ✅ Color-coded sections:
  - 🔴 Red: Critical termination policies
  - 🟡 Yellow/Orange: Important warnings
  - 🟢 Green: Voluntary actions
  - 🔵 Blue (Accent): Financial terms
- ✅ CheckCircle icons for each major section
- ✅ Responsive design for all screen sizes
- ✅ Dark mode support via theme context

### Content Structure
1. **Clear hierarchy**: Numbered sections with subsections
2. **Visual emphasis**: Bold text for critical amounts and terms
3. **Highlighted boxes**: Color-coded for different types of information
4. **Comprehensive coverage**: All policy aspects explained
5. **Legal protection**: Explicit consent tracking

### Accessibility
- Proper semantic HTML structure
- ARIA-compliant components
- Keyboard navigation support
- Screen reader friendly
- High contrast text

## Legal Compliance

### Explicit Consent Requirements
✅ **Financial Commitments**:
- Non-refundable $300 signup fee
- Recurring $25 monthly membership fee
- Automatic payment authorization

✅ **Policy Acknowledgments**:
- Suspension policy (immediate)
- 30-day termination policy
- Permanent queue position loss
- No refund policy
- Re-entry requirements

✅ **User Rights**:
- Voluntary cancellation option
- Contact information requirements
- Data protection notice
- Modification notification policy

### Documentation Trail
- Terms displayed before signup
- Link accessible at Step 1 (account creation)
- Link accessible at Step 5 (payment)
- Checkboxes require explicit user action
- Timestamp: Last Updated date displayed

## Technical Implementation

### Route Configuration
- **URL**: `/TermsAndConditions`
- **Component**: `TermsAndConditions.tsx`
- **Opens in**: New tab (`target="_blank"`)
- **Security**: `rel="noopener noreferrer"`

### State Management
- Uses Next.js router for navigation
- Theme context for dark mode support
- No additional state required (static content)

### Styling
- Tailwind CSS classes
- Shadcn/ui components (Card, Button)
- Lucide React icons
- Consistent with app theme

## Testing Checklist

- [ ] Terms page loads correctly
- [ ] Back button returns to previous page
- [ ] Links open in new tab
- [ ] All sections visible and readable
- [ ] Dark mode styling works
- [ ] Mobile responsive layout
- [ ] Step 1 link works
- [ ] Step 5 link works
- [ ] Payment button disabled without consent
- [ ] Consent validation works

## Future Enhancements

1. **Version Control**: Track terms changes and require re-acceptance
2. **Acceptance Logging**: Store timestamp of user acceptance in database
3. **Privacy Policy**: Create separate privacy policy page
4. **PDF Export**: Allow users to download terms as PDF
5. **Email Confirmation**: Send terms copy to user's email
6. **Multi-language**: Support for multiple languages

## Related Documentation

- [Payment Flow Diagram](./payment-flow-diagram.md)
- [SignUp Component](../src/pages/SignUp.tsx)
- Database schema for user agreements tracking

---

**Last Updated**: November 4, 2025
**Version**: 1.0
