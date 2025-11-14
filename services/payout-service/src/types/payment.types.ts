/**
 * Payment Processing Types
 * 
 * Types for payment instructions and calculations
 */

export interface PayoutCalculation {
  grossAmount: number;
  retentionFee: number;
  taxWithholding: number;
  netAmount: number;
  breakdown: PayoutBreakdownItem[];
}

export interface PayoutBreakdownItem {
  description: string;
  amount: number;
  type?: 'credit' | 'debit';
}

export interface PaymentInstructions {
  payoutId: string;
  paymentMethod: 'ach' | 'check';
  amount: number;
  currency: string;
  recipient: RecipientDetails;
  bankDetails?: BankDetails;
  mailingAddress?: Address;
  instructionsPdfUrl?: string;
  generatedAt: Date;
  generatedBy: number;
}

export interface RecipientDetails {
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
}

export interface BankDetails {
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  bankName?: string;
  encrypted?: boolean;
}

export interface Address {
  streetAddress: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
}

export interface PaymentSentDetails {
  sentDate: Date;
  expectedArrivalDate: Date;
  trackingNumber?: string;
  notes?: string;
  sentBy: number;
}

export interface CompletionDetails {
  completedDate: Date;
  confirmationNumber?: string;
  receiptUrl: string;
  completedBy: number;
  notes?: string;
}

export interface PaymentError {
  errorCode: string;
  errorMessage: string;
  timestamp: Date;
  retryable: boolean;
  details?: any;
}

export interface PaymentStatusUpdate {
  payoutId: string;
  status: string;
  updatedBy: number;
  timestamp: Date;
  details?: any;
}

export interface ReceiptData {
  payoutId: string;
  userId: string;
  recipientName: string;
  grossAmount: number;
  retentionFee: number;
  taxWithholding: number;
  netAmount: number;
  paymentMethod: 'ach' | 'check';
  paymentDate: Date;
  breakdown: PayoutBreakdownItem[];
}

export interface PaymentMethodValidation {
  isValid: boolean;
  paymentMethod: 'ach' | 'check';
  errors: string[];
  warnings: string[];
  bankDetailsValid?: boolean;
  addressValid?: boolean;
}
