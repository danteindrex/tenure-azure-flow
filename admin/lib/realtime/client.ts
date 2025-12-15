'use client'

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface RealtimeData {
  users: {
    total: number;
    online: number;
    newToday: number;
  };
  transactions: {
    total: number;
    todayAmount: number;
    pendingCount: number;
  };
  subscriptions: {
    active: number;
    newToday: number;
    churnToday: number;
  };
  system: {
    serverLoad: number;
    responseTime: number;
    errorRate: number;
  };
}

export function useRealtimeData() {
  const [data, setData] = useState<RealtimeData>({
    users: { total: 0, online: 0, newToday: 0 },
    transactions: { total: 0, todayAmount: 0, pendingCount: 0 },
    subscriptions: { active: 0, newToday: 0, churnToday: 0 },
    system: { serverLoad: 0, responseTime: 0, errorRate: 0 }
  });
  
  const [isConnected, setIsConnected] = useState(false);

  const fetchUserStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: totalUsers } = await supabase
        .from('users')
        .select('id', { count: 'exact' });

      const { data: newUsers } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .gte('created_at', today);

      // Simulate online users (in real app, you'd track this)
      const onlineUsers = Math.floor((totalUsers?.length || 0) * 0.1);

      setData(prev => ({
        ...prev,
        users: {
          total: totalUsers?.length || 0,
          online: onlineUsers,
          newToday: newUsers?.length || 0
        }
      }));
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchTransactionStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: totalTransactions } = await supabase
        .from('user_payments')
        .select('id', { count: 'exact' });

      const { data: todayTransactions } = await supabase
        .from('user_payments')
        .select('amount')
        .gte('created_at', today);

      const { data: pendingTransactions } = await supabase
        .from('user_payments')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');

      const todayAmount = todayTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      setData(prev => ({
        ...prev,
        transactions: {
          total: totalTransactions?.length || 0,
          todayAmount,
          pendingCount: pendingTransactions?.length || 0
        }
      }));
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
    }
  };

  const fetchSubscriptionStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: activeSubscriptions } = await supabase
        .from('user_subscriptions')
        .select('id', { count: 'exact' })
        .eq('status', 'active');

      const { data: newSubscriptions } = await supabase
        .from('user_subscriptions')
        .select('id', { count: 'exact' })
        .gte('created_at', today);

      const { data: canceledToday } = await supabase
        .from('user_subscriptions')
        .select('id', { count: 'exact' })
        .eq('status', 'canceled')
        .gte('updated_at', today);

      setData(prev => ({
        ...prev,
        subscriptions: {
          active: activeSubscriptions?.length || 0,
          newToday: newSubscriptions?.length || 0,
          churnToday: canceledToday?.length || 0
        }
      }));
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
    }
  };

  const fetchSystemStats = () => {
    // Simulate system metrics (in real app, you'd get these from monitoring)
    setData(prev => ({
      ...prev,
      system: {
        serverLoad: Math.random() * 100,
        responseTime: Math.random() * 500 + 50,
        errorRate: Math.random() * 5
      }
    }));
  };

  const fetchAllStats = useCallback(() => {
    fetchUserStats();
    fetchTransactionStats();
    fetchSubscriptionStats();
    fetchSystemStats();
  }, []);

  useEffect(() => {
    // Subscribe to real-time changes in Supabase
    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          console.log('User change received:', payload);
          // Update user stats
          fetchUserStats();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_payments' },
        (payload) => {
          console.log('Transaction change received:', payload);
          // Update transaction stats
          fetchTransactionStats();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_subscriptions' },
        (payload) => {
          console.log('Subscription change received:', payload);
          // Update subscription stats
          fetchSubscriptionStats();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Initial data fetch
    fetchAllStats();

    // Set up periodic updates for system metrics
    const systemInterval = setInterval(fetchSystemStats, 30000); // Every 30 seconds

    return () => {
      supabase.removeChannel(channel);
      clearInterval(systemInterval);
    };
  }, [fetchAllStats]);

  return { data, isConnected, refetch: fetchAllStats };
}