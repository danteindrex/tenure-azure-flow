/**
 * API endpoint to fetch states/provinces for a country
 * Uses dr5hn's open-source countries-states-cities database (free, no auth)
 * Source: https://github.com/dr5hn/countries-states-cities-database
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export interface State {
  name: string;
  code: string;  // State/province code (e.g., "CA" for California)
  countryCode: string;
}

interface GithubState {
  id: number;
  name: string;
  country_code: string;
  iso2: string;
  type: string;
  latitude: string;
  longitude: string;
}

// Cache for all states data (loaded once)
let allStatesCache: GithubState[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function loadStatesData(): Promise<GithubState[]> {
  // Check if cache is valid
  if (allStatesCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return allStatesCache;
  }

  // Fetch from GitHub raw content (free, no auth required)
  const response = await fetch(
    'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/states.json',
    {
      headers: {
        'Accept': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}`);
  }

  allStatesCache = await response.json();
  cacheTimestamp = Date.now();
  return allStatesCache!;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { country } = req.query;
  const countryCode = (typeof country === 'string' ? country : 'US').toUpperCase();

  try {
    // Load all states data
    const allStates = await loadStatesData();

    // Filter states for the requested country
    const countryStates = allStates
      .filter(state => state.country_code === countryCode)
      .map(state => ({
        name: state.name,
        code: state.iso2 || state.name.substring(0, 3).toUpperCase(),
        countryCode: countryCode
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Set cache headers
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');

    return res.status(200).json({
      success: true,
      states: countryStates,
      countryCode,
      count: countryStates.length
    });

  } catch (error) {
    console.error(`Error fetching states for ${countryCode}:`, error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch states data',
      countryCode
    });
  }
}
