import React from 'react';
import { useRouter } from 'next/router';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const TermsAndConditions = () => {
  const router = useRouter();
  const { actualTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-xl font-bold text-foreground">Terms & Conditions</h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Card className="p-8 bg-card border-border shadow-lg">
          <div className="space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Membership Agreement</h2>
              <p className="text-muted-foreground leading-relaxed">
                Please read these Terms and Conditions carefully before signing up for membership.
                By creating an account and making payment, you acknowledge that you have read, understood,
                and agree to be bound by these terms.
              </p>
            </section>

            {/* Section 1: Financial Commitment */}
            <section className="border-t border-border pt-8">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    1. Membership Fee Acknowledgment
                  </h3>
                  <p className="text-sm text-muted-foreground italic mb-4">
                    Financial Commitment and Payment Authorization
                  </p>
                </div>
              </div>

              <div className="space-y-4 pl-9">
                <p className="text-foreground leading-relaxed">
                  I understand and explicitly agree to the following non-refundable and recurring fees
                  associated with my membership:
                </p>

                <div className="bg-accent/5 border-l-4 border-accent p-4 rounded-r space-y-3">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      1.1 Non-Refundable Signup Fee
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      A one-time, <strong>non-refundable membership signup fee of $300.00 USD</strong> is
                      due immediately. This fee is paid to establish my initial <strong>tenure start timestamp</strong> and
                      is <strong>not contingent on future service delivery</strong>. This fee will not be refunded
                      under any circumstances, including but not limited to:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 ml-4 space-y-1">
                      <li>Voluntary membership cancellation</li>
                      <li>Membership suspension or termination</li>
                      <li>Failure to receive services</li>
                      <li>Change of mind or dissatisfaction</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      1.2 Monthly Membership Fee
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      A recurring monthly fee of <strong>$25.00 USD</strong> will be charged every 30 days.
                      The first month's fee is due immediately upon signup. Subsequent monthly fees will be
                      automatically charged to your designated payment method on the same day each month.
                    </p>
                  </div>

                  <div className="bg-background/50 p-3 rounded border border-border">
                    <p className="text-sm font-medium text-foreground mb-2">Payment Authorization:</p>
                    <p className="text-sm text-muted-foreground">
                      I authorize Home Solutions to charge my designated payment method for the initial{" "}
                      <strong className="text-accent">$300.00 USD</strong> (Non-Refundable Signup Fee)
                      and the subsequent monthly fee of <strong className="text-accent">$25.00 USD</strong>{" "}
                      until my membership is terminated in accordance with these terms.
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded-r">
                  <p className="text-sm font-medium text-foreground mb-1">⚠️ Important Notice:</p>
                  <p className="text-sm text-muted-foreground">
                    All payments are processed through secure third-party payment processors.
                    Monthly recurring charges will continue automatically until you cancel your membership
                    or your membership is terminated for non-payment.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: Membership Continuation and Termination */}
            <section className="border-t border-border pt-8">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    2. Continuation and Termination Policy
                  </h3>
                  <p className="text-sm text-muted-foreground italic mb-4">
                    Active Status, Suspension, and Termination Procedures
                  </p>
                </div>
              </div>

              <div className="space-y-4 pl-9">
                <p className="text-foreground leading-relaxed">
                  I acknowledge that my continued <strong>ACTIVE</strong> membership status, including my
                  eligibility for the queue and service delivery, is contingent upon the timely and
                  successful payment of the <strong>$25.00 USD monthly membership fee</strong>.
                </p>

                <div className="space-y-4">
                  <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r">
                    <h4 className="font-semibold text-foreground mb-2">2.1 Immediate Suspension</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      If any monthly payment fails for any reason, including but not limited to insufficient
                      funds, expired card, or payment method decline:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 space-y-1">
                      <li>My membership will be immediately marked as <strong>Suspended</strong></li>
                      <li>My queue entry loses its active status</li>
                      <li>No further services will be provided during suspension</li>
                      <li>I will be notified via email of the payment failure</li>
                    </ul>
                  </div>

                  <div className="bg-red-500/10 border-l-4 border-red-600 p-4 rounded-r">
                    <h4 className="font-semibold text-foreground mb-2">2.2 Permanent Termination (30-Day Policy)</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      If the outstanding monthly payment is not completed within <strong>30 days</strong> of
                      the initial failure date:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 space-y-1">
                      <li>My membership will be <strong>permanently Terminated</strong></li>
                      <li>All associated queue entries will be permanently marked as inactive</li>
                      <li><strong>My queue position will be lost permanently</strong></li>
                      <li>All tenure and payment history will be archived</li>
                      <li>No refunds will be issued for any prior payments</li>
                    </ul>
                  </div>

                  <div className="bg-orange-500/10 border-l-4 border-orange-500 p-4 rounded-r">
                    <h4 className="font-semibold text-foreground mb-2">2.3 Re-entry After Termination</h4>
                    <p className="text-sm text-muted-foreground">
                      I understand that membership termination is <strong>permanent and irreversible</strong>.
                      If I wish to rejoin after termination, I must:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 space-y-1 mt-2">
                      <li>Complete a full new sign-up process</li>
                      <li>Pay the <strong>non-refundable $300.00 USD signup fee</strong> again</li>
                      <li>Obtain a <strong>new, current tenure start timestamp</strong></li>
                      <li>Start at the back of the queue (no priority given for previous membership)</li>
                    </ul>
                  </div>

                  <div className="bg-green-500/10 border-l-4 border-green-500 p-4 rounded-r">
                    <h4 className="font-semibold text-foreground mb-2">2.4 Voluntary Cancellation</h4>
                    <p className="text-sm text-muted-foreground">
                      I may cancel my membership at any time by contacting support. Upon voluntary cancellation:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 space-y-1 mt-2">
                      <li>My membership will be canceled at the end of the current billing period</li>
                      <li>No refunds will be issued for any payments already made</li>
                      <li>My queue position and tenure timestamp will be permanently lost</li>
                      <li>I will need to pay the signup fee again if I wish to rejoin in the future</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Queue System */}
            <section className="border-t border-border pt-8">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    3. Membership Queue System
                  </h3>
                </div>
              </div>

              <div className="space-y-4 pl-9">
                <p className="text-foreground leading-relaxed">
                  I understand that membership includes placement in a priority queue system based on
                  my tenure start timestamp (established upon initial signup payment).
                </p>

                <div className="bg-accent/5 p-4 rounded border border-border space-y-3">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">3.1 Queue Eligibility</h4>
                    <p className="text-sm text-muted-foreground">
                      My position in the queue is determined by my tenure start timestamp and maintained
                      only while my membership status is <strong>ACTIVE</strong>. Payment failures result
                      in immediate loss of active queue status.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-1">3.2 Service Delivery</h4>
                    <p className="text-sm text-muted-foreground">
                      Service delivery is dependent on queue position and availability. The company makes
                      no guarantees regarding specific timelines for service delivery. My monthly fee maintains
                      my active status and queue position regardless of service delivery status.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Additional Terms */}
            <section className="border-t border-border pt-8">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    4. Additional Terms
                  </h3>
                </div>
              </div>

              <div className="space-y-4 pl-9">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">4.1 Modifications</h4>
                  <p className="text-sm text-muted-foreground">
                    Home Solutions reserves the right to modify these terms, membership fees, or service
                    offerings at any time with 30 days' notice to active members. Continued use of the
                    service after such notice constitutes acceptance of the modified terms.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-1">4.2 Contact Information</h4>
                  <p className="text-sm text-muted-foreground">
                    I agree to maintain current and accurate contact information, including email address
                    and payment method details. I am responsible for updating this information as needed.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-1">4.3 Data Protection</h4>
                  <p className="text-sm text-muted-foreground">
                    I acknowledge that my personal information will be collected, stored, and processed
                    in accordance with the company's Privacy Policy and applicable data protection laws.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-1">4.4 Governing Law</h4>
                  <p className="text-sm text-muted-foreground">
                    These Terms and Conditions shall be governed by and construed in accordance with the
                    laws of the jurisdiction in which Home Solutions operates.
                  </p>
                </div>
              </div>
            </section>

            {/* Acknowledgment */}
            <section className="border-t border-border pt-8">
              <div className="bg-accent/10 border-2 border-accent/30 p-6 rounded-lg">
                <h3 className="text-lg font-bold text-foreground mb-4">
                  Final Acknowledgment
                </h3>
                <p className="text-sm text-foreground leading-relaxed mb-4">
                  By checking the agreement boxes during signup and proceeding with payment, I confirm that:
                </p>
                <ul className="space-y-2 text-sm text-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">✓</span>
                    <span>I have read and understood all sections of these Terms and Conditions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">✓</span>
                    <span>I explicitly consent to the non-refundable $300.00 signup fee</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">✓</span>
                    <span>I explicitly consent to the recurring $25.00 monthly membership fee</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">✓</span>
                    <span>I understand the suspension and 30-day termination policy</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">✓</span>
                    <span>I understand that termination results in permanent loss of queue position</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">✓</span>
                    <span>I agree to authorize automatic recurring charges to my payment method</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Footer */}
            <div className="border-t border-border pt-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <Button
                onClick={() => router.back()}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Return to Signup
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TermsAndConditions;
