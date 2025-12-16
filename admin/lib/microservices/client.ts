export interface MicroserviceHealth {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number;
  lastCheck: string;
  version?: string;
  uptime?: number;
}

export interface QueueStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  waitingJobs: number;
  queues: Array<{
    name: string;
    jobs: number;
    processing: number;
    failed: number;
  }>;
}

export interface SubscriptionServiceStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  canceledSubscriptions: number;
  trialSubscriptions: number;
  revenue: {
    monthly: number;
    yearly: number;
    total: number;
  };
  plans: Array<{
    name: string;
    subscribers: number;
    revenue: number;
  }>;
}

class MicroserviceClient {
  private baseUrls: Record<string, string>;
  private apiKey: string;

  constructor() {
    this.baseUrls = {
      subscription: process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3001',
      queue: process.env.QUEUE_SERVICE_URL || 'http://localhost:3002',
      main: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    };
    this.apiKey = process.env.INTERNAL_API_KEY || '';
  }

  private async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...options.headers
    };

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async checkServiceHealth(service: string): Promise<MicroserviceHealth> {
    const startTime = Date.now();
    
    try {
      const url = `${this.baseUrls[service]}/health`;
      const data = await this.makeRequest(url);
      const responseTime = Date.now() - startTime;

      return {
        service,
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        version: data.version,
        uptime: data.uptime
      };
    } catch (error) {
      return {
        service,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString()
      };
    }
  }

  async getQueueStats(): Promise<QueueStats> {
    try {
      const data = await this.makeRequest(`${this.baseUrls.queue}/api/stats`);
      return data;
    } catch (error) {
      console.error('Error fetching queue stats:', error);
      // Return fallback data
      return {
        totalJobs: 0,
        activeJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        waitingJobs: 0,
        queues: []
      };
    }
  }

  async getSubscriptionStats(): Promise<SubscriptionServiceStats> {
    try {
      const data = await this.makeRequest(`${this.baseUrls.subscription}/api/stats`);
      return data;
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
      // Return fallback data
      return {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        canceledSubscriptions: 0,
        trialSubscriptions: 0,
        revenue: {
          monthly: 0,
          yearly: 0,
          total: 0
        },
        plans: []
      };
    }
  }

  async getAllServicesHealth(): Promise<MicroserviceHealth[]> {
    const services = Object.keys(this.baseUrls);
    const healthChecks = await Promise.allSettled(
      services.map(service => this.checkServiceHealth(service))
    );

    return healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          service: services[index],
          status: 'unknown' as const,
          responseTime: 0,
          lastCheck: new Date().toISOString()
        };
      }
    });
  }
}

export const microserviceClient = new MicroserviceClient();