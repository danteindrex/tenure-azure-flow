import { useQuery } from '@tanstack/react-query';

interface StatusValue {
  id: number;
  code: string;
  displayName: string;
  color: string;
  categoryCode: string;
  categoryName: string;
  sortOrder: number;
  isDefault: boolean;
  isTerminal: boolean;
}

interface StatusMap {
  [code: string]: {
    displayName: string;
    color: string;
    categoryCode: string;
  };
}

interface StatusValuesResponse {
  success: boolean;
  data: {
    statuses: StatusValue[];
    statusMap: StatusMap;
  };
}

/**
 * Hook to fetch status values with colors from the database
 * @param category - Optional category code to filter (e.g., 'member_eligibility')
 */
export const useStatusValues = (category?: string) => {
  return useQuery<StatusValuesResponse>({
    queryKey: ['statusValues', category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category) {
        params.append('category', category);
      }
      const url = `/api/status-values${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch status values');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - status values rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

/**
 * Get the color for a status code
 */
export const getStatusColor = (statusMap: StatusMap | undefined, code: string): string => {
  if (!statusMap || !code) return '#6B7280'; // Default gray
  return statusMap[code]?.color || '#6B7280';
};

/**
 * Get the display name for a status code
 */
export const getStatusDisplayName = (statusMap: StatusMap | undefined, code: string): string => {
  if (!statusMap || !code) return code;
  return statusMap[code]?.displayName || code;
};
