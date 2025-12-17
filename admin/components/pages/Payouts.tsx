'use client'

import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trophy, CheckCircle, XCircle, AlertCircle, Play, User, Mail, Phone, Calendar, CreditCard, Clock, MapPin, Search, Filter, Edit } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

async function fetchPayoutData() {
  // Add timestamp to prevent caching
  const timestamp = Date.now();
  const [payoutsRes, queueRes] = await Promise.allSettled([
    fetch(`/api/payouts?t=${timestamp}`),
    fetch(`/api/membership-queue?t=${timestamp}`)
  ]);

  return {
    payouts: payoutsRes.status === 'fulfilled' ? await payoutsRes.value.json() : { payouts: [] },
    queue: queueRes.status === 'fulfilled' ? await queueRes.value.json() : { members: [] },
  };
}

async function fetchMemberEligibilityStatuses() {
  const response = await fetch('/api/member-eligibility-statuses');
  if (!response.ok) {
    throw new Error('Failed to fetch member eligibility statuses');
  }
  return response.json();
}

async function updateMemberStatus(memberId: string, status: string) {
  const response = await fetch(`/api/membership-queue/${memberId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update member status');
  }
  
  return response.json();
}

export default function Payouts() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['payout-data'],
    queryFn: fetchPayoutData,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchOnWindowFocus: true, // Refetch when window gains focus
    staleTime: 0, // Always consider data stale to force fresh fetches
  });

  const { data: statusesData } = useQuery({
    queryKey: ['member-eligibility-statuses'],
    queryFn: fetchMemberEligibilityStatuses,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ memberId, status }: { memberId: string; status: string }) =>
      updateMemberStatus(memberId, status),
    onSuccess: async (data) => {
      toast.success(data.message || 'Member status updated successfully');
      
      // Force immediate refresh with multiple strategies
      await queryClient.invalidateQueries({ queryKey: ['payout-data'] });
      await queryClient.refetchQueries({ queryKey: ['payout-data'] });
      
      // Wait a moment and refresh again to ensure data is updated
      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ['payout-data'] });
      }, 1000);
      
      setIsEditingStatus(false);
      setNewStatus("");
      setIsDetailsOpen(false); // Close the dialog to force re-render
      
      // Show success message with the new status
      setTimeout(() => {
        toast.success(`Status successfully changed to ${data.member?.status || status}`);
      }, 1500);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update member status');
    },
  });

  // Real-time subscription for membership queue and payment changes
  useEffect(() => {
    const channel = supabase
      .channel('payout-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_memberships' },
        (payload) => {
          console.log('User memberships change received:', payload);
          queryClient.invalidateQueries({ queryKey: ['payout-data'] });
          queryClient.refetchQueries({ queryKey: ['payout-data'] });
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'member_eligibility_statuses' },
        (payload) => {
          console.log('Member status change received:', payload);
          queryClient.invalidateQueries({ queryKey: ['payout-data'] });
          queryClient.refetchQueries({ queryKey: ['payout-data'] });
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_payments' },
        (payload) => {
          console.log('Payment change received:', payload);
          queryClient.invalidateQueries({ queryKey: ['payout-data'] });
          queryClient.refetchQueries({ queryKey: ['payout-data'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleTriggerPayout = () => {
    setIsProcessing(true);
    // Simulate payout processing
    setTimeout(() => {
      setIsProcessing(false);
      toast.success("Payout calculation completed successfully!");
    }, 2000);
  };

  // Extract eligible members from queue data
  const eligibleMembers = data?.queue?.members || [];
  const payoutHistory = data?.payouts?.payouts || [];
  

  
  // Extract stats from API
  const totalPayoutPool = data?.payouts?.stats?.totalPayoutPool || 0;
  const nextPayoutDate = data?.payouts?.stats?.nextPayoutDate || 'TBD';
  const monthsUntilPayout = data?.payouts?.stats?.monthsUntilPayout || 0;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Payout Management</h1>
          <p className="text-muted-foreground">Loading payout data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Payout Management</h1>
          <p className="text-muted-foreground text-red-500">Error loading payout data. Please check your database connection.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">
            Payout Management
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage member payouts and winner selection.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="lg" className="bg-gradient-primary w-full sm:w-auto">
              <Play className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Trigger Payout Calculation</span>
              <span className="sm:hidden">Trigger Payout</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Payout Calculation</AlertDialogTitle>
              <AlertDialogDescription>
                This will calculate the 12-month payout based on total revenue
                collected and select eligible winner(s). Are you sure you want to
                proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleTriggerPayout}>
                {isProcessing ? "Processing..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Current Cycle Stats */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="hidden sm:inline">Total Revenue Collected</span>
              <span className="sm:hidden">Revenue</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              ${totalPayoutPool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Real-time revenue tracking
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Eligible Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{eligibleMembers.length}</div>

          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Next Payout Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{nextPayoutDate}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {monthsUntilPayout === 0 ? 'This month' : `${monthsUntilPayout} month${monthsUntilPayout !== 1 ? 's' : ''} away`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="Won">Won</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Eligible Members */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Eligible Members for Current Cycle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {eligibleMembers
              .filter((member) => {
                // Apply status filter
                if (statusFilter && statusFilter !== 'all') {
                  const memberStatus = member.member_status || member.status || 'Active';
                  if (memberStatus !== statusFilter) return false;
                }
                
                // Apply search filter
                if (searchTerm) {
                  const searchLower = searchTerm.toLowerCase();
                  const name = (member.full_name || member.users?.name || member.user_name || member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || '').toLowerCase();
                  const email = (member.email || member.users?.email || '').toLowerCase();
                  const userId = (member.user_id || member.users?.id || '').toString().toLowerCase();
                  
                  if (!name.includes(searchLower) && !email.includes(searchLower) && !userId.includes(searchLower)) {
                    return false;
                  }
                }
                
                return true;
              })
              .map((member) => (
              <div
                key={member.id || member.user_id || member.queue_position}
                className="flex items-center justify-between border-b border-border pb-4 last:border-0"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {member.full_name || member.users?.name || member.user_name || member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'No Name'}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        User ID: {member.user_id || member.users?.id || 'N/A'}
                      </p>
                    </div>
                    <Badge variant="secondary">#{member.queue_position || member.id}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {member.email || member.users?.email || 'No email'} | Queue Position: {member.queue_position} | Status: {member.member_status || member.status || 'Active'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge variant={
                      member.member_status === "Active" ? "default" : 
                      member.member_status === "Suspended" ? "destructive" :
                      member.member_status === "Won" ? "default" :
                      member.member_status === "Paid" ? "default" :
                      member.member_status === "Cancelled" ? "destructive" : "secondary"
                    }>
                      {member.member_status || member.status || 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        console.log('Member object from list:', member);
                        setSelectedMember(member);
                        setIsEditingStatus(true);
                        setNewStatus(member.member_status || member.status || 'Active');
                        setIsDetailsOpen(true);
                      }}
                      className="h-8 w-8 p-0"
                      title="Edit Status"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedMember(member);
                        setIsDetailsOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payoutHistory.length > 0 ? payoutHistory.map((payout, index) => (
              <div
                key={index}
                className="flex items-center justify-between border-b border-border pb-4 last:border-0"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {payout.users?.name || payout.winner || payout.user_name || payout.full_name || `${payout.first_name || ''} ${payout.last_name || ''}`.trim() || 'No Name'}
                  </p>
                  <p className="text-sm text-muted-foreground">{payout.date || payout.created_at || 'Unknown Date'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      ${(payout.amount || 0).toLocaleString()}
                    </p>
                    <Badge variant="default" className="bg-success">
                      {payout.status || 'Completed'}
                    </Badge>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No payout history available.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Member Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={(open) => {
        setIsDetailsOpen(open);
        if (!open) {
          setIsEditingStatus(false);
          setNewStatus("");
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedMember?.users?.image || selectedMember?.user_image} />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">
                  {selectedMember?.full_name || selectedMember?.users?.name || selectedMember?.user_name || selectedMember?.name || `${selectedMember?.first_name || ''} ${selectedMember?.last_name || ''}`.trim() || 'Unknown Member'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedMember?.users?.email || selectedMember?.user_email || selectedMember?.email}
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              Complete member profile and account information
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="grid gap-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground border-b pb-2">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                    <p className="text-sm font-medium">
                      {selectedMember.full_name || selectedMember.users?.name || selectedMember.user_name || selectedMember.name || `${selectedMember.first_name || ''} ${selectedMember.last_name || ''}`.trim() || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">User ID</Label>
                    <p className="text-sm font-mono truncate">
                      {selectedMember.user_id || selectedMember.users?.id || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email Address</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm truncate">
                        {selectedMember.users?.email || selectedMember.user_email || selectedMember.email || 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Phone Number</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">
                        {selectedMember.users?.phone || selectedMember.phone || selectedMember.phone_number || 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Status */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground border-b pb-2">Account Status</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Membership Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {!isEditingStatus ? (
                        <>
                          <Badge variant={
                            selectedMember.member_status === "Active" ? "default" : 
                            selectedMember.member_status === "Suspended" ? "destructive" :
                            selectedMember.member_status === "Won" ? "default" :
                            selectedMember.member_status === "Paid" ? "default" : "secondary"
                          }>
                            {selectedMember.member_status || selectedMember.status || 'Active'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsEditingStatus(true);
                              setNewStatus(selectedMember.member_status || selectedMember.status || 'Active');
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Select value={newStatus} onValueChange={setNewStatus}>
                            <SelectTrigger className="w-[140px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusesData?.statuses?.map((status: any) => (
                                <SelectItem key={status.id} value={status.id}>
                                  {status.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={() => {
                              console.log('Selected member object:', selectedMember);
                              console.log('Member ID:', selectedMember?.id);
                              console.log('Member User ID:', selectedMember?.user_id);
                              console.log('New status:', newStatus);
                              
                              const memberId = selectedMember?.id || selectedMember?.user_id;
                              
                              if (memberId && newStatus) {
                                updateStatusMutation.mutate({
                                  memberId: memberId,
                                  status: newStatus
                                });
                              } else {
                                console.error('Missing member ID or status:', { 
                                  memberId: memberId, 
                                  newStatus 
                                });
                                toast.error('Missing member ID or status');
                              }
                            }}
                            disabled={updateStatusMutation.isPending}
                            className="h-8 px-2"
                          >
                            {updateStatusMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsEditingStatus(false);
                              setNewStatus("");
                            }}
                            className="h-8 px-2"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email Verified</Label>
                    <Badge variant={selectedMember.users?.email_verified || selectedMember.email_verified ? "default" : "secondary"}>
                      {selectedMember.users?.email_verified || selectedMember.email_verified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Location & Personal Info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground border-b pb-2">Location & Personal Information</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                    <p className="text-sm">
                      {selectedMember.users?.address || selectedMember.address || selectedMember.street_address || 'Not provided'}
                    </p>
                  </div>
                  {(selectedMember.city || selectedMember.state || selectedMember.postal_code) && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">City, State & Postal Code</Label>
                      <p className="text-sm">
                        {[selectedMember.city, selectedMember.state, selectedMember.postal_code].filter(Boolean).join(', ') || 'Not provided'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Membership Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground border-b pb-2">Membership Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Queue Position</Label>
                    <Badge variant="secondary" className="text-lg mt-1">
                      #{selectedMember.queue_position || selectedMember.position || 'N/A'}
                    </Badge>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Join Date</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm">
                        {selectedMember.created_at || selectedMember.joined_at ? new Date(selectedMember.created_at || selectedMember.joined_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Months Completed</Label>
                    <p className="text-sm font-semibold mt-1">
                      {selectedMember.months_completed || 0} months
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground border-b pb-2">Payment Information</h4>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pre-payment Amount</span>
                    <span className="font-semibold">
                      ${selectedMember.prepayment_amount || selectedMember.amount || 300}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Payment Status</span>
                    {selectedMember.prepayment_status === "completed" || 
                     selectedMember.prepaymentStatus === "completed" || 
                     selectedMember.payment_status === "completed" ? (
                      <Badge variant="default" className="bg-success">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                  {selectedMember.payment_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Payment Date</span>
                      <span className="text-sm">
                        {new Date(selectedMember.payment_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedMember.payment_type && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Payment Type</span>
                      <Badge variant="outline">{selectedMember.payment_type}</Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Timeline */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground border-b pb-2">Account Timeline</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Joined Date</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {selectedMember.created_at || selectedMember.joined_at || selectedMember.user_created_at || selectedMember.join_date
                            ? new Date(selectedMember.created_at || selectedMember.joined_at || selectedMember.user_created_at || selectedMember.join_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : 'Unknown'}
                        </p>
                        {(selectedMember.created_at || selectedMember.joined_at || selectedMember.user_created_at || selectedMember.join_date) && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(selectedMember.created_at || selectedMember.joined_at || selectedMember.user_created_at || selectedMember.join_date).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {selectedMember.updated_at
                            ? new Date(selectedMember.updated_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : 'Unknown'}
                        </p>
                        {selectedMember.updated_at && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(selectedMember.updated_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Active</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        {selectedMember.last_active || selectedMember.users?.last_active ? (
                          <>
                            <p className="text-sm font-medium">
                              {new Date(selectedMember.last_active || selectedMember.users?.last_active).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(selectedMember.last_active || selectedMember.users?.last_active).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium">Never</p>
                            <p className="text-xs text-muted-foreground">No activity recorded</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Account Age</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {selectedMember.created_at || selectedMember.joined_at || selectedMember.user_created_at || selectedMember.join_date
                            ? (() => {
                                const joinDate = new Date(selectedMember.created_at || selectedMember.joined_at || selectedMember.user_created_at || selectedMember.join_date);
                                const now = new Date();
                                const diffTime = Math.abs(now.getTime() - joinDate.getTime());
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                
                                if (diffDays < 30) {
                                  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                                } else if (diffDays < 365) {
                                  const months = Math.floor(diffDays / 30);
                                  return `${months} month${months !== 1 ? 's' : ''}`;
                                } else {
                                  const years = Math.floor(diffDays / 365);
                                  const remainingMonths = Math.floor((diffDays % 365) / 30);
                                  return `${years} year${years !== 1 ? 's' : ''}${remainingMonths > 0 ? `, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}` : ''}`;
                                }
                              })()
                            : 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">Member since joining</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
