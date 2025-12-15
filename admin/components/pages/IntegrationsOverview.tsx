'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  CreditCard, 
  MessageSquare, 
  Mail, 
  Server, 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  Users,
  TrendingUp
} from "lucide-react";

async function fetchIntegrationsData() {
  const [stripeRes, twilioRes, emailRes, servicesRes] = await Promise.allSettled([
    fetch('/api/analytics/stripe'),
    fetch('/api/analytics/twilio'),
    fetch('/api/analytics/email'),
    fetch('/api/microservices/health')
  ]);

  return {
    stripe: stripeRes.status === 'fulfilled' ? await stripeRes.value.json() : null,
    twilio: twilioRes.status === 'fulfilled' ? await twilioRes.value.json() : null,
    email: emailRes.status === 'fulfilled' ? await emailRes.value.json() : null,
    services: servicesRes.status === 'fulfilled' ? await servicesRes.value.json() : []
  };
}

export default function IntegrationsOverview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['integrations-data'],
    queryFn: fetchIntegrationsData,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Integrations</h1>
          <p className="text-muted-foreground">Loading integration status...</p>
        </div>
      </div>
    );
  }

  const integrations = [
    {
      name: 'Stripe',
      description: 'Payment processing and subscription management',
      icon: CreditCard,
      connected: data?.stripe && !data.stripe.error,
      status: data?.stripe && !data.stripe.error ? 'Connected' : 'Disconnected',
      stats: data?.stripe ? [
        { label: 'MRR', value: `$${data.stripe.mrr?.toLocaleString() || 0}` },
        { label: 'Active Subscriptions', value: data.stripe.subscriptionStats?.active || 0 },
        { label: 'Churn Rate', value: `${data.stripe.churnRate?.toFixed(1) || 0}%` }
      ] : []
    },
    {
      name: 'Twilio',
      description: 'SMS messaging and phone verification',
      icon: MessageSquare,
      connected: data?.twilio && !data.twilio.error,
      status: data?.twilio && !data.twilio.error ? 'Connected' : 'Disconnected',
      stats: data?.twilio ? [
        { label: 'Messages Sent', value: data.twilio.totalMessages || 0 },
        { label: 'Delivery Rate', value: `${((data.twilio.messageStats?.delivered / data.twilio.totalMessages) * 100 || 0).toFixed(1)}%` },
        { label: 'Total Cost', value: `$${data.twilio.costAnalysis?.totalCost?.toFixed(2) || 0}` }
      ] : []
    },
    {
      name: 'Email Service',
      description: 'SMTP email delivery and analytics',
      icon: Mail,
      connected: data?.email && !data.email.error,
      status: data?.email && !data.email.error ? 'Connected' : 'Disconnected',
      stats: data?.email ? [
        { label: 'Emails Sent', value: data.email.totalEmails || 0 },
        { label: 'Delivery Rate', value: `${((data.email.emailStats?.delivered / data.email.totalEmails) * 100 || 0).toFixed(1)}%` },
        { label: 'Failed', value: data.email.emailStats?.failed || 0 }
      ] : []
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Integrations</h1>
        <p className="text-muted-foreground">
          Monitor and manage your external service integrations
        </p>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration, index) => (
          <Card key={index} className="shadow-card hover:shadow-elevated transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <integration.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{integration.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{integration.description}</p>
                </div>
              </div>
              <Badge variant={integration.connected ? "default" : "destructive"}>
                {integration.connected ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                {integration.status}
              </Badge>
            </CardHeader>
            <CardContent>
              {integration.connected && integration.stats.length > 0 ? (
                <div className="space-y-3">
                  {integration.stats.map((stat, statIndex) => (
                    <div key={statIndex} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{stat.label}</span>
                      <span className="font-semibold">{stat.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {integration.connected ? 'No data available' : 'Service not connected'}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Microservices Health */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>Microservices Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data?.services?.map((service: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    service.status === 'healthy' ? 'bg-green-500' :
                    service.status === 'unhealthy' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <div>
                    <p className="font-medium capitalize">{service.service}</p>
                    <p className="text-sm text-muted-foreground">
                      {service.responseTime}ms response
                    </p>
                  </div>
                </div>
                <Badge variant={
                  service.status === 'healthy' ? 'default' :
                  service.status === 'unhealthy' ? 'destructive' : 'secondary'
                }>
                  {service.status}
                </Badge>
              </div>
            )) || (
              <p className="text-muted-foreground col-span-full text-center py-4">
                No microservices data available
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <button className="p-4 border rounded-lg hover:bg-accent transition-colors text-left">
              <DollarSign className="h-6 w-6 mb-2 text-primary" />
              <p className="font-medium">View Stripe Dashboard</p>
              <p className="text-sm text-muted-foreground">Manage payments</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-accent transition-colors text-left">
              <MessageSquare className="h-6 w-6 mb-2 text-primary" />
              <p className="font-medium">Twilio Console</p>
              <p className="text-sm text-muted-foreground">SMS analytics</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-accent transition-colors text-left">
              <Mail className="h-6 w-6 mb-2 text-primary" />
              <p className="font-medium">Email Logs</p>
              <p className="text-sm text-muted-foreground">Delivery reports</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-accent transition-colors text-left">
              <TrendingUp className="h-6 w-6 mb-2 text-primary" />
              <p className="font-medium">Analytics</p>
              <p className="text-sm text-muted-foreground">View all metrics</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}