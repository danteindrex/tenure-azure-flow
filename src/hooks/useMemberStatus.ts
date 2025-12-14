import { useQuery } from '@tanstack/react-query';

interface MemberStatusData {
  memberStatusId: number | null;
  memberStatus: string;
  subscriptionStatusId: number | null;
  subscriptionStatus: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  isInGracePeriod: boolean;
  isFullyCanceled: boolean;
  canRejoin: boolean;
  canUndoCancel: boolean;
}

interface MemberStatusResponse {
  success: boolean;
  data: MemberStatusData;
}

const fetchMemberStatus = async (): Promise<MemberStatusResponse> => {
  const response = await fetch('/api/user/member-status', {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch member status');
  }

  return response.json();
};

export const useMemberStatus = () => {
  return useQuery({
    queryKey: ['memberStatus'],
    queryFn: fetchMemberStatus,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
};