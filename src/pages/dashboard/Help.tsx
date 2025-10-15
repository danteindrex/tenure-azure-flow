import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  Search, 
  MessageCircle, 
  Mail, 
  Phone, 
  FileText,
  ChevronRight,
  Send,
  Clock,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    category: "",
    priority: "medium",
    description: ""
  });

  const faqCategories = [
    {
      id: "account",
      title: "Account & Profile",
      icon: "👤",
      questions: [
        {
          question: "How do I update my profile information?",
          answer: "You can update your profile information by going to the Profile page in your dashboard. Click the 'Edit Profile' button to make changes to your personal details, contact information, and address."
        },
        {
          question: "How do I change my password?",
          answer: "To change your password, go to Settings > Security and click 'Change Password'. You'll need to enter your current password and then create a new one."
        },
        {
          question: "Can I have multiple accounts?",
          answer: "No, each person is only allowed one account. Having multiple accounts violates our terms of service and may result in account suspension."
        }
      ]
    },
    {
      id: "payments",
      title: "Payments & Billing",
      icon: "💳",
      questions: [
        {
          question: "How much does membership cost?",
          answer: "The initial membership fee is $300, followed by monthly payments of $25. All fees are clearly displayed during the signup process."
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept credit cards, debit cards, and bank transfers. You can manage your payment methods in the Settings > Payment section."
        },
        {
          question: "When is my payment due?",
          answer: "Monthly payments are due on the same date each month as your initial signup. You'll receive reminders before the due date."
        },
        {
          question: "What happens if I miss a payment?",
          answer: "Missing a payment will result in immediate loss of your queue position. It's important to keep your payment method up to date and ensure sufficient funds."
        }
      ]
    },
    {
      id: "queue",
      title: "Tenure Queue",
      icon: "👥",
      questions: [
        {
          question: "How does the tenure queue work?",
          answer: "Members are ranked by their tenure (time as a member). The longer you've been a member, the higher your position. When the fund reaches payout milestones, the top-ranked members receive rewards."
        },
        {
          question: "Can I see my current position?",
          answer: "Yes, your current position in the queue is displayed on your dashboard. You can also view the full queue on the Tenure Queue page."
        },
        {
          question: "What happens when I move up in the queue?",
          answer: "You'll receive a notification when your position changes. Moving up means you're closer to receiving a payout when the next milestone is reached."
        }
      ]
    },
    {
      id: "payouts",
      title: "Payouts & Rewards",
      icon: "💰",
      questions: [
        {
          question: "How often are payouts made?",
          answer: "Payouts are made when the fund reaches certain milestones. Currently, we pay out to the top 2 members when the fund reaches $250,000."
        },
        {
          question: "How much can I win?",
          answer: "Payout amounts vary based on the fund size and your position. The top-ranked members receive the largest shares of the payout pool."
        },
        {
          question: "How will I receive my payout?",
          answer: "Payouts are typically sent via bank transfer or check, depending on your preference. You can update your payout preferences in Settings."
        }
      ]
    }
  ];

  const supportTickets = [
    {
      id: "TICKET-001",
      subject: "Payment processing issue",
      status: "open",
      priority: "high",
      created: "2 hours ago",
      lastUpdate: "1 hour ago"
    },
    {
      id: "TICKET-002",
      subject: "Profile update not saving",
      status: "resolved",
      priority: "medium",
      created: "1 day ago",
      lastUpdate: "12 hours ago"
    },
    {
      id: "TICKET-003",
      subject: "Queue position question",
      status: "in-progress",
      priority: "low",
      created: "3 days ago",
      lastUpdate: "2 days ago"
    }
  ];

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Support ticket submitted successfully!");
    setTicketForm({ subject: "", category: "", priority: "medium", description: "" });
  };

  const filteredFAQs = faqCategories.filter(category => 
    selectedCategory === "all" || category.id === selectedCategory
  ).filter(category => 
    searchQuery === "" || 
    category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.questions.some(q => 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Help & Support</h1>
          <p className="text-muted-foreground">Find answers and get help with your account</p>
        </div>
      </div>

      {/* Search and Contact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-accent" />
            Search Help
          </h3>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="account">Account & Profile</SelectItem>
                <SelectItem value="payments">Payments & Billing</SelectItem>
                <SelectItem value="queue">Tenure Queue</SelectItem>
                <SelectItem value="payouts">Payouts & Rewards</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Contact Support */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-accent" />
            Contact Support
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
              <Mail className="w-5 h-5 text-accent" />
              <div>
                <p className="font-medium">Email Support</p>
                <p className="text-sm text-muted-foreground">support@tenure.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
              <Phone className="w-5 h-5 text-accent" />
              <div>
                <p className="font-medium">Phone Support</p>
                <p className="text-sm text-muted-foreground">1-800-TENURE-1</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
              <Clock className="w-5 h-5 text-accent" />
              <div>
                <p className="font-medium">Hours</p>
                <p className="text-sm text-muted-foreground">Mon-Fri 9AM-6PM EST</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            Quick Actions
          </h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              View Documentation
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <MessageCircle className="w-4 h-4 mr-2" />
              Live Chat
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Phone className="w-4 h-4 mr-2" />
              Schedule Call
            </Button>
          </div>
        </Card>
      </div>

      {/* Support Tickets */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-accent" />
          My Support Tickets
        </h3>
        <div className="space-y-3">
          {supportTickets.map((ticket) => (
            <div key={ticket.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-background/50">
                  <MessageCircle className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="font-medium">{ticket.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    {ticket.id} • Created {ticket.created}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={
                  ticket.status === "resolved" ? "bg-green-100 text-green-800" :
                  ticket.status === "in-progress" ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                }>
                  {ticket.status}
                </Badge>
                <Button variant="ghost" size="sm">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Submit New Ticket */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Send className="w-5 h-5 text-accent" />
          Submit Support Ticket
        </h3>
        <form onSubmit={handleSubmitTicket} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={ticketForm.subject}
                onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                placeholder="Brief description of your issue"
                className="bg-background/50"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={ticketForm.category}
                onValueChange={(value) => setTicketForm({...ticketForm, category: value})}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="account">Account Issues</SelectItem>
                  <SelectItem value="payment">Payment Problems</SelectItem>
                  <SelectItem value="queue">Queue Questions</SelectItem>
                  <SelectItem value="technical">Technical Support</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={ticketForm.description}
              onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
              placeholder="Please provide detailed information about your issue..."
              className="bg-background/50 min-h-[120px]"
              required
            />
          </div>
          <Button type="submit" className="bg-accent hover:bg-accent/90">
            <Send className="w-4 h-4 mr-2" />
            Submit Ticket
          </Button>
        </form>
      </Card>

      {/* FAQ */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Frequently Asked Questions</h3>
        <Accordion type="single" collapsible className="space-y-2">
          {filteredFAQs.map((category) => (
            <AccordionItem key={category.id} value={category.id} className="border border-border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <span className="font-medium">{category.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="space-y-4">
                  {category.questions.map((faq, index) => (
                    <div key={index} className="border-l-2 border-accent/20 pl-4">
                      <h4 className="font-medium mb-2">{faq.question}</h4>
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default Help;
