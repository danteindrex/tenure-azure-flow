'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useActivityStream } from '@/hooks/useActivityStream';
import { getActivityDescription } from '@/lib/utils/activity-logger';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Activity, 
  LogIn, 
  LogOut, 
  Clock, 
  User, 
  Monitor,
  MapPin,
  RefreshCw,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

interface ActivityLog {
  id: number;
  admin_id: number;
  session_id: string | null;
  action: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  error_message: string | null;
  metadata: any;
  created_at: string;
  admin: {
    id: number;
    email: string;
    name: string;
  } | null;
}

export default function AdminSessionLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  
  // Real-time activity stream
  const { activities: realtimeActivities, isConnected } = useActivityStream();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (filterAction !== 'all') {
        params.append('action', filterAction);
      }

      const response = await fetch(`/api/admin-sessions/logs?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Error loading logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin-sessions/stats');
      
      if (!response.ok) {
        console.error('Failed to fetch stats');
        return;
      }

      const data = await response.json();
      setActiveSessions(data.activeSessions || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [filterAction, offset]);

  // Merge real-time activities with fetched logs
  useEffect(() => {
    if (realtimeActivities.length > 0) {
      setLogs((prevLogs) => {
        const newActivities = realtimeActivities.filter(
          (activity) => !prevLogs.some((log) => log.id === activity.id)
        ).map(activity => ({
          ...activity,
          session_id: activity.session_id || null,
          error_message: activity.error_message || null,
        }));
        return [...newActivities, ...prevLogs];
      });
      setTotal((prev) => prev + realtimeActivities.length);
    }
  }, [realtimeActivities]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <LogIn className="h-4 w-4 text-green-500" />;
      case 'logout':
        return <LogOut className="h-4 w-4 text-orange-500" />;
      case 'session_expired':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getActionBadge = (action: string, success: boolean) => {
    if (!success) {
      return <Badge variant="destructive">{action}</Badge>;
    }

    switch (action) {
      case 'login':
        return <Badge className="bg-green-500">{action}</Badge>;
      case 'logout':
        return <Badge className="bg-orange-500">{action}</Badge>;
      case 'session_expired':
        return <Badge variant="secondary">{action}</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Admin', 'Action', 'IP Address', 'User Agent', 'Success'].join(','),
      ...logs.map(log => [
        log.created_at,
        log.admin?.email || 'Unknown',
        log.action,
        log.ip_address,
        `"${log.user_agent}"`,
        log.success
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-session-logs-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exported successfully');
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.admin?.email?.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      log.ip_address.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions.length}</div>
            <p className="text-xs text-muted-foreground">Currently logged in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">Activity records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logins Today</CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(l => l.action === 'login' && 
                new Date(l.created_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logouts Today</CardTitle>
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(l => l.action === 'logout' && 
                new Date(l.created_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Admin Activity Logs</CardTitle>
                {isConnected && (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <Activity className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                )}
              </div>
              <CardDescription>Real-time tracking of all admin activities</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { fetchLogs(); fetchStats(); }} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={exportLogs} variant="outline" size="sm" disabled={logs.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Search by email, action, or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="session_expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No logs found. Try logging in to generate activity.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{log.admin?.name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">
                              {log.admin?.email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            {getActionBadge(log.action, log.success)}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {getActivityDescription(log.action, log.metadata)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{log.ip_address}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[200px]" title={log.user_agent}>
                            {log.user_agent}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.success ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Success
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} logs
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
