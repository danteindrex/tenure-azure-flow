'use client'

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Monitor, Smartphone, Tablet, Globe, Clock, XCircle, RefreshCw, Activity, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAdminUser } from "@/hooks/useAdminUser";

async function fetchSessions(activeOnly = false) {
  const params = new URLSearchParams();
  if (activeOnly) params.append('active_only', 'true');
  
  const response = await fetch(`/api/admin-sessions?${params}`);
  if (!response.ok) throw new Error('Failed to fetch sessions');
  return response.json();
}

async function invalidateSession(sessionId: string) {
  const response = await fetch(`/api/admin-sessions?session_id=${sessionId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to invalidate session');
  return response.json();
}

async function cleanupSessions() {
  const response = await fetch('/api/admin-sessions/cleanup', {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to cleanup sessions');
  return response.json();
}

export default function SessionsManagement() {
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const queryClient = useQueryClient();
  const { adminUser } = useAdminUser();
  const isSuperAdmin = adminUser?.role === 'super_admin';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-sessions', showActiveOnly],
    queryFn: async () => {
      console.log('Fetching sessions, activeOnly:', showActiveOnly);
      const result = await fetchSessions(showActiveOnly);
      console.log('Sessions fetched:', result);
      return result;
    },
    refetchInterval: 30000,
  });

  const invalidateMutation = useMutation({
    mutationFn: invalidateSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      toast.success('Session invalidated successfully!');
    },
    onError: () => {
      toast.error('Failed to invalidate session');
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: cleanupSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      toast.success('Expired sessions cleaned up!');
    },
    onError: () => {
      toast.error('Failed to cleanup sessions');
    },
  });

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
      return <Smartphone className="h-4 w-4" />;
    } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      return <Tablet className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const getBrowserName = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground text-red-500">Error loading sessions.</p>
      </div>
    );
  }

  const sessions = data?.sessions || [];
  const activeSessions = sessions.filter((s: any) => s.is_active);
  const expiredSessions = sessions.filter((s: any) => !s.is_active);

  return (
    <div className="space-y-6">
      {/* Actions - Only visible to Super Admin */}
      {isSuperAdmin && (
        <div className="flex justify-end items-center">
          <div className="flex gap-2">
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => cleanupMutation.mutate()} variant="outline">
              <XCircle className="h-4 w-4 mr-2" />
              Cleanup Expired
            </Button>
            <Button 
              onClick={() => setShowActiveOnly(!showActiveOnly)}
              variant={showActiveOnly ? "default" : "outline"}
            >
              <Activity className="h-4 w-4 mr-2" />
              {showActiveOnly ? 'Show All' : 'Active Only'}
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{sessions.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{activeSessions.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expired Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{expiredSessions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Admin Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length > 0 ? sessions.map((session: any) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{session.admin?.name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{session.admin?.email || 'N/A'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(session.user_agent)}
                        <span className="text-sm">{getBrowserName(session.user_agent)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{session.ip_address}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-sm">
                          <LogIn className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(session.created_at).toLocaleString()}
                          </span>
                        </div>
                        {session.logout_at && (
                          <div className="flex items-center gap-1 text-sm">
                            <LogOut className="h-3 w-3 text-orange-500" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(session.logout_at).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{getTimeAgo(session.last_activity)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{new Date(session.expires_at).toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={session.is_active ? 'default' : 'secondary'}>
                        {session.is_active ? 'Active' : session.logout_reason || 'Inactive'}
                      </Badge>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        {session.is_active && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Invalidate Session?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will force logout the user from this session. They will need to log in again.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => invalidateMutation.mutate(session.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Invalidate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin ? 8 : 7} className="text-center py-8">
                      <p className="text-muted-foreground">No sessions found.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
