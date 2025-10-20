import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const port = process.env.PORT || 3005;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'tenure-queue', time: new Date().toISOString() });
});

app.get('/queue', async (_req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

    const { data: queue, error: queueError } = await supabase
      .from('queue')
      .select('*')
      .order('queue_position', { ascending: true });
    if (queueError) return res.status(500).json({ error: 'Failed to fetch queue' });

    const { data: payments } = await supabase
      .from('payment')
      .select('amount')
      .eq('status', 'Completed');
    const totalRevenue = (payments || []).reduce((s, p) => s + (p?.amount || 0), 0);

    // Best-effort member enrichment
    const enriched = await Promise.all((queue || []).map(async (q) => {
      let member = null;
      try {
        const { data } = await supabase
          .from('member')
          .select('name, email, status, join_date')
          .eq('member_id', q.memberid)
          .maybeSingle();
        member = data;
      } catch {}
      return {
        ...q,
        member_name: member?.name || `Member ${q.memberid}`,
        member_email: member?.email || `member${q.memberid}@example.com`,
        member_status: member?.status || (q.subscription_active ? 'Active' : 'Inactive'),
        member_join_date: member?.join_date || q.joined_at,
      };
    }));

    const activeMembers = enriched.filter(m => m.subscription_active).length;
    const eligibleMembers = enriched.filter(m => m.is_eligible).length;
    const potentialWinners = Math.min(2, eligibleMembers);

    res.json({
      success: true,
      data: {
        queue: enriched,
        statistics: {
          totalMembers: enriched.length,
          activeMembers,
          eligibleMembers,
          totalRevenue,
          potentialWinners,
        }
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`[tenure-queue] listening on :${port}`);
});


