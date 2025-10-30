// Help system service for managing support tickets, FAQ, and knowledge base
import { db } from '../../drizzle/db';

export interface SupportTicket {
  id?: string;
  user_id?: string;
  ticket_number?: string;
  subject: string;
  description: string;
  category: 'account' | 'payment' | 'queue' | 'technical' | 'billing' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  assigned_to?: string;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string;
  closed_at?: string;
  attachments?: any[];
  tags?: string[];
  internal_notes?: string;
  resolution?: string;
  user_email?: string;
  user_name?: string;
}

export interface SupportTicketMessage {
  id?: string;
  ticket_id: string;
  user_id?: string;
  message: string;
  is_internal?: boolean;
  created_at?: string;
  message_type?: 'text' | 'system' | 'attachment';
  attachments?: any[];
}

export interface FAQCategory {
  id?: string;
  name: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FAQItem {
  id?: string;
  category_id: string;
  question: string;
  answer: string;
  sort_order?: number;
  is_active?: boolean;
  view_count?: number;
  helpful_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface KnowledgeBaseArticle {
  id?: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  category: string;
  tags?: string[];
  is_published?: boolean;
  is_featured?: boolean;
  view_count?: number;
  helpful_count?: number;
  author_id?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
}

export interface HelpSearchLog {
  id?: string;
  user_id?: string;
  search_query: string;
  results_count?: number;
  clicked_result_id?: string;
  clicked_result_type?: string;
  created_at?: string;
}

class HelpService {
  constructor() {
    // Using Drizzle ORM with existing database tables
    // Note: Help/support tables may need to be created if not existing
  }

  // Support Tickets - Placeholder implementations
  async createSupportTicket(ticket: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at' | 'ticket_number'>): Promise<SupportTicket | null> {
    try {
      // TODO: Implement with proper support_tickets table
      console.log('Creating support ticket:', ticket);
      return null;
    } catch (error) {
      console.error('Error in createSupportTicket:', error);
      return null;
    }
  }

  async getSupportTickets(userId: string): Promise<SupportTicket[]> {
    try {
      // TODO: Implement with proper support_tickets table
      console.log('Getting support tickets for user:', userId);
      return [];
    } catch (error) {
      console.error('Error in getSupportTickets:', error);
      return [];
    }
  }

  async getSupportTicket(ticketId: string, userId: string): Promise<SupportTicket | null> {
    try {
      // TODO: Implement with proper support_tickets table
      console.log('Getting support ticket:', ticketId, 'for user:', userId);
      return null;
    } catch (error) {
      console.error('Error in getSupportTicket:', error);
      return null;
    }
  }

  async updateSupportTicket(ticketId: string, updates: Partial<SupportTicket>, userId: string): Promise<boolean> {
    try {
      // TODO: Implement with proper support_tickets table
      console.log('Updating support ticket:', ticketId, updates, 'for user:', userId);
      return false;
    } catch (error) {
      console.error('Error in updateSupportTicket:', error);
      return false;
    }
  }

  // Support Ticket Messages - Placeholder implementations
  async addTicketMessage(message: Omit<SupportTicketMessage, 'id' | 'created_at'>): Promise<SupportTicketMessage | null> {
    try {
      // TODO: Implement with proper support_ticket_messages table
      console.log('Adding ticket message:', message);
      return null;
    } catch (error) {
      console.error('Error in addTicketMessage:', error);
      return null;
    }
  }

  async getTicketMessages(ticketId: string): Promise<SupportTicketMessage[]> {
    try {
      // TODO: Implement with proper support_ticket_messages table
      console.log('Getting ticket messages for:', ticketId);
      return [];
    } catch (error) {
      console.error('Error in getTicketMessages:', error);
      return [];
    }
  }

  // FAQ Categories - Static data for now
  async getFAQCategories(): Promise<FAQCategory[]> {
    try {
      // Return static FAQ categories until database tables are created
      return [
        {
          id: '1',
          name: 'Account Management',
          description: 'Questions about your account, profile, and settings',
          icon: 'user',
          sort_order: 1,
          is_active: true
        },
        {
          id: '2',
          name: 'Payments & Billing',
          description: 'Payment methods, billing cycles, and transaction history',
          icon: 'credit-card',
          sort_order: 2,
          is_active: true
        },
        {
          id: '3',
          name: 'Queue System',
          description: 'How the membership queue works and your position',
          icon: 'list',
          sort_order: 3,
          is_active: true
        },
        {
          id: '4',
          name: 'Technical Support',
          description: 'Technical issues, bugs, and troubleshooting',
          icon: 'settings',
          sort_order: 4,
          is_active: true
        }
      ];
    } catch (error) {
      console.error('Error in getFAQCategories:', error);
      return [];
    }
  }

  // FAQ Items - Static data for now
  async getFAQItems(categoryId?: string): Promise<FAQItem[]> {
    try {
      // Return static FAQ items until database tables are created
      const allFAQs = [
        {
          id: '1',
          category_id: '1',
          question: 'How do I update my profile information?',
          answer: 'You can update your profile information by going to Settings > Profile and editing your details.',
          sort_order: 1,
          is_active: true,
          view_count: 0,
          helpful_count: 0
        },
        {
          id: '2',
          category_id: '2',
          question: 'When will I be charged for my membership?',
          answer: 'You will be charged $300 initially (joining fee + first month), then $25 monthly thereafter.',
          sort_order: 1,
          is_active: true,
          view_count: 0,
          helpful_count: 0
        },
        {
          id: '3',
          category_id: '3',
          question: 'How does the queue system work?',
          answer: 'Members are ranked by their tenure start date. The longest continuous members are eligible for payouts.',
          sort_order: 1,
          is_active: true,
          view_count: 0,
          helpful_count: 0
        }
      ];

      return categoryId ? allFAQs.filter(faq => faq.category_id === categoryId) : allFAQs;
    } catch (error) {
      console.error('Error in getFAQItems:', error);
      return [];
    }
  }

  async searchFAQItems(searchQuery: string): Promise<FAQItem[]> {
    try {
      const allFAQs = await this.getFAQItems();
      const query = searchQuery.toLowerCase();
      
      return allFAQs.filter(faq => 
        faq.question.toLowerCase().includes(query) || 
        faq.answer.toLowerCase().includes(query)
      );
    } catch (error) {
      console.error('Error in searchFAQItems:', error);
      return [];
    }
  }

  async incrementFAQViewCount(faqId: string): Promise<boolean> {
    try {
      // TODO: Implement with proper faq_items table
      console.log('Incrementing FAQ view count for:', faqId);
      return true;
    } catch (error) {
      console.error('Error in incrementFAQViewCount:', error);
      return false;
    }
  }

  // Knowledge Base Articles - Placeholder implementations
  async getKnowledgeBaseArticles(category?: string, featured?: boolean): Promise<KnowledgeBaseArticle[]> {
    try {
      // TODO: Implement with proper knowledge_base_articles table
      console.log('Getting knowledge base articles:', { category, featured });
      return [];
    } catch (error) {
      console.error('Error in getKnowledgeBaseArticles:', error);
      return [];
    }
  }

  async searchKnowledgeBase(searchQuery: string): Promise<KnowledgeBaseArticle[]> {
    try {
      // TODO: Implement with proper knowledge_base_articles table
      console.log('Searching knowledge base:', searchQuery);
      return [];
    } catch (error) {
      console.error('Error in searchKnowledgeBase:', error);
      return [];
    }
  }

  // Search Logs - Placeholder implementation
  async logSearch(searchQuery: string, resultsCount: number, userId?: string, clickedResultId?: string, clickedResultType?: string): Promise<boolean> {
    try {
      // TODO: Implement with proper help_search_logs table
      console.log('Logging search:', { searchQuery, resultsCount, userId, clickedResultId, clickedResultType });
      return true;
    } catch (error) {
      console.error('Error in logSearch:', error);
      return false;
    }
  }

  // Combined search across all help content
  async searchHelpContent(searchQuery: string, userId?: string): Promise<{
    faqItems: FAQItem[];
    articles: KnowledgeBaseArticle[];
    totalResults: number;
  }> {
    try {
      const [faqItems, articles] = await Promise.all([
        this.searchFAQItems(searchQuery),
        this.searchKnowledgeBase(searchQuery)
      ]);

      const totalResults = faqItems.length + articles.length;

      // Log the search
      await this.logSearch(searchQuery, totalResults, userId);

      return {
        faqItems,
        articles,
        totalResults
      };
    } catch (error) {
      console.error('Error in searchHelpContent:', error);
      return {
        faqItems: [],
        articles: [],
        totalResults: 0
      };
    }
  }
}

export default HelpService;