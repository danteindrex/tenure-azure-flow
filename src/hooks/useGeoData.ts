/**
 * Hooks for fetching geographic data (countries, states, dial codes)
 * Uses free, no-auth APIs via our backend endpoints
 */

import { useQuery } from '@tanstack/react-query';

export interface Country {
  name: string;
  code: string;        // ISO 3166-1 alpha-2 (e.g., "US")
  dialCode: string;    // e.g., "+1"
  flag: string;        // Flag emoji
}

export interface State {
  name: string;
  code: string;        // State/province code (e.g., "CA")
  countryCode: string;
}

interface CountriesResponse {
  success: boolean;
  countries: Country[];
  count?: number;
  error?: string;
}

interface StatesResponse {
  success: boolean;
  states: State[];
  countryCode: string;
  count?: number;
  error?: string;
}

/**
 * Fetch all countries with dial codes
 * Data from REST Countries API (https://restcountries.com/)
 */
export function useCountries() {
  return useQuery<Country[], Error>({
    queryKey: ['countries'],
    queryFn: async () => {
      const response = await fetch('/api/geo/countries');
      const data: CountriesResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch countries');
      }

      return data.countries;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000,    // 24 hours (formerly cacheTime)
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Fetch states/provinces for a specific country
 * Data from CountryStateCity API (https://countrystatecity.in/)
 */
export function useStates(countryCode: string = 'US') {
  return useQuery<State[], Error>({
    queryKey: ['states', countryCode],
    queryFn: async () => {
      const response = await fetch(`/api/geo/states?country=${countryCode}`);
      const data: StatesResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch states');
      }

      return data.states;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000,    // 24 hours
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: !!countryCode, // Only fetch when countryCode is provided
  });
}

/**
 * Get unique dial codes from countries list
 * Useful for phone number country code selector
 */
export function useDialCodes() {
  const { data: countries, isLoading, error } = useCountries();

  const dialCodes = countries
    ? [...new Map(
        countries
          .filter(c => c.dialCode)
          .map(c => [c.dialCode, { dialCode: c.dialCode, flag: c.flag, name: c.name, code: c.code }])
      ).values()]
        .sort((a, b) => {
          // Sort by dial code numerically
          const aNum = parseInt(a.dialCode.replace('+', ''));
          const bNum = parseInt(b.dialCode.replace('+', ''));
          return aNum - bNum;
        })
    : [];

  return {
    dialCodes,
    isLoading,
    error,
    // Helper to find country by dial code
    getCountryByDialCode: (dialCode: string) =>
      countries?.find(c => c.dialCode === dialCode),
  };
}

/**
 * Helper hook for formatted state options (for select dropdowns)
 */
export function useStateOptions(countryCode: string = 'US') {
  const { data: states, isLoading, error } = useStates(countryCode);

  const options = states?.map(state => ({
    value: state.code,
    label: state.name,
  })) || [];

  return {
    options,
    states,
    isLoading,
    error,
  };
}
