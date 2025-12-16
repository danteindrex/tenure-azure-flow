import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // Get recent user activities
    const { data: userActivities } = await supabaseAdmin
      .from('users')
      .select('id, name, email, created_at, updated_at, status, last_active')
      .order('updated_at', { ascending: false })
      .limit(20);

  // Get recent user audit logs
  const { data: userAuditLogs } = await supabaseAdmin
    .from('user_audit_logs')
    .select(`
      id,
      user_id,
      entity_type,
      entity_id,
      action,
      success,
      error_message,
      metadata,
      user_agent,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(100);

    // Get recent transactions
    const { data: recentTransactions } = await supabaseAdmin
      .from('transactions')
      .select(`
        *,
        users(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get recent subscriptions
    const { data: recentSubscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        *,
        users(name, email)
      `)
      .order('updated_at', { ascending: false })
      .limit(10);

    // Combine and format audit logs
    const auditLogs = [];

    // User activities
    userActivities?.forEach(user => {
      if (user.created_at === user.updated_at) {
        auditLogs.push({
          id: `user-signup-${user.id}`,
          timestamp: user.created_at,
          user: user.name || user.email,
          action: 'Member Sign-up',
          details: `New member registration completed`,
          status: 'success',
          type: 'user'
        });
      } else {
        auditLogs.push({
          id: `user-update-${user.id}`,
          timestamp: user.updated_at,
          user: user.name || user.email,
          action: 'Profile Updated',
          details: `Member profile information updated`,
          status: user.status === 'suspended' ? 'warning' : 'success',
          type: 'user'
        });
      }

      if (user.last_active) {
        auditLogs.push({
          id: `user-activity-${user.id}`,
          timestamp: user.last_active,
          user: user.name || user.email,
          action: 'User Activity',
          details: `Member last seen`,
          status: 'info',
          type: 'activity'
        });
      }
    });

    // Transaction activities
    recentTransactions?.forEach(transaction => {
      auditLogs.push({
        id: `transaction-${transaction.id}`,
        timestamp: transaction.created_at,
        user: transaction.users?.name || transaction.users?.email || 'Unknown',
        action: transaction.status === 'completed' ? 'Payment Received' : 
                transaction.status === 'failed' ? 'Payment Failed' : 'Payment Pending',
        details: `${transaction.type} of ${transaction.currency} ${transaction.amount} - ${transaction.description || 'No description'}`,
        status: transaction.status === 'completed' ? 'success' : 
               transaction.status === 'failed' ? 'warning' : 'info',
        type: 'transaction'
      });
    });

  // User audit log activities
  userAuditLogs?.forEach((log) => {
    auditLogs.push({
      id: `user-audit-${log.id}`,
      timestamp: log.created_at,
      user: log.user_agent || log.user_id || 'Unknown',
      action: log.action,
      details: `${log.entity_type || 'entity'} ${log.entity_id || ''}`.trim(),
      status: log.success === false ? 'warning' : 'success',
      type: 'user_audit'
    });
  });

    // Subscription activities
    recentSubscriptions?.forEach(subscription => {
      auditLogs.push({
        id: `subscription-${subscription.id}`,
        timestamp: subscription.updated_at,
        user: subscription.users?.name || subscription.users?.email || 'Unknown',
        action: 'Subscription Updated',
        details: `Subscription status changed to ${subscription.status}`,
        status: subscription.status === 'active' ? 'success' : 'warning',
        type: 'subscription'
      });
    });

    // Sort by timestamp
    auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply filters
    let filteredLogs = auditLogs;
    
    if (action && action !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }

    if (search) {
      filteredLogs = filteredLogs.filter(log => 
        log.user.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.details.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Paginate
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    return NextResponse.json({
      logs: paginatedLogs,
      pagination: {
        page,
        pages: Math.ceil(filteredLogs.length / limit),
        total: filteredLogs.length,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}