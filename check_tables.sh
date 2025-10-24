#!/bin/bash
for table in users user_profiles user_contacts user_addresses user_memberships user_subscriptions user_payments membership_queue notifications audit_log
do
  curl -s "https://exneyqwvvckzxqzlknxv.supabase.co/rest/v1/$table?limit=0" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4bmV5cXd2dmNrenhxemxrbnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTQ2NzgsImV4cCI6MjA3NjE5MDY3OH0.Rr3YCGH3qlrd_caZVhRPCLyxXJwHUZuponHBOD7Yehc" 2>&1 | grep -q "PGRST205" && echo "❌ $table" || echo "✅ $table"
done
