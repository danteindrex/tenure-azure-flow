import { loadStripe, Stripe } from '@stripe/stripe-js';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  'pk_test_51S8VuuIIJqwyg6uVByheEd6oUTERccbybgHSedEIHjqrlOuuX9uW3Jo3jTrwGW0150EK6TMZjEZorEL6Ulr4S1ma005ZxJ9Ak6';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};
