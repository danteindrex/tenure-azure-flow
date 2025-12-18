import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, Loader2, CreditCard, RefreshCw, Trophy } from 'lucide-react';
import { useMemberStatus } from '@/hooks/useMemberStatus';
import { MEMBER_STATUS } from '@/lib/status-ids';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth-client';

const PaymentStatusWidget: React.FC = () => {
  const { data: memberStatus, refetch } = useMemberStatus();
  const { data: session } = useSession();
  const user = session?.user;
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreeToPayment, setAgreeToPayment] = useState(false);

  if (!memberStatus?.data) return null;

  const { memberStatusId, memberStatus: statusName } = memberStatus.data;

  // Only show for statuses that need action (exclude Active=2, Paid=6)
  const shouldShow = memberStatusId === MEMBER_STATUS.INACTIVE ||
                     memberStatusId === MEMBER_STATUS.SUSPENDED ||  // Add suspended
                     memberStatusId === MEMBER_STATUS.CANCELLED ||
                     memberStatusId === MEMBER_STATUS.WON;

  if (!shouldShow) return null;

  const getButtonConfig = () => {
    switch (memberStatusId) {
      case MEMBER_STATUS.INACTIVE:
        return {
          text: "Pay to Join Queue",
          icon: <CreditCard className="w-4 h-4" />,
          variant: "default" as const,
          description: "Complete your membership to join the payout queue"
        };
      case MEMBER_STATUS.SUSPENDED:
        return {
          text: "Update Payment Method",
          icon: <CreditCard className="w-4 h-4" />,
          variant: "destructive" as const,
          description: "Your payment failed. Update your payment method to restore access"
        };
      case MEMBER_STATUS.CANCELLED:
        return {
          text: "Rejoin Membership",
          icon: <RefreshCw className="w-4 h-4" />,
          variant: "secondary" as const,
          description: "Reactivate your membership to rejoin the queue"
        };
      case MEMBER_STATUS.WON:
        return {
          text: "You Previously Won - Rejoin Again",
          icon: <Trophy className="w-4 h-4" />,
          variant: "outline" as const,
          description: "Congratulations! You can rejoin for another chance"
        };
      default:
        return null;
    }
  };

  const config = getButtonConfig();
  if (!config) return null;

  const handlePayment = async (): Promise<void> => {
    // Check payment consent first for new payments
    if (memberStatusId === MEMBER_STATUS.INACTIVE && !agreeToPayment) {
      toast.error("Please agree to the payment terms to continue");
      return;
    }

    try {
      setLoading(true);

      let apiEndpoint = "";
      
      // Determine which API to call based on status
      if (memberStatusId === MEMBER_STATUS.INACTIVE) {
        // New payment - create checkout session
        apiEndpoint = "/api/subscriptions/create-checkout";
      } else if (memberStatusId === MEMBER_STATUS.SUSPENDED) {
        // Update payment method - use update payment API
        apiEndpoint = `/api/subscriptions/${user?.id}/update-payment`;
      } else if (memberStatusId === MEMBER_STATUS.CANCELLED || memberStatusId === MEMBER_STATUS.WON) {
        // Rejoin - use rejoin API
        apiEndpoint = "/api/subscriptions/rejoin";
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        let msg = "Failed to process request";
        try {
          const data = await response.json();
          msg = data.error || data.message || msg;
        } catch {
          // Use default message
        }
        throw new Error(msg);
      }

      const data = await response.json();

      if (memberStatusId === MEMBER_STATUS.INACTIVE && data.success && data.checkoutUrl) {
        toast.success("Redirecting to payment...");
        window.location.href = data.checkoutUrl;
      } else if (memberStatusId === MEMBER_STATUS.SUSPENDED && data.success && data.data?.url) {
        toast.success("Redirecting to update payment method...");
        window.location.href = data.data.url;
      } else if ((memberStatusId === MEMBER_STATUS.CANCELLED || memberStatusId === MEMBER_STATUS.WON) && data.success) {
        toast.success("Membership reactivated successfully!");
        setShowModal(false);
        refetch(); // Refresh member status
      } else {
        toast.error("Failed to process request. Please try again.");
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error occurred";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Payment Status Button */}
      <Card className="p-4 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground mb-1">Membership Status: {statusName}</h3>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
          <Button 
            onClick={() => setShowModal(true)}
            variant={config.variant}
            className="flex items-center gap-2"
          >
            {config.icon}
            {config.text}
          </Button>
        </div>
      </Card>

      {/* Payment Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {memberStatusId === MEMBER_STATUS.INACTIVE ? "Complete Your Membership" : 
               memberStatusId === MEMBER_STATUS.SUSPENDED ? "Update Payment Method" : 
               "Rejoin Membership"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Payment Details for New Members */}
            {memberStatusId === MEMBER_STATUS.INACTIVE && (
              <>
                <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <div className="text-center space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Non-refundable Signup Fee</p>
                      <p className="text-4xl font-bold text-accent">$300</p>
                      <p className="text-xs text-muted-foreground mt-1">One-time payment</p>
                    </div>
                    <div className="border-t border-border pt-4">
                      <p className="text-sm text-muted-foreground mb-1">Recurring Monthly Membership Fee</p>
                      <p className="text-2xl font-semibold text-foreground">$25</p>
                      <p className="text-xs text-muted-foreground mt-1">Billed monthly</p>
                    </div>
                  </div>
                </Card>

                <div className="space-y-4 p-4 bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-foreground">What happens next:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-accent" />
                      You'll be redirected to our secure payment processor
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-accent" />
                      Enter your payment information safely
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-accent" />
                      Your membership will be activated immediately
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-accent" />
                      You'll be added to the membership queue
                    </li>
                  </ul>
                </div>

                {/* Payment Consent Checkbox */}
                <div className="p-4 bg-accent/5 border-2 border-accent/20 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="agreeToPayment"
                      checked={agreeToPayment}
                      onCheckedChange={(checked: boolean) => setAgreeToPayment(checked)}
                      className="mt-1"
                    />
                    <Label htmlFor="agreeToPayment" className="text-sm text-foreground leading-relaxed cursor-pointer">
                      I explicitly consent to the payment of the <strong>non-refundable $300 signup fee</strong> and the <strong>recurring $25 monthly membership fee</strong> as outlined in the Terms & Conditions.
                    </Label>
                  </div>
                </div>
              </>
            )}

            {/* Payment Failed Message for Suspended Members */}
            {memberStatusId === MEMBER_STATUS.SUSPENDED && (
              <div className="text-center space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <CreditCard className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-red-900 dark:text-red-100">Payment Failed</h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Your recent payment failed. You have 30 days to update your payment method before your membership is cancelled.
                  </p>
                </div>
                <p className="text-muted-foreground">
                  Click below to update your payment method and restore your membership.
                </p>
              </div>
            )}

            {/* Rejoin Message for Cancelled/Won Members */}
            {(memberStatusId === MEMBER_STATUS.CANCELLED || memberStatusId === MEMBER_STATUS.WON) && (
              <div className="text-center space-y-4">
                {memberStatusId === MEMBER_STATUS.WON && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <Trophy className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-purple-900 dark:text-purple-100">Congratulations!</h3>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      You previously won a payout. You can rejoin the queue for another chance to win.
                    </p>
                  </div>
                )}
                <p className="text-muted-foreground">
                  Click below to reactivate your membership and rejoin the payout queue.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="w-full"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={loading || (memberStatusId === MEMBER_STATUS.INACTIVE && !agreeToPayment)}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  memberStatusId === MEMBER_STATUS.INACTIVE ? "Proceed to Payment" : 
                  memberStatusId === MEMBER_STATUS.SUSPENDED ? "Update Payment Method" :
                  "Rejoin Now"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentStatusWidget;