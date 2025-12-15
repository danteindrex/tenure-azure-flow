/**
 * WebSocket Activity Stream
 * Real-time activity updates using Server-Sent Events (SSE)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createActivityStream() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Subscribe to real-time changes in admin_activity_logs
  const channel = supabase
    .channel('admin_activity_logs')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_activity_logs'
      },
      (payload) => {
        console.log('New activity:', payload);
        // Broadcast to all connected clients
        broadcastActivity(payload.new);
      }
    )
    .subscribe();

  return channel;
}

const clients: Set<ReadableStreamDefaultController> = new Set();

export function addClient(controller: ReadableStreamDefaultController) {
  clients.add(controller);
}

export function removeClient(controller: ReadableStreamDefaultController) {
  clients.delete(controller);
}

export function broadcastActivity(activity: any) {
  const message = `data: ${JSON.stringify(activity)}\n\n`;
  
  clients.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      console.error('Failed to send to client:', error);
      clients.delete(controller);
    }
  });
}
