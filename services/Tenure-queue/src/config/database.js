const { createClient } = require('@supabase/supabase-js');

class DatabaseConnection {
  constructor() {
    this.supabase = null;
    this.init();
  }

  init() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  getClient() {
    return this.supabase;
  }

  async testConnection() {
    try {
      const { data, error } = await this.supabase
        .from('queue')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        throw error;
      }
      
      return { success: true, message: 'Database connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new DatabaseConnection();