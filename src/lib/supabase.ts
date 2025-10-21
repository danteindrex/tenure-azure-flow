// Supabase client singleton to prevent multiple GoTrueClient instances
import { SupabaseClient, createClient } from '@supabase/supabase-js';

class SupabaseClientSingleton {
  private static instance: SupabaseClient | null = null;

  static getInstance(): SupabaseClient {
    if (!SupabaseClientSingleton.instance) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables');
      }

      SupabaseClientSingleton.instance = createClient(supabaseUrl, supabaseKey);
    }

    return SupabaseClientSingleton.instance;
  }

  // Method to set instance from external client (for Next.js auth helpers)
  static setInstance(client: SupabaseClient): void {
    SupabaseClientSingleton.instance = client;
  }

  // Method to clear instance (for testing or cleanup)
  static clearInstance(): void {
    SupabaseClientSingleton.instance = null;
  }
}

export default SupabaseClientSingleton;
