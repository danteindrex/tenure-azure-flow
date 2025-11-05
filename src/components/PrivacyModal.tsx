import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Lock, Eye, Database, UserCheck, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PrivacyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">Privacy Policy</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[calc(90vh-120px)] px-6 pb-6">
          <div className="space-y-8 pr-4">
            {/* Introduction */}
            <section>
              <p className="text-muted-foreground leading-relaxed">
                At Home Solutions, we are committed to protecting your privacy and ensuring the security of your personal information. 
                This Privacy Policy explains how we collect, use, store, and protect your data when you use our membership services.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong>Effective Date:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </section>

            {/* Section 1: Information We Collect */}
            <section className="border-t border-border pt-6">
              <div className="flex items-start gap-3 mb-4">
                <Database className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    1. Information We Collect
                  </h3>
                </div>
              </div>

              <div className="space-y-4 pl-9">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">1.1 Personal Information</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    When you create an account and sign up for our membership, we collect:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 space-y-1">
                    <li>Full name (first, middle, last)</li>
                    <li>Email address</li>
                    <li>Phone number</li>
                    <li>Date of birth</li>
                    <li>Mailing address (street, city, state, zip code, country)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">1.2 Payment Information</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    For processing membership fees, we collect:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 space-y-1">
                    <li>Payment method details (processed securely through third-party payment processors)</li>
                    <li>Billing address</li>
                    <li>Transaction history</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    Note: We do not store complete credit card numbers. Payment processing is handled by PCI-compliant third-party providers.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">1.3 Account and Usage Information</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    We automatically collect:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 space-y-1">
                    <li>Account creation date and tenure timestamp</li>
                    <li>Login activity and session information</li>
                    <li>Queue position and membership status</li>
                    <li>Service usage and interaction history</li>
                    <li>Device information and IP address</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 2: How We Use Your Information */}
            <section className="border-t border-border pt-6">
              <div className="flex items-start gap-3 mb-4">
                <UserCheck className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    2. How We Use Your Information
                  </h3>
                </div>
              </div>

              <div className="space-y-4 pl-9">
                <p className="text-sm text-muted-foreground">
                  We use your personal information for the following purposes:
                </p>
                
                <div className="bg-accent/5 p-4 rounded border border-border space-y-3">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">2.1 Service Delivery</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 space-y-1">
                      <li>Creating and managing your membership account</li>
                      <li>Processing payments and maintaining billing records</li>
                      <li>Managing your queue position and tenure</li>
                      <li>Delivering services according to your membership tier</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-1">2.2 Communication</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 space-y-1">
                      <li>Sending account verification emails</li>
                      <li>Notifying you of payment status and billing issues</li>
                      <li>Providing customer support</li>
                      <li>Sending important updates about your membership</li>
                      <li>Informing you of changes to our terms or policies</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-1">2.3 Security and Fraud Prevention</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 space-y-1">
                      <li>Verifying your identity</li>
                      <li>Detecting and preventing fraudulent activity</li>
                      <li>Protecting against unauthorized access</li>
                      <li>Maintaining audit logs for security purposes</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-1">2.4 Service Improvement</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 space-y-1">
                      <li>Analyzing usage patterns to improve our services</li>
                      <li>Understanding member needs and preferences</li>
                      <li>Developing new features and services</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Data Security */}
            <section className="border-t border-border pt-6">
              <div className="flex items-start gap-3 mb-4">
                <Lock className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    3. Data Security
                  </h3>
                </div>
              </div>

              <div className="space-y-4 pl-9">
                <p className="text-sm text-muted-foreground">
                  We implement industry-standard security measures to protect your personal information:
                </p>
                
                <div className="bg-green-500/10 border-l-4 border-green-500 p-4 rounded-r space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <p className="text-sm text-muted-foreground">
                      <strong>Encryption:</strong> All data transmitted between your device and our servers is encrypted using SSL/TLS protocols
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <p className="text-sm text-muted-foreground">
                      <strong>Secure Storage:</strong> Personal data is stored in secure, access-controlled databases
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <p className="text-sm text-muted-foreground">
                      <strong>Access Controls:</strong> Only authorized personnel have access to your information
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <p className="text-sm text-muted-foreground">
                      <strong>Regular Audits:</strong> We conduct regular security audits and vulnerability assessments
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <p className="text-sm text-muted-foreground">
                      <strong>Payment Security:</strong> Payment processing is handled by PCI-DSS compliant third-party providers
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Data Sharing */}
            <section className="border-t border-border pt-6">
              <div className="flex items-start gap-3 mb-4">
                <Eye className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    4. Data Sharing and Disclosure
                  </h3>
                </div>
              </div>

              <div className="space-y-4 pl-9">
                <p className="text-sm text-muted-foreground mb-2">
                  We do not sell your personal information. We may share your data only in the following circumstances:
                </p>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">4.1 Service Providers</h4>
                    <p className="text-sm text-muted-foreground">
                      We share information with trusted third-party service providers who assist us in operating our platform, 
                      processing payments, sending emails, and providing customer support. These providers are contractually 
                      obligated to protect your information and use it only for the services they provide to us.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-1">4.2 Legal Requirements</h4>
                    <p className="text-sm text-muted-foreground">
                      We may disclose your information if required by law, court order, or government regulation, or if we 
                      believe disclosure is necessary to protect our rights, your safety, or the safety of others.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-1">4.3 Business Transfers</h4>
                    <p className="text-sm text-muted-foreground">
                      In the event of a merger, acquisition, or sale of assets, your information may be transferred to the 
                      acquiring entity, subject to the same privacy protections outlined in this policy.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5: Your Rights */}
            <section className="border-t border-border pt-6">
              <div className="flex items-start gap-3 mb-4">
                <Shield className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    5. Your Privacy Rights
                  </h3>
                </div>
              </div>

              <div className="space-y-4 pl-9">
                <p className="text-sm text-muted-foreground mb-2">
                  You have the following rights regarding your personal information:
                </p>
                
                <div className="bg-accent/5 p-4 rounded border border-border space-y-2">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">5.1 Access and Portability</h4>
                    <p className="text-sm text-muted-foreground">
                      You can request a copy of your personal data in a structured, machine-readable format.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-1">5.2 Correction</h4>
                    <p className="text-sm text-muted-foreground">
                      You can update or correct your personal information through your account settings or by contacting support.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-1">5.3 Deletion</h4>
                    <p className="text-sm text-muted-foreground">
                      You can request deletion of your account and personal data, subject to legal retention requirements 
                      and legitimate business needs (e.g., payment records, audit logs).
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-1">5.4 Opt-Out</h4>
                    <p className="text-sm text-muted-foreground">
                      You can opt out of marketing communications at any time. However, you will continue to receive 
                      essential service-related communications.
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground italic mt-4">
                  To exercise any of these rights, please contact us at privacy@homesolutions.com
                </p>
              </div>
            </section>

            {/* Section 6: Data Retention */}
            <section className="border-t border-border pt-6">
              <div className="flex items-start gap-3 mb-4">
                <FileText className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    6. Data Retention
                  </h3>
                </div>
              </div>

              <div className="space-y-4 pl-9">
                <p className="text-sm text-muted-foreground">
                  We retain your personal information for as long as necessary to provide our services and comply with legal obligations:
                </p>
                
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 space-y-1">
                  <li><strong>Active Accounts:</strong> Data is retained while your membership is active</li>
                  <li><strong>Terminated Accounts:</strong> Data is archived for 7 years for legal and audit purposes</li>
                  <li><strong>Payment Records:</strong> Retained for 7 years to comply with financial regulations</li>
                  <li><strong>Audit Logs:</strong> Retained for security and compliance purposes</li>
                </ul>
              </div>
            </section>

            {/* Section 7: Cookies and Tracking */}
            <section className="border-t border-border pt-6">
              <div className="flex items-start gap-3 mb-4">
                <Database className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    7. Cookies and Tracking Technologies
                  </h3>
                </div>
              </div>

              <div className="space-y-4 pl-9">
                <p className="text-sm text-muted-foreground">
                  We use cookies and similar technologies to enhance your experience, maintain your session, and analyze usage patterns. 
                  You can control cookie preferences through your browser settings, though some features may not function properly if cookies are disabled.
                </p>
              </div>
            </section>

            {/* Section 8: Children's Privacy */}
            <section className="border-t border-border pt-6">
              <div className="flex items-start gap-3 mb-4">
                <Shield className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    8. Children's Privacy
                  </h3>
                </div>
              </div>

              <div className="space-y-4 pl-9">
                <p className="text-sm text-muted-foreground">
                  Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal 
                  information from children. If we become aware that we have collected information from a child under 18, 
                  we will take steps to delete that information promptly.
                </p>
              </div>
            </section>

            {/* Section 9: Changes to Privacy Policy */}
            <section className="border-t border-border pt-6">
              <div className="flex items-start gap-3 mb-4">
                <FileText className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    9. Changes to This Privacy Policy
                  </h3>
                </div>
              </div>

              <div className="space-y-4 pl-9">
                <p className="text-sm text-muted-foreground">
                  We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. 
                  We will notify you of any material changes by email or through a prominent notice on our platform. Your continued 
                  use of our services after such notice constitutes acceptance of the updated policy.
                </p>
              </div>
            </section>

            {/* Contact Information */}
            <section className="border-t border-border pt-6">
              <div className="bg-accent/10 border-2 border-accent/30 p-6 rounded-lg">
                <h3 className="text-lg font-bold text-foreground mb-4">
                  Contact Us
                </h3>
                <p className="text-sm text-foreground leading-relaxed mb-4">
                  If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="space-y-2 text-sm text-foreground">
                  <p><strong>Email:</strong> privacy@homesolutions.com</p>
                  <p><strong>Support:</strong> support@homesolutions.com</p>
                  <p><strong>Mail:</strong> Home Solutions Privacy Team, [Address]</p>
                </div>
              </div>
            </section>

            <div className="text-center pt-4 pb-2">
              <p className="text-sm text-muted-foreground">
                Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
