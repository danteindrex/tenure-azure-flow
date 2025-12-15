import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSessionStructure() {
  const { data, error } = await supabase.from('session').select('*').limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Session columns:', data?.[0] ? Object.keys(data[0]) : 'No data');
    console.log('Sample data:', data?.[0]);
  }
}

checkSessionStructure();
