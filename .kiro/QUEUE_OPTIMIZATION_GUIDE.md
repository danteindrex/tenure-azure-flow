# Queue Optimization: Nearest 5 Users Implementation

## Overview
Configured the tenure queue service to return only the nearest 5 users around the current user instead of all users. This reduces data transfer and improves performance.

## How It Works

### Backend Logic (Tenure Queue Service)
**File:** `services/Tenure-queue/src/controllers/queueController.ts`

The `getQueue` method now accepts a `currentPosition` query parameter:

```typescript
// If currentPosition is provided, return only nearest 5 users (2 above, current, 2 below)
if (currentPosition) {
  const currentPos = parseInt(currentPosition as string);
  const startPos = Math.max(1, currentPos - 2);
  const endPos = Math.min(totalCount, currentPos + 2);
  
  queueData = queueData.filter((member: any) => 
    member.queue_position >= startPos && member.queue_position <= endPos
  );
}
```

**Behavior:**
- If user is at position 3: Shows positions 1, 2, 3, 4, 5
- If user is at position 1: Shows positions 1, 2, 3, 4, 5
- If user is at position 50: Shows positions 48, 49, 50, 51, 52
- If user is at last position: Shows last 5 positions

### Frontend Implementation

#### Step 1: Hook Enhancement
**File:** `src/hooks/useQueueData.ts`

Updated to accept optional `currentPosition` parameter:

```typescript
export const useQueueData = (currentPosition?: number) => {
  const query = useQuery<QueueResponse>({
    queryKey: ['queue', currentPosition],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentPosition) {
        params.append('currentPosition', currentPosition.toString());
      }
      
      const queryString = params.toString();
      const url = `/api/queue${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, { credentials: 'include' });
      // ...
    },
    // ...
  });
  // ...
};
```

#### Step 2: Dashboard Component
**File:** `src/pages/DashboardSimple.tsx`

Two-step fetching process:

1. **First fetch:** Get all queue data to find current user's position
```typescript
const { data: allQueueData, isLoading: isLoadingAllQueue } = useQueueData();
```

2. **Extract position:**
```typescript
const currentUserPosition = useMemo(() => {
  if (!user?.id || !allQueueData?.data?.queue) return null;
  const userInQueue = allQueueData.data.queue.find((q: any) => q.user_id === user.id);
  return userInQueue?.queue_position || null;
}, [allQueueData, user?.id]);
```

3. **Second fetch:** Get nearest 5 users based on position
```typescript
const { data: queueData, isLoading: isLoadingQueue, isFetching: isFetchingQueue, refreshQueue } = useQueueData(currentUserPosition || undefined);
```

## API Endpoint

### Request
```
GET /api/queue?currentPosition=3
```

### Response
```json
{
  "success": true,
  "data": {
    "queue": [
      { "queue_position": 1, "user_id": "user1", "id": 1 },
      { "queue_position": 2, "user_id": "user2", "id": 2 },
      { "queue_position": 3, "user_id": "user3", "id": 3 },
      { "queue_position": 4, "user_id": "user4", "id": 4 },
      { "queue_position": 5, "user_id": "user5", "id": 5 }
    ],
    "statistics": { /* ... */ },
    "pagination": {
      "total": 150,
      "limit": 5,
      "offset": 0,
      "filtered": true
    }
  }
}
```

## Benefits

1. **Reduced Data Transfer:** Only 5 users instead of all users
2. **Faster Load Times:** Less data to process and render
3. **Better Performance:** Smaller payload reduces network latency
4. **Scalability:** Works efficiently even with thousands of queue members
5. **Privacy:** Still maintains privacy by not showing all user positions

## Edge Cases Handled

- **Position 1:** Shows positions 1-5 (not negative positions)
- **Last Position:** Shows last 5 positions (not beyond queue length)
- **No Position:** Falls back to showing first 5 users
- **User Not in Queue:** Shows first 5 users

## Backward Compatibility

The implementation maintains backward compatibility:
- Without `currentPosition` parameter: Returns paginated results (old behavior)
- With `currentPosition` parameter: Returns nearest 5 users (new behavior)

## Testing

To test the implementation:

```bash
# Get nearest 5 users around position 3
curl "http://localhost:3000/api/queue?currentPosition=3"

# Get all users with pagination (old behavior)
curl "http://localhost:3000/api/queue?limit=10&offset=0"
```
