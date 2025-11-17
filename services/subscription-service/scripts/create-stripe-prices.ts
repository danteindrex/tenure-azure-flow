/**
 * Script to create reusable Stripe prices
 *
 * Run this ONCE to create the monthly and annual prices in Stripe.
 * This will output the price IDs that you need to add to your .env file.
 *
 * Usage:
 *   npx ts-node scripts/create-stripe-prices.ts
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
  typescript: true,
});

async function createStripePrices() {
  console.log('🔧 Creating Stripe prices for Tenure Subscription...\n');

  try {
    // Check if prices already exist
    const existingPrices = await stripe.prices.list({
      limit: 100,
      active: true,
    });

    const monthlyExists = existingPrices.data.find(
      p => p.recurring?.interval === 'month' && p.unit_amount === 2500
    );

    const annualExists = existingPrices.data.find(
      p => p.recurring?.interval === 'year' && p.unit_amount === 30000
    );

    let monthlyPriceId: string;
    let annualPriceId: string;

    // Create monthly price if it doesn't exist
    if (monthlyExists) {
      console.log('✅ Monthly price already exists:', monthlyExists.id);
      monthlyPriceId = monthlyExists.id;
    } else {
      const monthlyPrice = await stripe.prices.create({
        currency: 'usd',
        unit_amount: 2500, // $25.00
        recurring: {
          interval: 'month',
        },
        product_data: {
          name: 'Tenure Monthly Subscription',
        },
      });
      console.log('✅ Created monthly price:', monthlyPrice.id);
      monthlyPriceId = monthlyPrice.id;
    }

    // Create annual price if it doesn't exist
    if (annualExists) {
      console.log('✅ Annual price already exists:', annualExists.id);
      annualPriceId = annualExists.id;
    } else {
      const annualPrice = await stripe.prices.create({
        currency: 'usd',
        unit_amount: 30000, // $300.00
        recurring: {
          interval: 'year',
        },
        product_data: {
          name: 'Tenure Annual Subscription',
        },
      });
      console.log('✅ Created annual price:', annualPrice.id);
      annualPriceId = annualPrice.id;
    }

    console.log('\n📋 Add these to your .env file:\n');
    console.log(`STRIPE_MONTHLY_PRICE_ID=${monthlyPriceId}`);
    console.log(`STRIPE_ANNUAL_PRICE_ID=${annualPriceId}`);
    console.log('\n✅ Done! Prices are ready to use.\n');

  } catch (error) {
    console.error('❌ Error creating prices:', error);
    process.exit(1);
  }
}

createStripePrices();
