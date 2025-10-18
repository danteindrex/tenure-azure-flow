import { createClient } from '@supabase/supabase-js';

// Types for audit logging
export interface AuditLogEntry {
  user_id?: string;
  user_type: 'guest' | 'authenticated' | 'admin';
  session_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface AuditLogFilters {
  user_id?: string;
  user_type?: string;
  action?: string;
  resource_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

class AuditLogger {
  private supabase: any;
  private sessionId: string;
  private static instance: AuditLogger;

  constructor() {
    // Use existing Supabase client from window if available to avoid multiple instances
    if (typeof window !== 'undefined' && (window as any).__supabaseClient) {
      this.supabase = (window as any).__supabaseClient;
    } else {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientInfo() {
    if (typeof window === 'undefined') {
      return {
        user_agent: 'Server-side',
        ip_address: '127.0.0.1'
      };
    }

    return {
      user_agent: navigator.userAgent,
      ip_address: 'client-side' // Will be populated by server-side logging
    };
  }

  private async getLocationFromIP(ip: string) {
    try {
      // Using a free IP geolocation service (you might want to use a more reliable service)
      const response = await fetch(`http://ip-api.com/json/${ip}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        return {
          country: data.country,
          region: data.regionName,
          city: data.city,
          latitude: data.lat,
          longitude: data.lon
        };
      }
    } catch (error) {
      console.warn('Failed to get location from IP:', error);
    }
    return null;
  }

  async log(entry: Omit<AuditLogEntry, 'user_agent' | 'ip_address' | 'location'>) {
    try {
      // Get user's current session
      const { data: { session } } = await this.supabase.auth.getSession();
      
      const auditData = {
        ...entry,
        session_id: this.sessionId,
        user_id: session?.user?.id || entry.user_id,
        user_type: session?.user ? 'authenticated' : entry.user_type || 'guest'
      };

      // Use server-side API for better IP tracking
      const response = await fetch('/api/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auditData),
      });

      if (!response.ok) {
        console.error('Failed to log audit entry via API');
      }
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }

  // Convenience methods for common actions
  async logPageVisit(page: string, userId?: string) {
    await this.log({
      user_id: userId,
      user_type: userId ? 'authenticated' : 'guest',
      action: 'page_visit',
      resource_type: 'page',
      resource_id: page,
      details: { page }
    });
  }

  async logLogin(email: string, success: boolean, userId?: string) {
    await this.log({
      user_id: userId,
      user_type: userId ? 'authenticated' : 'guest',
      action: 'login_attempt',
      resource_type: 'auth',
      resource_id: email,
      details: { 
        email, 
        success,
        timestamp: new Date().toISOString()
      }
    });
  }

  async logLogout(userId: string) {
    await this.log({
      user_id: userId,
      user_type: 'authenticated',
      action: 'logout',
      resource_type: 'auth',
      details: { timestamp: new Date().toISOString() }
    });
  }

  async logSignup(email: string, success: boolean, userId?: string) {
    await this.log({
      user_id: userId,
      user_type: 'guest',
      action: 'signup_attempt',
      resource_type: 'auth',
      resource_id: email,
      details: { 
        email, 
        success,
        timestamp: new Date().toISOString()
      }
    });
  }

  async logProfileUpdate(userId: string, changes: Record<string, any>) {
    await this.log({
      user_id: userId,
      user_type: 'authenticated',
      action: 'profile_update',
      resource_type: 'profile',
      resource_id: userId,
      details: { changes, timestamp: new Date().toISOString() }
    });
  }

  async logError(error: string, userId?: string, context?: Record<string, any>) {
    await this.log({
      user_id: userId,
      user_type: userId ? 'authenticated' : 'guest',
      action: 'error',
      resource_type: 'system',
      details: { 
        error, 
        context,
        timestamp: new Date().toISOString()
      }
    });
  }

  async logApiCall(endpoint: string, method: string, statusCode: number, userId?: string) {
    await this.log({
      user_id: userId,
      user_type: userId ? 'authenticated' : 'guest',
      action: 'api_call',
      resource_type: 'api',
      resource_id: endpoint,
      details: { 
        endpoint, 
        method, 
        status_code: statusCode,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Query audit logs
  async getAuditLogs(filters: AuditLogFilters = {}) {
    try {
      let query = this.supabase
        .from('user_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.user_type) {
        query = query.eq('user_type', filters.user_type);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.resource_type) {
        query = query.eq('resource_type', filters.resource_type);
      }
      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Failed to fetch audit logs:', error);
        return { data: [], error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return { data: [], error };
    }
  }

  // Get audit statistics
  async getAuditStats(startDate?: string, endDate?: string) {
    try {
      let query = this.supabase
        .from('user_audit_logs')
        .select('action, user_type, created_at');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Failed to fetch audit stats:', error);
        return { data: null, error };
      }

      // Process data to get statistics
      const stats = {
        total_actions: data.length,
        actions_by_type: data.reduce((acc: any, log: any) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        }, {}),
        users_by_type: data.reduce((acc: any, log: any) => {
          acc[log.user_type] = (acc[log.user_type] || 0) + 1;
          return acc;
        }, {}),
        unique_users: new Set(data.map((log: any) => log.user_id).filter(Boolean)).size
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      return { data: null, error };
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Export convenience functions
export const logPageVisit = (page: string, userId?: string) => 
  auditLogger.logPageVisit(page, userId);

export const logLogin = (email: string, success: boolean, userId?: string) => 
  auditLogger.logLogin(email, success, userId);

export const logLogout = (userId: string) => 
  auditLogger.logLogout(userId);

export const logSignup = (email: string, success: boolean, userId?: string) => 
  auditLogger.logSignup(email, success, userId);

export const logProfileUpdate = (userId: string, changes: Record<string, any>) => 
  auditLogger.logProfileUpdate(userId, changes);

export const logError = (error: string, userId?: string, context?: Record<string, any>) => 
  auditLogger.logError(error, userId, context);

export const logApiCall = (endpoint: string, method: string, statusCode: number, userId?: string) => 
  auditLogger.logApiCall(endpoint, method, statusCode, userId);
