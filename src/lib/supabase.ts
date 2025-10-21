// Supabase client singleton to prevent multiple GoTrueClient instances
import { SupabaseClient, createClient } from '@supabase/supabase-js';

class SupabaseClientSingleton {
  private static instance: SupabaseClient | null = null;

  static getInstance(): SupabaseClient {
    if (!SupabaseClientSingleton.instance) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        // Check if we're on the server side and environment variables are missing
        if (typeof window === 'undefined') {
          console.warn('Supabase environment variables not available on server side');
          // Return a mock client for server-side rendering
          return null as any;
        }
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

// Named export for compatibility
export const supabase = SupabaseClientSingleton.getInstance();
