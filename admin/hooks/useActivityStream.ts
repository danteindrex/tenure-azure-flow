import { useEffect, useState, useCallback } from 'react';

interface Activity {
  id: number;
  admin_id: number;
  session_id?: string | null;
  action: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  error_message?: string | null;
  metadata: any;
  created_at: string;
  admin: {
    id: number;
    email: string;
    name: string;
  };
}

export function useActivityStream() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addActivity = useCallback((activity: Activity) => {
    setActivities((prev) => [activity, ...prev].slice(0, 100)); // Keep last 100
  }, []);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        eventSource = new EventSource('/api/admin-sessions/activity-stream');

        eventSource.onopen = () => {
          console.log('Activity stream connected');
          setIsConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'connected') {
              console.log('Stream connection established');
            } else if (data.type === 'activity') {
              addActivity(data.data);
            }
          } catch (err) {
            console.error('Failed to parse activity:', err);
          }
        };

        eventSource.onerror = (err) => {
          console.error('Activity stream error:', err);
          setIsConnected(false);
          setError('Connection lost. Reconnecting...');
          
          eventSource?.close();
          
          // Reconnect after 5 seconds
          reconnectTimeout = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, 5000);
        };
      } catch (err) {
        console.error('Failed to create EventSource:', err);
        setError('Failed to connect to activity stream');
      }
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [addActivity]);

  return {
    activities,
    isConnected,
    error,
  };
}
