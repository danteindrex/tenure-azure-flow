'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStripe } from '@/lib/stripe';
import { SubscriptionAPI } from '@/lib/subscription-api';

export default function SubscribePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: Get actual member ID from auth context
  const memberId = 1;

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create checkout session
      const { data } = await SubscriptionAPI.createCheckoutSession({
        memberId,
        successUrl: `${window.location.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/subscribe?canceled=true`,
      });

      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message || 'Failed to start subscription process');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Join Home Solutions
          </h1>
          <p className="text-xl text-gray-300">
            Secure your spot in the queue and start earning rewards
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Subscription Plan Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="text-center mb-6">
              <div className="inline-block bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold mb-4">
                SUBSCRIPTION PLAN
              </div>
              <div className="text-6xl font-bold text-white mb-2">
                $325
              </div>
              <div className="text-gray-300 mb-4">First Month</div>
              <div className="text-3xl font-bold text-white mb-2">
                $25
              </div>
              <div className="text-gray-300">per month after</div>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start text-white">
                <svg className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Secure your position in the queue</span>
              </li>
              <li className="flex items-start text-white">
                <svg className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Track your tenure and progress</span>
              </li>
              <li className="flex items-start text-white">
                <svg className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Eligible for $100,000 payout</span>
              </li>
              <li className="flex items-start text-white">
                <svg className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Cancel anytime</span>
              </li>
            </ul>
          </div>

          {/* Payout Details Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6">
              How Payouts Work
            </h3>
            <div className="space-y-6 text-white">
              <div>
                <h4 className="font-semibold text-lg mb-2 text-purple-300">
                  💰 Payout Amount
                </h4>
                <p className="text-gray-300">
                  $100,000 per winner (minus $300 for next year renewal)
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-2 text-purple-300">
                  📅 Payout Criteria
                </h4>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Company reaches 12 months from production</li>
                  <li>• Company revenue exceeds $100,000</li>
                  <li>• Active subscription maintained</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-2 text-purple-300">
                  🏆 Winner Selection
                </h4>
                <p className="text-gray-300">
                  Winners are selected by queue position. First member to sign up gets first payout when criteria are met.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-2 text-purple-300">
                  📈 More Winners
                </h4>
                <p className="text-gray-300">
                  If company revenue exceeds $100k, more members can win. $200k = 2 winners, $300k = 3 winners, etc.
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500 text-white px-6 py-4 rounded-lg">
            {error}
          </div>
        )}

        <div className="text-center">
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-12 rounded-full text-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Subscribe Now'
            )}
          </button>

          <p className="text-gray-400 text-sm mt-4">
            Secure checkout powered by Stripe
          </p>
        </div>

        <div className="mt-12 text-center text-gray-400 text-sm">
          <p>
            By subscribing, you agree to our terms and conditions.
            <br />
            You can cancel your subscription at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
