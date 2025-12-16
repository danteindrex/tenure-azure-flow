'use client'

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

async function fetchAuditLogs(page = 1, search = '', action = '') {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '50',
    ...(search && { search }),
    ...(action && action !== 'all' && { action })
  });
  
  const response = await fetch(`/api/audit-logs?${params}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('Audit logs API error:', response.status, errorData);
    throw new Error(errorData.error || `Failed to fetch audit logs (${response.status})`);
  }
  return response.json();
}
export default function AuditLog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  // Fetch all audit logs once, filter on client side for instant results
  const { data: allData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['audit-logs-all', actionFilter], // Only refetch when action filter changes
    queryFn: () => fetchAuditLogs(1, '', actionFilter), // Fetch without search
    refetchInterval: 30000, // Real-time updates every 30 seconds
    staleTime: 10000,
  });

  // Realtime: refresh audit logs when session changes
  useEffect(() => {
    const channel = supabase
      .channel('realtime-audit-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session' }, () => {
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleSearch = () => {
    setCurrentPage(1);
    refetch();
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Audit logs refreshed!");
  };

  if (isLoading && !allData) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Loading audit logs from database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="shadow-card border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'Failed to load audit logs'}
            </p>
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Possible causes:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>You may need to log in again (session expired)</li>
                <li>Database connection issue</li>
                <li>Missing session table</li>
              </ul>
            </div>
            <Button onClick={() => refetch()} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get all logs and filter client-side for instant results
  let allLogs = allData?.logs || [];
  
  // Apply search filter instantly on client side
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    allLogs = allLogs.filter(log =>
      log.user?.toLowerCase().includes(searchLower) ||
      log.user_email?.toLowerCase().includes(searchLower) ||
      log.action?.toLowerCase().includes(searchLower) ||
      log.details?.toLowerCase().includes(searchLower)
    );
  }

  // Client-side pagination
  const limit = 50;
  const total = allLogs.length;
  const pages = Math.ceil(total / limit);
  const offset = (currentPage - 1) * limit;
  const logs = allLogs.slice(offset, offset + limit);

  const pagination = { page: currentPage, pages, total, limit };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-success";
      case "warning":
        return "bg-warning";
      case "info":
        return "bg-accent";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                <SelectItem value="active">Active Sessions</SelectItem>
                <SelectItem value="expired">Expired Sessions</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {pagination.total}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {logs.filter((l) => l.action === "Session Created").length}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {logs.filter((l) => l.action === "Session Expired").length}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Ended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {logs.filter((l) => l.action === "Session Ended").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session Log Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Session Activity ({pagination.total})
            {isFetching && (
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length > 0 ? logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{log.user}</span>
                        {log.user_email && (
                          <span className="text-xs text-muted-foreground">{log.user_email}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.details}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(log.status)}>
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
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
