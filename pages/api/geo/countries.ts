/**
 * API endpoint to fetch countries with dial codes from REST Countries API
 * Free, no authentication required
 * Source: https://restcountries.com/
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export interface Country {
  name: string;
  code: string;        // ISO 3166-1 alpha-2 (e.g., "US")
  dialCode: string;    // e.g., "+1"
  flag: string;        // Flag emoji
}

interface RestCountryResponse {
  name: {
    common: string;
    official: string;
  };
  cca2: string;
  idd?: {
    root?: string;
    suffixes?: string[];
  };
  flag: string;
}

// Cache for 24 hours
let cachedCountries: Country[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check cache
    if (cachedCountries && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return res.status(200).json({
        success: true,
        countries: cachedCountries,
        cached: true
      });
    }

    // Fetch from REST Countries API
    const response = await fetch(
      'https://restcountries.com/v3.1/all?fields=name,cca2,idd,flag',
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`REST Countries API returned ${response.status}`);
    }

    const data: RestCountryResponse[] = await response.json();

    // Transform and filter countries with dial codes
    const countries: Country[] = data
      .filter(country => country.idd?.root) // Only countries with dial codes
      .map(country => {
        // Build dial code from root + first suffix (if any)
        let dialCode = country.idd?.root || '';
        if (country.idd?.suffixes && country.idd.suffixes.length === 1) {
          dialCode += country.idd.suffixes[0];
        }
        // For countries with multiple suffixes (like +1 for US/Canada), use just the root

        return {
          name: country.name.common,
          code: country.cca2,
          dialCode: dialCode,
          flag: country.flag
        };
      })
      .filter(country => country.dialCode) // Ensure dial code exists
      .sort((a, b) => a.name.localeCompare(b.name));

    // Update cache
    cachedCountries = countries;
    cacheTimestamp = Date.now();

    // Set cache headers
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');

    return res.status(200).json({
      success: true,
      countries,
      count: countries.length
    });

  } catch (error) {
    console.error('Error fetching countries:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch countries data'
    });
  }
}
