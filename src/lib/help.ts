// Help system service for managing support tickets, FAQ, and knowledge base
import SupabaseClientSingleton from './supabase';

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
  private supabase: ReturnType<typeof SupabaseClientSingleton.getInstance>;

  constructor(supabaseClient?: ReturnType<typeof SupabaseClientSingleton.getInstance>) {
    this.supabase = supabaseClient || SupabaseClientSingleton.getInstance();
  }

  // Support Tickets
  async createSupportTicket(ticket: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at' | 'ticket_number'>): Promise<SupportTicket | null> {
    try {
      const { data, error } = await this.supabase
        .from('support_tickets')
        .insert(ticket)
        .select()
        .single();

      if (error) {
        console.error('Error creating support ticket:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createSupportTicket:', error);
      return null;
    }
  }

  async getSupportTickets(userId: string): Promise<SupportTicket[]> {
    try {
      const { data, error } = await this.supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching support tickets:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSupportTickets:', error);
      return [];
    }
  }

  async getSupportTicket(ticketId: string, userId: string): Promise<SupportTicket | null> {
    try {
      const { data, error } = await this.supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching support ticket:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getSupportTicket:', error);
      return null;
    }
  }

  async updateSupportTicket(ticketId: string, updates: Partial<SupportTicket>, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating support ticket:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateSupportTicket:', error);
      return false;
    }
  }

  // Support Ticket Messages
  async addTicketMessage(message: Omit<SupportTicketMessage, 'id' | 'created_at'>): Promise<SupportTicketMessage | null> {
    try {
      const { data, error } = await this.supabase
        .from('support_ticket_messages')
        .insert(message)
        .select()
        .single();

      if (error) {
        console.error('Error adding ticket message:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in addTicketMessage:', error);
      return null;
    }
  }

  async getTicketMessages(ticketId: string): Promise<SupportTicketMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching ticket messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTicketMessages:', error);
      return [];
    }
  }

  // FAQ Categories
  async getFAQCategories(): Promise<FAQCategory[]> {
    try {
      const { data, error } = await this.supabase
        .from('faq_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching FAQ categories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getFAQCategories:', error);
      return [];
    }
  }

  // FAQ Items
  async getFAQItems(categoryId?: string): Promise<FAQItem[]> {
    try {
      let query = this.supabase
        .from('faq_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching FAQ items:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getFAQItems:', error);
      return [];
    }
  }

  async searchFAQItems(searchQuery: string): Promise<FAQItem[]> {
    try {
      const { data, error } = await this.supabase
        .from('faq_items')
        .select('*')
        .eq('is_active', true)
        .or(`question.ilike.%${searchQuery}%,answer.ilike.%${searchQuery}%`)
        .order('helpful_count', { ascending: false });

      if (error) {
        console.error('Error searching FAQ items:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchFAQItems:', error);
      return [];
    }
  }

  async incrementFAQViewCount(faqId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('faq_items')
        .update({ view_count: this.supabase.raw('view_count + 1') })
        .eq('id', faqId);

      if (error) {
        console.error('Error incrementing FAQ view count:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in incrementFAQViewCount:', error);
      return false;
    }
  }

  // Knowledge Base Articles
  async getKnowledgeBaseArticles(category?: string, featured?: boolean): Promise<KnowledgeBaseArticle[]> {
    try {
      let query = this.supabase
        .from('knowledge_base_articles')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      if (featured) {
        query = query.eq('is_featured', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching knowledge base articles:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getKnowledgeBaseArticles:', error);
      return [];
    }
  }

  async searchKnowledgeBase(searchQuery: string): Promise<KnowledgeBaseArticle[]> {
    try {
      const { data, error } = await this.supabase
        .from('knowledge_base_articles')
        .select('*')
        .eq('is_published', true)
        .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%`)
        .order('helpful_count', { ascending: false });

      if (error) {
        console.error('Error searching knowledge base:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchKnowledgeBase:', error);
      return [];
    }
  }

  // Search Logs
  async logSearch(searchQuery: string, resultsCount: number, userId?: string, clickedResultId?: string, clickedResultType?: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('help_search_logs')
        .insert({
          user_id: userId,
          search_query: searchQuery,
          results_count: resultsCount,
          clicked_result_id: clickedResultId,
          clicked_result_type: clickedResultType
        });

      if (error) {
        console.error('Error logging search:', error);
        return false;
      }

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
