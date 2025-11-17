/**
 * Stripe Price Configuration
 *
 * These price IDs should be created ONCE in your Stripe Dashboard or via migration script.
 * DO NOT create new prices for each customer - reuse these IDs.
 *
 * To create these prices:
 * 1. Go to Stripe Dashboard → Products
 * 2. Create a product called "Tenure Subscription"
 * 3. Add two prices:
 *    - Monthly: $25/month
 *    - Annual: $300/year
 * 4. Copy the price IDs (they start with "price_") and update this file
 *
 * OR use the migration script: npm run stripe:create-prices
 */

export const STRIPE_PRICE_IDS = {
  // TODO: Replace these with your actual Stripe price IDs after creating them
  // These are placeholder IDs - you MUST update them
  MONTHLY: process.env.STRIPE_MONTHLY_PRICE_ID || 'price_REPLACE_WITH_MONTHLY_PRICE_ID',
  ANNUAL: process.env.STRIPE_ANNUAL_PRICE_ID || 'price_REPLACE_WITH_ANNUAL_PRICE_ID',
} as const;

export const STRIPE_PRICE_AMOUNTS = {
  MONTHLY: 25.00, // $25/month
  ANNUAL: 300.00, // $300/year
} as const;

/**
 * Validates that Stripe price IDs are configured
 * Throws error if placeholder IDs are still being used
 */
export function validateStripePriceIds(): void {
  if (STRIPE_PRICE_IDS.MONTHLY.includes('REPLACE_WITH')) {
    throw new Error(
      'STRIPE_MONTHLY_PRICE_ID is not configured. ' +
      'Please create a monthly price in Stripe Dashboard and set STRIPE_MONTHLY_PRICE_ID in .env'
    );
  }

  if (STRIPE_PRICE_IDS.ANNUAL.includes('REPLACE_WITH')) {
    throw new Error(
      'STRIPE_ANNUAL_PRICE_ID is not configured. ' +
      'Please create an annual price in Stripe Dashboard and set STRIPE_ANNUAL_PRICE_ID in .env'
    );
  }
}
