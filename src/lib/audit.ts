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
  private sessionId: string;
  private static instance: AuditLogger;

  constructor() {
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
      const auditData = {
        ...entry,
        session_id: this.sessionId,
        user_id: entry.user_id,
        user_type: entry.user_type || 'guest'
      };

      // Fire-and-forget POST to the API route. We intentionally do not rethrow errors
      // so client code (page navigation, etc.) is not disrupted by logging failures.
      try {
        // Use a small timeout helper to avoid hangs in environments where fetch may stall.
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const signal = controller ? controller.signal : undefined;
        if (controller) {
          // Abort after 3 seconds
          setTimeout(() => controller.abort(), 3000);
        }

        // Note: do not await the fetch in a way that would allow exceptions to bubble
        // into the caller stack — handle errors locally.
        fetch('/api/audit/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(auditData),
          signal
        })
        .then(res => {
          if (!res.ok) {
            // Log non-OK responses but don't throw
            console.error('Failed to log audit entry via API, status:', res.status);
          }
        })
        .catch(err => {
          // Swallow network errors — best-effort logging only
          console.warn('Audit log network error (ignored):', err?.message || err);
        });
      } catch (e) {
        // Defensive: any unexpected error should not crash the app
        console.warn('Audit log failed to send (ignored):', e);
      }
    } catch (error) {
      // Final catch to ensure no exceptions escape this method
      console.warn('Unexpected error in audit logging (ignored):', error);
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

  // Query audit logs via API
  async getAuditLogs(filters: AuditLogFilters = {}) {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/audit/logs?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return { data: result.data || [], error: null };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return { data: [], error };
    }
  }

  // Get audit statistics via API
  async getAuditStats(startDate?: string, endDate?: string) {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`/api/audit/stats?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return { data: result.data || null, error: null };
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
