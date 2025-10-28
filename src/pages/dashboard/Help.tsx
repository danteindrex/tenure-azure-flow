import { useState, useEffect, useMemo } from "react";
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
  CheckCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import HelpService, { SupportTicket, FAQCategory, FAQItem, KnowledgeBaseArticle } from "@/lib/help";
import { logError } from "@/lib/audit";

const Help = () => {
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    category: "",
    priority: "medium",
    description: ""
  });

  // Data state
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [faqCategories, setFaqCategories] = useState<FAQCategory[]>([]);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [searchResults, setSearchResults] = useState<{
    faqItems: FAQItem[];
    articles: KnowledgeBaseArticle[];
    totalResults: number;
  }>({ faqItems: [], articles: [], totalResults: 0 });


  const { data: session } = useSession();
  const user = session?.user;
  
  // Memoize the help service to prevent recreation on every render
  const helpService = useMemo(() => new HelpService(supabase), [supabase]);

  // Load initial data
  useEffect(() => {
    let isMounted = true;
    
    const loadHelpData = async () => {
      if (!user) return;
      
      try {
        if (isMounted) {
          setLoading(true);
        }
        
        // Load data in parallel
        const [tickets, categories, items] = await Promise.all([
          helpService.getSupportTickets(user.id),
          helpService.getFAQCategories(),
          helpService.getFAQItems()
        ]);

        // Only update state if component is still mounted
        if (isMounted) {
          setSupportTickets(tickets);
          setFaqCategories(categories);
          setFaqItems(items);
          setLoading(false);
        }

      } catch (error) {
        console.error('Error loading help data:', error);
        if (isMounted) {
          await logError(`Error loading help data: ${error.message}`, user.id);
          toast.error("Failed to load help data");
          setLoading(false);
        }
      }
    };

    loadHelpData();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [user?.id, helpService]); // Only depend on user.id and helpService

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to submit a ticket");
      return;
    }

    try {
      setSubmittingTicket(true);
      
      const ticket = await helpService.createSupportTicket({
        user_id: user.id,
        subject: ticketForm.subject,
        description: ticketForm.description,
        category: ticketForm.category as any,
        priority: ticketForm.priority as any,
        status: 'open'
      });

      if (ticket) {
        toast.success("Support ticket submitted successfully!");
        setTicketForm({ subject: "", category: "", priority: "medium", description: "" });
        
        // Refresh tickets list
        const updatedTickets = await helpService.getSupportTickets(user.id);
        setSupportTickets(updatedTickets);
      } else {
        throw new Error("Failed to create ticket");
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
      await logError(`Error submitting ticket: ${error.message}`, user.id);
      toast.error("Failed to submit support ticket");
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      
      const results = await helpService.searchHelpContent(searchQuery, user?.id);
      setSearchResults(results);
      
      if (results.totalResults === 0) {
        toast.info("No results found for your search");
      }
    } catch (error) {
      console.error('Error searching help content:', error);
      await logError(`Error searching help content: ${error.message}`, user?.id);
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  // Get filtered FAQ items based on search and category
  const getFilteredFAQItems = () => {
    if (searchResults.totalResults > 0) {
      return searchResults.faqItems;
    }
    
    let items = faqItems;
    
    if (selectedCategory !== "all") {
      items = items.filter(item => item.category_id === selectedCategory);
    }
    
    return items;
  };

  const filteredFAQItems = getFilteredFAQItems();

  // Debug logging
  console.log('Help component render:', { loading, user: user?.id, hasUser: !!user });

  // If no user after initial load, show message
  if (!user && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Please log in to access help content</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
            <p className="text-muted-foreground">Loading help content...</p>
            <p className="text-xs text-muted-foreground mt-2">User: {user?.id || 'Not loaded'}</p>
          </div>
        </div>
      </div>
    );
  }

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
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 bg-background/50"
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={searching || !searchQuery.trim()}
              className="w-full"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              {searching ? "Searching..." : "Search"}
            </Button>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {faqCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id || ''}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
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
          {supportTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No support tickets yet</p>
              <p className="text-sm">Submit a ticket below to get help</p>
            </div>
          ) : (
            supportTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-background/50">
                    <MessageCircle className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">{ticket.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.ticket_number} • Created {new Date(ticket.created_at || '').toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={
                    ticket.status === "resolved" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                    ticket.status === "in-progress" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                    ticket.status === "closed" ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" :
                    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  }>
                    {ticket.status}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
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
          <Button 
            type="submit" 
            className="bg-accent hover:bg-accent/90"
            disabled={submittingTicket}
          >
            {submittingTicket ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {submittingTicket ? "Submitting..." : "Submit Ticket"}
          </Button>
        </form>
      </Card>

      {/* FAQ */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Frequently Asked Questions</h3>
        {filteredFAQItems.length === 0 ? (
          <Card className="p-8 text-center">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {searchQuery ? "No FAQ items found for your search" : "No FAQ items available"}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {faqCategories.map((category) => {
              const categoryItems = filteredFAQItems.filter(item => item.category_id === category.id);
              if (categoryItems.length === 0) return null;
              
              return (
                <Card key={category.id} className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{category.icon}</span>
                    <h4 className="text-lg font-semibold">{category.name}</h4>
                  </div>
                  <div className="space-y-4">
                    {categoryItems.map((item, index) => (
                      <div key={item.id || index} className="border-l-2 border-accent/20 pl-4">
                        <h5 className="font-medium mb-2">{item.question}</h5>
                        <p className="text-sm text-muted-foreground">{item.answer}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Help;
